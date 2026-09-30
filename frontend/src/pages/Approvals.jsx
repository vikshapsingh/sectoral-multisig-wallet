import { useCallback, useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '../hooks/useWallet';
import { AppLayout } from '../components/layout/AppLayout';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorBanner, EmptyState } from '../components/common/EmptyState';
import { AddressPill } from '../components/common/AddressPill';
import { functionLabel } from '../utils/format';
import { decodeTransactionData, tokenIface, walletIface } from '../utils/decode';
import { CONTRACT_ADDRESSES } from '../services/contracts';

const ACTIONS = [
  {
    key: 'mint',
    label: 'Mint tokens',
    target: 'token',
    fields: [
      { name: 'to', type: 'address', label: 'Recipient address' },
      { name: 'amount', type: 'amount', label: 'Amount (SSC)' },
    ],
  },
  {
    key: 'burn',
    label: 'Burn tokens',
    target: 'token',
    fields: [
      { name: 'from', type: 'address', label: 'Address to burn from' },
      { name: 'amount', type: 'amount', label: 'Amount (SSC)' },
    ],
  },
  { key: 'pause', label: 'Pause token', target: 'token', fields: [] },
  { key: 'unpause', label: 'Unpause token', target: 'token', fields: [] },
  {
    key: 'freeze',
    label: 'Freeze address',
    target: 'token',
    fields: [{ name: 'account', type: 'address', label: 'Address to freeze' }],
  },
  {
    key: 'unfreeze',
    label: 'Unfreeze address',
    target: 'token',
    fields: [{ name: 'account', type: 'address', label: 'Address to unfreeze' }],
  },
  {
    key: 'changeThreshold',
    label: 'Change approval threshold',
    target: 'wallet',
    fields: [{ name: 'newThreshold', type: 'number', label: 'New threshold' }],
  },
];

function encodeAction(action, values) {
  const args = action.fields.map((field) => {
    const raw = values[field.name];
    if (field.type === 'amount') return ethers.parseEther(raw || '0');
    if (field.type === 'number') return Number(raw);
    return raw;
  });

  const iface = action.target === 'token' ? tokenIface : walletIface;
  const to = action.target === 'token' ? CONTRACT_ADDRESSES.token : CONTRACT_ADDRESSES.wallet;
  const data = iface.encodeFunctionData(action.key, args);
  return { to, data };
}

function SubmitForm({ onSubmit, submitting }) {
  const [actionKey, setActionKey] = useState(ACTIONS[0].key);
  const [values, setValues] = useState({});
  const action = ACTIONS.find((a) => a.key === actionKey);

  const handleActionChange = (e) => {
    setActionKey(e.target.value);
    setValues({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { to, data } = encodeAction(action, values);
    await onSubmit(to, data);
    setValues({});
  };

  return (
    <form onSubmit={handleSubmit} className="card p-5 space-y-4">
      <h2 className="font-medium">Propose a transaction</h2>

      <div>
        <label className="label" htmlFor="action">
          Action
        </label>
        <select id="action" className="input" value={actionKey} onChange={handleActionChange}>
          {ACTIONS.map((a) => (
            <option key={a.key} value={a.key}>
              {a.label}
            </option>
          ))}
        </select>
      </div>

      {action.fields.map((field) => (
        <div key={field.name}>
          <label className="label" htmlFor={field.name}>
            {field.label}
          </label>
          <input
            id={field.name}
            required
            className="input font-mono text-sm"
            value={values[field.name] || ''}
            onChange={(e) => setValues((v) => ({ ...v, [field.name]: e.target.value }))}
            placeholder={field.type === 'address' ? '0x…' : field.type === 'amount' ? '0.0' : ''}
          />
        </div>
      ))}

      <button type="submit" disabled={submitting} className="btn-primary w-full">
        {submitting ? 'Submitting…' : 'Propose transaction'}
      </button>
      <p className="text-xs text-ink-500">
        This sends a transaction from your connected wallet. It only takes effect once enough owners
        confirm it.
      </p>
    </form>
  );
}

function TransactionRow({ tx, ownerAddress, isOwner, onConfirm, onRevoke, onExecute, busy }) {
  const decoded = decodeTransactionData(tx.data);
  const alreadyConfirmed = tx.confirmedByMe;
  const canExecute = tx.numConfirmations >= tx.numConfirmationsRequired && !tx.executed;

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium text-sm">{functionLabel(decoded?.functionName)}</p>
          <p className="text-xs text-ink-500 mt-0.5">
            Target: <AddressPill address={tx.to} className="ml-1" />
          </p>
          {decoded?.args?.length > 0 && (
            <p className="text-xs text-ink-500 mt-1 font-mono break-all">args: {decoded.args.join(', ')}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-semibold">
            {tx.numConfirmations} / {tx.numConfirmationsRequired}
          </p>
          <p className="text-xs text-ink-500">{tx.executed ? 'Executed' : 'confirmations'}</p>
        </div>
      </div>

      {!tx.executed && (
        <div className="flex gap-2 mt-4">
          {!alreadyConfirmed ? (
            <button
              onClick={() => onConfirm(tx.txIndex)}
              disabled={!isOwner || busy}
              className="btn-primary text-xs px-3 py-1.5"
            >
              Confirm
            </button>
          ) : (
            <button
              onClick={() => onRevoke(tx.txIndex)}
              disabled={!isOwner || busy}
              className="btn-secondary text-xs px-3 py-1.5"
            >
              Revoke my confirmation
            </button>
          )}
          <button
            onClick={() => onExecute(tx.txIndex)}
            disabled={!canExecute || busy}
            className="btn-secondary text-xs px-3 py-1.5"
            title={!canExecute ? 'Waiting on more confirmations' : ''}
          >
            Execute
          </button>
        </div>
      )}
      {!ownerAddress && (
        <p className="text-xs text-alert-500 mt-3">Connect your wallet to confirm, revoke or execute.</p>
      )}
      {ownerAddress && !isOwner && (
        <p className="text-xs text-alert-500 mt-3">
          Your connected address isn't a wallet owner — actions will be rejected by the contract.
        </p>
      )}
    </div>
  );
}

export default function Approvals() {
  const {
    address,
    isConnected,
    connect,
    readWalletContract,
    writeWalletContract,
    contractsConfigured,
  } = useWallet();

  const [owners, setOwners] = useState([]);
  const [threshold, setThreshold] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyTxIndex, setBusyTxIndex] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState(null);

  const isOwner = address ? owners.some((o) => o.toLowerCase() === address.toLowerCase()) : false;

  const loadFromChain = useCallback(async () => {
    if (!readWalletContract) return;
    setError(null);
    try {
      const [ownerList, req, count] = await Promise.all([
        readWalletContract.getOwners(),
        readWalletContract.numConfirmationsRequired(),
        readWalletContract.getTransactionCount(),
      ]);
      setOwners(ownerList);
      setThreshold(Number(req));

      const total = Number(count);
      const items = [];
      for (let i = total - 1; i >= 0; i--) {
        const [to, value, data, executed, numConfirmations] = await readWalletContract.getTransaction(i);
        const confirmedByMe = address ? await readWalletContract.isConfirmedBy(i, address) : false;
        items.push({
          txIndex: i,
          to,
          value: value.toString(),
          data,
          executed,
          numConfirmations: Number(numConfirmations),
          numConfirmationsRequired: Number(req),
          confirmedByMe,
        });
      }
      setTransactions(items);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [readWalletContract, address]);

  useEffect(() => {
    loadFromChain();
  }, [loadFromChain]);

  const runWriteAction = async (fn) => {
    setActionError(null);
    try {
      const tx = await fn();
      await tx.wait();
      await loadFromChain();
    } catch (err) {
      setActionError(err.reason || err.shortMessage || err.message);
    }
  };

  const handleSubmitTransaction = async (to, data) => {
    if (!writeWalletContract) {
      setActionError('Connect your wallet first.');
      return;
    }
    setSubmitting(true);
    await runWriteAction(() => writeWalletContract.submitTransaction(to, 0, data));
    setSubmitting(false);
  };

  const handleConfirm = async (txIndex) => {
    setBusyTxIndex(txIndex);
    await runWriteAction(() => writeWalletContract.confirmTransaction(txIndex));
    setBusyTxIndex(null);
  };

  const handleRevoke = async (txIndex) => {
    setBusyTxIndex(txIndex);
    await runWriteAction(() => writeWalletContract.revokeConfirmation(txIndex));
    setBusyTxIndex(null);
  };

  const handleExecute = async (txIndex) => {
    setBusyTxIndex(txIndex);
    await runWriteAction(() => writeWalletContract.executeTransaction(txIndex));
    setBusyTxIndex(null);
  };

  if (!contractsConfigured) {
    return (
      <AppLayout>
        <EmptyState
          title="Contract addresses not configured"
          description="Set VITE_MULTISIG_ADDRESS and VITE_TOKEN_ADDRESS in frontend/.env, then restart the dev server."
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <h1 className="text-xl font-semibold mb-1">Approvals</h1>
      <p className="text-ink-400 text-sm mb-6">
        Threshold: {threshold} of {owners.length} owners. Every action here is signed by your connected
        wallet and sent straight to the contract — nothing here can be faked by the backend.
      </p>

      {!isConnected && (
        <div className="card p-4 mb-6 flex items-center justify-between">
          <p className="text-sm text-ink-300">Connect your wallet to confirm, revoke or execute transactions.</p>
          <button onClick={connect} className="btn-primary text-sm">
            Connect wallet
          </button>
        </div>
      )}

      <ErrorBanner message={error} />
      <ErrorBanner message={actionError} />

      <div className="grid md:grid-cols-3 gap-6 mt-2">
        <div className="md:col-span-1">
          <SubmitForm onSubmit={handleSubmitTransaction} submitting={submitting} />
        </div>

        <div className="md:col-span-2 space-y-3">
          {loading && <LoadingSpinner label="Reading transactions from chain…" />}
          {!loading && transactions.length === 0 && (
            <EmptyState title="No transactions yet" description="Propose one using the form on the left." />
          )}
          {!loading &&
            transactions.map((tx) => (
              <TransactionRow
                key={tx.txIndex}
                tx={tx}
                ownerAddress={address}
                isOwner={isOwner}
                onConfirm={handleConfirm}
                onRevoke={handleRevoke}
                onExecute={handleExecute}
                busy={busyTxIndex === tx.txIndex}
              />
            ))}
        </div>
      </div>
    </AppLayout>
  );
}
