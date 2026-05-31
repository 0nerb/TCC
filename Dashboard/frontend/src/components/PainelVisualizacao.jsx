import React from 'react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend, ReferenceLine, Cell 
} from 'recharts';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import styles from '../App.module.css';

const CORES = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#facc15', '#a855f7'];

export default function PainelVisualizacao({
  activeTab, selSetores, estatisticas, maxPerda, setMaxPerda,
  dataIndice, dataVolatilidade, dataSazonalidade, dataCorrelacao,
  dataAnomalia, dataEstresse, dataExposicao
}) {
  const descStyle = {
    fontSize: '0.8rem', color: '#a1a1aa', marginBottom: '20px', lineHeight: '1.4'
  };

  return (
    <div className={styles.container}>
      {activeTab === 'setor' && (
        <>
          <h3 className={styles.chartTitle} style={{marginBottom: '5px'}}>Performance do Índice Sintético</h3>
          <p style={descStyle}>Métrica de evolução cumulativa de longo prazo (Retorno Absoluto) de uma carteira teórica equiponderada, aferida com base no preço de fechamento e padronizada em base 100 no marco inicial da série temporal.</p>
          
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
             <ShieldAlert color="#ef4444" size={24} /> <span>Sensibilidade: <b style={{color:'#ef4444'}}>{maxPerda}%</b></span>
             <input type="range" min="0.5" max="25" step="0.5" value={maxPerda} onChange={e => setMaxPerda(parseFloat(e.target.value))} className={styles.slider} />
          </div>
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dataIndice} margin={{ top: 20, right: 30, left: 30, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="data" stroke="#52525b" fontSize={10} label={{ value: 'Período Cronológico (Semanas)', position: 'insideBottom', offset: -15, fill: '#a1a1aa', fontSize: 11 }} />
                <YAxis stroke="#52525b" domain={['auto', 'auto']} label={{ value: 'Valor do Índice (Base 100)', angle: -90, position: 'insideLeft', offset: -15, fill: '#a1a1aa', fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a' }} />
                <Legend verticalAlign="top" height={36} />
                <ReferenceLine y={100} stroke="#52525b" strokeDasharray="3 3" />
                {selSetores.map((s, i) => (<Line key={s} type="monotone" dataKey={s} stroke={CORES[i % CORES.length]} strokeWidth={2} dot={(p) => p.payload[`${s}_violacao`] ? <circle cx={p.cx} cy={p.cy} r={4} fill="#ef4444" stroke="#fff" /> : null} />))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {activeTab === 'volatilidade' && (
        <div className={styles.chartContainer}>
          <h3 className={styles.chartTitle} style={{marginBottom: '5px'}}>Desvio Padrão Anualizado (σ)</h3>
          <p style={descStyle}>Métrica de Risco Não-Direcional que quantifica a dispersão estatística de uma série de ativos em relação à sua média. Computada através do desvio padrão dos log-retornos semanais submetidos à fatoração temporal escalar da raiz quadrada de 52 (√52).</p>
          <ResponsiveContainer width="100%" height={450}>
            <BarChart data={dataVolatilidade} margin={{ top: 20, right: 30, left: 30, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="setor" stroke="#52525b" label={{ value: 'Setores Econômicos', position: 'insideBottom', offset: -15, fill: '#a1a1aa', fontSize: 11 }} />
              <YAxis stroke="#52525b" unit="%" label={{ value: 'Volatilidade Histórica (%)', angle: -90, position: 'insideLeft', offset: -15, fill: '#a1a1aa', fontSize: 11 }} />
              <Tooltip cursor={{fill: '#27272a', opacity: 0.4}} formatter={(v) => [`${Number(v).toFixed(2)}%`, 'Volatilidade']} />
              <Bar dataKey="volatilidade_anualizada">{dataVolatilidade.map((e, i) => (<Cell key={i} fill={CORES[i % CORES.length]} />))}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {activeTab === 'anomalia' && (
        <div className={styles.chartContainer}>
          <h3 className={styles.chartTitle} style={{marginBottom: '5px'}}>Paradoxo de Baixa Volatilidade (Retorno por Quintil)</h3>
          <p style={descStyle}>Análise empírica transversal elaborada para validar a falha do Capital Asset Pricing Model (CAPM). A visualização contrapõe o retorno esperado anualizado da carteira de agrupamento defensivo (verde) face aos grupos mais agressivos da distribuição da amostra (vermelho).</p>
          <ResponsiveContainer width="100%" height={450}>
            <BarChart data={dataAnomalia} margin={{ top: 20, right: 30, left: 30, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="faixa_risco" stroke="#52525b" label={{ value: 'Quintis de Classificação (Z-Score Consolidado)', position: 'insideBottom', offset: -15, fill: '#a1a1aa', fontSize: 11 }} />
              <YAxis stroke="#52525b" unit="%" label={{ value: 'Retorno Médio Anualizado (%)', angle: -90, position: 'insideLeft', offset: -15, fill: '#a1a1aa', fontSize: 11 }} />
              <Tooltip formatter={(v) => [`${Number(v).toFixed(2)}%`, 'Retorno Anualizado']} />
              <Bar dataKey="retorno_anualizado_pct">
                {dataAnomalia.map((e, i) => (<Cell key={i} fill={i < 2 ? '#10b981' : i > 3 ? '#ef4444' : '#3b82f6'} />))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {activeTab === 'estresse' && (
        <div className={styles.chartContainer}>
          <h3 className={styles.chartTitle} style={{marginBottom: '5px'}}>Maximum Drawdown (MDD) por Quintil de Risco</h3>
          <p style={descStyle}>Métrica de controle de cauda (Tail Risk) designada para validação preditiva do Z-Score perante o estresse de capital. Mede a profundidade geométrica das perdas absolutas comparando as mínimas de vales estatísticos aos seus Picos Históricos de Capitalização (High-Water Marks).</p>
          <ResponsiveContainer width="100%" height={450}>
            <BarChart data={dataEstresse} margin={{ top: 20, right: 30, left: 30, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="faixa_risco" stroke="#52525b" label={{ value: 'Quintis de Classificação (Z-Score Consolidado)', position: 'insideBottom', offset: -15, fill: '#a1a1aa', fontSize: 11 }} />
              <YAxis stroke="#52525b" unit="%" label={{ value: 'Profundidade da Retração (%)', angle: -90, position: 'insideLeft', offset: -15, fill: '#a1a1aa', fontSize: 11 }} />
              <Tooltip formatter={(v) => [`${Number(v).toFixed(2)}%`, 'Queda Máxima']} />
              <ReferenceLine y={0} stroke="#52525b" />
              <Bar dataKey="maximum_drawdown_pct" fill="#ef4444" radius={[0, 0, 4, 4]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {activeTab === 'exposicao' && (
        <div className={styles.chartContainer}>
          <h3 className={styles.chartTitle} style={{marginBottom: '5px'}}>Perfil de Exposição Sistêmica (Z-Score Médio por Setor)</h3>
          <p style={descStyle}>Consolidação paramétrica dos desvios agregados em relação à média de risco do mercado. O alinhamento negativo aponta regimes defensivos em relação à incerteza da amostra, atuando como amortecedores de portfólio; o vetor positivo expõe os agressores da volatilidade sistêmica.</p>
          <ResponsiveContainer width="100%" height={450}>
            <BarChart data={dataExposicao} layout="vertical" margin={{ top: 20, right: 30, left: 60, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
              <XAxis type="number" stroke="#52525b" label={{ value: 'Score Médio Padrão (Z-Score)', position: 'insideBottom', offset: -15, fill: '#a1a1aa', fontSize: 11 }} />
              <YAxis dataKey="setor" type="category" stroke="#52525b" width={120} label={{ value: 'Estruturação Setorial', angle: -90, position: 'insideLeft', offset: -45, fill: '#a1a1aa', fontSize: 11 }} />
              <Tooltip formatter={(v) => [Number(v).toFixed(2), 'Z-Score Médio']} />
              <ReferenceLine x={0} stroke="#fff" />
              <Bar dataKey="z_score_medio_setor">
                {dataExposicao.map((e, i) => (<Cell key={i} fill={e.z_score_medio_setor > 0 ? '#ef4444' : '#3b82f6'} />))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      
      {activeTab === 'sazonalidade' && (
        <div className={styles.chartContainer}>
          <h3 className={styles.chartTitle} style={{marginBottom: '5px'}}>Anomalias de Sazonalidade (Média de Retorno Mensal)</h3>
          <p style={descStyle}>Avaliação do comportamento determinístico subjacente do retorno via decomposição estrutural do calendário gregoriano. O vetor estatístico destina-se a atestar fluxos de liquidez sistematicamente anômalos que violam as proposições primárias da hipótese de eficiência de mercado fraca.</p>
          <ResponsiveContainer width="100%" height={400} minHeight={400}>
            <BarChart data={dataSazonalidade} margin={{ top: 20, right: 30, left: 30, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="mes" stroke="#52525b" fontSize={12} label={{ value: 'Mês Calendário Gergoriano', position: 'insideBottom', offset: -15, fill: '#a1a1aa', fontSize: 11 }} />
              <YAxis stroke="#52525b" unit="%" label={{ value: 'Retorno Fatorado (%)', angle: -90, position: 'insideLeft', offset: -15, fill: '#a1a1aa', fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a' }} formatter={(v) => [`${Number(v).toFixed(2)}%`, 'Média de Retorno']} />
              <Legend verticalAlign="top" height={36} />
              <ReferenceLine y={0} stroke="#52525b" />
              {selSetores.map((s, i) => (<Bar key={s} dataKey={s} name={s} fill={CORES[i % CORES.length]} radius={[4, 4, 0, 0]} />))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {activeTab === 'correlacao' && (
        <div className={styles.chartContainer} style={{ height: 'auto', minHeight: '500px' }}>
          <h3 className={styles.chartTitle} style={{marginBottom: '5px'}}>Matriz de Correlação Setorial de Pearson (ρ)</h3>
          <p style={descStyle}>Metodologia de mensuração simétrica de covariâncias normalizadas para avaliação da co-movimentação de vetores pareados através de joins relacionais síncronos da amostra. Índices próximos a -1 revelam hedge eficiente, enquanto correlações positivas indicam concentração estrutural não dispersada.</p>
          {Object.keys(dataCorrelacao).length === 0 ? (
            <div style={{display:'flex', alignItems:'center', justifyContent:'center', height:'300px', color:'#52525b'}}>Aguardando processamento estatístico...</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%', textAlign: 'center', fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '10px', borderBottom: '1px solid #27272a' }}></th>
                    {selSetores.map(s => (<th key={s} style={{ padding: '10px', borderBottom: '1px solid #27272a', color: '#a1a1aa', fontWeight: 'normal' }}>{s}</th>))}
                  </tr>
                </thead>
                <tbody>
                  {selSetores.map(setorA => (
                    <tr key={setorA}>
                      <td style={{ padding: '10px', borderRight: '1px solid #27272a', color: '#a1a1aa', textAlign: 'right' }}>{setorA}</td>
                      {selSetores.map(setorB => {
                        const coef = dataCorrelacao[setorA]?.[setorB] ?? 0;
                        const r = coef < 0 ? 239 : 24; const g = coef > 0 ? 185 : 68; const b = coef < 0 ? 68 : 27; const alpha = Math.abs(coef);
                        return (
                          <td key={`${setorA}-${setorB}`} style={{ padding: '15px', backgroundColor: `rgba(${r}, ${g}, ${b}, ${alpha})`, color: alpha > 0.5 ? '#fff' : '#a1a1aa', border: '1px solid #27272a', fontWeight: 'bold' }}>
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
    </div>
  );
}