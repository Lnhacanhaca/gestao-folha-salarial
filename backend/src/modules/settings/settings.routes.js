const express = require('express');
const router = express.Router();
const settingsController = require('./settings.controller');
const { authenticateJWT, authorizeRoles } = require('../../shared/middlewares/auth');
const multer = require('multer');
const os = require('os');

const upload = multer({ dest: os.tmpdir() });

router.use(authenticateJWT);
router.use(authorizeRoles('ADMIN'));

router.get('/backup', settingsController.backup);
router.post('/restore', upload.single('file'), settingsController.restore);

module.exports = router;
