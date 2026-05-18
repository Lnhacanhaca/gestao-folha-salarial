const express = require('express');
const router = express.Router();
const userController = require('./users.controller');
const { authenticateJWT, authorizeRoles } = require('../../shared/middlewares/auth');

router.use(authenticateJWT);

router.get('/', authorizeRoles('ADMIN'), userController.getAll);
router.post('/', authorizeRoles('ADMIN'), userController.create);
router.put('/:id', authorizeRoles('ADMIN'), userController.update);
router.delete('/:id', authorizeRoles('ADMIN'), userController.remove);

module.exports = router;
