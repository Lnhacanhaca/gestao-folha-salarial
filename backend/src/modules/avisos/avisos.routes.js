const express = require('express');
const router = express.Router();
const avisosController = require('./avisos.controller');
const { authenticateJWT, authorizeRoles } = require('../../shared/middlewares/auth');

router.use(authenticateJWT);

// Public (Authenticated)
router.get('/', avisosController.getActive);

// Admin Only
router.post('/', authorizeRoles('ADMIN'), avisosController.create);
router.put('/:id', authorizeRoles('ADMIN'), avisosController.update);
router.delete('/:id', authorizeRoles('ADMIN'), avisosController.remove);

module.exports = router;
