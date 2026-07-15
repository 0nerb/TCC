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
      WITH PrecosSemanais AS (
          SELECT 
              DATE_TRUNC('week', t.data_completa) as semana,
              a.ticker,
              f.faixa_risco,
              AVG(f.preco_fechamento) as preco_medio
          FROM fato_infoacaodiario f
          JOIN dim_acao a ON f.fk_dim_acao_acao_key = a.acao_key
          JOIN dim_tempo t ON f.fk_dim_tempo_data_key = t.data_key
          WHERE t.ano BETWEEN $1 AND $2
          GROUP BY 1, 2, 3
      ),
      RetornosClassificados AS (
          SELECT 
              ticker,
              semana,
              faixa_risco,
              (preco_medio / NULLIF(LAG(preco_medio) OVER (PARTITION BY ticker ORDER BY semana), 0) - 1) as retorno_discreto
          FROM PrecosSemanais
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
      WITH PrecosFaixa AS (
          SELECT 
              DATE_TRUNC('week', t.data_completa) as semana,
              f.faixa_risco,
              AVG(f.preco_fechamento) as preco_medio
          FROM fato_infoacaodiario f
          JOIN dim_acao a ON f.fk_dim_acao_acao_key = a.acao_key
          JOIN dim_tempo t ON f.fk_dim_tempo_data_key = t.data_key
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

  async obterEvolucaoRisco(ano_ini, ano_fim, listaRiscos) {
    const query = `
      WITH PrecosSemanais AS (
          SELECT 
              DATE_TRUNC('week', t.data_completa) as semana,
              f.faixa_risco,
              a.ticker,
              AVG(f.preco_fechamento) as preco_medio
          FROM fato_infoacaodiario f
          JOIN dim_acao a ON f.fk_dim_acao_acao_key = a.acao_key
          JOIN dim_tempo t ON f.fk_dim_tempo_data_key = t.data_key
          WHERE t.ano BETWEEN $1 AND $2
            AND a.ticker NOT IN ('SOS', 'AHT')
          GROUP BY 1, 2, 3
      )
      SELECT 
          semana as data,
          faixa_risco,
          SUM(preco_medio) / COUNT(DISTINCT ticker) as valor
      FROM PrecosSemanais
      WHERE faixa_risco IS NOT NULL
        AND (CARDINALITY($3::text[]) = 0 OR faixa_risco = ANY($3::text[]))
      GROUP BY semana, faixa_risco
      ORDER BY semana ASC;
    `;
    const result = await pool.query(query, [ano_ini, ano_fim, listaRiscos]);
    return result.rows;
  }

  async obterMapaMercado(setores, industrias, paises, riscos, anoIni, anoFim, useDiv = true, useMargem = true, useEv = true) {
    try {
      const escape = (s) => String(s).replace(/'/g, "''");
      const filtroSetor = setores && setores.length > 0 ? `AND a.setor IN (${setores.map(s => `'${escape(s)}'`).join(',')})` : '';
      const filtroIndustria = industrias && industrias.length > 0 ? `AND a.industria IN (${industrias.map(s => `'${escape(s)}'`).join(',')})` : '';
      const filtroPais = paises && paises.length > 0 ? `AND a.pais IN (${paises.map(s => `'${escape(s)}'`).join(',')})` : '';
      const filtroRisco = riscos && riscos.length > 0 ? `AND faixa_risco IN (${riscos.map(s => `'${escape(s)}'`).join(',')})` : '';

      const wDiv = useDiv ? 1 : 0;
      const wMargem = useMargem ? 1 : 0;
      const wEv = useEv ? 1 : 0;

      const query = `
        WITH UltimaDataFundamento AS (
            SELECT MAX(t.data_completa) as max_data
            FROM fato_indicadores f JOIN dim_tempo t ON f.fk_dim_tempo_data_key = t.data_key
        ),
        RiscoModa AS (
            -- Faixa de risco = moda (faixa mais frequente) considerando apenas
            -- janeiro, maio e setembro de cada ano dentro do período selecionado.
            SELECT DISTINCT ON (a.ticker)
                a.ticker, f.faixa_risco
            FROM fato_infoacaodiario f
            JOIN dim_acao a ON f.fk_dim_acao_acao_key = a.acao_key
            JOIN dim_tempo t ON f.fk_dim_tempo_data_key = t.data_key
            WHERE t.ano BETWEEN ${parseInt(anoIni)} AND ${parseInt(anoFim)}
              AND t.mes IN (1, 5, 9)
              AND f.faixa_risco IS NOT NULL
            GROUP BY a.ticker, f.faixa_risco
            ORDER BY a.ticker, COUNT(*) DESC, f.faixa_risco DESC
        ),
        UltimoRiscoGlobal AS (
            -- Fallback: faixa de risco mais recente da acao (qualquer data),
            -- usada quando nao ha registro no periodo/meses filtrados.
            SELECT DISTINCT ON (a.ticker)
                a.ticker, f.faixa_risco
            FROM fato_infoacaodiario f
            JOIN dim_acao a ON f.fk_dim_acao_acao_key = a.acao_key
            JOIN dim_tempo t ON f.fk_dim_tempo_data_key = t.data_key
            WHERE f.faixa_risco IS NOT NULL
            ORDER BY a.ticker, t.data_completa DESC
        ),
        RiscoHistorico AS (
            SELECT a.ticker, AVG(f.risco_base) as risco_medio
            FROM fato_infoacaodiario f
            JOIN dim_acao a ON f.fk_dim_acao_acao_key = a.acao_key
            JOIN dim_tempo t ON f.fk_dim_tempo_data_key = t.data_key
            WHERE t.ano BETWEEN ${parseInt(anoIni)} AND ${parseInt(anoFim)}
            GROUP BY a.ticker
        ),
        FundamentosAtuais AS (
            SELECT a.ticker, a.setor,
                MAX(CASE WHEN ti.nome_indicador = 'trailing_dividend_yield' THEN CAST(f.valor_indicador AS NUMERIC) ELSE 0 END) as div_yield,
                MAX(CASE WHEN ti.nome_indicador = 'ebitda_margin' THEN CAST(f.valor_indicador AS NUMERIC) ELSE 0 END) as margem_ebitda,
                MAX(CASE WHEN ti.nome_indicador = 'enterprise_to_ebitda' THEN CAST(f.valor_indicador AS NUMERIC) ELSE 0 END) as ev_ebitda
            FROM fato_indicadores f
            JOIN dim_acao a ON f.fk_dim_acao_acao_key = a.acao_key
            JOIN dim_tipoindicador ti ON f.fk_dim_tipoindicador_indicador_key = ti.indicador_key
            JOIN dim_tempo t ON f.fk_dim_tempo_data_key = t.data_key
            JOIN UltimaDataFundamento u ON t.data_completa = u.max_data
            WHERE ti.nome_indicador IN ('trailing_dividend_yield', 'ebitda_margin', 'enterprise_to_ebitda')
            ${filtroSetor}
            ${filtroIndustria}
            ${filtroPais}
            GROUP BY a.ticker, a.setor
        ),
        EstatisticasMercadoHoje AS (
            SELECT AVG(div_yield) as avg_yield, STDDEV(div_yield) as std_yield,
                   AVG(margem_ebitda) as avg_margem, STDDEV(margem_ebitda) as std_margem,
                   AVG(ev_ebitda) as avg_ev, STDDEV(ev_ebitda) as std_ev
            FROM FundamentosAtuais
        ),
        ZScoreQualidade AS (
            SELECT fa.ticker, fa.setor, COALESCE(rm.faixa_risco, urg.faixa_risco) AS faixa_risco,
                   (
                    -- Amortecedores e Amplificadores Opcionais
                    -- Dividend Yield tratado como fator negativo (penaliza o score)
                    - COALESCE(${wDiv} * ((fa.div_yield - em.avg_yield) / NULLIF(em.std_yield, 0)), 0) +
                    COALESCE(${wMargem} * ((fa.margem_ebitda - em.avg_margem) / NULLIF(em.std_margem, 0)), 0) -
                    COALESCE(${wEv} * ((fa.ev_ebitda - em.avg_ev) / NULLIF(em.std_ev, 0)), 0) - 
                    -- Risco Base Fixo e Obrigatório
                    COALESCE(rh.risco_medio, 0)
                   ) / (${wDiv} + ${wMargem} + ${wEv} + 1)::NUMERIC as score_qualidade
            FROM FundamentosAtuais fa 
            CROSS JOIN EstatisticasMercadoHoje em
            LEFT JOIN RiscoHistorico rh ON fa.ticker = rh.ticker
            LEFT JOIN RiscoModa rm ON fa.ticker = rm.ticker
            LEFT JOIN UltimoRiscoGlobal urg ON fa.ticker = urg.ticker
        ),
        PesosBrutos AS (
            SELECT ticker, setor, faixa_risco, COALESCE(score_qualidade, 0) as score_qualidade, 
                   EXP(LEAST(GREATEST(COALESCE(score_qualidade, 0), -5.0), 5.0)) as peso_exponencial
            FROM ZScoreQualidade
        ),
        RankingSetorial AS (
            SELECT setor, ticker, faixa_risco, ROUND(CAST(score_qualidade AS NUMERIC), 4) as score,
                   ROUND(CAST((peso_exponencial / SUM(peso_exponencial) OVER(PARTITION BY setor)) * 100 AS NUMERIC), 2) as tamanho,
                   ROW_NUMBER() OVER(PARTITION BY setor ORDER BY peso_exponencial DESC) as rank
            FROM PesosBrutos
            WHERE peso_exponencial > 0 AND faixa_risco IS NOT NULL ${filtroRisco}
        )
        SELECT setor, ticker, faixa_risco, score, tamanho
        FROM RankingSetorial
        WHERE rank <= 200;
      `;
      
      const res = await pool.query(query);
      const rows = res.rows;
      const tree = [];
      const setoresUnicos = [...new Set(rows.map(r => r.setor))];
      
      setoresUnicos.forEach(setorNome => {
        const children = rows.filter(r => r.setor === setorNome).map(r => ({
          name: r.ticker,
          size: parseFloat(r.tamanho) || 1, 
          score: parseFloat(r.score) || 0,
          risco: r.faixa_risco || 'N/D'
        }));
        if (children.length > 0) tree.push({ name: setorNome, children });
      });
      
      return tree;

    } catch (err) {
      throw err;
    }
  }

  async obterListagemAcoes(listaPaises, listaSetores, listaIndustrias, listaRiscos, alphaEv = 5, alphaDy = 5, alphaEb = 5) {
    const query = `
      WITH UltimaDataFundamento AS (
          SELECT MAX(t.data_completa) AS max_data
          FROM fato_indicadores f
          JOIN dim_tempo t ON f.fk_dim_tempo_data_key = t.data_key
      ),
      Stats AS (
          SELECT
              AVG(CASE WHEN ti.nome_indicador = 'ebitda_margin'         THEN CAST(f.valor_indicador AS NUMERIC) END) AS avg_eb,
              STDDEV(CASE WHEN ti.nome_indicador = 'ebitda_margin'      THEN CAST(f.valor_indicador AS NUMERIC) END) AS std_eb,
              AVG(CASE WHEN ti.nome_indicador = 'enterprise_to_ebitda'  THEN CAST(f.valor_indicador AS NUMERIC) END) AS avg_ev,
              STDDEV(CASE WHEN ti.nome_indicador = 'enterprise_to_ebitda' THEN CAST(f.valor_indicador AS NUMERIC) END) AS std_ev,
              AVG(CASE WHEN ti.nome_indicador = 'trailing_dividend_yield' THEN CAST(f.valor_indicador AS NUMERIC) END) AS avg_dy,
              STDDEV(CASE WHEN ti.nome_indicador = 'trailing_dividend_yield' THEN CAST(f.valor_indicador AS NUMERIC) END) AS std_dy
          FROM fato_indicadores f
          JOIN dim_tipoindicador ti ON f.fk_dim_tipoindicador_indicador_key = ti.indicador_key
          JOIN dim_tempo t ON f.fk_dim_tempo_data_key = t.data_key
          JOIN UltimaDataFundamento u ON t.data_completa = u.max_data
      ),
      Fundamentos AS (
          SELECT
              a.ticker,
              MAX(CASE WHEN ti.nome_indicador = 'ebitda_margin'          THEN CAST(f.valor_indicador AS NUMERIC) END) AS eb,
              MAX(CASE WHEN ti.nome_indicador = 'enterprise_to_ebitda'   THEN CAST(f.valor_indicador AS NUMERIC) END) AS ev,
              MAX(CASE WHEN ti.nome_indicador = 'trailing_dividend_yield' THEN CAST(f.valor_indicador AS NUMERIC) END) AS dy
          FROM fato_indicadores f
          JOIN dim_acao a ON f.fk_dim_acao_acao_key = a.acao_key
          JOIN dim_tipoindicador ti ON f.fk_dim_tipoindicador_indicador_key = ti.indicador_key
          JOIN dim_tempo t ON f.fk_dim_tempo_data_key = t.data_key
          JOIN UltimaDataFundamento u ON t.data_completa = u.max_data
          GROUP BY a.ticker
      ),
      UltimoSnapshot AS (
          -- Sempre o registro mais recente disponível por ação, sem filtro de ano.
          -- A aba "Listagem" reflete o snapshot atual do mercado.
          SELECT DISTINCT ON (a.ticker)
              a.ticker, a.nome, a.pais, a.setor, a.industria,
              f.faixa_risco, f.rsi_14, f.risk_score_normalizado AS risco_normalizado
          FROM fato_infoacaodiario f
          JOIN dim_acao a ON f.fk_dim_acao_acao_key = a.acao_key
          JOIN dim_tempo t ON f.fk_dim_tempo_data_key = t.data_key
          WHERE (CARDINALITY($1::text[]) = 0 OR a.pais       = ANY($1::text[]))
            AND (CARDINALITY($2::text[]) = 0 OR a.setor      = ANY($2::text[]))
            AND (CARDINALITY($3::text[]) = 0 OR a.industria  = ANY($3::text[]))
            AND (CARDINALITY($4::text[]) = 0 OR f.faixa_risco = ANY($4::text[]))
          ORDER BY a.ticker, t.data_completa DESC
      )
      SELECT
          u.ticker, u.nome, u.pais, u.setor, u.industria,
          u.faixa_risco, u.rsi_14, u.risco_normalizado,
          f.dy AS dividend_yield,
          GREATEST(0::numeric, LEAST(100::numeric,
              u.risco_normalizado::numeric
              + COALESCE($5::numeric * ((f.ev - s.avg_ev) / NULLIF(s.std_ev, 0)), 0)
              + COALESCE($6::numeric * ((f.dy - s.avg_dy) / NULLIF(s.std_dy, 0)), 0)
              - COALESCE($7::numeric * ((f.eb - s.avg_eb) / NULLIF(s.std_eb, 0)), 0)
          )) AS risco_modificado
      FROM UltimoSnapshot u
      LEFT JOIN Fundamentos f ON u.ticker = f.ticker
      CROSS JOIN Stats s
      ORDER BY u.ticker;
    `;
    const res = await pool.query(query, [
      listaPaises, listaSetores, listaIndustrias, listaRiscos,
      alphaEv, alphaDy, alphaEb
    ]);
    return res.rows;
  }

  async obterIndiceCustomizado(tickers, pesos, anoIni, anoFim) {
    // ÍNDICE PROGRESSIVO — rebalanceamento semanal.
    // Estratégia: em vez de normalizar cada ticker em 100 no seu próprio primeiro dia
    // (o que causava saltos quando um novo ticker entrava na série), calculamos o
    // retorno semanal ponderado da carteira usando apenas os tickers que possuem
    // retorno válido naquela semana (rebalanceamento entre disponíveis).
    // O índice acumula esses retornos via produto geométrico: I_t = 100 · ∏(1 + r_i).
    const query = `
      WITH PesosCarteira AS (
          SELECT ticker, peso
          FROM UNNEST($1::text[], $2::numeric[]) AS t(ticker, peso)
      ),
      PrecosSemanais AS (
          SELECT
              DATE_TRUNC('week', t.data_completa) as semana,
              a.ticker,
              AVG(f.preco_fechamento) as preco
          FROM fato_infoacaodiario f
          JOIN dim_acao a ON f.fk_dim_acao_acao_key = a.acao_key
          JOIN dim_tempo t ON f.fk_dim_tempo_data_key = t.data_key
          WHERE a.ticker = ANY($1::text[])
            AND t.ano BETWEEN $3 AND $4
          GROUP BY 1, 2
      ),
      Retornos AS (
          -- Retorno semanal por ticker; a primeira semana de cada ticker tem LAG NULL.
          SELECT
              p.semana, p.ticker,
              p.preco / NULLIF(LAG(p.preco) OVER (PARTITION BY p.ticker ORDER BY p.semana), 0) - 1 AS ret
          FROM PrecosSemanais p
      ),
      RetornoCarteira AS (
          -- Retorno agregado da carteira: média dos retornos ponderada pelos pesos
          -- dos tickers com retorno válido na semana (renormalizados via divisão pela
          -- soma dos pesos ativos). Assim tickers ausentes não distorcem o índice.
          SELECT r.semana,
                 SUM(pc.peso * r.ret) / NULLIF(SUM(pc.peso), 0) AS ret_semana
          FROM Retornos r
          JOIN PesosCarteira pc ON r.ticker = pc.ticker
          WHERE r.ret IS NOT NULL
          GROUP BY r.semana
      ),
      IndiceProgressivo AS (
          -- Semana inicial (primeira em que qualquer ticker tem preço) = 100.
          SELECT MIN(semana) AS data, 100::numeric AS valor_indice
          FROM PrecosSemanais
          UNION ALL
          -- Semanas subsequentes: acumulação geométrica dos retornos.
          -- EXP(SUM(LN(...)) OVER (ORDER BY ...)) == produto acumulado.
          SELECT semana AS data,
                 100 * EXP(SUM(LN(GREATEST(1 + ret_semana, 0.01))) OVER (ORDER BY semana)) AS valor_indice
          FROM RetornoCarteira
      )
      SELECT data, valor_indice
      FROM IndiceProgressivo
      ORDER BY data ASC;
    `;
    const res = await pool.query(query, [tickers, pesos, anoIni, anoFim]);
    return res.rows;
  }

}

module.exports = new QuantRepository();