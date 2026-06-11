const express = require('express');
const router = express.Router();
const quantController = require('../controllers/quantController');

router.get('/filtros', quantController.getFiltros.bind(quantController));
router.get('/indice', quantController.getIndice.bind(quantController));
router.get('/volatilidade', quantController.getVolatilidade.bind(quantController));
router.get('/sazonalidade', quantController.getSazonalidade.bind(quantController));
router.get('/correlacao', quantController.getCorrelacao.bind(quantController));
router.get('/anomalia-risco', quantController.getAnomaliaRisco.bind(quantController));
router.get('/estresse-risco', quantController.getEstresseRisco.bind(quantController));
router.get('/exposicao-setorial', quantController.getExposicaoSetorial.bind(quantController));
router.get('/evolucao-risco', quantController.getEvolucaoRisco.bind(quantController));
router.get('/benchmark-sp500', quantController.getBenchmarkSP500.bind(quantController));
router.get('/mapa-mercado', quantController.getMapaMercado.bind(quantController));
router.get('/indice-customizado', quantController.getIndiceCustomizado.bind(quantController));

module.exports = router;