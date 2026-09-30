const express = require('express');
const { body } = require('express-validator');
const { register, login, me } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('A valid email is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('walletAddress')
      .optional({ nullable: true })
      .matches(/^0x[a-fA-F0-9]{40}$/)
      .withMessage('walletAddress must be a valid Ethereum address'),
  ],
  register
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('A valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  login
);

router.get('/me', authenticateToken, me);

module.exports = router;
