const { ethers } = require('ethers');
const env = require('../config/env');
const { MULTISIG_WALLET_ABI, SECTORIAL_STABLE_COIN_ABI } = require('./contractAbis');
const AppError = require('../utils/AppError');
const Transaction = require('../models/Transaction');
const AuditLog = require('../models/AuditLog');

let provider;
let walletContract;
let tokenContract;

function getProvider() {
  if (!provider) {
    provider = new ethers.JsonRpcProvider(env.blockchainRpcUrl);
    // Default HTTP polling is every 4s, which makes the transaction cache
    // and audit log feel laggy right after an approver acts in the
    // frontend. A local Hardhat node handles much more frequent polling
    // fine, so tighten this for a snappier demo.
    provider.pollingInterval = 1000;
  }
  return provider;
}

function requireAddress(address, label) {
  if (!address) {
    throw new AppError(
      `${label} contract address is not configured. Set it in backend/.env after deployment.`,
      500
    );
  }
}

function getWalletContract() {
  if (!walletContract) {
    requireAddress(env.multisigAddress, 'MultiSigWallet');
    walletContract = new ethers.Contract(env.multisigAddress, MULTISIG_WALLET_ABI, getProvider());
  }
  return walletContract;
}

function getTokenContract() {
  if (!tokenContract) {
    requireAddress(env.tokenAddress, 'SectorialStableCoin');
    tokenContract = new ethers.Contract(env.tokenAddress, SECTORIAL_STABLE_COIN_ABI, getProvider());
  }
  return tokenContract;
}

// ---------- Reads ----------

async function getWalletInfo() {
  const wallet = getWalletContract();
  const [owners, threshold, txCount] = await Promise.all([
    wallet.getOwners(),
    wallet.numConfirmationsRequired(),
    wallet.getTransactionCount(),
  ]);
  return {
    address: env.multisigAddress,
    owners,
    threshold: Number(threshold),
    transactionCount: Number(txCount),
  };
}

async function getTokenInfo() {
  const token = getTokenContract();
  const [name, symbol, decimals, totalSupply, sector, paused, ownerAddr] = await Promise.all([
    token.name(),
    token.symbol(),
    token.decimals(),
    token.totalSupply(),
    token.sector(),
    token.paused(),
    token.owner(),
  ]);
  return {
    address: env.tokenAddress,
    name,
    symbol,
    decimals: Number(decimals),
    totalSupply: totalSupply.toString(),
    sector,
    paused,
    owner: ownerAddr,
  };
}

async function getTokenBalance(address) {
  if (!ethers.isAddress(address)) {
    throw new AppError('Invalid address', 400);
  }
  const token = getTokenContract();
  const balance = await token.balanceOf(address);
  return balance.toString();
}

/**
 * Reads a single transaction directly from the chain, bypassing the Mongo
 * cache entirely. Used by GET /api/transactions/:id/chain-status so the
 * frontend (or a skeptical viva panel) can verify the cache isn't lying.
 */
async function getChainTransaction(txIndex) {
  const wallet = getWalletContract();
  const count = await wallet.getTransactionCount();
  if (txIndex < 0 || txIndex >= Number(count)) {
    throw new AppError('Transaction index out of range', 404);
  }
  const [to, value, data, executed, numConfirmations] = await wallet.getTransaction(txIndex);
  const threshold = await wallet.numConfirmationsRequired();
  return {
    txIndex,
    to,
    value: value.toString(),
    data,
    executed,
    numConfirmations: Number(numConfirmations),
    numConfirmationsRequired: Number(threshold),
    decoded: decodeTransactionData(to, data),
  };
}

/**
 * Best-effort decode of a transaction's target function + args, trying the
 * token ABI first (most transactions are token calls) and falling back to
 * the wallet ABI (governance calls like changeThreshold target the wallet
 * itself).
 */
function decodeTransactionData(to, data) {
  if (!data || data === '0x') return null;

  const tokenIface = new ethers.Interface(SECTORIAL_STABLE_COIN_ABI);
  const walletIface = new ethers.Interface(MULTISIG_WALLET_ABI);

  for (const iface of [tokenIface, walletIface]) {
    try {
      const parsed = iface.parseTransaction({ data });
      if (parsed) {
        return {
          functionName: parsed.name,
          args: parsed.args.map((a) => (typeof a === 'bigint' ? a.toString() : a)),
        };
      }
    } catch (err) {
      // Not decodable by this ABI, try the next one.
    }
  }
  return null;
}

// ---------- Cache sync (event-driven) ----------

async function upsertTransactionFromChain(txIndex) {
  const wallet = getWalletContract();
  const [to, value, data, executed, numConfirmations] = await wallet.getTransaction(txIndex);
  const threshold = await wallet.numConfirmationsRequired();
  const decoded = decodeTransactionData(to, data);

  const status = executed ? 'EXECUTED' : Number(numConfirmations) >= Number(threshold) ? 'APPROVED' : 'PENDING';

  await Transaction.findOneAndUpdate(
    { txIndex },
    {
      txIndex,
      to: to.toLowerCase(),
      value: value.toString(),
      data,
      functionName: decoded?.functionName ?? null,
      decodedArgs: decoded?.args ?? null,
      numConfirmations: Number(numConfirmations),
      numConfirmationsRequired: Number(threshold),
      executed,
      status,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function logAudit(action, { actorAddress = null, details = {}, txHash = null } = {}) {
  try {
    await AuditLog.create({
      action,
      actorAddress: actorAddress ? actorAddress.toLowerCase() : null,
      details,
      blockchainTxHash: txHash,
    });
  } catch (err) {
    // Audit logging must never crash the listener; just report it.
    console.error('[blockchainService] failed to write audit log:', err.message);
  }
}

/**
 * Performs a full resync of every transaction currently on the wallet.
 * Called once at startup so the cache is correct even if the backend was
 * offline while transactions happened.
 */
async function fullResync() {
  const wallet = getWalletContract();
  const count = Number(await wallet.getTransactionCount());
  console.log(`[blockchainService] resyncing ${count} transaction(s) from chain...`);
  for (let i = 0; i < count; i++) {
    await upsertTransactionFromChain(i);
  }
  console.log('[blockchainService] resync complete.');
}

/**
 * Subscribes to live contract events and keeps the Mongo cache + audit log
 * up to date. This is additive to fullResync(): events cover everything
 * that happens *after* startup.
 */
function startEventListeners() {
  const wallet = getWalletContract();
  const token = getTokenContract();

  wallet.on('TransactionSubmitted', async (txIndex, owner, to, value, data, event) => {
    await upsertTransactionFromChain(Number(txIndex));
    await logAudit('TX_SUBMITTED', {
      actorAddress: owner,
      details: { txIndex: Number(txIndex), to },
      txHash: event.log.transactionHash,
    });
  });

  wallet.on('TransactionConfirmed', async (txIndex, owner, event) => {
    await upsertTransactionFromChain(Number(txIndex));
    await logAudit('TX_CONFIRMED', {
      actorAddress: owner,
      details: { txIndex: Number(txIndex) },
      txHash: event.log.transactionHash,
    });
  });

  wallet.on('TransactionRevoked', async (txIndex, owner, event) => {
    await upsertTransactionFromChain(Number(txIndex));
    await logAudit('TX_REVOKED', {
      actorAddress: owner,
      details: { txIndex: Number(txIndex) },
      txHash: event.log.transactionHash,
    });
  });

  wallet.on('TransactionExecuted', async (txIndex, executor, event) => {
    await upsertTransactionFromChain(Number(txIndex));
    await Transaction.findOneAndUpdate(
      { txIndex: Number(txIndex) },
      { executedAtBlock: event.log.blockNumber, executedTxHash: event.log.transactionHash }
    );
    await logAudit('TX_EXECUTED', {
      actorAddress: executor,
      details: { txIndex: Number(txIndex) },
      txHash: event.log.transactionHash,
    });
  });

  wallet.on('OwnerAdded', async (owner, event) => {
    await logAudit('OWNER_ADDED', { actorAddress: owner, txHash: event.log.transactionHash });
  });

  wallet.on('OwnerRemoved', async (owner, event) => {
    await logAudit('OWNER_REMOVED', { actorAddress: owner, txHash: event.log.transactionHash });
  });

  wallet.on('ThresholdChanged', async (newThreshold, event) => {
    await logAudit('THRESHOLD_CHANGED', {
      details: { newThreshold: Number(newThreshold) },
      txHash: event.log.transactionHash,
    });
  });

  token.on('TokensIssued', async (to, amount, event) => {
    await logAudit('TOKENS_ISSUED', {
      actorAddress: to,
      details: { to, amount: amount.toString() },
      txHash: event.log.transactionHash,
    });
  });

  token.on('TokensBurned', async (from, amount, event) => {
    await logAudit('TOKENS_BURNED', {
      actorAddress: from,
      details: { from, amount: amount.toString() },
      txHash: event.log.transactionHash,
    });
  });

  token.on('AddressFrozen', async (account, event) => {
    await logAudit('ADDRESS_FROZEN', { actorAddress: account, txHash: event.log.transactionHash });
  });

  token.on('AddressUnfrozen', async (account, event) => {
    await logAudit('ADDRESS_UNFROZEN', { actorAddress: account, txHash: event.log.transactionHash });
  });

  token.on('Paused', async (account, event) => {
    await logAudit('TOKEN_PAUSED', { actorAddress: account, txHash: event.log.transactionHash });
  });

  token.on('Unpaused', async (account, event) => {
    await logAudit('TOKEN_UNPAUSED', { actorAddress: account, txHash: event.log.transactionHash });
  });

  console.log('[blockchainService] event listeners active.');
}

/**
 * Call this once during server startup, after MongoDB is connected. Safe to
 * call even if contract addresses are not yet configured (it will skip and
 * log a warning, since a fresh clone won't have deployed contracts yet).
 */
async function initBlockchainSync() {
  if (!env.multisigAddress || !env.tokenAddress) {
    console.warn(
      '[blockchainService] MULTISIG_CONTRACT_ADDRESS / TOKEN_CONTRACT_ADDRESS not set — ' +
        'skipping chain sync. Deploy the contracts and update backend/.env, then restart.'
    );
    return;
  }
  try {
    await fullResync();
    startEventListeners();
  } catch (err) {
    console.error('[blockchainService] failed to initialize chain sync:', err.message);
    console.error('[blockchainService] Is the Hardhat node running at', env.blockchainRpcUrl, '?');
  }
}

module.exports = {
  getProvider,
  getWalletContract,
  getTokenContract,
  getWalletInfo,
  getTokenInfo,
  getTokenBalance,
  getChainTransaction,
  decodeTransactionData,
  initBlockchainSync,
  fullResync,
};
