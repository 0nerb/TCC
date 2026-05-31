// controllers/quantController.js
const quantRepository = require('../repositories/quantRepository');

// Função utilitária (DRY) para extração e sanitização dos parâmetros da Query String
const extrairParametros = (query) => {
  const { setores, industrias, paises, ano_ini, ano_fim } = query;
  return {
    listaSetores: setores ? setores.split(',').filter(Boolean) : [],
    listaIndustrias: industrias ? industrias.split(',').filter(Boolean) : [],
    listaPaises: paises ? paises.split(',').filter(Boolean) : [],
    anoIni: ano_ini,
    anoFim: ano_fim
  };
};

class QuantController {
  async getFiltros(req, res) {
    try {
      const dados = await quantRepository.obterFiltros();
      res.json(dados);
    } catch (err) { res.status(500).json({ error: err.message }); }
  }

  async getIndice(req, res) {
    try {
      const { listaSetores, anoIni, anoFim, listaIndustrias, listaPaises } = extrairParametros(req.query);
      const dados = await quantRepository.obterIndice(listaSetores, anoIni, anoFim, listaIndustrias, listaPaises);
      res.json(dados);
    } catch (err) { res.status(500).json({ error: err.message }); }
  }

  async getVolatilidade(req, res) {
    try {
      const { listaSetores, anoIni, anoFim, listaIndustrias, listaPaises } = extrairParametros(req.query);
      const dados = await quantRepository.obterVolatilidade(listaSetores, anoIni, anoFim, listaIndustrias, listaPaises);
      res.json(dados);
    } catch (err) { res.status(500).json({ error: err.message }); }
  }

  async getSazonalidade(req, res) {
    try {
      const { listaSetores, anoIni, anoFim, listaIndustrias, listaPaises } = extrairParametros(req.query);
      const dados = await quantRepository.obterSazonalidade(listaSetores, anoIni, anoFim, listaIndustrias, listaPaises);
      res.json(dados);
    } catch (err) { res.status(500).json({ error: err.message }); }
  }

  async getCorrelacao(req, res) {
    try {
      const { listaSetores, anoIni, anoFim, listaIndustrias, listaPaises } = extrairParametros(req.query);
      const dados = await quantRepository.obterCorrelacao(listaSetores, anoIni, anoFim, listaIndustrias, listaPaises);
      res.json(dados);
    } catch (err) { res.status(500).json({ error: err.message }); }
  }

  async getAnomaliaRisco(req, res) {
    try {
      const { ano_ini, ano_fim } = req.query;
      const dados = await quantRepository.obterAnomaliaRisco(ano_ini, ano_fim);
      res.json(dados);
    } catch (err) { res.status(500).json({ error: err.message }); }
  }

  async getEstresseRisco(req, res) {
    try {
      const { ano_ini, ano_fim } = req.query;
      const dados = await quantRepository.obterEstresseRisco(ano_ini, ano_fim);
      res.json(dados);
    } catch (err) { res.status(500).json({ error: err.message }); }
  }

  async getExposicaoSetorial(req, res) {
    try {
      const { ano_ini, ano_fim } = req.query;
      const dados = await quantRepository.obterExposicaoSetorial(ano_ini, ano_fim);
      res.json(dados);
    } catch (err) { res.status(500).json({ error: err.message }); }
  }
}

// Exporta uma instância única do Controller
module.exports = new QuantController();