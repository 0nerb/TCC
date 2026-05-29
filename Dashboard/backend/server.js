const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const port = 5001;

app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: 'postgresql://postgres:admin@localhost:3000/tcc_indices',
});

// Endpoint: Mapeamento Relacional para Filtro em Cascata
app.get('/api/filtros', async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT pais, setor, industria 
      FROM dim_acao 
      WHERE pais IS NOT NULL AND setor IS NOT NULL AND industria IS NOT NULL
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Endpoint: Evolução do Índice Sintético
app.get('/api/indice', async (req, res) => {
  const { setores, industrias, paises, ano_ini, ano_fim } = req.query;
  
  const listaSetores = setores ? setores.split(',').filter(Boolean) : [];
  const listaIndustrias = industrias ? industrias.split(',').filter(Boolean) : [];
  const listaPaises = paises ? paises.split(',').filter(Boolean) : [];

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

  try {
    const result = await pool.query(query, [listaSetores, ano_ini, ano_fim, listaIndustrias, listaPaises]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Endpoint: Volatilidade Histórica Anualizada
app.get('/api/volatilidade', async (req, res) => {
  const { setores, industrias, paises, ano_ini, ano_fim } = req.query;
  
  const listaSetores = setores ? setores.split(',').filter(Boolean) : [];
  const listaIndustrias = industrias ? industrias.split(',').filter(Boolean) : [];
  const listaPaises = paises ? paises.split(',').filter(Boolean) : [];

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

  try {
    const result = await pool.query(query, [listaSetores, ano_ini, ano_fim, listaIndustrias, listaPaises]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Endpoint: Sazonalidade Mensal
app.get('/api/sazonalidade', async (req, res) => {
  const { setores, industrias, paises, ano_ini, ano_fim } = req.query;
  
  const listaSetores = setores ? setores.split(',').filter(Boolean) : [];
  const listaIndustrias = industrias ? industrias.split(',').filter(Boolean) : [];
  const listaPaises = paises ? paises.split(',').filter(Boolean) : [];

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

  try {
    const result = await pool.query(query, [listaSetores, ano_ini, ano_fim, listaIndustrias, listaPaises]);
    const dadosConvertidos = result.rows.map(row => ({
      setor: row.setor,
      mes: parseInt(row.mes),
      media_retorno: parseFloat(row.media_retorno)
    }));
    res.json(dadosConvertidos);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Endpoint: Matriz de Correlação de Pearson
app.get('/api/correlacao', async (req, res) => {
  const { setores, industrias, paises, ano_ini, ano_fim } = req.query;
  
  const listaSetores = setores ? setores.split(',').filter(Boolean) : [];
  const listaIndustrias = industrias ? industrias.split(',').filter(Boolean) : [];
  const listaPaises = paises ? paises.split(',').filter(Boolean) : [];

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

  try {
    const result = await pool.query(query, [listaSetores, ano_ini, ano_fim, listaIndustrias, listaPaises]);
    const dadosConvertidos = result.rows.map(row => ({
      setor_a: row.setor_a,
      setor_b: row.setor_b,
      coeficiente: parseFloat(row.coeficiente)
    }));
    res.json(dadosConvertidos);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.listen(port, () => console.log(`🚀 Server na porta ${port}`));