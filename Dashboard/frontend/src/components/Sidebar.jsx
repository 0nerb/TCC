import React from 'react';
import { 
  TrendingUp, BarChart3, CalendarDays, Share2, 
  LayoutDashboard, Activity, Bomb, PieChart 
} from 'lucide-react';
import styles from '../App.module.css';

export default function Sidebar({ activeTab, setActiveTab }) {
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
          <div className={styles.menuSeparator} style={{borderTop: '1px solid #27272a', margin: '15px 0'}}></div>
          <li className={`${styles.menuItem} ${activeTab === 'anomalia' ? styles.activeMenuItem : ''}`} onClick={() => setActiveTab('anomalia')}>
            <Activity size={18} /> Anomalia Risco
          </li>
          <li className={`${styles.menuItem} ${activeTab === 'estresse' ? styles.activeMenuItem : ''}`} onClick={() => setActiveTab('estresse')}>
            <Bomb size={18} /> Teste Estresse
          </li>
          <li className={`${styles.menuItem} ${activeTab === 'exposicao' ? styles.activeMenuItem : ''}`} onClick={() => setActiveTab('exposicao')}>
            <PieChart size={18} /> Exp. Setorial
          </li>
        </ul>
      </nav>
    </aside>
  );
}