const express = require('express');
const { listAuditLogs } = require('../controllers/auditController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

router.get('/', listAuditLogs);

module.exports = router;
