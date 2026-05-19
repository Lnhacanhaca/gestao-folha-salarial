const express = require('express');
const router = express.Router();
const folhaController = require('./folhas.controller');
const { authenticateJWT } = require('../../shared/middlewares/auth');

router.use(authenticateJWT);

router.post('/importar', folhaController.importar);
router.post('/deletar-docente', folhaController.deletarDocenteFolha);
router.get('/curso/:id', folhaController.getByCurso);
router.get('/geral', folhaController.getGeral);

module.exports = router;
