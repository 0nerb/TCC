const quantRepository = require('../repositories/quantRepository');
const sp500Service = require('../services/sp500Service');

const extrairParametros = (query) => {
  const { setores, industrias, paises, riscos, ano_ini, ano_fim } = query;
  return {
    listaSetores: setores ? setores.split(',').filter(Boolean) : [],
    listaIndustrias: industrias ? industrias.split(',').filter(Boolean) : [],
    listaPaises: paises ? paises.split(',').filter(Boolean) : [],
    listaRiscos: riscos ? riscos.split(',').filter(Boolean) : [],
    anoIni: ano_ini,
    anoFim: ano_fim
  };
};

class QuantController {
  async getFiltros(req, res) {
    try { const dados = await quantRepository.obterFiltros(); res.json(dados); } catch (err) { res.status(500).json({ error: err.message }); }
  }
  async getIndice(req, res) {
    try { const p = extrairParametros(req.query); const dados = await quantRepository.obterIndice(p.listaSetores, p.anoIni, p.anoFim, p.listaIndustrias, p.listaPaises); res.json(dados); } catch (err) { res.status(500).json({ error: err.message }); }
  }
  async getVolatilidade(req, res) {
    try { const p = extrairParametros(req.query); const dados = await quantRepository.obterVolatilidade(p.listaSetores, p.anoIni, p.anoFim, p.listaIndustrias, p.listaPaises); res.json(dados); } catch (err) { res.status(500).json({ error: err.message }); }
  }
  async getSazonalidade(req, res) {
    try { const p = extrairParametros(req.query); const dados = await quantRepository.obterSazonalidade(p.listaSetores, p.anoIni, p.anoFim, p.listaIndustrias, p.listaPaises); res.json(dados); } catch (err) { res.status(500).json({ error: err.message }); }
  }
  async getCorrelacao(req, res) {
    try { const p = extrairParametros(req.query); const dados = await quantRepository.obterCorrelacao(p.listaSetores, p.anoIni, p.anoFim, p.listaIndustrias, p.listaPaises); res.json(dados); } catch (err) { res.status(500).json({ error: err.message }); }
  }
  async getAnomaliaRisco(req, res) {
    try { const { ano_ini, ano_fim } = req.query; const dados = await quantRepository.obterAnomaliaRisco(ano_ini, ano_fim); res.json(dados); } catch (err) { res.status(500).json({ error: err.message }); }
  }
  async getEstresseRisco(req, res) {
    try { const { ano_ini, ano_fim } = req.query; const dados = await quantRepository.obterEstresseRisco(ano_ini, ano_fim); res.json(dados); } catch (err) { res.status(500).json({ error: err.message }); }
  }
  async getExposicaoSetorial(req, res) {
    try { const { ano_ini, ano_fim } = req.query; const dados = await quantRepository.obterExposicaoSetorial(ano_ini, ano_fim); res.json(dados); } catch (err) { res.status(500).json({ error: err.message }); }
  }
  async getEvolucaoRisco(req, res) {
    try { const { anoIni, anoFim, listaRiscos } = extrairParametros(req.query); const dados = await quantRepository.obterEvolucaoRisco(anoIni, anoFim, listaRiscos); res.json(dados); } catch (err) { res.status(500).json({ error: err.message }); }
  }
async getMapaMercado(req, res) {
    try {
      const setores = req.query.setores ? req.query.setores.split(',') : [];
      const industrias = req.query.industrias ? req.query.industrias.split(',') : [];
      const paises = req.query.paises ? req.query.paises.split(',') : [];
      
      const anoIni = req.query.ano_ini || 2010;
      const anoFim = req.query.ano_fim || 2025;

      const useDiv = req.query.use_div !== 'false';
      const useMargem = req.query.use_margem !== 'false';
      const useEv = req.query.use_ev !== 'false';

      const dados = await quantRepository.obterMapaMercado(
        setores, industrias, paises, anoIni, anoFim, useDiv, useMargem, useEv
      );
      res.json(dados);
    } catch (err) { 
      res.status(500).json({ error: err.message }); 
    }
  }

  async getIndiceCustomizado(req, res) {
    try {
      const tickers = req.query.tickers ? req.query.tickers.split(',') : [];
      const pesos = req.query.pesos ? req.query.pesos.split(',').map(Number) : [];
      const anoIni = req.query.ano_ini || 2010;
      const anoFim = req.query.ano_fim || 2025;

      if (tickers.length === 0 || tickers.length !== pesos.length) {
        return res.status(400).json({ error: "Parâmetros de Tickers e Pesos inválidos." });
      }

      const dados = await quantRepository.obterIndiceCustomizado(tickers, pesos, anoIni, anoFim);
      res.json(dados);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  // Rota do Benchmark S&P 500
  async getBenchmarkSP500(req, res) {
    try {
      const { ano_ini, ano_fim } = req.query;
      const dados = sp500Service.getDadosProcessados(parseInt(ano_ini), parseInt(ano_fim));
      res.json(dados);
    } catch (err) {
      console.error("[Backend] Erro no endpoint getBenchmarkSP500:", err);
      res.status(500).json({ error: err.message });
    }
  }
}

module.exports = new QuantController();