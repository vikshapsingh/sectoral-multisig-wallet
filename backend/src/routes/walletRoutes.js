const express = require('express');
const { getWalletInfo, getTokenInfo, getBalance } = require('../controllers/walletController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

router.get('/info', getWalletInfo);
router.get('/token', getTokenInfo);
router.get('/balance/:address', getBalance);

module.exports = router;
