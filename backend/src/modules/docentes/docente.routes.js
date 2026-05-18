const express = require('express');
const router = express.Router();
const docenteController = require('./docentes.controller');
const { authenticateJWT } = require('../../shared/middlewares/auth');

router.use(authenticateJWT);

router.get('/', docenteController.getAll);
router.post('/', docenteController.create);
router.put('/:id', docenteController.update);
router.delete('/:id', docenteController.remove);

module.exports = router;
