// routes/api.js
const express = require('express');
const router = express.Router();
const quantController = require('../controllers/quantController');

// Mapeamento de Endpoints (Bindings verbos HTTP -> Métodos Controller)
router.get('/filtros', quantController.getFiltros.bind(quantController));
router.get('/indice', quantController.getIndice.bind(quantController));
router.get('/volatilidade', quantController.getVolatilidade.bind(quantController));
router.get('/sazonalidade', quantController.getSazonalidade.bind(quantController));
router.get('/correlacao', quantController.getCorrelacao.bind(quantController));
router.get('/anomalia-risco', quantController.getAnomaliaRisco.bind(quantController));
router.get('/estresse-risco', quantController.getEstresseRisco.bind(quantController));
router.get('/exposicao-setorial', quantController.getExposicaoSetorial.bind(quantController));

module.exports = router;