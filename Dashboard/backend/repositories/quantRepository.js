const pool = require('../config/database');

class QuantRepository {
  async obterFiltros() {
    const query = `
      SELECT DISTINCT pais, setor, industria 
      FROM dim_acao 
      WHERE pais IS NOT NULL AND setor IS NOT NULL AND industria IS NOT NULL
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  async obterIndice(listaSetores, ano_ini, ano_fim, listaIndustrias, listaPaises) {
    const query = `
      WITH TotalSetor AS (
          SELECT setor, COUNT(DISTINCT ticker) as total_geral 
          FROM dim_acao 
          WHERE (CARDINALITY($1::text[]) = 0 OR setor = ANY($1::text[]))
            AND (CARDINALITY($4::text[]) = 0 OR industria = ANY($4::text[]))
            AND (CARDINALITY($5::text[]) = 0 OR pais = ANY($5::text[]))
          GROUP BY setor
      ),
      PrecosSemanais AS (
          SELECT 
              DATE_TRUNC('week', t.data_completa) as semana,
              a.setor,
              a.ticker,
              AVG(f.preco_fechamento) as preco_medio
          FROM fato_infoacaodiario f
          JOIN dim_acao a ON f.fk_dim_acao_acao_key = a.acao_key
          JOIN dim_tempo t ON f.fk_dim_tempo_data_key = t.data_key
          WHERE (CARDINALITY($1::text[]) = 0 OR a.setor = ANY($1::text[]))
            AND (CARDINALITY($4::text[]) = 0 OR a.industria = ANY($4::text[]))
            AND (CARDINALITY($5::text[]) = 0 OR a.pais = ANY($5::text[]))
            AND t.ano BETWEEN $2 AND $3
          GROUP BY 1, 2, 3
      )
      SELECT 
          semana as data,
          setor,
          (SUM(preco_medio) / COUNT(DISTINCT ticker)) * (SELECT total_geral FROM TotalSetor ts WHERE ts.setor = PrecosSemanais.setor) as valor
      FROM PrecosSemanais
      GROUP BY semana, setor
      ORDER BY semana ASC;
    `;
    const result = await pool.query(query, [listaSetores, ano_ini, ano_fim, listaIndustrias, listaPaises]);
    return result.rows;
  }

  async obterVolatilidade(listaSetores, ano_ini, ano_fim, listaIndustrias, listaPaises) {
    const query = `
      WITH TotalSetor AS (
          SELECT setor, COUNT(DISTINCT ticker) as total_geral 
          FROM dim_acao 
          WHERE (CARDINALITY($1::text[]) = 0 OR setor = ANY($1::text[]))
            AND (CARDINALITY($4::text[]) = 0 OR industria = ANY($4::text[]))
            AND (CARDINALITY($5::text[]) = 0 OR pais = ANY($5::text[]))
          GROUP BY setor
      ),
      PrecosSemanais AS (
          SELECT 
              DATE_TRUNC('week', t.data_completa) as semana,
              a.setor,
              a.ticker,
              AVG(f.preco_fechamento) as preco_medio
          FROM fato_infoacaodiario f
          JOIN dim_acao a ON f.fk_dim_acao_acao_key = a.acao_key
          JOIN dim_tempo t ON f.fk_dim_tempo_data_key = t.data_key
          WHERE (CARDINALITY($1::text[]) = 0 OR a.setor = ANY($1::text[]))
            AND (CARDINALITY($4::text[]) = 0 OR a.industria = ANY($4::text[]))
            AND (CARDINALITY($5::text[]) = 0 OR a.pais = ANY($5::text[]))
            AND t.ano BETWEEN $2 AND $3
          GROUP BY 1, 2, 3
      ),
      Indice AS (
          SELECT 
              semana as data,
              setor,
              (SUM(preco_medio) / COUNT(DISTINCT ticker)) * (SELECT total_geral FROM TotalSetor ts WHERE ts.setor = PrecosSemanais.setor) as valor
          FROM PrecosSemanais
          GROUP BY semana, setor
      ),
      Retornos AS (
          SELECT setor, (valor / LAG(valor) OVER (PARTITION BY setor ORDER BY data) - 1) as r
          FROM Indice
      )
      SELECT setor, COALESCE(STDDEV(r) * SQRT(52) * 100, 0) as volatilidade_anualizada
      FROM Retornos WHERE r IS NOT NULL
      GROUP BY setor;
    `;
    const result = await pool.query(query, [listaSetores, ano_ini, ano_fim, listaIndustrias, listaPaises]);
    return result.rows;
  }

  async obterSazonalidade(listaSetores, ano_ini, ano_fim, listaIndustrias, listaPaises) {
    const query = `
      WITH TotalSetor AS (
          SELECT setor, COUNT(DISTINCT ticker) as total_geral 
          FROM dim_acao 
          WHERE (CARDINALITY($1::text[]) = 0 OR setor = ANY($1::text[]))
            AND (CARDINALITY($4::text[]) = 0 OR industria = ANY($4::text[]))
            AND (CARDINALITY($5::text[]) = 0 OR pais = ANY($5::text[]))
          GROUP BY setor
      ),
      PrecosSemanais AS (
          SELECT 
              DATE_TRUNC('week', t.data_completa) as semana,
              a.setor,
              a.ticker,
              AVG(f.preco_fechamento) as preco_medio
          FROM fato_infoacaodiario f
          JOIN dim_acao a ON f.fk_dim_acao_acao_key = a.acao_key
          JOIN dim_tempo t ON f.fk_dim_tempo_data_key = t.data_key
          WHERE (CARDINALITY($1::text[]) = 0 OR a.setor = ANY($1::text[]))
            AND (CARDINALITY($4::text[]) = 0 OR a.industria = ANY($4::text[]))
            AND (CARDINALITY($5::text[]) = 0 OR a.pais = ANY($5::text[]))
            AND t.ano BETWEEN $2 AND $3
          GROUP BY 1, 2, 3
      ),
      Indice AS (
          SELECT 
              p.semana as data,
              p.setor,
              (SUM(p.preco_medio) / COUNT(DISTINCT p.ticker)) * MAX(ts.total_geral) as valor
          FROM PrecosSemanais p
          JOIN TotalSetor ts ON ts.setor = p.setor
          GROUP BY p.semana, p.setor
      ),
      Retornos AS (
          SELECT 
              setor, 
              EXTRACT(MONTH FROM data) as mes,
              (valor / LAG(valor) OVER (PARTITION BY setor ORDER BY data) - 1) as r
          FROM Indice
      )
      SELECT 
          setor, 
          mes, 
          AVG(r) * 100 as media_retorno
      FROM Retornos 
      WHERE r IS NOT NULL
      GROUP BY setor, mes
      ORDER BY mes ASC, setor ASC;
    `;
    const result = await pool.query(query, [listaSetores, ano_ini, ano_fim, listaIndustrias, listaPaises]);
    return result.rows;
  }

  async obterCorrelacao(listaSetores, ano_ini, ano_fim, listaIndustrias, listaPaises) {
    const query = `
      WITH TotalSetor AS (
          SELECT setor, COUNT(DISTINCT ticker) as total_geral 
          FROM dim_acao 
          WHERE (CARDINALITY($1::text[]) = 0 OR setor = ANY($1::text[]))
            AND (CARDINALITY($4::text[]) = 0 OR industria = ANY($4::text[]))
            AND (CARDINALITY($5::text[]) = 0 OR pais = ANY($5::text[]))
          GROUP BY setor
      ),
      PrecosSemanais AS (
          SELECT 
              DATE_TRUNC('week', t.data_completa) as semana,
              a.setor,
              a.ticker,
              AVG(f.preco_fechamento) as preco_medio
          FROM fato_infoacaodiario f
          JOIN dim_acao a ON f.fk_dim_acao_acao_key = a.acao_key
          JOIN dim_tempo t ON f.fk_dim_tempo_data_key = t.data_key
          WHERE (CARDINALITY($1::text[]) = 0 OR a.setor = ANY($1::text[]))
            AND (CARDINALITY($4::text[]) = 0 OR a.industria = ANY($4::text[]))
            AND (CARDINALITY($5::text[]) = 0 OR a.pais = ANY($5::text[]))
            AND t.ano BETWEEN $2 AND $3
          GROUP BY 1, 2, 3
      ),
      Indice AS (
          SELECT 
              p.semana as data,
              p.setor,
              (SUM(p.preco_medio) / COUNT(DISTINCT p.ticker)) * MAX(ts.total_geral) as valor
          FROM PrecosSemanais p
          JOIN TotalSetor ts ON ts.setor = p.setor
          GROUP BY p.semana, p.setor
      )
      SELECT 
          s1.setor as setor_a,
          s2.setor as setor_b,
          CORR(s1.valor, s2.valor) as coeficiente
      FROM Indice s1
      JOIN Indice s2 ON s1.data = s2.data
      GROUP BY s1.setor, s2.setor
      ORDER BY s1.setor, s2.setor;
    `;
    const result = await pool.query(query, [listaSetores, ano_ini, ano_fim, listaIndustrias, listaPaises]);
    return result.rows;
  }

async obterAnomaliaRisco(ano_ini, ano_fim) {
    const query = `
      WITH AtivosRisco AS (
          SELECT 
              DATE_TRUNC('week', t.data_completa) as semana,
              a.ticker,
              AVG(f.preco_fechamento) as preco_medio,
              AVG(f.risco_base) as risco_semanal
          FROM fato_infoacaodiario f
          JOIN dim_acao a ON f.fk_dim_acao_acao_key = a.acao_key
          JOIN dim_tempo t ON f.fk_dim_tempo_data_key = t.data_key
          WHERE t.ano BETWEEN $1 AND $2
          GROUP BY 1, 2
      ),
      RetornosClassificados AS (
          SELECT 
              ticker,
              semana,
              -- Injeção do NULLIF(..., 0) para prevenção de Divisão por Zero
              (preco_medio / NULLIF(LAG(preco_medio) OVER (PARTITION BY ticker ORDER BY semana), 0) - 1) as retorno_discreto,
              CASE 
                  WHEN risco_semanal <= -0.60 THEN '1 - Muito Baixo'
                  WHEN risco_semanal > -0.60 AND risco_semanal <= -0.25 THEN '2 - Baixo'
                  WHEN risco_semanal > -0.25 AND risco_semanal <= 0.25 THEN '3 - Medio'
                  WHEN risco_semanal > 0.25 AND risco_semanal <= 0.60 THEN '4 - Alto'
                  WHEN risco_semanal > 0.60 THEN '5 - Muito Alto'
              END as faixa_risco
          FROM AtivosRisco
      )
      SELECT 
          faixa_risco,
          COUNT(DISTINCT ticker) as ativos_no_quintil,
          (AVG(retorno_discreto) * 52 * 100) as retorno_anualizado_pct
      FROM RetornosClassificados
      WHERE retorno_discreto IS NOT NULL AND faixa_risco IS NOT NULL
      GROUP BY faixa_risco
      ORDER BY faixa_risco ASC;
    `;
    const result = await pool.query(query, [ano_ini, ano_fim]);
    return result.rows;
  }

  async obterEstresseRisco(ano_ini, ano_fim) {
    const query = `
      WITH ClassificacaoRisco AS (
          SELECT 
              a.ticker,
              CASE 
                  WHEN AVG(f.risco_base) <= -0.60 THEN '1 - Muito Baixo'
                  WHEN AVG(f.risco_base) > -0.60 AND AVG(f.risco_base) <= -0.25 THEN '2 - Baixo'
                  WHEN AVG(f.risco_base) > -0.25 AND AVG(f.risco_base) <= 0.25 THEN '3 - Medio'
                  WHEN AVG(f.risco_base) > 0.25 AND AVG(f.risco_base) <= 0.60 THEN '4 - Alto'
                  WHEN AVG(f.risco_base) > 0.60 THEN '5 - Muito Alto'
              END as faixa_risco
          FROM fato_infoacaodiario f
          JOIN dim_acao a ON f.fk_dim_acao_acao_key = a.acao_key
          JOIN dim_tempo t ON f.fk_dim_tempo_data_key = t.data_key
          WHERE t.ano BETWEEN $1 AND $2
          GROUP BY a.ticker
      ),
      PrecosFaixa AS (
          SELECT 
              DATE_TRUNC('week', t.data_completa) as semana,
              c.faixa_risco,
              AVG(f.preco_fechamento) as preco_medio
          FROM fato_infoacaodiario f
          JOIN dim_acao a ON f.fk_dim_acao_acao_key = a.acao_key
          JOIN dim_tempo t ON f.fk_dim_tempo_data_key = t.data_key
          JOIN ClassificacaoRisco c ON a.ticker = c.ticker
          WHERE t.ano BETWEEN $1 AND $2
          GROUP BY 1, 2
      ),
      DrawdownCalc AS (
          SELECT 
              faixa_risco,
              semana,
              preco_medio as valor_indice,
              MAX(preco_medio) OVER (PARTITION BY faixa_risco ORDER BY semana ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) as hwm
          FROM PrecosFaixa
      )
      SELECT 
          faixa_risco,
          MIN((valor_indice / NULLIF(hwm, 0)) - 1) * 100 as maximum_drawdown_pct
      FROM DrawdownCalc
      WHERE faixa_risco IS NOT NULL
      GROUP BY faixa_risco
      ORDER BY faixa_risco ASC;
    `;
    const result = await pool.query(query, [ano_ini, ano_fim]);
    return result.rows;
  }

  async obterExposicaoSetorial(ano_ini, ano_fim) {
    const query = `
      SELECT 
          a.setor,
          AVG(f.risco_base) as z_score_medio_setor,
          MAX(f.risco_base) as z_score_maximo,
          MIN(f.risco_base) as z_score_minimo
      FROM fato_infoacaodiario f
      JOIN dim_acao a ON f.fk_dim_acao_acao_key = a.acao_key
      JOIN dim_tempo t ON f.fk_dim_tempo_data_key = t.data_key
      WHERE t.ano BETWEEN $1 AND $2
        AND f.risco_base IS NOT NULL
      GROUP BY a.setor
      ORDER BY z_score_medio_setor DESC;
    `;
    const result = await pool.query(query, [ano_ini, ano_fim]);
    return result.rows;
  }
}

module.exports = new QuantRepository();