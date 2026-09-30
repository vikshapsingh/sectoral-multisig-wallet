const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const env = require('../config/env');

function issueToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

const register = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Invalid registration data', 400, errors.array());
  }

  const { name, email, password, walletAddress } = req.body;

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw new AppError('An account with this email already exists', 409);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  // First-ever user becomes ADMIN so the system is bootstrappable; everyone
  // after that defaults to AUDITOR until an admin promotes them.
  const userCount = await User.countDocuments();
  const role = userCount === 0 ? 'ADMIN' : 'AUDITOR';

  const user = await User.create({
    name,
    email: email.toLowerCase(),
    passwordHash,
    walletAddress: walletAddress || null,
    role,
  });

  await AuditLog.create({ action: 'USER_CREATED', actor: user._id, details: { email: user.email, role } });

  const token = issueToken(user);
  res.status(201).json({ token, user: user.toSafeObject() });
});

const login = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Invalid login data', 400, errors.array());
  }

  const { email, password } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');

  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }
  if (!user.isActive) {
    throw new AppError('This account has been deactivated', 403);
  }

  const matches = await user.comparePassword(password);
  if (!matches) {
    await AuditLog.create({ action: 'LOGIN_FAILED', details: { email: user.email } });
    throw new AppError('Invalid email or password', 401);
  }

  await AuditLog.create({ action: 'LOGIN', actor: user._id });

  const token = issueToken(user);
  res.json({ token, user: user.toSafeObject() });
});

const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user.toSafeObject() });
});

module.exports = { register, login, me };
