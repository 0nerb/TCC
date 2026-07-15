import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ReferenceLine, Cell
} from 'recharts';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import styles from '../App.module.css';

const CORES = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#facc15', '#a855f7'];

const CORES_RISCO = {
  '1 - Muito Baixo': '#10b981',
  '2 - Baixo': '#f59e0b',
  '3 - Medio': '#3b82f6',
  '4 - Alto': '#ec4899',
  '5 - Muito Alto': '#ef4444'
};

export default function PainelVisualizacao({
  activeTab, selSetores, selRiscos, anoIni, anoFim, estatisticas, maxPerda, setMaxPerda,
  dataIndice, dataVolatilidade, dataSazonalidade, dataCorrelacao,
  dataAnomalia, dataEstresse, dataExposicao, dataEvolucaoRisco, dataSp500,
  dataMapa, useDiv, setUseDiv, useMargem, setUseMargem, useEv, setUseEv,
  dataCustomIndex, buildCustomIndex, loadingCustom, customError,
  dataListagem, alphaEv, setAlphaEv, alphaDy, setAlphaDy, alphaEb, setAlphaEb
}) {
  const customChartRef = useRef(null);
  const [sortKey, setSortKey] = useState('ticker');
  const [sortDir, setSortDir] = useState('asc');

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sortedListagem = useMemo(() => {
    if (!Array.isArray(dataListagem) || dataListagem.length === 0) return [];
    const compare = (a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      const numA = typeof va === 'number' ? va : parseFloat(va);
      const numB = typeof vb === 'number' ? vb : parseFloat(vb);
      const ambosNum = !isNaN(numA) && !isNaN(numB);
      let r;
      if (ambosNum) r = numA - numB;
      else r = String(va ?? '').localeCompare(String(vb ?? ''));
      return sortDir === 'asc' ? r : -r;
    };
    return [...dataListagem].sort(compare);
  }, [dataListagem, sortKey, sortDir]);

  const setaSort = (key) => sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '';
  const descStyle = { fontSize: '1.05rem', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: '1.5', maxWidth: '1100px' };

  // Ordenação da tabela do Mapa de Mercado
  const [sortMapaKey, setSortMapaKey] = useState(null);
  const [sortMapaDir, setSortMapaDir] = useState('asc');

  const handleSortMapa = (key) => {
    if (sortMapaKey === key) {
      setSortMapaDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortMapaKey(key);
      setSortMapaDir('asc');
    }
  };

  const setaSortMapa = (key) => sortMapaKey === key ? (sortMapaDir === 'asc' ? ' ▲' : ' ▼') : '';

  const sortedMapaFlat = useMemo(() => {
    if (!dataMapa || dataMapa.length === 0) return [];
    const flat = dataMapa.flatMap(setor =>
      (setor.children || []).map(ativo => ({
        setor: setor.name,
        ticker: ativo.name,
        risco: ativo.risco,
        score: ativo.score,
        size: ativo.size,
        _raw: ativo
      }))
    );
    if (!sortMapaKey) {
      return flat.sort((a, b) => a.setor.localeCompare(b.setor) || b.size - a.size);
    }
    return flat.sort((a, b) => {
      const va = a[sortMapaKey];
      const vb = b[sortMapaKey];
      const numA = typeof va === 'number' ? va : parseFloat(va);
      const numB = typeof vb === 'number' ? vb : parseFloat(vb);
      const ambosNum = !isNaN(numA) && !isNaN(numB);
      const r = ambosNum ? numA - numB : String(va ?? '').localeCompare(String(vb ?? ''));
      return sortMapaDir === 'asc' ? r : -r;
    });
  }, [dataMapa, sortMapaKey, sortMapaDir]);

  // Controle de Caixa de Seleção do Índice Customizado
  const [selectedTickers, setSelectedTickers] = useState([]);

  const toggleTicker = (ativo) => {
    setSelectedTickers(prev => {
      const exists = prev.find(p => p.name === ativo.name);
      if (exists) return prev.filter(p => p.name !== ativo.name);
      return [...prev, ativo];
    });
  };

  const totalSize = selectedTickers.reduce((acc, curr) => acc + curr.size, 0);
  const selectedWithWeights = selectedTickers.map(t => ({
    ticker: t.name,
    newWeight: totalSize > 0 ? (t.size / totalSize) * 100 : 0
  }));

  const corPorFaixaRisco = (faixa, fallbackIndex = 0) => {
    if (faixa === 'S&P 500') return '#facc15';
    return CORES_RISCO[faixa] || CORES[fallbackIndex % CORES.length];
  };

  const AnomaliaTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    const idx = mergedAnomalia.findIndex(d => d.faixa_risco === label);
    const cor = corPorFaixaRisco(label, idx);
    const valor = Number(payload[0].value).toFixed(2);
    return (
      <div style={{ background: '#000', border: `1px solid ${cor}`, borderRadius: 6, padding: '10px 14px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
        <div style={{ color: '#fff', fontWeight: 'bold', marginBottom: 6, fontSize: '0.95rem' }}>{label}</div>
        <div style={{ color: '#a1a1aa', fontSize: '0.9rem' }}>
          Retorno: <span style={{ color: cor, fontWeight: 'bold' }}>{valor}%</span>
        </div>
      </div>
    );
  };

  const ExposicaoTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    const valorNum = Number(payload[0].value);
    const cor = valorNum > 0 ? '#ef4444' : '#3b82f6';
    const valor = valorNum.toFixed(2);
    return (
      <div style={{ background: '#000', border: `1px solid ${cor}`, borderRadius: 6, padding: '10px 14px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
        <div style={{ color: '#fff', fontWeight: 'bold', marginBottom: 6, fontSize: '0.95rem' }}>{label}</div>
        <div style={{ color: '#a1a1aa', fontSize: '0.9rem' }}>
          Z-Score: <span style={{ color: cor, fontWeight: 'bold' }}>{valor}</span>
        </div>
      </div>
    );
  };

  const EstresseTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    const idx = mergedEstresse.findIndex(d => d.faixa_risco === label);
    const cor = corPorFaixaRisco(label, idx);
    const valor = Number(payload[0].value).toFixed(2);
    return (
      <div style={{ background: '#000', border: `1px solid ${cor}`, borderRadius: 6, padding: '10px 14px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
        <div style={{ color: '#fff', fontWeight: 'bold', marginBottom: 6, fontSize: '0.95rem' }}>{label}</div>
        <div style={{ color: '#a1a1aa', fontSize: '0.9rem' }}>
          Drawdown: <span style={{ color: cor, fontWeight: 'bold' }}>{valor}%</span>
        </div>
      </div>
    );
  };

  const VolatilidadeTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    const idx = dataVolatilidade.findIndex(d => d.setor === label);
    const cor = CORES[(idx >= 0 ? idx : 0) % CORES.length];
    const valor = Number(payload[0].value).toFixed(2);
    return (
      <div style={{ background: '#000', border: `1px solid ${cor}`, borderRadius: 6, padding: '10px 14px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
        <div style={{ color: '#fff', fontWeight: 'bold', marginBottom: 6, fontSize: '0.95rem' }}>{label}</div>
        <div style={{ color: '#a1a1aa', fontSize: '0.9rem' }}>
          Volatilidade: <span style={{ color: cor, fontWeight: 'bold' }}>{valor}%</span>
        </div>
      </div>
    );
  };

  useEffect(() => {
    if (!loadingCustom && dataCustomIndex && dataCustomIndex.length > 0 && customChartRef.current) {
      customChartRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [dataCustomIndex, loadingCustom]);

  const mergedChartData = useMemo(() => {
    if (!dataCustomIndex || dataCustomIndex.length === 0) return [];
    const spEvolucao = dataSp500?.evolucao || [];
    const trunc = (v) => v ? v.toString().substring(0, 10) : '';

    // Rebase do S&P 500 no primeiro ponto em que o índice customizado tem valor,
    // para que as duas séries partam de 100 na mesma data e o retorno cumulativo
    // seja comparável apples-to-apples no gráfico.
    const primeiraDataCustom = trunc(dataCustomIndex[0]?.data);
    let spBase = null;
    for (const sp of spEvolucao) {
      if (trunc(sp.data) >= primeiraDataCustom) { spBase = sp.SP500; break; }
    }
    if (spBase == null && spEvolucao.length > 0) spBase = spEvolucao[0].SP500;

    return dataCustomIndex.map(row => {
      const rowDateTrunc = trunc(row.data);
      const spMatch = spEvolucao.find(sp => trunc(sp.data) === rowDateTrunc);
      const spReb = spMatch && spBase ? (spMatch.SP500 / spBase) * 100 : null;
      return {
        data: row.data,
        Indice_Customizado: row.valor_indice,
        SP500: spReb
      };
    });
  }, [dataCustomIndex, dataSp500]);

  // Mescla S&P 500 no gráfico de Anomalia
  const mergedAnomalia = useMemo(() => {
    const base = [...(dataAnomalia || [])];
    if (dataSp500?.anomalia && dataSp500.anomalia.length > 0) {
      base.push({
        faixa_risco: 'S&P 500',
        retorno_anualizado_pct: dataSp500.anomalia[0].retorno_anualizado_pct
      });
    }
    return base;
  }, [dataAnomalia, dataSp500]);

  // Mescla S&P 500 no gráfico de Estresse (MDD)
  const mergedEstresse = useMemo(() => {
    const base = [...(dataEstresse || [])];
    if (dataSp500?.estresse && dataSp500.estresse.length > 0) {
      base.push({
        faixa_risco: 'S&P 500',
        maximum_drawdown_pct: dataSp500.estresse[0].maximum_drawdown_pct
      });
    }
    return base;
  }, [dataEstresse, dataSp500]);

  // Mescla S&P 500 na linha de Evolução por Risco
  const mergedEvolucaoRisco = useMemo(() => {
    if (!dataEvolucaoRisco || dataEvolucaoRisco.length === 0) return [];
    return dataEvolucaoRisco.map(row => {
      const rowDateTrunc = row.data ? row.data.toString().substring(0, 10) : '';
      const spMatch = dataSp500?.evolucao?.find(sp => {
        const spDateTrunc = sp.data ? sp.data.toString().substring(0, 10) : '';
        return spDateTrunc === rowDateTrunc;
      });
      return {
        ...row,
        SP500: spMatch ? spMatch.SP500 : null
      };
    });
  }, [dataEvolucaoRisco, dataSp500]);

  return (
    <div className={`${styles.container} ${(activeTab === 'listagem' || activeTab === 'capa') ? styles.containerWide : ''}`}>
      {activeTab === 'capa' && (() => {
        const miniCardStyle = {
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '16px',
          height: '260px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.15)'
        };
        const miniTitleStyle = { fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0, marginBottom: '4px' };
        const miniSubtitleStyle = { fontSize: '0.7rem', color: 'var(--text-faint)', marginBottom: '10px' };
        const miniChartArea = { flex: 1, minHeight: 0 };
        const setoresCapa = selSetores && selSetores.length > 0 ? selSetores : ['Energy', 'Technology', 'Healthcare'];
        const riscosCapa = ['1 - Muito Baixo', '2 - Baixo', '3 - Medio', '4 - Alto', '5 - Muito Alto'];

        return (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '20px', gap: '16px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-primary)' }}>Ambiente Analítico — Visão Geral</h2>
                <p style={{ margin: '6px 0 0 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Painel resumo com miniaturas de todos os módulos analíticos da plataforma.</p>
              </div>
              <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)', fontWeight: 500, whiteSpace: 'nowrap', padding: '4px 10px', border: '1px solid var(--border)', borderRadius: '6px', background: 'var(--bg-inset)' }}>
                {anoIni} – {anoFim}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>

              {/* 1. Performance do Índice Sintético */}
              <div style={miniCardStyle}>
                <h3 style={miniTitleStyle}>Performance do Índice Sintético</h3>
                <p style={miniSubtitleStyle}>Retorno cumulativo por setor (base 100)</p>
                <div style={miniChartArea}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dataIndice} margin={{ top: 5, right: 8, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="data" stroke="var(--axis)" fontSize={9} tick={false} axisLine={{ stroke: 'var(--axis)' }} />
                      <YAxis stroke="var(--axis)" fontSize={9} width={30} />
                      <ReferenceLine y={100} stroke="var(--axis)" strokeDasharray="3 3" />
                      {setoresCapa.map((s, i) => (
                        <Line key={s} type="monotone" dataKey={s} stroke={CORES[i % CORES.length]} strokeWidth={1.5} dot={false} />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 2. Volatilidade */}
              <div style={miniCardStyle}>
                <h3 style={miniTitleStyle}>Desvio Padrão Anualizado (σ)</h3>
                <p style={miniSubtitleStyle}>Volatilidade por setor</p>
                <div style={miniChartArea}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dataVolatilidade} margin={{ top: 5, right: 8, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="setor" tick={false} axisLine={{ stroke: 'var(--axis)' }} />
                      <YAxis stroke="var(--axis)" fontSize={9} width={30} unit="%" />
                      <Bar dataKey="volatilidade_anualizada">
                        {dataVolatilidade.map((e, i) => (<Cell key={i} fill={CORES[i % CORES.length]} />))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 3. Sazonalidade */}
              <div style={miniCardStyle}>
                <h3 style={miniTitleStyle}>Anomalias de Sazonalidade</h3>
                <p style={miniSubtitleStyle}>Retorno médio por mês</p>
                <div style={miniChartArea}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dataSazonalidade} margin={{ top: 5, right: 8, left: 0, bottom: 5 }} barCategoryGap="8%" barGap={1}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="mes" stroke="var(--axis)" fontSize={9} />
                      <YAxis stroke="var(--axis)" fontSize={9} width={30} unit="%" />
                      <ReferenceLine y={0} stroke="var(--axis)" />
                      {setoresCapa.map((s, i) => (<Bar key={s} dataKey={s} fill={CORES[i % CORES.length]} radius={[1, 1, 0, 0]} />))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 4. Correlação — grid colorido compacto */}
              <div style={miniCardStyle}>
                <h3 style={miniTitleStyle}>Matriz de Correlação Setorial</h3>
                <p style={miniSubtitleStyle}>Pearson (ρ) — verde=positivo, vermelho=negativo</p>
                <div style={{ ...miniChartArea, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {Object.keys(dataCorrelacao).length > 0 ? (
                    <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.6rem' }}>
                      <tbody>
                        {setoresCapa.map(sA => (
                          <tr key={sA}>
                            <td style={{ padding: '2px 4px', color: 'var(--text-muted)', textAlign: 'right', whiteSpace: 'nowrap', maxWidth: 70, overflow: 'hidden', textOverflow: 'ellipsis' }}>{sA.substring(0, 8)}</td>
                            {setoresCapa.map(sB => {
                              const coef = dataCorrelacao[sA]?.[sB] ?? 0;
                              const r = coef < 0 ? 239 : 24; const g = coef > 0 ? 185 : 68; const b = coef < 0 ? 68 : 27; const alpha = Math.abs(coef);
                              return <td key={sB} style={{ padding: '6px 4px', backgroundColor: `rgba(${r},${g},${b},${alpha})`, color: alpha > 0.5 ? '#fff' : 'var(--text-muted)', border: '1px solid var(--border)', textAlign: 'center', fontWeight: 'bold' }}>{Number(coef).toFixed(2)}</td>;
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (<span style={{ color: 'var(--text-faint)', fontSize: '0.8rem' }}>Sem dados</span>)}
                </div>
              </div>

              {/* 5. Anomalia de Risco */}
              <div style={miniCardStyle}>
                <h3 style={miniTitleStyle}>Retorno por Faixa de Risco</h3>
                <p style={miniSubtitleStyle}>Testa o CAPM vs paradoxo de baixa vol.</p>
                <div style={miniChartArea}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={mergedAnomalia} margin={{ top: 5, right: 8, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="faixa_risco" tick={false} axisLine={{ stroke: 'var(--axis)' }} />
                      <YAxis stroke="var(--axis)" fontSize={9} width={30} unit="%" />
                      <Bar dataKey="retorno_anualizado_pct">
                        {mergedAnomalia.map((e, i) => (
                          <Cell key={i} fill={e.faixa_risco === 'S&P 500' ? '#facc15' : CORES_RISCO[e.faixa_risco] || CORES[i % CORES.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 6. Teste de Estresse — MDD */}
              <div style={miniCardStyle}>
                <h3 style={miniTitleStyle}>Maximum Drawdown (MDD)</h3>
                <p style={miniSubtitleStyle}>Pior queda por faixa de risco</p>
                <div style={miniChartArea}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={mergedEstresse} margin={{ top: 5, right: 8, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="faixa_risco" tick={false} axisLine={{ stroke: 'var(--axis)' }} />
                      <YAxis stroke="var(--axis)" fontSize={9} width={30} unit="%" />
                      <ReferenceLine y={0} stroke="var(--axis)" />
                      <Bar dataKey="maximum_drawdown_pct" radius={[0,0,1,1]}>
                        {mergedEstresse.map((e, i) => (
                          <Cell key={i} fill={e.faixa_risco === 'S&P 500' ? '#facc15' : CORES_RISCO[e.faixa_risco] || CORES[i % CORES.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 7. Exposição Setorial */}
              <div style={miniCardStyle}>
                <h3 style={miniTitleStyle}>Perfil de Exposição Sistêmica</h3>
                <p style={miniSubtitleStyle}>Z-score de risco por setor</p>
                <div style={miniChartArea}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dataExposicao} layout="vertical" margin={{ top: 5, right: 8, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                      <XAxis type="number" stroke="var(--axis)" fontSize={9} />
                      <YAxis dataKey="setor" type="category" tick={false} width={4} axisLine={{ stroke: 'var(--axis)' }} />
                      <ReferenceLine x={0} stroke="var(--text-primary)" />
                      <Bar dataKey="z_score_medio_setor">
                        {dataExposicao.map((e, i) => (<Cell key={i} fill={e.z_score_medio_setor > 0 ? '#ef4444' : '#3b82f6'} />))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 8. Evolução por Risco */}
              <div style={miniCardStyle}>
                <h3 style={miniTitleStyle}>Evolução de Portfólio por Risco</h3>
                <p style={miniSubtitleStyle}>Índice base 100 vs S&P 500</p>
                <div style={miniChartArea}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={mergedEvolucaoRisco} margin={{ top: 5, right: 8, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="data" tick={false} axisLine={{ stroke: 'var(--axis)' }} />
                      <YAxis stroke="var(--axis)" fontSize={9} width={30} />
                      <ReferenceLine y={100} stroke="var(--axis)" strokeDasharray="3 3" />
                      {riscosCapa.map((r) => (
                        <Line connectNulls key={r} type="monotone" dataKey={r} stroke={CORES_RISCO[r]} strokeWidth={1.2} dot={false} />
                      ))}
                      <Line connectNulls type="monotone" dataKey="SP500" stroke="#facc15" strokeWidth={1.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 9. Mapa de Mercado — treemap simplificado como barras */}
              <div style={miniCardStyle}>
                <h3 style={miniTitleStyle}>Mapa de Mercado (Smart Beta)</h3>
                <p style={miniSubtitleStyle}>Alocação por qualidade — top 10</p>
                <div style={{ ...miniChartArea, overflow: 'hidden' }}>
                  {dataMapa && dataMapa.length > 0 ? (() => {
                    const flat = dataMapa.flatMap(s => (s.children || []).map(c => ({ ticker: c.name, setor: s.name, size: c.size, risco: c.risco })))
                      .sort((a, b) => b.size - a.size).slice(0, 10);
                    const maxSize = Math.max(...flat.map(x => x.size), 1);
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {flat.map((x, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem' }}>
                            <span style={{ width: 44, color: 'var(--text-primary)', fontWeight: 'bold' }}>{x.ticker}</span>
                            <div style={{ flex: 1, height: 10, background: 'var(--bg-inset)', borderRadius: 2, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${(x.size / maxSize) * 100}%`, background: CORES_RISCO[x.risco] || '#3b82f6' }}></div>
                            </div>
                            <span style={{ width: 42, textAlign: 'right', color: 'var(--text-muted)' }}>{x.size.toFixed(1)}%</span>
                          </div>
                        ))}
                      </div>
                    );
                  })() : <span style={{ color: 'var(--text-faint)', fontSize: '0.8rem' }}>Sem dados</span>}
                </div>
              </div>

              {/* 10. Listagem de Ações — miniatura tabular */}
              <div style={miniCardStyle}>
                <h3 style={miniTitleStyle}>Listagem de Ações</h3>
                <p style={miniSubtitleStyle}>Snapshot atual — Risco Modificado por ativo</p>
                <div style={{ ...miniChartArea, overflow: 'hidden' }}>
                  {Array.isArray(dataListagem) && dataListagem.length > 0 ? (() => {
                    const top = [...dataListagem]
                      .filter(a => a.risco_modificado != null)
                      .sort((a, b) => Number(a.risco_modificado) - Number(b.risco_modificado))
                      .slice(0, 8);
                    const corRisco = (v) => v == null ? 'var(--text-muted)' : v >= 70 ? '#ef4444' : v >= 40 ? '#f59e0b' : '#10b981';
                    return (
                      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.68rem' }}>
                        <thead>
                          <tr style={{ color: 'var(--text-faint)', borderBottom: '1px solid var(--border)' }}>
                            <th style={{ textAlign: 'left', padding: '3px 4px' }}>Ticker</th>
                            <th style={{ textAlign: 'left', padding: '3px 4px' }}>Setor</th>
                            <th style={{ textAlign: 'center', padding: '3px 4px' }}>Risco</th>
                            <th style={{ textAlign: 'right', padding: '3px 4px' }}>R.Mod</th>
                          </tr>
                        </thead>
                        <tbody>
                          {top.map((a, i) => {
                            const rm = Number(a.risco_modificado);
                            return (
                              <tr key={i} style={{ backgroundColor: i % 2 === 0 ? 'transparent' : 'rgba(127,127,127,0.05)' }}>
                                <td style={{ padding: '3px 4px', color: 'var(--text-primary)', fontWeight: 'bold' }}>{a.ticker}</td>
                                <td style={{ padding: '3px 4px', color: 'var(--text-muted)', maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.setor}</td>
                                <td style={{ padding: '3px 4px', textAlign: 'center' }}>
                                  <span style={{
                                    backgroundColor: a.faixa_risco?.startsWith('1') || a.faixa_risco?.startsWith('2') ? 'rgba(16,185,129,0.15)' :
                                                     a.faixa_risco?.startsWith('4') || a.faixa_risco?.startsWith('5') ? 'rgba(239,68,68,0.15)' : 'rgba(59,130,246,0.15)',
                                    color: a.faixa_risco?.startsWith('1') || a.faixa_risco?.startsWith('2') ? '#10b981' :
                                           a.faixa_risco?.startsWith('4') || a.faixa_risco?.startsWith('5') ? '#ef4444' : '#3b82f6',
                                    padding: '1px 5px', borderRadius: '3px', fontSize: '0.6rem', fontWeight: 'bold', whiteSpace: 'nowrap'
                                  }}>{a.faixa_risco?.split(' - ')[0] || '—'}</span>
                                </td>
                                <td style={{ padding: '3px 4px', textAlign: 'right', color: corRisco(rm), fontWeight: 'bold' }}>{rm.toFixed(1)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    );
                  })() : <span style={{ color: 'var(--text-faint)', fontSize: '0.8rem' }}>Sem dados</span>}
                </div>
              </div>

            </div>
          </>
        );
      })()}

      {activeTab === 'setor' && (
        <div style={{ background: '#f1f3f4', padding: '24px', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <h3 className={styles.chartTitle} style={{ marginBottom: '5px' }}>Performance do Índice Sintético</h3>
          <p style={descStyle}>Retorno cumulativo de cada setor — todos partem da base 100; pontos vermelhos marcam quedas acima do limite selecionado.</p>

          <div className={styles.yieldPanel}>
            {selSetores.map((s, i) => (
              <div key={s} className={styles.yieldCard} style={{ borderLeftColor: CORES[i % CORES.length] }}>
                <span className={styles.cardLabel}>{s.toUpperCase()}</span>
                <div className={`${styles.yieldValue} ${estatisticas[s]?.rendimento >= 0 ? styles.positive : styles.negative}`}>{estatisticas[s]?.rendimento}%</div>
                <div className={styles.violationBadge}><AlertTriangle size={12} /> <span>{estatisticas[s]?.quedasCriticas} quedas &gt; {maxPerda}%</span></div>
              </div>
            ))}
          </div>

          <div className={styles.riskPanel}>
            <ShieldAlert color="#ef4444" size={24} /> <span>Sensibilidade: <b style={{ color: '#ef4444' }}>{maxPerda}%</b></span>
            <input type="range" min="0.5" max="25" step="0.5" value={maxPerda} onChange={e => setMaxPerda(parseFloat(e.target.value))} className={styles.slider} />
          </div>

          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height={450}>
              <LineChart data={dataIndice} margin={{ top: 20, right: 30, left: 40, bottom: 50 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="data"
                  stroke="var(--axis)"
                  fontSize={13}
                  tickMargin={15}
                  minTickGap={40}
                  label={{ value: 'Período Cronológico (Semanas)', position: 'insideBottom', offset: -20, fill: 'var(--text-muted)', fontSize: 14 }}
                />
                <YAxis
                  stroke="var(--axis)"
                  domain={['auto', 'auto']}
                  width={80}
                  label={{ value: 'Valor do Índice (Base 100)', angle: -90, position: 'insideLeft', offset: -20, fill: 'var(--text-muted)', fontSize: 14 }}
                />
                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border)' }} />
                <Legend verticalAlign="top" height={36} />
                <ReferenceLine y={100} stroke="var(--axis)" strokeDasharray="3 3" />
                {selSetores.map((s, i) => (
                  <Line key={s} type="monotone" dataKey={s} stroke={CORES[i % CORES.length]} strokeWidth={2} dot={(p) => p.payload[`${s}_violacao`] ? <circle cx={p.cx} cy={p.cy} r={4} fill="#ef4444" stroke="#fff" /> : null} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeTab === 'volatilidade' && (
        <div className={styles.chartContainer}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '5px', gap: '16px' }}>
            <h3 className={styles.chartTitle} style={{ margin: 0 }}>Desvio Padrão Anualizado</h3>
            <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)', fontWeight: 500, whiteSpace: 'nowrap', padding: '4px 10px', border: '1px solid var(--border)', borderRadius: '6px', background: 'var(--bg-inset)' }}>
              {anoIni} – {anoFim}
            </span>
          </div>
          <p style={descStyle}>Desvio padrão anualizado dos retornos — quanto mais alta a barra, maior a instabilidade do setor no período.</p>
          <ResponsiveContainer width="100%" height={480}>
            <BarChart data={dataVolatilidade} margin={{ top: 20, right: 30, left: 30, bottom: 90 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="setor"
                stroke="var(--axis)"
                interval={0}
                angle={-30}
                textAnchor="end"
                height={90}
                tick={{ fontSize: 12, fill: 'var(--text-muted)' }}
                tickMargin={8}
                label={{ value: 'Setores Econômicos', position: 'insideBottom', offset: -5, fill: 'var(--text-muted)', fontSize: 14 }}
              />
              <YAxis stroke="var(--axis)" unit="%" label={{ value: 'Volatilidade (%)', angle: -90, position: 'insideLeft', offset: -15, fill: 'var(--text-muted)', fontSize: 14 }} />
              <Tooltip cursor={{ fill: 'var(--border)', opacity: 0.4 }} content={<VolatilidadeTooltip />} />
              <Bar dataKey="volatilidade_anualizada">{dataVolatilidade.map((e, i) => (<Cell key={i} fill={CORES[i % CORES.length]} />))}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {activeTab === 'sazonalidade' && (
        <div className={styles.chartContainer}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '5px', gap: '16px' }}>
            <h3 className={styles.chartTitle} style={{ margin: 0 }}>Sazonalidade</h3>
            <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)', fontWeight: 500, whiteSpace: 'nowrap', padding: '4px 10px', border: '1px solid var(--border)', borderRadius: '6px', background: 'var(--bg-inset)' }}>
              {anoIni} – {anoFim}
            </span>
          </div>
          <p style={descStyle}>Retorno médio de cada mês do ano — revela padrões que se repetem independentemente do ano específico.</p>
          {(() => {
            const n = Math.max(1, selSetores.length);
            const chartHeight = n >= 8 ? 520 : n >= 5 ? 460 : 400;
            const legendHeight = n >= 8 ? 60 : n >= 5 ? 48 : 36;
            const catGap = n >= 8 ? '4%' : n >= 5 ? '8%' : '12%';
            const barGap = n >= 8 ? 1 : n >= 5 ? 2 : 4;
            const radius = n >= 8 ? [1, 1, 0, 0] : n >= 5 ? [2, 2, 0, 0] : [4, 4, 0, 0];
            return (
              <ResponsiveContainer width="100%" height={chartHeight} minHeight={chartHeight}>
                <BarChart data={dataSazonalidade} margin={{ top: 20, right: 30, left: 30, bottom: 50 }} barCategoryGap={catGap} barGap={barGap}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="mes" stroke="var(--axis)" fontSize={13} label={{ value: 'Meses', position: 'insideBottom', offset: -20, fill: 'var(--text-muted)', fontSize: 14 }} />
                  <YAxis stroke="var(--axis)" unit="%" label={{ value: 'Retorno Fatorado (%)', angle: -90, position: 'insideLeft', offset: -15, fill: 'var(--text-muted)', fontSize: 14 }} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border)' }} formatter={(v) => [`${Number(v).toFixed(2)}%`, 'Média de Retorno']} />
                  <Legend verticalAlign="top" height={legendHeight} wrapperStyle={{ paddingBottom: 8 }} />
                  <ReferenceLine y={0} stroke="var(--axis)" />
                  {selSetores.map((s, i) => (<Bar key={s} dataKey={s} name={s} fill={CORES[i % CORES.length]} radius={radius} />))}
                </BarChart>
              </ResponsiveContainer>
            );
          })()}
        </div>
      )}

      {activeTab === 'correlacao' && (
        <div className={styles.chartContainer} style={{ height: 'auto', minHeight: '500px' }}>
          <h3 className={styles.chartTitle} style={{ marginBottom: '5px' }}>Matriz de Correlação Setorial</h3>
          <p style={descStyle}>Coeficiente de Pearson (ρ) entre setores — verde: movem-se juntos; vermelho: movem-se em direções opostas.</p>
          {Object.keys(dataCorrelacao).length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: 'var(--axis)' }}>Aguardando processamento estatístico...</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%', textAlign: 'center', fontSize: '0.92rem' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '10px', borderBottom: '1px solid var(--border)' }}></th>
                    {selSetores.map(s => (<th key={s} style={{ padding: '10px', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontWeight: 'normal' }}>{s}</th>))}
                  </tr>
                </thead>
                <tbody>
                  {selSetores.map(setorA => (
                    <tr key={setorA}>
                      <td style={{ padding: '10px', borderRight: '1px solid var(--border)', color: 'var(--text-muted)', textAlign: 'right' }}>{setorA}</td>
                      {selSetores.map(setorB => {
                        const coef = dataCorrelacao[setorA]?.[setorB] ?? 0;
                        const r = coef < 0 ? 239 : 24; const g = coef > 0 ? 185 : 68; const b = coef < 0 ? 68 : 27; const alpha = Math.abs(coef);
                        return (
                          <td key={`${setorA}-${setorB}`} style={{ padding: '15px', backgroundColor: `rgba(${r}, ${g}, ${b}, ${alpha})`, color: alpha > 0.5 ? '#fff' : 'var(--text-muted)', border: '1px solid var(--border)', fontWeight: 'bold' }}>
                            {Number(coef).toFixed(2)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'anomalia' && (
        <div className={styles.chartContainer}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '5px', gap: '16px' }}>
            <h3 className={styles.chartTitle} style={{ margin: 0 }}>Retorno por Faixa de Risco</h3>
            <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)', fontWeight: 500, whiteSpace: 'nowrap', padding: '4px 10px', border: '1px solid var(--border)', borderRadius: '6px', background: 'var(--bg-inset)' }}>
              {anoIni} – {anoFim}
            </span>
          </div>
          <p style={descStyle}>Retorno anualizado por faixa de risco vs. S&amp;P 500 — testa se mais risco realmente entregou mais retorno.</p>
          <ResponsiveContainer width="100%" height={450}>
            <BarChart data={mergedAnomalia} margin={{ top: 20, right: 30, left: 30, bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="faixa_risco" stroke="var(--axis)" label={{ value: 'Quintis de Classificação & Benchmark', position: 'insideBottom', offset: -20, fill: 'var(--text-muted)', fontSize: 14 }} />
              <YAxis stroke="var(--axis)" unit="%" label={{ value: 'Retorno (%)', angle: -90, position: 'insideLeft', offset: -15, fill: 'var(--text-muted)', fontSize: 14 }} />
              <Tooltip cursor={{ fill: 'var(--border)', opacity: 0.4 }} content={<AnomaliaTooltip />} />
              <Bar dataKey="retorno_anualizado_pct">
                {mergedAnomalia.map((e, i) => {
                  const cor = e.faixa_risco === 'S&P 500'
                    ? '#facc15'
                    : CORES_RISCO[e.faixa_risco] || CORES[i % CORES.length];
                  return <Cell key={i} fill={cor} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {activeTab === 'estresse' && (
        <div className={styles.chartContainer}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '5px', gap: '16px' }}>
            <h3 className={styles.chartTitle} style={{ margin: 0 }}>Maximum Drawdown (MDD)</h3>
            <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)', fontWeight: 500, whiteSpace: 'nowrap', padding: '4px 10px', border: '1px solid var(--border)', borderRadius: '6px', background: 'var(--bg-inset)' }}>
              {anoIni} – {anoFim}
            </span>
          </div>
          <p style={descStyle}>Maior queda acumulada (Maximum Drawdown) por faixa de risco — mede o pior tombo enfrentado no período.</p>
          <ResponsiveContainer width="100%" height={450}>
            <BarChart data={mergedEstresse} margin={{ top: 20, right: 30, left: 30, bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="faixa_risco" stroke="var(--axis)" label={{ value: 'Quintis de Classificação & Benchmark', position: 'insideBottom', offset: -20, fill: 'var(--text-muted)', fontSize: 14 }} />
              <YAxis stroke="var(--axis)" unit="%" label={{ value: 'Retração (%)', angle: -90, position: 'insideLeft', offset: -15, fill: 'var(--text-muted)', fontSize: 14 }} />
              <Tooltip cursor={{ fill: 'var(--border)', opacity: 0.4 }} content={<EstresseTooltip />} />
              <ReferenceLine y={0} stroke="var(--axis)" />
              <Bar dataKey="maximum_drawdown_pct" radius={[0, 0, 4, 4]}>
                {mergedEstresse.map((entry, index) => {
                  const cor = entry.faixa_risco === 'S&P 500'
                    ? '#facc15'
                    : CORES_RISCO[entry.faixa_risco] || CORES[index % CORES.length];
                  return <Cell key={`cell-${index}`} fill={cor} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {activeTab === 'exposicao' && (
        <div className={styles.chartContainer}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '5px', gap: '16px' }}>
            <h3 className={styles.chartTitle} style={{ margin: 0 }}>Risco por Setor</h3>
            <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)', fontWeight: 500, whiteSpace: 'nowrap', padding: '4px 10px', border: '1px solid var(--border)', borderRadius: '6px', background: 'var(--bg-inset)' }}>
              {anoIni} – {anoFim}
            </span>
          </div>
          <p style={descStyle}>Z-Score médio de risco por setor — vermelho: acima da média (mais arriscado); azul: abaixo (mais defensivo).</p>
          <ResponsiveContainer width="100%" height={450}>
            <BarChart data={dataExposicao} layout="vertical" margin={{ top: 20, right: 30, left: 60, bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" stroke="var(--axis)" label={{ value: 'Z-Score', position: 'insideBottom', offset: -20, fill: 'var(--text-muted)', fontSize: 14 }} />
              <YAxis dataKey="setor" type="category" stroke="var(--axis)" width={120} label={{ value: 'Setor', angle: -90, position: 'insideLeft', offset: -45, fill: 'var(--text-muted)', fontSize: 14 }} />
              <Tooltip cursor={{ fill: 'var(--border)', opacity: 0.4 }} content={<ExposicaoTooltip />} />
              <ReferenceLine x={0} stroke="var(--text-primary)" />
              <Bar dataKey="z_score_medio_setor">
                {dataExposicao.map((e, i) => (<Cell key={i} fill={e.z_score_medio_setor > 0 ? '#ef4444' : '#3b82f6'} />))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {activeTab === 'evolucaoRisco' && (
        <div className={styles.chartContainer}>
          <h3 className={styles.chartTitle} style={{ marginBottom: '5px' }}>Evolução Temporal de Portfólio por Risco</h3>
          <p style={descStyle}>Evolução de cada R$100 investidos por faixa de risco vs. S&amp;P 500 (linha amarela) — todos partem da base 100.</p>
          <ResponsiveContainer width="100%" height={500}>
            <LineChart data={mergedEvolucaoRisco} margin={{ top: 20, right: 30, left: 40, bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="data" stroke="var(--axis)" fontSize={13} tickMargin={15} minTickGap={50} />
              <YAxis stroke="var(--axis)" domain={['auto', 'auto']} width={80} />
              <Tooltip contentStyle={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border)' }} formatter={(v) => [Number(v).toFixed(2), 'Índice']} />
              <Legend verticalAlign="top" height={36} />
              <ReferenceLine y={100} stroke="var(--axis)" strokeDasharray="3 3" />
              {selRiscos.map((r) => (<Line connectNulls={true} key={r} type="monotone" dataKey={r} stroke={CORES_RISCO[r]} strokeWidth={2} dot={false} />))}
              <Line connectNulls={true} type="monotone" name="S&P 500 Benchmark" dataKey="SP500" stroke="#facc15" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {activeTab === 'mapa' && (
        <div className={styles.chartContainer} style={{ height: 'auto', minHeight: '500px' }}>
          <h3 className={styles.chartTitle} style={{ marginBottom: '5px' }}>Tabela de Alocação (Smart Beta)</h3>
          <p style={descStyle}>Ranqueia ativos por Score de Qualidade (Smart Beta) combinando fundamentos e risco — selecione para montar seu próprio índice.</p>

          <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setUseDiv(!useDiv)}
              style={{ padding: '8px 12px', borderRadius: '6px', fontSize: '0.92rem', fontWeight: 'bold', border: `1px solid ${useDiv ? '#ef4444' : 'var(--border)'}`, backgroundColor: useDiv ? 'rgba(239, 68, 68, 0.1)' : 'transparent', color: useDiv ? '#ef4444' : 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              Trailing Div. Yield {useDiv ? '(Ativo)' : '(Inativo)'}
            </button>
            <button
              onClick={() => setUseMargem(!useMargem)}
              style={{ padding: '8px 12px', borderRadius: '6px', fontSize: '0.92rem', fontWeight: 'bold', border: `1px solid ${useMargem ? '#10b981' : 'var(--border)'}`, backgroundColor: useMargem ? 'rgba(16, 185, 129, 0.1)' : 'transparent', color: useMargem ? '#10b981' : 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              EBITDA Margin {useMargem ? '(Ativo)' : '(Inativo)'}
            </button>
            <button
              onClick={() => setUseEv(!useEv)}
              style={{ padding: '8px 12px', borderRadius: '6px', fontSize: '0.92rem', fontWeight: 'bold', border: `1px solid ${useEv ? '#ef4444' : 'var(--border)'}`, backgroundColor: useEv ? 'rgba(239, 68, 68, 0.1)' : 'transparent', color: useEv ? '#ef4444' : 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              EV / EBITDA {useEv ? '(Ativo)' : '(Inativo)'}
            </button>
          </div>

          <div style={{ overflowX: 'auto', maxHeight: '400px', overflowY: 'auto', marginBottom: '20px' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', textAlign: 'left', fontSize: '0.92rem' }}>
              <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-inset)', zIndex: 1, boxShadow: '0 1px 0 var(--border)' }}>
                <tr>
                  <th style={{ padding: '12px 10px', color: 'var(--text-muted)', width: '40px', textAlign: 'center' }}>✔️</th>
                  <th onClick={() => handleSortMapa('setor')}  style={{ padding: '12px 10px', color: 'var(--text-muted)', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>Setor{setaSortMapa('setor')}</th>
                  <th onClick={() => handleSortMapa('ticker')} style={{ padding: '12px 10px', color: 'var(--text-muted)', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>Ticker{setaSortMapa('ticker')}</th>
                  <th onClick={() => handleSortMapa('risco')}  style={{ padding: '12px 10px', color: 'var(--text-muted)', textAlign: 'center', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>Faixa de Risco{setaSortMapa('risco')}</th>
                  <th onClick={() => handleSortMapa('score')}  style={{ padding: '12px 10px', color: 'var(--text-muted)', textAlign: 'right', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>Z-Score Qualidade{setaSortMapa('score')}</th>
                  <th onClick={() => handleSortMapa('size')}   style={{ padding: '12px 10px', color: 'var(--text-muted)', textAlign: 'right', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>Alocação (%){setaSortMapa('size')}</th>
                </tr>
              </thead>
              <tbody>
                {sortedMapaFlat.length > 0 ? (
                  sortedMapaFlat.map((row, index) => (
                    <tr key={`${row.setor}-${row.ticker}`} style={{ backgroundColor: index % 2 === 0 ? 'transparent' : 'rgba(127, 127, 127, 0.06)' }}>
                      <td style={{ padding: '10px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={selectedTickers.some(s => s.name === row.ticker)}
                          onChange={() => toggleTicker(row._raw)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ padding: '10px', borderBottom: '1px solid var(--border)', color: 'var(--text-primary)' }}>{row.setor}</td>
                      <td style={{ padding: '10px', borderBottom: '1px solid var(--border)', color: 'var(--text-primary)', fontWeight: 'bold' }}>{row.ticker}</td>
                      <td style={{ padding: '10px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
                        <span style={{
                           backgroundColor: row.risco?.startsWith('1') || row.risco?.startsWith('2') ? 'rgba(16, 185, 129, 0.1)' :
                                            row.risco?.startsWith('4') || row.risco?.startsWith('5') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                           color: row.risco?.startsWith('1') || row.risco?.startsWith('2') ? '#10b981' :
                                  row.risco?.startsWith('4') || row.risco?.startsWith('5') ? '#ef4444' : '#3b82f6',
                           padding: '4px 8px', borderRadius: '4px', fontSize: '0.82rem', fontWeight: 'bold', border: '1px solid currentColor'
                        }}>
                           {row.risco}
                        </span>
                      </td>
                      <td style={{ padding: '10px', borderBottom: '1px solid var(--border)', textAlign: 'right', color: row.score > 0 ? '#10b981' : '#ef4444' }}>
                        {row.score > 0 ? '+' : ''}{Number(row.score).toFixed(4)}
                      </td>
                      <td style={{ padding: '10px', borderBottom: '1px solid var(--border)', textAlign: 'right', color: '#3b82f6', fontWeight: 'bold' }}>
                        {Number(row.size).toFixed(2)}%
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" style={{ padding: '30px', textAlign: 'center', color: 'var(--axis)' }}>Nenhum dado fundamentalista encontrado para os filtros selecionados.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={{ padding: '20px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '8px' }}>
            <h4 style={{ color: 'var(--text-primary)', marginBottom: '10px' }}>Índice Customizado (Backtest 2010 - 2025)</h4>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '15px' }}>
              Ativos isolados: {selectedTickers.length}. O algoritmo padronizará o preço inicial das ações no marco temporal Base 100 e ponderará o retorno cumulativo pelos percentuais recém-calculados.
            </p>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={() => buildCustomIndex(selectedWithWeights)}
                disabled={selectedTickers.length === 0 || loadingCustom}
                style={{ padding: '10px 15px', backgroundColor: selectedTickers.length > 0 ? '#3b82f6' : 'var(--border)', color: 'var(--text-primary)', border: 'none', borderRadius: '6px', cursor: selectedTickers.length > 0 ? 'pointer' : 'not-allowed', fontWeight: 'bold' }}
              >
                {loadingCustom ? 'Aguarde, calculando vetores quantitativos...' : 'Processar Gráfico de Evolução contra S&P 500'}
              </button>
              <button
                onClick={() => setSelectedTickers([])}
                disabled={selectedTickers.length === 0 || loadingCustom}
                title="Remove todas as ações selecionadas"
                style={{ padding: '10px 15px', backgroundColor: 'transparent', color: selectedTickers.length > 0 ? '#ef4444' : 'var(--text-faint)', border: `1px solid ${selectedTickers.length > 0 ? '#ef4444' : 'var(--border)'}`, borderRadius: '6px', cursor: selectedTickers.length > 0 ? 'pointer' : 'not-allowed', fontWeight: 'bold' }}
              >
                Limpar seleção
              </button>
            </div>
            {customError && (
              <div style={{ marginTop: '12px', padding: '10px 14px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '6px', color: '#ef4444', fontSize: '0.88rem' }}>
                {customError}
              </div>
            )}
          </div>

          {mergedChartData.length > 0 && (
            <div ref={customChartRef} style={{ marginTop: '30px' }}>
               <h4 style={{ color: 'var(--text-primary)', marginBottom: '15px' }}>Performance Histórica (Retorno Cumulativo Base 100)</h4>
               <ResponsiveContainer width="100%" height={450}>
                  <LineChart data={mergedChartData} margin={{ top: 10, right: 30, left: 20, bottom: 30 }}>
                     <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                     <XAxis dataKey="data" stroke="var(--axis)" fontSize={13} tickMargin={15} minTickGap={50} />
                     <YAxis stroke="var(--axis)" domain={['auto', 'auto']} width={60} fontSize={13} />
                     <Tooltip contentStyle={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border)' }} formatter={(v) => [Number(v).toFixed(2), 'Índice']} />
                     <Legend verticalAlign="top" height={36} />
                     <Line type="monotone" name="S&P 500 Benchmark" dataKey="SP500" stroke="#facc15" strokeWidth={2} dot={false} />
                     <Line type="monotone" name="Portfólio Customizado" dataKey="Indice_Customizado" stroke="#3b82f6" strokeWidth={3} dot={false} />
                  </LineChart>
               </ResponsiveContainer>
            </div>
          )}

        </div>
      )}

      {activeTab === 'listagem' && (
        <div className={styles.chartContainer} style={{ height: 'auto', minHeight: '500px', padding: '1.5rem' }}>
          <h3 className={styles.chartTitle} style={{ marginBottom: '5px' }}>Listagem de Ações</h3>
          <p style={descStyle}>Snapshot atual das ações filtradas com <b>Risco Modificado</b> — clique nas colunas para ordenar. <span style={{ color: 'var(--text-faint)' }}>⚠ Filtro de ano não se aplica.</span></p>

          {(() => {
            const alphaLabelStyle = { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 500 };
            const alphaInputStyle = { width: '80px', padding: '8px 12px', background: 'var(--bg-inset)', border: '1px solid var(--border-strong)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: 'bold', textAlign: 'center' };
            return (
              <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '0.95rem', color: 'var(--text-faint)', fontWeight: 'bold' }}>PESOS (α) DA FÓRMULA</span>
                <label style={alphaLabelStyle}>
                  EV/EBITDA <input type="number" step="1" min="0" max="20" value={alphaEv} onChange={e => setAlphaEv(parseFloat(e.target.value) || 0)} style={alphaInputStyle} />
                </label>
                <label style={alphaLabelStyle}>
                  Dividend Yield <input type="number" step="1" min="0" max="20" value={alphaDy} onChange={e => setAlphaDy(parseFloat(e.target.value) || 0)} style={alphaInputStyle} />
                </label>
                <label style={alphaLabelStyle}>
                  EBITDA Margin <input type="number" step="1" min="0" max="20" value={alphaEb} onChange={e => setAlphaEb(parseFloat(e.target.value) || 0)} style={alphaInputStyle} />
                </label>
              </div>
            );
          })()}

          <div style={{ overflowX: 'auto', maxHeight: '70vh', overflowY: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', textAlign: 'left', fontSize: '0.88rem', tableLayout: 'auto' }}>
              <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-surface)', zIndex: 1, boxShadow: '0 1px 0 var(--border)' }}>
                <tr>
                  {[
                    { key: 'ticker',              label: 'Ticker' },
                    { key: 'nome',                label: 'Nome' },
                    { key: 'pais',                label: 'País' },
                    { key: 'setor',               label: 'Setor' },
                    { key: 'industria',           label: 'Indústria' },
                    { key: 'faixa_risco',         label: 'Risco' },
                    { key: 'rsi_14',              label: 'Último RSI', align: 'right' },
                    { key: 'dividend_yield',      label: 'Div. Yield', align: 'center' },
                    { key: 'risco_normalizado',   label: 'Risco Norm.', align: 'right' },
                    { key: 'risco_modificado',    label: 'Risco Mod.', align: 'right' }
                  ].map(col => (
                    <th key={col.key}
                        onClick={() => handleSort(col.key)}
                        style={{ padding: '10px 8px', color: 'var(--text-muted)', textAlign: col.align || 'left', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
                      {col.label}{setaSort(col.key)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedListagem.length === 0 ? (
                  <tr>
                    <td colSpan="10" style={{ padding: '30px', textAlign: 'center', color: 'var(--axis)' }}>
                      Nenhuma ação encontrada para os filtros selecionados.
                    </td>
                  </tr>
                ) : sortedListagem.map((a, i) => {
                  const rsi = a.rsi_14 != null ? Number(a.rsi_14) : null;
                  const rsiCor = rsi == null ? 'var(--text-muted)' : rsi >= 70 ? '#ef4444' : rsi <= 30 ? '#10b981' : 'var(--text-primary)';
                  const dy = a.dividend_yield != null ? Number(a.dividend_yield) : null;
                  const temDy = dy != null && dy > 0;
                  const rn = a.risco_normalizado != null ? Number(a.risco_normalizado) : null;
                  const rm = a.risco_modificado != null ? Number(a.risco_modificado) : null;
                  const corRisco = (v) => v == null ? 'var(--text-muted)' : v >= 70 ? '#ef4444' : v >= 40 ? '#f59e0b' : '#10b981';
                  return (
                    <tr key={a.ticker} style={{ backgroundColor: i % 2 === 0 ? 'transparent' : 'rgba(127, 127, 127, 0.06)' }}>
                      <td style={{ padding: '8px 8px', borderBottom: '1px solid var(--border)', color: 'var(--text-primary)', fontWeight: 'bold' }}>{a.ticker}</td>
                      <td style={{ padding: '8px 8px', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.nome}</td>
                      <td style={{ padding: '10px', borderBottom: '1px solid var(--border)', color: 'var(--text-primary)' }}>{a.pais}</td>
                      <td style={{ padding: '10px', borderBottom: '1px solid var(--border)', color: 'var(--text-primary)' }}>{a.setor}</td>
                      <td style={{ padding: '10px', borderBottom: '1px solid var(--border)', color: 'var(--text-primary)' }}>{a.industria}</td>
                      <td style={{ padding: '10px', borderBottom: '1px solid var(--border)' }}>
                        <span style={{
                          backgroundColor: a.faixa_risco?.startsWith('1') || a.faixa_risco?.startsWith('2') ? 'rgba(16, 185, 129, 0.1)' :
                                           a.faixa_risco?.startsWith('4') || a.faixa_risco?.startsWith('5') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                          color: a.faixa_risco?.startsWith('1') || a.faixa_risco?.startsWith('2') ? '#10b981' :
                                 a.faixa_risco?.startsWith('4') || a.faixa_risco?.startsWith('5') ? '#ef4444' : '#3b82f6',
                          padding: '3px 7px', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 'bold', border: '1px solid currentColor', whiteSpace: 'nowrap'
                        }}>{a.faixa_risco || 'N/D'}</span>
                      </td>
                      <td style={{ padding: '10px', borderBottom: '1px solid var(--border)', textAlign: 'right', color: rsiCor, fontWeight: 'bold' }}>
                        {rsi != null ? rsi.toFixed(2) : '—'}
                      </td>
                      <td style={{ padding: '10px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
                        {temDy ? (
                          <span style={{ color: '#10b981', fontWeight: 'bold' }} title={`${(dy * 100).toFixed(2)}%`}>
                            Sim ({(dy * 100).toFixed(2)}%)
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-faint)' }}>Não</span>
                        )}
                      </td>
                      <td style={{ padding: '10px', borderBottom: '1px solid var(--border)', textAlign: 'right', color: corRisco(rn), fontWeight: 'bold' }}>
                        {rn != null ? rn.toFixed(2) : '—'}
                      </td>
                      <td style={{ padding: '10px', borderBottom: '1px solid var(--border)', textAlign: 'right', color: corRisco(rm), fontWeight: 'bold' }}>
                        {rm != null ? rm.toFixed(2) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}