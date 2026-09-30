const express = require('express');
const { body } = require('express-validator');
const { listUsers, getUser, updateUser, updateUserRole } = require('../controllers/userController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

router.use(authenticateToken);

router.get('/', authorizeRole('ADMIN'), listUsers);
router.get('/:id', authorizeRole('ADMIN'), getUser);

router.patch(
  '/:id',
  authorizeRole('ADMIN'),
  [
    body('name').optional().trim().notEmpty(),
    body('walletAddress')
      .optional({ nullable: true })
      .matches(/^0x[a-fA-F0-9]{40}$/)
      .withMessage('walletAddress must be a valid Ethereum address'),
    body('isActive').optional().isBoolean(),
  ],
  updateUser
);

router.patch(
  '/:id/role',
  authorizeRole('ADMIN'),
  [body('role').isIn(User.ROLES).withMessage(`role must be one of: ${User.ROLES.join(', ')}`)],
  updateUserRole
);

module.exports = router;
