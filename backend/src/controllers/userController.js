const { validationResult } = require('express-validator');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const listUsers = asyncHandler(async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.json({ users: users.map((u) => u.toSafeObject()) });
});

const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError('User not found', 404);
  res.json({ user: user.toSafeObject() });
});

const updateUser = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Invalid update data', 400, errors.array());
  }

  const { name, walletAddress, isActive } = req.body;
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError('User not found', 404);

  if (name !== undefined) user.name = name;
  if (walletAddress !== undefined) user.walletAddress = walletAddress;

  if (isActive !== undefined && isActive !== user.isActive) {
    user.isActive = isActive;
    await AuditLog.create({
      action: isActive ? 'USER_REACTIVATED' : 'USER_DEACTIVATED',
      actor: req.user._id,
      details: { targetUser: user.email },
    });
  }

  await user.save();
  res.json({ user: user.toSafeObject() });
});

const updateUserRole = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Invalid role', 400, errors.array());
  }

  const { role } = req.body;
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError('User not found', 404);

  const previousRole = user.role;
  user.role = role;
  await user.save();

  await AuditLog.create({
    action: 'ROLE_CHANGED',
    actor: req.user._id,
    details: { targetUser: user.email, from: previousRole, to: role },
  });

  res.json({ user: user.toSafeObject() });
});

module.exports = { listUsers, getUser, updateUser, updateUserRole };
