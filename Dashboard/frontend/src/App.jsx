import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend, ReferenceLine, Cell 
} from 'recharts';
import { 
  TrendingUp, ShieldAlert, Search, Loader2, 
  BarChart3, CalendarDays, Share2, LayoutDashboard, AlertTriangle, Filter 
} from 'lucide-react';
import styles from './App.module.css';

const CORES = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#facc15', '#a855f7'];

export default function App() {
  const [activeTab, setActiveTab] = useState('setor');
  const [filtrosDB, setFiltrosDB] = useState([]);
  
  const [selPaises, setSelPaises] = useState([]);
  const [selSetores, setSelSetores] = useState(['Energy']);
  const [selIndustrias, setSelIndustrias] = useState([]);
  
  const [anoIni, setAnoIni] = useState(2010);
  const [anoFim, setAnoFim] = useState(2019);
  const [loading, setLoading] = useState(false);
  
  const [dataIndice, setDataIndice] = useState([]);
  const [dataVolatilidade, setDataVolatilidade] = useState([]);
  const [dataSazonalidade, setDataSazonalidade] = useState([]);
  const [dataCorrelacao, setDataCorrelacao] = useState({});
  const [estatisticas, setEstatisticas] = useState({});
  const [maxPerda, setMaxPerda] = useState(3.0);

  useEffect(() => {
    fetch('http://localhost:5001/api/filtros')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP Status: ${res.status}`);
        return res.json();
      })
      .then(res => {
        if (Array.isArray(res)) {
          setFiltrosDB(res);
        } else {
          console.error("Carga de Dados Inválida:", res);
          setFiltrosDB([]); 
        }
      })
      .catch(err => {
        console.error("Falha Crítica - API Filtros:", err);
        setFiltrosDB([]);
      });
  }, []);

  const dbSafe = Array.isArray(filtrosDB) ? filtrosDB : [];
  
  const paisesDisponiveis = [...new Set(dbSafe.map(f => f.pais).filter(Boolean))].sort();
  
  const setoresDisponiveis = [...new Set(dbSafe
    .filter(f => selPaises.length === 0 || selPaises.includes(f.pais))
    .map(f => f.setor)
    .filter(Boolean)
  )].sort();

  const industriasDisponiveis = [...new Set(dbSafe
    .filter(f => selPaises.length === 0 || selPaises.includes(f.pais))
    .filter(f => selSetores.length === 0 || selSetores.includes(f.setor))
    .map(f => f.industria)
    .filter(Boolean)
  )].sort();

  const toggleFilter = (list, setList, item) => {
    setList(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
  };

  const fetchData = async () => {
    if (selSetores.length === 0) return;
    setLoading(true);

    const params = new URLSearchParams({
      setores: selSetores.join(','),
      industrias: selIndustrias.join(','),
      paises: selPaises.join(','),
      ano_ini: anoIni,
      ano_fim: anoFim
    }).toString();

    try {
      if (activeTab === 'setor') {
        const res = await fetch(`http://localhost:5001/api/indice?${params}`);
        const raw = await res.json();
        if (Array.isArray(raw)) processarIndice(raw);
        
      } else if (activeTab === 'volatilidade') {
        const res = await fetch(`http://localhost:5001/api/volatilidade?${params}`);
        const json = await res.json();
        if (Array.isArray(json)) setDataVolatilidade(json);
        
      } else if (activeTab === 'sazonalidade') {
        const res = await fetch(`http://localhost:5001/api/sazonalidade?${params}`);
        const json = await res.json();
        
        if (Array.isArray(json)) {
          const mesesLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
          const pivot = Array.from({ length: 12 }, (_, i) => ({ mes: mesesLabels[i] }));

          json.forEach(row => {
            const index = row.mes - 1; 
            pivot[index][row.setor] = row.media_retorno;
          });

          setDataSazonalidade(pivot);
        } else {
          setDataSazonalidade([]);
        }
        
      } else if (activeTab === 'correlacao') {
        const res = await fetch(`http://localhost:5001/api/correlacao?${params}`);
        const json = await res.json();

        if (Array.isArray(json)) {
          const matriz = {};
          json.forEach(row => {
            if (!matriz[row.setor_a]) matriz[row.setor_a] = {};
            matriz[row.setor_a][row.setor_b] = row.coeficiente;
          });
          setDataCorrelacao(matriz);
        } else {
          setDataCorrelacao({});
        }
      }
    } catch (err) {
      console.error("Erro de Processamento da API:", err);
    } finally {
      setLoading(false);
    }
  };

  const processarIndice = (raw) => {
    const pivot = raw.reduce((acc, curr) => {
      const d = curr.data.split('T')[0];
      if (!acc[d]) acc[d] = { data: d };
      acc[d][curr.setor] = parseFloat(curr.valor);
      return acc;
    }, {});

    const finalData = Object.values(pivot);
    const novasStats = {};

    if (finalData.length > 0) {
      const primeira = finalData[0];
      const ultima = finalData[finalData.length - 1];

      selSetores.forEach(s => novasStats[s] = { rendimento: 0, quedasCriticas: 0 });

      const normalized = finalData.map((row, i, arr) => {
        const newRow = { ...row };
        selSetores.forEach(s => {
          if (row[s] && primeira[s]) {
            newRow[s] = (row[s] / primeira[s]) * 100;

            if (i > 0 && arr[i - 1][s]) {
              const valorAnteriorNorm = (arr[i - 1][s] / primeira[s]) * 100;
              const varPct = ((newRow[s] - valorAnteriorNorm) / valorAnteriorNorm) * 100;

              const isViolacao = (varPct < 0 && Math.abs(varPct) >= maxPerda);
              newRow[`${s}_violacao`] = isViolacao;

              if (isViolacao) novasStats[s].quedasCriticas += 1;
            }
          }
        });
        return newRow;
      });

      selSetores.forEach(s => {
        if (ultima[s] && primeira[s]) {
          novasStats[s].rendimento = (((ultima[s] / primeira[s]) - 1) * 100).toFixed(2);
        }
      });

      setDataIndice(normalized);
      setEstatisticas(novasStats);
    }
  };

  useEffect(() => { fetchData(); }, [activeTab, maxPerda]);

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.title}>
          <TrendingUp className={styles.accent} size={24} />
          QUANTLAB <span className={styles.accent}>PRO</span>
        </div>

        <nav>
          <ul className={styles.menuList}>
            <li className={`${styles.menuItem} ${activeTab === 'setor' ? styles.activeMenuItem : ''}`} onClick={() => setActiveTab('setor')}>
              <LayoutDashboard size={18} /> Análise Por Setor
            </li>
            <li className={`${styles.menuItem} ${activeTab === 'volatilidade' ? styles.activeMenuItem : ''}`} onClick={() => setActiveTab('volatilidade')}>
              <BarChart3 size={18} /> Volatilidade Anualizada
            </li>
            <li className={`${styles.menuItem} ${activeTab === 'sazonalidade' ? styles.activeMenuItem : ''}`} onClick={() => setActiveTab('sazonalidade')}>
              <CalendarDays size={18} /> Sazonalidade
            </li>
            <li className={`${styles.menuItem} ${activeTab === 'correlacao' ? styles.activeMenuItem : ''}`} onClick={() => setActiveTab('correlacao')}>
              <Share2 size={18} /> Correlação Cruzada
            </li>
          </ul>
        </nav>
      </aside>

      <main className={styles.mainContent}>
        <header className={styles.header}>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', flex: 1 }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <span style={{ fontSize: '0.7rem', color: '#71717a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Filter size={12} /> COUNTRY:
                </span>
                <div className={styles.checkboxGroup} style={{ maxHeight: '80px', overflowY: 'auto' }}>
                  {paisesDisponiveis.map(p => (
                    <label key={p} className={styles.checkboxItem}>
                      <input type="checkbox" checked={selPaises.includes(p)} onChange={() => toggleFilter(selPaises, setSelPaises, p)} /> {p}
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <span style={{ fontSize: '0.7rem', color: '#71717a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Filter size={12} /> SECTOR:
                </span>
                <div className={styles.checkboxGroup} style={{ maxHeight: '80px', overflowY: 'auto' }}>
                  {setoresDisponiveis.map(s => (
                    <label key={s} className={styles.checkboxItem}>
                      <input type="checkbox" checked={selSetores.includes(s)} onChange={() => toggleFilter(selSetores, setSelSetores, s)} /> {s}
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <span style={{ fontSize: '0.7rem', color: '#71717a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Filter size={12} /> INDUSTRY:
                </span>
                <div className={styles.checkboxGroup} style={{ maxHeight: '80px', overflowY: 'auto' }}>
                  {industriasDisponiveis.map(ind => (
                    <label key={ind} className={styles.checkboxItem}>
                      <input type="checkbox" checked={selIndustrias.includes(ind)} onChange={() => toggleFilter(selIndustrias, setSelIndustrias, ind)} /> {ind}
                    </label>
                  ))}
                </div>
              </div>

            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input type="number" className={styles.inputYear} value={anoIni} onChange={e => setAnoIni(e.target.value)} />
                <input type="number" className={styles.inputYear} value={anoFim} onChange={e => setAnoFim(e.target.value)} />
              </div>
              <button className={styles.button} onClick={fetchData} disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
                {loading ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />} Analisar
              </button>
            </div>
          </div>
        </header>

        {activeTab === 'setor' && (
          <div className={styles.container}>
            <div className={styles.yieldPanel}>
              {selSetores.map((s, i) => (
                <div key={s} className={styles.yieldCard} style={{ borderLeftColor: CORES[i % CORES.length] }}>
                  <span style={{ fontSize: '0.7rem', color: '#a1a1aa', fontWeight: 'bold' }}>{s.toUpperCase()}</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: 'bold' }} className={estatisticas[s]?.rendimento >= 0 ? styles.positive : styles.negative}>
                    {estatisticas[s]?.rendimento >= 0 ? '+' : ''}{estatisticas[s]?.rendimento}%
                  </div>
                  <div className={styles.violationBadge}>
                    <AlertTriangle size={12} color="#ef4444" />
                    <span style={{ color: '#ef4444' }}>{estatisticas[s]?.quedasCriticas} quedas &gt; {maxPerda}%</span>
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.riskPanel}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '280px' }}>
                <ShieldAlert color="#ef4444" size={24} />
                <span>Sensibilidade de Queda (Filtro): <b style={{ color: '#ef4444' }}>{maxPerda}%</b></span>
              </div>
              <input type="range" min="0.5" max="25" step="0.5" value={maxPerda} onChange={e => setMaxPerda(parseFloat(e.target.value))} className={styles.slider} />
            </div>

            <div className={styles.chartContainer}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dataIndice}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="data" stroke="#52525b" fontSize={10} />
                  <YAxis stroke="#52525b" domain={['auto', 'auto']} />
                  <Tooltip contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a' }} />
                  <Legend verticalAlign="top" height={36} />
                  <ReferenceLine y={100} stroke="#52525b" strokeDasharray="3 3" />
                  {selSetores.map((s, i) => (
                    <Line
                      key={s}
                      type="monotone"
                      dataKey={s}
                      stroke={CORES[i % CORES.length]}
                      strokeWidth={2}
                      dot={(props) => {
                        const { payload, cx, cy } = props;
                        return payload[`${s}_violacao`] ? <circle cx={cx} cy={cy} r={4} fill="#ef4444" stroke="#fff" /> : null;
                      }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'volatilidade' && (
          <div className={styles.container}>
            <div className={styles.chartContainer}>
              <h3 style={{ marginBottom: '20px', fontSize: '1rem', color: '#a1a1aa' }}>
                Desvio Padrão de Retorno Anualizado (σ anual)
              </h3>
              {!dataVolatilidade || dataVolatilidade.length === 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#52525b' }}>Aguardando processamento estatístico...</div>
              ) : (
                <ResponsiveContainer width="100%" height={400} minHeight={400}>
                  <BarChart data={dataVolatilidade}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis dataKey="setor" stroke="#52525b" fontSize={12} />
                    <YAxis stroke="#52525b" unit="%" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a' }}
                      itemStyle={{ color: '#f4f4f5' }}
                      labelStyle={{ color: '#f4f4f5' }}
                      cursor={{ fill: '#27272a', opacity: 0.4 }}
                      formatter={(value) => [`${value.toFixed(2)}%`, 'Volatilidade Anual']}
                    />
                    <Bar dataKey="volatilidade_anualizada" name="Volatilidade Anual">
                      {dataVolatilidade.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CORES[index % CORES.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )}

        {activeTab === 'sazonalidade' && (
          <div className={styles.container}>
            <div className={styles.chartContainer}>
              <h3 style={{ marginBottom: '20px', fontSize: '1rem', color: '#a1a1aa' }}>
                Média de Retorno Histórico por Mês (Análise de Calendário)
              </h3>
              {!dataSazonalidade || dataSazonalidade.length === 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#52525b' }}>Aguardando processamento estatístico...</div>
              ) : (
                <ResponsiveContainer width="100%" height={400} minHeight={400}>
                  <BarChart data={dataSazonalidade}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis dataKey="mes" stroke="#52525b" fontSize={12} />
                    <YAxis stroke="#52525b" unit="%" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a' }}
                      itemStyle={{ color: '#f4f4f5' }}
                      labelStyle={{ color: '#f4f4f5' }}
                      cursor={{ fill: '#27272a', opacity: 0.4 }}
                      formatter={(value) => [`${value.toFixed(2)}%`, 'Média de Retorno']}
                    />
                    <Legend verticalAlign="top" height={36} />
                    <ReferenceLine y={0} stroke="#52525b" />
                    {selSetores.map((s, i) => (
                      <Bar key={s} dataKey={s} name={s} fill={CORES[i % CORES.length]} radius={[4, 4, 0, 0]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )}

        {activeTab === 'correlacao' && (
          <div className={styles.container}>
            <div className={styles.chartContainer} style={{ height: 'auto', minHeight: '500px' }}>
              <h3 style={{marginBottom:'20px', fontSize:'1rem', color:'#a1a1aa'}}>
                Matriz de Correlação de Pearson (ρ)
              </h3>
              {Object.keys(dataCorrelacao).length === 0 ? (
                <div style={{display:'flex', alignItems:'center', justifyContent:'center', height:'300px', color:'#52525b'}}>
                  Aguardando processamento estatístico...
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ borderCollapse: 'collapse', width: '100%', textAlign: 'center', fontSize: '0.85rem' }}>
                    <thead>
                      <tr>
                        <th style={{ padding: '10px', borderBottom: '1px solid #27272a' }}></th>
                        {selSetores.map(s => (
                          <th key={s} style={{ padding: '10px', borderBottom: '1px solid #27272a', color: '#a1a1aa', fontWeight: 'normal' }}>{s}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selSetores.map(setorA => (
                        <tr key={setorA}>
                          <td style={{ padding: '10px', borderRight: '1px solid #27272a', color: '#a1a1aa', textAlign: 'right' }}>{setorA}</td>
                          {selSetores.map(setorB => {
                            const coef = dataCorrelacao[setorA]?.[setorB] ?? 0;
                            const r = coef < 0 ? 239 : 24;
                            const g = coef > 0 ? 185 : 68;
                            const b = coef < 0 ? 68 : 27;
                            const alpha = Math.abs(coef);
                            
                            return (
                              <td key={`${setorA}-${setorB}`} style={{
                                padding: '15px',
                                backgroundColor: `rgba(${r}, ${g}, ${b}, ${alpha})`,
                                color: alpha > 0.5 ? '#fff' : '#a1a1aa',
                                border: '1px solid #27272a',
                                fontWeight: 'bold'
                              }}>
                                {coef.toFixed(2)}
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
          </div>
        )}
      </main>
    </div>
  );
}