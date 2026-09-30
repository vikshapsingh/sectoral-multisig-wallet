const express = require('express');
const {
  listTransactions,
  getTransaction,
  getChainStatus,
} = require('../controllers/transactionController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

router.get('/', listTransactions);
router.get('/:id', getTransaction);
router.get('/:id/chain-status', getChainStatus);

module.exports = router;
