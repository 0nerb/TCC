import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import FiltrosCascata from './components/FiltrosCascata';
import PainelVisualizacao from './components/PainelVisualizacao';
import styles from './App.module.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('setor');
  const [filtrosDB, setFiltrosDB] = useState([]);
  
  const [selPaises, setSelPaises] = useState([]);
  const [selSetores, setSelSetores] = useState([]);
  const [selIndustrias, setSelIndustrias] = useState([]);
  const [anoIni, setAnoIni] = useState(2010);
  const [anoFim, setAnoFim] = useState(2015);
  const [loading, setLoading] = useState(false);
  
  const [dataIndice, setDataIndice] = useState([]);
  const [dataVolatilidade, setDataVolatilidade] = useState([]);
  const [dataSazonalidade, setDataSazonalidade] = useState([]);
  const [dataCorrelacao, setDataCorrelacao] = useState({});
  const [dataAnomalia, setDataAnomalia] = useState([]);
  const [dataEstresse, setDataEstresse] = useState([]);
  const [dataExposicao, setDataExposicao] = useState([]);
  
  const [estatisticas, setEstatisticas] = useState({});
  const [maxPerda, setMaxPerda] = useState(3.0);

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

  const fetchData = async () => {
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
        setDataVolatilidade(await res.json());
      } else if (activeTab === 'sazonalidade') {
        const res = await fetch(`http://localhost:5001/api/sazonalidade?${params}`);
        const json = await res.json();
        if (Array.isArray(json)) {
          const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
          const pivot = Array.from({ length: 12 }, (_, i) => ({ mes: meses[i] }));
          json.forEach(row => { pivot[row.mes - 1][row.setor] = row.media_retorno; });
          setDataSazonalidade(pivot);
        }
      } else if (activeTab === 'correlacao') {
        const res = await fetch(`http://localhost:5001/api/correlacao?${params}`);
        const json = await res.json();
        const matriz = {};
        if (Array.isArray(json)) json.forEach(row => { if (!matriz[row.setor_a]) matriz[row.setor_a] = {}; matriz[row.setor_a][row.setor_b] = row.coeficiente; });
        setDataCorrelacao(matriz);
      // ... (dentro de fetchData) ...
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
      }
  // ...
    } catch (err) { console.error("Erro API:", err); }
    finally { setLoading(false); }
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

  useEffect(() => { fetchData(); }, [activeTab, maxPerda]);

  return (
    <div className={styles.layout}>
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className={styles.mainContent}>
        <FiltrosCascata 
          paisesDisponiveis={paisesDisponiveis}
          setoresDisponiveis={setoresDisponiveis}
          industriasDisponiveis={industriasDisponiveis}
          selPaises={selPaises} setSelPaises={setSelPaises}
          selSetores={selSetores} setSelSetores={setSelSetores}
          selIndustrias={selIndustrias} setSelIndustrias={setSelIndustrias}
          anoIni={anoIni} setAnoIni={setAnoIni}
          anoFim={anoFim} setAnoFim={setAnoFim}
          loading={loading} fetchData={fetchData}
          toggleFilter={toggleFilter} toggleSelectAll={toggleSelectAll}
        />

        <PainelVisualizacao 
          activeTab={activeTab}
          selSetores={selSetores}
          estatisticas={estatisticas}
          maxPerda={maxPerda}
          setMaxPerda={setMaxPerda}
          dataIndice={dataIndice}
          dataVolatilidade={dataVolatilidade}
          dataSazonalidade={dataSazonalidade}
          dataCorrelacao={dataCorrelacao}
          dataAnomalia={dataAnomalia}
          dataEstresse={dataEstresse}
          dataExposicao={dataExposicao}
        />
      </main>
    </div>
  );
}