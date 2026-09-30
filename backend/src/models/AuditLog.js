const mongoose = require('mongoose');

const ACTIONS = [
  'LOGIN',
  'LOGIN_FAILED',
  'USER_CREATED',
  'ROLE_CHANGED',
  'USER_DEACTIVATED',
  'USER_REACTIVATED',
  'TX_SUBMITTED',
  'TX_CONFIRMED',
  'TX_REVOKED',
  'TX_EXECUTED',
  'TOKENS_ISSUED',
  'TOKENS_BURNED',
  'ADDRESS_FROZEN',
  'ADDRESS_UNFROZEN',
  'TOKEN_PAUSED',
  'TOKEN_UNPAUSED',
  'OWNER_ADDED',
  'OWNER_REMOVED',
  'THRESHOLD_CHANGED',
];

const auditLogSchema = new mongoose.Schema(
  {
    action: { type: String, enum: ACTIONS, required: true },
    // The acting user, if this was triggered through the app (e.g. login).
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    // The on-chain address involved, if this came from a blockchain event.
    actorAddress: { type: String, lowercase: true, default: null },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
    blockchainTxHash: { type: String, default: null },
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.statics.ACTIONS = ACTIONS;

module.exports = mongoose.model('AuditLog', auditLogSchema);
