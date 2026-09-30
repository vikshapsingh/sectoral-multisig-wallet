const mongoose = require('mongoose');

/**
 * This collection is a read-optimized CACHE of MultiSigWallet transactions,
 * kept in sync by the blockchain event listener (see services/blockchainService.js).
 * It exists so the frontend can list/search/filter quickly. It must never be
 * treated as authoritative — approval counts, execution status, and threshold
 * enforcement always come from the chain. See GET /api/transactions/:id/chain-status
 * for a route that bypasses this cache entirely.
 */
const transactionSchema = new mongoose.Schema(
  {
    // Index of this transaction in the MultiSigWallet's `transactions` array.
    txIndex: {
      type: Number,
      required: true,
      unique: true,
    },
    to: { type: String, required: true, lowercase: true },
    value: { type: String, default: '0' }, // stored as string (wei) to avoid precision loss
    data: { type: String, default: '0x' },

    // Best-effort human label for what this transaction does, decoded from
    // `data` where possible (e.g. "mint", "pause", "changeThreshold").
    functionName: { type: String, default: null },
    decodedArgs: { type: mongoose.Schema.Types.Mixed, default: null },

    submitter: { type: String, lowercase: true },
    numConfirmations: { type: Number, default: 0 },
    numConfirmationsRequired: { type: Number, default: 0 },
    executed: { type: Boolean, default: false },

    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'EXECUTED'],
      default: 'PENDING',
    },

    submittedAtBlock: { type: Number },
    submittedTxHash: { type: String },
    executedAtBlock: { type: Number, default: null },
    executedTxHash: { type: String, default: null },
  },
  { timestamps: true }
);

transactionSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
