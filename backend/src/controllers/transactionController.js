const Transaction = require('../models/Transaction');
const blockchainService = require('../services/blockchainService');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const listTransactions = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = {};
  if (status) {
    if (!['PENDING', 'APPROVED', 'EXECUTED'].includes(status)) {
      throw new AppError('Invalid status filter', 400);
    }
    filter.status = status;
  }

  const transactions = await Transaction.find(filter).sort({ txIndex: -1 });
  res.json({ transactions });
});

const getTransaction = asyncHandler(async (req, res) => {
  const txIndex = Number(req.params.id);
  if (!Number.isInteger(txIndex) || txIndex < 0) {
    throw new AppError('Invalid transaction id', 400);
  }

  const transaction = await Transaction.findOne({ txIndex });
  if (!transaction) throw new AppError('Transaction not found', 404);
  res.json({ transaction });
});

/**
 * Bypasses the Mongo cache and reads the transaction straight from the
 * MultiSigWallet contract. Use this whenever the cache's correctness is
 * in question (e.g. right after a transaction was confirmed/executed and
 * the event listener may not have caught up yet).
 */
const getChainStatus = asyncHandler(async (req, res) => {
  const txIndex = Number(req.params.id);
  if (!Number.isInteger(txIndex) || txIndex < 0) {
    throw new AppError('Invalid transaction id', 400);
  }

  const onChain = await blockchainService.getChainTransaction(txIndex);
  res.json({ transaction: onChain });
});

module.exports = { listTransactions, getTransaction, getChainStatus };
