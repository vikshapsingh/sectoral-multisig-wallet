const AuditLog = require('../models/AuditLog');
const asyncHandler = require('../utils/asyncHandler');

const listAuditLogs = asyncHandler(async (req, res) => {
  const { action, limit = 100 } = req.query;
  const filter = {};
  if (action) filter.action = action;

  const cappedLimit = Math.min(parseInt(limit, 10) || 100, 500);

  const logs = await AuditLog.find(filter)
    .sort({ createdAt: -1 })
    .limit(cappedLimit)
    .populate('actor', 'name email role');

  res.json({ logs });
});

module.exports = { listAuditLogs };
