const jwt = require('jsonwebtoken');
const env = require('../config/env');
const AppError = require('../utils/AppError');
const User = require('../models/User');

/**
 * Verifies the Bearer JWT on the request, attaches the corresponding user
 * document to req.user. Rejects if the token is missing, invalid, expired,
 * or the user has since been deactivated.
 */
async function authenticateToken(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw new AppError('Missing or malformed Authorization header', 401);
    }

    let payload;
    try {
      payload = jwt.verify(token, env.jwtSecret);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw new AppError('Session expired, please log in again', 401);
      }
      throw new AppError('Invalid authentication token', 401);
    }

    const user = await User.findById(payload.sub);
    if (!user) {
      throw new AppError('User no longer exists', 401);
    }
    if (!user.isActive) {
      throw new AppError('This account has been deactivated', 403);
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Restricts a route to one or more roles. Use after authenticateToken.
 * Usage: authorizeRole('ADMIN'), authorizeRole('ADMIN', 'APPROVER')
 */
function authorizeRole(...allowedRoles) {
  return function checkRole(req, res, next) {
    if (!req.user) {
      return next(new AppError('Not authenticated', 401));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          `This action requires one of the following roles: ${allowedRoles.join(', ')}`,
          403
        )
      );
    }
    next();
  };
}

module.exports = { authenticateToken, authorizeRole };
