import React, { useState, useMemo } from 'react';
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
  activeTab, selSetores, selRiscos, estatisticas, maxPerda, setMaxPerda,
  dataIndice, dataVolatilidade, dataSazonalidade, dataCorrelacao,
  dataAnomalia, dataEstresse, dataExposicao, dataEvolucaoRisco, dataSp500,
  dataMapa, useDiv, setUseDiv, useMargem, setUseMargem, useEv, setUseEv,
  dataCustomIndex, buildCustomIndex, loadingCustom
}) {
  const descStyle = { fontSize: '0.95rem', color: 'var(--text-muted)', marginBottom: '24px', lineHeight: '1.6', maxWidth: '960px' };

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

  const mergedChartData = useMemo(() => {
    if (!dataCustomIndex || dataCustomIndex.length === 0) return [];
    return dataCustomIndex.map(row => {
      const rowDateTrunc = row.data ? row.data.toString().substring(0, 10) : '';
      const spMatch = dataSp500?.evolucao?.find(sp => {
        const spDateTrunc = sp.data ? sp.data.toString().substring(0, 10) : '';
        return spDateTrunc === rowDateTrunc;
      });
      return {
        data: row.data,
        Indice_Customizado: row.valor_indice,
        SP500: spMatch ? spMatch.SP500 : null
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
    <div className={styles.container}>
      {activeTab === 'setor' && (
        <>
          <h3 className={styles.chartTitle} style={{ marginBottom: '5px' }}>Performance do Índice Sintético</h3>
          <p style={descStyle}>Simula uma carteira teórica que investe igualmente em todas as ações do setor e acompanha sua evolução ao longo do tempo. Todos os setores partem da base 100 no início do período, então a linha mostra o retorno acumulado — quanto valeria hoje cada R$100 investidos no começo. Os pontos vermelhos marcam as semanas em que a queda superou o limite de sensibilidade definido no controle abaixo.</p>

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
        </>
      )}

      {activeTab === 'volatilidade' && (
        <div className={styles.chartContainer}>
          <h3 className={styles.chartTitle} style={{ marginBottom: '5px' }}>Desvio Padrão Anualizado (σ)</h3>
          <p style={descStyle}>Mede o quanto o retorno de cada setor oscila em torno da sua média, já convertido para uma base anual (desvio padrão dos retornos semanais × √52). Quanto mais alta a barra, mais instável e imprevisível foi o setor no período — ou seja, maior o seu risco.</p>
          <ResponsiveContainer width="100%" height={450}>
            <BarChart data={dataVolatilidade} margin={{ top: 20, right: 30, left: 30, bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="setor" stroke="var(--axis)" label={{ value: 'Setores Econômicos', position: 'insideBottom', offset: -20, fill: 'var(--text-muted)', fontSize: 14 }} />
              <YAxis stroke="var(--axis)" unit="%" label={{ value: 'Volatilidade (%)', angle: -90, position: 'insideLeft', offset: -15, fill: 'var(--text-muted)', fontSize: 14 }} />
              <Tooltip cursor={{ fill: 'var(--border)', opacity: 0.4 }} formatter={(v) => [`${Number(v).toFixed(2)}%`, 'Volatilidade']} />
              <Bar dataKey="volatilidade_anualizada">{dataVolatilidade.map((e, i) => (<Cell key={i} fill={CORES[i % CORES.length]} />))}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {activeTab === 'sazonalidade' && (
        <div className={styles.chartContainer}>
          <h3 className={styles.chartTitle} style={{ marginBottom: '5px' }}>Anomalias de Sazonalidade</h3>
          <p style={descStyle}>Mostra o retorno médio histórico de cada mês do ano, revelando padrões que tendem a se repetir independentemente do ano específico. Barras acima de zero indicam meses que costumam ser favoráveis para o setor; abaixo de zero, meses historicamente negativos.</p>
          <ResponsiveContainer width="100%" height={400} minHeight={400}>
            <BarChart data={dataSazonalidade} margin={{ top: 20, right: 30, left: 30, bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="mes" stroke="var(--axis)" fontSize={13} label={{ value: 'Mês Calendário Gergoriano', position: 'insideBottom', offset: -20, fill: 'var(--text-muted)', fontSize: 14 }} />
              <YAxis stroke="var(--axis)" unit="%" label={{ value: 'Retorno Fatorado (%)', angle: -90, position: 'insideLeft', offset: -15, fill: 'var(--text-muted)', fontSize: 14 }} />
              <Tooltip contentStyle={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border)' }} formatter={(v) => [`${Number(v).toFixed(2)}%`, 'Média de Retorno']} />
              <Legend verticalAlign="top" height={36} />
              <ReferenceLine y={0} stroke="var(--axis)" />
              {selSetores.map((s, i) => (<Bar key={s} dataKey={s} name={s} fill={CORES[i % CORES.length]} radius={[4, 4, 0, 0]} />))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {activeTab === 'correlacao' && (
        <div className={styles.chartContainer} style={{ height: 'auto', minHeight: '500px' }}>
          <h3 className={styles.chartTitle} style={{ marginBottom: '5px' }}>Matriz de Correlação Setorial de Pearson (ρ)</h3>
          <p style={descStyle}>Indica o quanto os setores se movimentam juntos, numa escala de -1 a +1. Valores próximos de +1 (verde) significam que os setores sobem e descem em sincronia; próximos de -1 (vermelho), que andam em direções opostas. Combinar setores pouco correlacionados é a base da diversificação para reduzir risco.</p>
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
          <h3 className={styles.chartTitle} style={{ marginBottom: '5px' }}>Paradoxo de Baixa Volatilidade</h3>
          <p style={descStyle}>Compara o retorno anualizado de cada faixa de risco com o índice S&amp;P 500. A teoria clássica (CAPM) prevê que mais risco deveria gerar mais retorno; este gráfico testa essa hipótese — se as ações de baixo risco (verde) entregam retorno parecido ou até superior ao das de alto risco (vermelho), temos o chamado paradoxo de baixa volatilidade.</p>
          <ResponsiveContainer width="100%" height={450}>
            <BarChart data={mergedAnomalia} margin={{ top: 20, right: 30, left: 30, bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="faixa_risco" stroke="var(--axis)" label={{ value: 'Quintis de Classificação & Benchmark', position: 'insideBottom', offset: -20, fill: 'var(--text-muted)', fontSize: 14 }} />
              <YAxis stroke="var(--axis)" unit="%" label={{ value: 'Retorno (%)', angle: -90, position: 'insideLeft', offset: -15, fill: 'var(--text-muted)', fontSize: 14 }} />
              <Tooltip formatter={(v) => [`${Number(v).toFixed(2)}%`, 'Retorno']} contentStyle={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border)' }} />
              <Bar dataKey="retorno_anualizado_pct">
                {mergedAnomalia.map((e, i) => {
                  let cor = '#3b82f6';
                  if (e.faixa_risco === 'S&P 500') cor = '#facc15';
                  else if (e.faixa_risco.startsWith('1') || e.faixa_risco.startsWith('2')) cor = '#10b981';
                  else if (e.faixa_risco.startsWith('5')) cor = '#ef4444';
                  return <Cell key={i} fill={cor} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {activeTab === 'estresse' && (
        <div className={styles.chartContainer}>
          <h3 className={styles.chartTitle} style={{ marginBottom: '5px' }}>Maximum Drawdown (MDD)</h3>
          <p style={descStyle}>Apresenta a maior perda acumulada de cada faixa de risco, medida do topo até o fundo mais profundo seguinte (Maximum Drawdown). Representa o pior momento que o investidor teria enfrentado no período: quanto mais negativa a barra, mais fundo foi o tombo e menor a resiliência da carteira em crises.</p>
          <ResponsiveContainer width="100%" height={450}>
            <BarChart data={mergedEstresse} margin={{ top: 20, right: 30, left: 30, bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="faixa_risco" stroke="var(--axis)" label={{ value: 'Quintis de Classificação & Benchmark', position: 'insideBottom', offset: -20, fill: 'var(--text-muted)', fontSize: 14 }} />
              <YAxis stroke="var(--axis)" unit="%" label={{ value: 'Retração (%)', angle: -90, position: 'insideLeft', offset: -15, fill: 'var(--text-muted)', fontSize: 14 }} />
              <Tooltip formatter={(v) => [`${Number(v).toFixed(2)}%`, 'Drawdown']} contentStyle={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border)' }} />
              <ReferenceLine y={0} stroke="var(--axis)" />
              <Bar dataKey="maximum_drawdown_pct" radius={[0, 0, 4, 4]}>
                {mergedEstresse.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.faixa_risco === 'S&P 500' ? '#facc15' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {activeTab === 'exposicao' && (
        <div className={styles.chartContainer}>
          <h3 className={styles.chartTitle} style={{ marginBottom: '5px' }}>Perfil de Exposição Sistêmica</h3>
          <p style={descStyle}>Resume o risco sistêmico de cada setor pelo Z-Score médio — o número de desvios padrão que o setor está acima ou abaixo da média do mercado. Barras à direita (vermelhas) apontam setores mais arriscados que a média; à esquerda (azuis), setores mais defensivos.</p>
          <ResponsiveContainer width="100%" height={450}>
            <BarChart data={dataExposicao} layout="vertical" margin={{ top: 20, right: 30, left: 60, bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" stroke="var(--axis)" label={{ value: 'Z-Score', position: 'insideBottom', offset: -20, fill: 'var(--text-muted)', fontSize: 14 }} />
              <YAxis dataKey="setor" type="category" stroke="var(--axis)" width={120} label={{ value: 'Setor', angle: -90, position: 'insideLeft', offset: -45, fill: 'var(--text-muted)', fontSize: 14 }} />
              <Tooltip formatter={(v) => [Number(v).toFixed(2), 'Z-Score']} />
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
          <p style={descStyle}>Acompanha a evolução de cada R$100 investidos em cada faixa de risco ao longo do tempo, todas partindo da base 100 e comparadas ao benchmark S&amp;P 500 (linha amarela). Permite visualizar se assumir mais risco realmente se traduziu em mais retorno no período analisado.</p>
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
          <h3 className={styles.chartTitle} style={{ marginBottom: '5px' }}>Tabela de Alocação Fundamentalista (Smart Beta)</h3>
          <p style={descStyle}>Ranqueia os principais ativos de cada setor por um Score de Qualidade (Smart Beta), que combina fundamentos — dividend yield, margem EBITDA e EV/EBITDA — e penaliza o risco sistêmico histórico. O percentual de alocação prioriza empresas de boa qualidade e baixo risco. Selecione ações na tabela abaixo para montar e testar (backtest) seu próprio índice contra o S&amp;P 500.</p>

          <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setUseDiv(!useDiv)}
              style={{ padding: '8px 12px', borderRadius: '6px', fontSize: '0.92rem', fontWeight: 'bold', border: `1px solid ${useDiv ? '#10b981' : 'var(--border)'}`, backgroundColor: useDiv ? 'rgba(16, 185, 129, 0.1)' : 'transparent', color: useDiv ? '#10b981' : 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.2s' }}
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
                  <th style={{ padding: '12px 10px', color: 'var(--text-muted)' }}>Setor</th>
                  <th style={{ padding: '12px 10px', color: 'var(--text-muted)' }}>Ticker</th>
                  <th style={{ padding: '12px 10px', color: 'var(--text-muted)', textAlign: 'center' }}>Faixa de Risco</th>
                  <th style={{ padding: '12px 10px', color: 'var(--text-muted)', textAlign: 'right' }}>Z-Score Qualidade</th>
                  <th style={{ padding: '12px 10px', color: 'var(--text-muted)', textAlign: 'right' }}>Alocação (%)</th>
                </tr>
              </thead>
              <tbody>
                {dataMapa && dataMapa.length > 0 ? (
                  dataMapa.flatMap(setor =>
                    (setor.children || [])
                      .sort((a, b) => b.size - a.size)
                      .map((ativo, index) => (
                        <tr key={`${setor.name}-${ativo.name}`} style={{ backgroundColor: index % 2 === 0 ? 'transparent' : 'rgba(39, 39, 42, 0.3)' }}>
                          <td style={{ padding: '10px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
                            <input 
                              type="checkbox" 
                              checked={selectedTickers.some(s => s.name === ativo.name)}
                              onChange={() => toggleTicker(ativo)}
                              style={{ cursor: 'pointer' }}
                            />
                          </td>
                          <td style={{ padding: '10px', borderBottom: '1px solid var(--border)', color: 'var(--text-primary)' }}>{setor.name}</td>
                          <td style={{ padding: '10px', borderBottom: '1px solid var(--border)', color: 'var(--text-primary)', fontWeight: 'bold' }}>{ativo.name}</td>
                          <td style={{ padding: '10px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
                            <span style={{ 
                               backgroundColor: ativo.risco?.startsWith('1') || ativo.risco?.startsWith('2') ? 'rgba(16, 185, 129, 0.1)' : 
                                                ativo.risco?.startsWith('4') || ativo.risco?.startsWith('5') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                               color: ativo.risco?.startsWith('1') || ativo.risco?.startsWith('2') ? '#10b981' : 
                                      ativo.risco?.startsWith('4') || ativo.risco?.startsWith('5') ? '#ef4444' : '#3b82f6',
                               padding: '4px 8px', borderRadius: '4px', fontSize: '0.82rem', fontWeight: 'bold', border: '1px solid currentColor'
                            }}>
                               {ativo.risco}
                            </span>
                          </td>
                          <td style={{ padding: '10px', borderBottom: '1px solid var(--border)', textAlign: 'right', color: ativo.score > 0 ? '#10b981' : '#ef4444' }}>
                            {ativo.score > 0 ? '+' : ''}{Number(ativo.score).toFixed(4)}
                          </td>
                          <td style={{ padding: '10px', borderBottom: '1px solid var(--border)', textAlign: 'right', color: '#3b82f6', fontWeight: 'bold' }}>
                            {Number(ativo.size).toFixed(2)}%
                          </td>
                        </tr>
                      ))
                  )
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
            <button
              onClick={() => buildCustomIndex(selectedWithWeights)}
              disabled={selectedTickers.length === 0 || loadingCustom}
              style={{ padding: '10px 15px', backgroundColor: selectedTickers.length > 0 ? '#3b82f6' : 'var(--border)', color: 'var(--text-primary)', border: 'none', borderRadius: '6px', cursor: selectedTickers.length > 0 ? 'pointer' : 'not-allowed', fontWeight: 'bold' }}
            >
              {loadingCustom ? 'Aguarde, calculando vetores quantitativos...' : 'Processar Gráfico de Evolução contra S&P 500'}
            </button>
          </div>

          {mergedChartData.length > 0 && (
            <div style={{ marginTop: '30px' }}>
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

    </div>
  );
}