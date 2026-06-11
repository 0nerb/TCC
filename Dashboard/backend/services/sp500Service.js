const fs = require('fs');
const path = require('path');

class Sp500Service {
  constructor() {
    this.sp500Raw = [];
    this.carregarDados();
  }

  carregarDados() {
    try {
      const sp500Path = path.join(__dirname, '../dadosSP500.json');
      const fileData = fs.readFileSync(sp500Path, 'utf8');
      this.sp500Raw = JSON.parse(fileData).dados;
      console.log(`[S&P 500 Benchmark] Sucesso: Carregados ${this.sp500Raw.length} registros.`);
    } catch (err) {
      console.error("[S&P 500] Erro fatal ao ler dadosSP500.json:", err.message);
    }
  }

  getDadosProcessados(anoIni, anoFim) {
    try {
      if (!this.sp500Raw || this.sp500Raw.length === 0) {
        return { evolucao: [], anomalia: [], estresse: [] };
      }

      // Blindagem de Parâmetros: Fallback para impedir que anos indefinidos zerem a consulta
      const inicio = parseInt(anoIni) || 2010;
      const fim = parseInt(anoFim) || 2025;

      const filtrado = this.sp500Raw.filter(d => {
        if (!d || !d.data) return false;
        const ano = parseInt(String(d.data).trim().substring(0, 4));
        return ano >= inicio && ano <= fim;
      });

      // Feedback no terminal do backend para auditoria
      console.log(`[S&P 500] Consulta de Benchmark: ${inicio} a ${fim} -> ${filtrado.length} dias extraídos.`);
      
      if (filtrado.length === 0) return { evolucao: [], anomalia: [], estresse: [] };

      const porSemana = {};
      filtrado.forEach(row => {
        if (row.fechamento === undefined || row.fechamento === null) return;
        
        // Proteção contra vírgulas ou dados formatados como string no JSON
        const precoVal = parseFloat(String(row.fechamento).replace(/,/g, ''));
        if (isNaN(precoVal) || precoVal <= 0) return;

        try {
          // Parse mecânico e uso de Date.UTC para eliminar dependência de fuso horário do Windows/Linux
          const dataStr = String(row.data).trim();
          const parts = dataStr.split('-');
          if (parts.length !== 3) return;

          const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 12, 0, 0));
          if (isNaN(d.getTime())) return;

          const day = d.getUTCDay();
          const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1); 
          
          const monday = new Date(d.getTime());
          monday.setUTCDate(diff);
          
          const weekKey = monday.toISOString().split('T')[0];

          if (!porSemana[weekKey]) porSemana[weekKey] = { sum: 0, count: 0 };
          porSemana[weekKey].sum += precoVal;
          porSemana[weekKey].count += 1;
        } catch (e) {}
      });

      const semanas = Object.keys(porSemana).sort();
      const precosSemanais = semanas.map(s => ({
        data: s,
        preco: porSemana[s].sum / porSemana[s].count
      }));

      if (precosSemanais.length === 0) return { evolucao: [], anomalia: [], estresse: [] };

      // Motor de Cálculos (Base 100, Anualizado e Tail Risk)
      const precoInicial = precosSemanais[0].preco;
      const evolucao = precosSemanais.map(s => ({
        data: s.data,
        SP500: (s.preco / precoInicial) * 100
      }));

      let sumRetornos = 0;
      let countRetornos = 0;
      for (let i = 1; i < precosSemanais.length; i++) {
        const divisor = precosSemanais[i - 1].preco;
        if (divisor > 0) {
          const ret = (precosSemanais[i].preco / divisor) - 1;
          sumRetornos += ret;
          countRetornos++;
        }
      }
      
      const mediaRetorno = countRetornos > 0 ? (sumRetornos / countRetornos) : 0;
      const retornoAnualizado = mediaRetorno * 52 * 100;
      const anomalia = [{ benchmark: 'S&P 500', retorno_anualizado_pct: retornoAnualizado }];

      let maxDrawdown = 0;
      let peak = precosSemanais[0].preco;
      precosSemanais.forEach(s => {
        if (s.preco > peak) peak = s.preco;
        const drawdown = (s.preco - peak) / peak; 
        if (drawdown < maxDrawdown) maxDrawdown = drawdown;
      });
      const estresse = [{ benchmark: 'S&P 500', maximum_drawdown_pct: maxDrawdown * 100 }];

      return { evolucao, anomalia, estresse };

    } catch (fatalError) {
      console.error("[S&P 500] Erro crítico no processamento:", fatalError);
      return { evolucao: [], anomalia: [], estresse: [] };
    }
  }
}

module.exports = new Sp500Service();