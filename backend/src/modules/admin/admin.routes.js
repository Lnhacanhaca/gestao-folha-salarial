const express = require('express');
const router = express.Router();
const adminController = require('./admin.controller');
const { authenticateJWT, authorizeRoles } = require('../../shared/middlewares/auth');

router.use(authenticateJWT);
router.use(authorizeRoles('ADMIN'));

router.get('/backup', adminController.backup);
router.post('/restore', adminController.restore);

module.exports = router;
