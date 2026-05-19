const express = require('express');
const router = express.Router();
const auditController = require('./audit.controller');
const { authenticateJWT, authorizeRoles } = require('../../shared/middlewares/auth');

router.use(authenticateJWT);
router.use(authorizeRoles('ADMIN')); // Audit logs should only be accessible by general administrator

router.get('/', auditController.getAllLogs);
router.delete('/clear', auditController.clearLogs);

module.exports = router;
