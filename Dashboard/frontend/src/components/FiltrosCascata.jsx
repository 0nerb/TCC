import React from 'react';
import { Filter, Search, Loader2 } from 'lucide-react';
import styles from '../App.module.css';

export default function FiltrosCascata({
  paisesDisponiveis, setoresDisponiveis, industriasDisponiveis,
  selPaises, setSelPaises,
  selSetores, setSelSetores,
  selIndustrias, setSelIndustrias,
  anoIni, setAnoIni,
  anoFim, setAnoFim,
  loading, fetchData,
  toggleFilter, toggleSelectAll
}) {
  const btnActionStyle = {
    background: 'transparent',
    border: '1px solid #3f3f46',
    color: '#a1a1aa',
    fontSize: '0.65rem',
    cursor: 'pointer',
    padding: '2px 8px',
    borderRadius: '4px',
    marginLeft: 'auto',
    transition: 'all 0.2s'
  };

  return (
    <header className={styles.header}>
      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flex: 1 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
          <span className={styles.label} style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
            <Filter size={14} /> FILTROS EM CASCATA
          </span>
          
          <div style={{display: 'flex', gap: '15px'}}>
            <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: '#71717a', fontWeight: 'bold' }}>PAÍS</span>
                <button style={{...btnActionStyle, color: selPaises.length === paisesDisponiveis.length && paisesDisponiveis.length > 0 ? '#ef4444' : '#3b82f6', borderColor: selPaises.length === paisesDisponiveis.length && paisesDisponiveis.length > 0 ? '#7f1d1d' : '#1e3a8a'}} onClick={() => toggleSelectAll(paisesDisponiveis, selPaises, setSelPaises)}>
                  {selPaises.length === paisesDisponiveis.length && paisesDisponiveis.length > 0 ? 'Desmarcar Todos' : 'Selecionar Todos'}
                </button>
              </div>
              <div className={styles.checkboxGroup} style={{ maxHeight: '140px', overflowY: 'auto' }}>
                {paisesDisponiveis.map(p => (
                  <label key={p} className={styles.checkboxItem}><input type="checkbox" checked={selPaises.includes(p)} onChange={() => toggleFilter(selPaises, setSelPaises, p)} /> {p}</label>
                ))}
              </div>
            </div>

            <div style={{ flex: 1.5, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: '#71717a', fontWeight: 'bold' }}>SETOR</span>
                <button style={{...btnActionStyle, color: selSetores.length === setoresDisponiveis.length && setoresDisponiveis.length > 0 ? '#ef4444' : '#3b82f6', borderColor: selSetores.length === setoresDisponiveis.length && setoresDisponiveis.length > 0 ? '#7f1d1d' : '#1e3a8a'}} onClick={() => toggleSelectAll(setoresDisponiveis, selSetores, setSelSetores)}>
                  {selSetores.length === setoresDisponiveis.length && setoresDisponiveis.length > 0 ? 'Desmarcar Todos' : 'Selecionar Todos'}
                </button>
              </div>
              <div className={styles.checkboxGroup} style={{ maxHeight: '140px', overflowY: 'auto' }}>
                {setoresDisponiveis.map(s => (
                  <label key={s} className={styles.checkboxItem}><input type="checkbox" checked={selSetores.includes(s)} onChange={() => toggleFilter(selSetores, setSelSetores, s)} /> {s}</label>
                ))}
              </div>
            </div>

            <div style={{ flex: 1.5, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: '#71717a', fontWeight: 'bold' }}>INDÚSTRIA</span>
                <button style={{...btnActionStyle, color: selIndustrias.length === industriasDisponiveis.length && industriasDisponiveis.length > 0 ? '#ef4444' : '#3b82f6', borderColor: selIndustrias.length === industriasDisponiveis.length && industriasDisponiveis.length > 0 ? '#7f1d1d' : '#1e3a8a'}} onClick={() => toggleSelectAll(industriasDisponiveis, selIndustrias, setSelIndustrias)}>
                  {selIndustrias.length === industriasDisponiveis.length && industriasDisponiveis.length > 0 ? 'Desmarcar Todos' : 'Selecionar Todos'}
                </button>
              </div>
              <div className={styles.checkboxGroup} style={{ maxHeight: '140px', overflowY: 'auto' }}>
                {industriasDisponiveis.map(i => (
                  <label key={i} className={styles.checkboxItem}><input type="checkbox" checked={selIndustrias.includes(i)} onChange={() => toggleFilter(selIndustrias, setSelIndustrias, i)} /> {i}</label>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '22px' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input type="number" className={styles.inputYear} value={anoIni} onChange={e => setAnoIni(e.target.value)} />
            <input type="number" className={styles.inputYear} value={anoFim} onChange={e => setAnoFim(e.target.value)} />
          </div>
          <button className={styles.button} onClick={fetchData} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />} Analisar
          </button>
        </div>
      </div>
    </header>
  );
}