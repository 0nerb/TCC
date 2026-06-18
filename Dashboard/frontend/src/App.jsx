import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import FiltrosCascata from './components/FiltrosCascata';
import PainelVisualizacao from './components/PainelVisualizacao';
import styles from './App.module.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('setor');
  const [filtrosDB, setFiltrosDB] = useState([]);

  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  
  const [selPaises, setSelPaises] = useState([]);
  const [selSetores, setSelSetores] = useState(['Energy']);
  const [selIndustrias, setSelIndustrias] = useState([]);
  const [selRiscos, setSelRiscos] = useState(['1 - Muito Baixo', '5 - Muito Alto']);
  
  const [anoIni, setAnoIni] = useState(2010);
  const [anoFim, setAnoFim] = useState(2014);
  const [loading, setLoading] = useState(false);
  
  const [dataIndice, setDataIndice] = useState([]);
  const [dataVolatilidade, setDataVolatilidade] = useState([]);
  const [dataSazonalidade, setDataSazonalidade] = useState([]);
  const [dataCorrelacao, setDataCorrelacao] = useState({});
  const [dataAnomalia, setDataAnomalia] = useState([]);
  const [dataEstresse, setDataEstresse] = useState([]);
  const [dataExposicao, setDataExposicao] = useState([]);
  const [dataEvolucaoRisco, setDataEvolucaoRisco] = useState([]);
  
  const [dataMapa, setDataMapa] = useState([]);
  const [dataSp500, setDataSp500] = useState({ evolucao: [], anomalia: [], estresse: [] });
  
  const [dataCustomIndex, setDataCustomIndex] = useState([]);
  const [loadingCustom, setLoadingCustom] = useState(false);
  const [customError, setCustomError] = useState(null);

  const [dataListagem, setDataListagem] = useState([]);
  const [alphaEv, setAlphaEv] = useState(5);
  const [alphaDy, setAlphaDy] = useState(5);
  const [alphaEb, setAlphaEb] = useState(5);

  const [estatisticas, setEstatisticas] = useState({});
  const [maxPerda, setMaxPerda] = useState(3.0);

  const [useDiv, setUseDiv] = useState(true);
  const [useMargem, setUseMargem] = useState(true);
  const [useEv, setUseEv] = useState(true);

  const riscosDisponiveis = ['1 - Muito Baixo', '2 - Baixo', '3 - Medio', '4 - Alto', '5 - Muito Alto'];

  useEffect(() => {
    fetch('http://localhost:5001/api/filtros')
      .then(res => res.json())
      .then(res => setFiltrosDB(Array.isArray(res) ? res : []))
      .catch(err => console.error("Erro API Filtros:", err));
  }, []);

  const dbSafe = Array.isArray(filtrosDB) ? filtrosDB : [];
  const paisesDisponiveis = [...new Set(dbSafe.map(f => f.pais).filter(Boolean))].sort();
  const setoresDisponiveis = [...new Set(dbSafe.filter(f => selPaises.length === 0 || selPaises.includes(f.pais)).map(f => f.setor).filter(Boolean))].sort();
  const industriasDisponiveis = [...new Set(dbSafe.filter(f => selPaises.length === 0 || selPaises.includes(f.pais)).filter(f => selSetores.length === 0 || selSetores.includes(f.setor)).map(f => f.industria).filter(Boolean))].sort();

  const toggleFilter = (list, setList, item) => {
    setList(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
  };

  const toggleSelectAll = (disponiveis, selecionados, setSelecionados) => {
    if (disponiveis.length === 0) return;
    if (selecionados.length === disponiveis.length) {
      setSelecionados([]); 
    } else {
      setSelecionados([...disponiveis]); 
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
    if (finalData.length > 0) {
      const primeira = finalData[0];
      const ultima = finalData[finalData.length - 1];
      const novasStats = {};
      selSetores.forEach(s => novasStats[s] = { rendimento: 0, quedasCriticas: 0 });
      const normalized = finalData.map((row, i, arr) => {
        const newRow = { ...row };
        selSetores.forEach(s => {
          if (row[s] && primeira[s]) {
            newRow[s] = (row[s] / primeira[s]) * 100;
            if (i > 0 && arr[i-1][s]) {
              const varPct = (((row[s]/primeira[s])*100 - (arr[i-1][s]/primeira[s])*100) / ((arr[i-1][s]/primeira[s])*100)) * 100;
              const violacao = varPct < 0 && Math.abs(varPct) >= maxPerda;
              newRow[`${s}_violacao`] = violacao;
              if (violacao) novasStats[s].quedasCriticas++;
            }
          }
        });
        return newRow;
      });
      selSetores.forEach(s => novasStats[s].rendimento = (((ultima[s]/primeira[s]) - 1) * 100).toFixed(2));
      setDataIndice(normalized);
      setEstatisticas(novasStats);
    }
  };

  const processarEvolucaoRisco = (raw) => {
    const pivot = raw.reduce((acc, curr) => {
      const d = curr.data.split('T')[0];
      if (!acc[d]) acc[d] = { data: d };
      acc[d][curr.faixa_risco] = parseFloat(curr.valor);
      return acc;
    }, {});
    
    const finalData = Object.values(pivot).sort((a, b) => new Date(a.data) - new Date(b.data));
    
    if (finalData.length > 0) {
      const bases = {};
      selRiscos.forEach(r => {
          const firstRowWithR = finalData.find(row => row[r] !== undefined && row[r] !== null);
          if (firstRowWithR) bases[r] = firstRowWithR[r];
      });

      const normalized = finalData.map(row => {
        const newRow = { ...row };
        selRiscos.forEach(r => {
          if (row[r] !== undefined && bases[r] !== undefined && bases[r] !== 0) {
            newRow[r] = (row[r] / bases[r]) * 100;
          }
        });
        return newRow;
      });
      setDataEvolucaoRisco(normalized);
    } else {
      setDataEvolucaoRisco([]);
    }
  };

  const buildCustomIndex = async (ativosSelecionados) => {
    setCustomError(null);
    if (!ativosSelecionados || ativosSelecionados.length === 0) {
      setCustomError('Selecione pelo menos uma ação na tabela acima.');
      return;
    }

    const ativosValidos = ativosSelecionados.filter(a => a.ticker && Number.isFinite(a.newWeight));
    if (ativosValidos.length === 0) {
      setCustomError('Os ativos selecionados não têm peso válido.');
      return;
    }

    setLoadingCustom(true);
    const tickersStr = ativosValidos.map(a => a.ticker).join(',');
    const pesosStr = ativosValidos.map(a => a.newWeight).join(',');
    const url = `http://localhost:5001/api/indice-customizado?tickers=${encodeURIComponent(tickersStr)}&pesos=${encodeURIComponent(pesosStr)}&ano_ini=${anoIni}&ano_fim=${anoFim}`;
    console.log('[Índice Customizado] requisição:', { tickers: tickersStr, pesos: pesosStr, anoIni, anoFim });

    try {
      const res = await fetch(url);
      const json = await res.json();
      console.log('[Índice Customizado] resposta:', { status: res.status, linhas: Array.isArray(json) ? json.length : 'erro', amostra: Array.isArray(json) ? json[0] : json });

      if (!res.ok) {
        setCustomError(`Erro ${res.status}: ${json?.error || 'falha ao processar.'}`);
        setDataCustomIndex([]);
        return;
      }
      if (!Array.isArray(json) || json.length === 0) {
        setCustomError('Backend retornou vazio para esses tickers no período selecionado.');
        setDataCustomIndex([]);
        return;
      }
      setDataCustomIndex(json);
    } catch (err) {
      console.error('[Índice Customizado] erro de rede:', err);
      setCustomError(`Falha de conexão: ${err.message}. O backend está rodando em localhost:5001?`);
      setDataCustomIndex([]);
    } finally {
      setLoadingCustom(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    const params = new URLSearchParams({
      setores: selSetores.join(','), industrias: selIndustrias.join(','), paises: selPaises.join(','),
      riscos: selRiscos.join(','), ano_ini: anoIni, ano_fim: anoFim,
      use_div: useDiv, use_margem: useMargem, use_ev: useEv
    }).toString();

    try {
      if (activeTab === 'setor') {
        const res = await fetch(`http://localhost:5001/api/indice?${params}`);
        const raw = await res.json();
        if (Array.isArray(raw)) processarIndice(raw);
      } else if (activeTab === 'volatilidade') {
        const res = await fetch(`http://localhost:5001/api/volatilidade?${params}`);
        const json = await res.json();
        setDataVolatilidade(Array.isArray(json) ? json : []);
      } else if (activeTab === 'sazonalidade') {
        const res = await fetch(`http://localhost:5001/api/sazonalidade?${params}`);
        const json = await res.json();
        if (Array.isArray(json)) {
          const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
          const pivot = Array.from({ length: 12 }, (_, i) => ({ mes: meses[i] }));
          json.forEach(row => { pivot[row.mes - 1][row.setor] = row.media_retorno; });
          setDataSazonalidade(pivot);
        } else {
          setDataSazonalidade([]);
        }
      } else if (activeTab === 'correlacao') {
        const res = await fetch(`http://localhost:5001/api/correlacao?${params}`);
        const json = await res.json();
        if (Array.isArray(json)) {
          const matriz = {};
          json.forEach(row => { if (!matriz[row.setor_a]) matriz[row.setor_a] = {}; matriz[row.setor_a][row.setor_b] = row.coeficiente; });
          setDataCorrelacao(matriz);
        } else {
          setDataCorrelacao({});
        }
      } else if (activeTab === 'anomalia') {
        const res = await fetch(`http://localhost:5001/api/anomalia-risco?${params}`);
        const json = await res.json();
        setDataAnomalia(Array.isArray(json) ? json : []);
      } else if (activeTab === 'estresse') {
        const res = await fetch(`http://localhost:5001/api/estresse-risco?${params}`);
        const json = await res.json();
        setDataEstresse(Array.isArray(json) ? json : []);
      } else if (activeTab === 'exposicao') {
        const res = await fetch(`http://localhost:5001/api/exposicao-setorial?${params}`);
        const json = await res.json();
        setDataExposicao(Array.isArray(json) ? json : []);
      } else if (activeTab === 'evolucaoRisco') {
        const res = await fetch(`http://localhost:5001/api/evolucao-risco?${params}`);
        const raw = await res.json();
        if (Array.isArray(raw)) processarEvolucaoRisco(raw);
      } else if (activeTab === 'mapa') {
        const res = await fetch(`http://localhost:5001/api/mapa-mercado?${params}`);
        const json = await res.json();
        setDataMapa(Array.isArray(json) ? json : []);
      } else if (activeTab === 'listagem') {
        const listParams = new URLSearchParams({
          paises: selPaises.join(','), setores: selSetores.join(','),
          industrias: selIndustrias.join(','), riscos: selRiscos.join(','),
          alpha_ev: alphaEv, alpha_dy: alphaDy, alpha_eb: alphaEb
        }).toString();
        const res = await fetch(`http://localhost:5001/api/listagem-acoes?${listParams}`);
        const json = await res.json();
        setDataListagem(Array.isArray(json) ? json : []);
      }

      if (['anomalia', 'estresse', 'evolucaoRisco', 'mapa'].includes(activeTab)) {
        const resSp = await fetch(`http://localhost:5001/api/benchmark-sp500?ano_ini=${anoIni}&ano_fim=${anoFim}`);
        if (resSp.ok) {
          const jsonSp = await resSp.json();
          setDataSp500(jsonSp);
        } else {
          setDataSp500({ evolucao: [], anomalia: [], estresse: [] });
        }
      }

    } catch (err) { 
      console.error("Erro API Global:", err); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { fetchData(); }, [activeTab, maxPerda, useDiv, useMargem, useEv, alphaEv, alphaDy, alphaEb]);

  return (
    <div className={styles.layout}>
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} theme={theme} toggleTheme={toggleTheme} />
      <main className={styles.mainContent}>
        <FiltrosCascata 
          paisesDisponiveis={paisesDisponiveis} setoresDisponiveis={setoresDisponiveis} industriasDisponiveis={industriasDisponiveis} riscosDisponiveis={riscosDisponiveis}
          selPaises={selPaises} setSelPaises={setSelPaises} selSetores={selSetores} setSelSetores={setSelSetores}
          selIndustrias={selIndustrias} setSelIndustrias={setSelIndustrias} selRiscos={selRiscos} setSelRiscos={setSelRiscos}
          anoIni={anoIni} setAnoIni={setAnoIni} anoFim={anoFim} setAnoFim={setAnoFim}
          loading={loading} fetchData={fetchData} toggleFilter={toggleFilter} toggleSelectAll={toggleSelectAll}
        />
        <PainelVisualizacao 
          activeTab={activeTab} selSetores={selSetores} selRiscos={selRiscos}
          estatisticas={estatisticas} maxPerda={maxPerda} setMaxPerda={setMaxPerda}
          dataIndice={dataIndice} dataVolatilidade={dataVolatilidade} dataSazonalidade={dataSazonalidade}
          dataCorrelacao={dataCorrelacao} dataAnomalia={dataAnomalia} dataEstresse={dataEstresse}
          dataExposicao={dataExposicao} dataEvolucaoRisco={dataEvolucaoRisco} dataSp500={dataSp500}
          dataMapa={dataMapa}
          useDiv={useDiv} setUseDiv={setUseDiv} useMargem={useMargem} setUseMargem={setUseMargem} useEv={useEv} setUseEv={setUseEv}
          dataCustomIndex={dataCustomIndex} buildCustomIndex={buildCustomIndex} loadingCustom={loadingCustom} customError={customError}
          dataListagem={dataListagem}
          alphaEv={alphaEv} setAlphaEv={setAlphaEv}
          alphaDy={alphaDy} setAlphaDy={setAlphaDy}
          alphaEb={alphaEb} setAlphaEb={setAlphaEb}
        />
      </main>
    </div>
  );
}