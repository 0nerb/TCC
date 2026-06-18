import React from 'react';
import {
  TrendingUp, BarChart3, CalendarDays, Share2,
  LayoutDashboard, Activity, Bomb, PieChart, Map, Sun, Moon, ListFilter
} from 'lucide-react';
import styles from '../App.module.css';

export default function Sidebar({ activeTab, setActiveTab, theme, toggleTheme }) {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.title}>
        <TrendingUp className={styles.accent} size={24} /> 
        QUANTLAB <span className={styles.accent}>PRO</span>
      </div>
      <nav>
        <ul className={styles.menuList}>
          <li className={`${styles.menuItem} ${activeTab === 'setor' ? styles.activeMenuItem : ''}`} onClick={() => setActiveTab('setor')}>
            <LayoutDashboard size={18} /> Performance
          </li>
          <li className={`${styles.menuItem} ${activeTab === 'volatilidade' ? styles.activeMenuItem : ''}`} onClick={() => setActiveTab('volatilidade')}>
            <BarChart3 size={18} /> Volatilidade
          </li>
          <li className={`${styles.menuItem} ${activeTab === 'sazonalidade' ? styles.activeMenuItem : ''}`} onClick={() => setActiveTab('sazonalidade')}>
            <CalendarDays size={18} /> Sazonalidade
          </li>
          <li className={`${styles.menuItem} ${activeTab === 'correlacao' ? styles.activeMenuItem : ''}`} onClick={() => setActiveTab('correlacao')}>
            <Share2 size={18} /> Correlação
          </li>
          
          <div className={styles.menuSeparator} style={{borderTop: '1px solid var(--border)', margin: '15px 0'}}></div>
          
          <li className={`${styles.menuItem} ${activeTab === 'anomalia' ? styles.activeMenuItem : ''}`} onClick={() => setActiveTab('anomalia')}>
            <Activity size={18} /> Anomalia Risco
          </li>
          <li className={`${styles.menuItem} ${activeTab === 'estresse' ? styles.activeMenuItem : ''}`} onClick={() => setActiveTab('estresse')}>
            <Bomb size={18} /> Teste Estresse
          </li>
          <li className={`${styles.menuItem} ${activeTab === 'exposicao' ? styles.activeMenuItem : ''}`} onClick={() => setActiveTab('exposicao')}>
            <PieChart size={18} /> Exp. Setorial
          </li>
          
          <div className={styles.menuSeparator} style={{borderTop: '1px solid var(--border)', margin: '15px 0'}}></div>
          
          <li className={`${styles.menuItem} ${activeTab === 'evolucaoRisco' ? styles.activeMenuItem : ''}`} onClick={() => setActiveTab('evolucaoRisco')}>
            <TrendingUp size={18} /> Evolução por Risco
          </li>

          <li className={`${styles.menuItem} ${activeTab === 'mapa' ? styles.activeMenuItem : ''}`} onClick={() => setActiveTab('mapa')}>
            <Map size={18} /> Mapa de Mercado
          </li>

          <li className={`${styles.menuItem} ${activeTab === 'listagem' ? styles.activeMenuItem : ''}`} onClick={() => setActiveTab('listagem')}>
            <ListFilter size={18} /> Listagem de Ações
          </li>
        </ul>
      </nav>

      <button className={styles.themeToggle} onClick={toggleTheme}>
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        {theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
      </button>
    </aside>
  );
}