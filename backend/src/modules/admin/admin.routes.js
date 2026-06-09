const express = require('express');
const router = express.Router();
const adminController = require('./admin.controller');
const { authenticateJWT, authorizeRoles } = require('../../shared/middlewares/auth');

router.use(authenticateJWT);
router.use(authorizeRoles('ADMIN'));

router.get('/backup', adminController.backup);
router.post('/restore', adminController.restore);
router.post('/clean-folhas', adminController.apagarLancamentos);

// Exceções de Prazo de Edição
router.get('/excecoes', adminController.listarExcecoes);
router.post('/excecoes', adminController.criarExcecao);
router.delete('/excecoes/:id', adminController.deletarExcecao);

module.exports = router;
