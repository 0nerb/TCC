import pandas as pd
import matplotlib.pyplot as plt
from sqlalchemy import create_engine, text

# ==========================================================
# 1. PARÂMETROS GLOBAIS
# ==========================================================
ANO_INICIAL = 2014
ANO_FINAL = 2020
SETOR_ALVO = 'Industrials'
MAX_PERDA_PERMITIDA = 10.0 

# ==========================================================
# 2. CONFIGURAÇÃO DA CONEXÃO (postgres:admin)
# ==========================================================
DB_URL = 'postgresql://postgres:admin@localhost:3000/tcc_indices'
engine = create_engine(DB_URL)

# ==========================================================
# 3. QUERY SQL COM AGREGAÇÃO SEMANAL E ESCALA SINTÉTICA
# ==========================================================
sql_query = text("""
WITH TotalSetor AS (
    SELECT COUNT(DISTINCT ticker) as total_geral FROM dim_acao WHERE setor = :setor_filtro
),
PrecosSemanaisPorTicker AS (
    SELECT 
        DATE_TRUNC('week', t.data_completa) as semana,
        a.ticker,
        AVG(f.preco_fechamento) as preco_medio_ticker
    FROM fato_infoacaodiario f
    JOIN dim_acao a ON f.fk_dim_acao_acao_key = a.acao_key
    JOIN dim_tempo t ON f.fk_dim_tempo_data_key = t.data_key
    WHERE a.setor = :setor_filtro 
      AND t.ano BETWEEN :ano_ini AND :ano_fim
    GROUP BY 1, 2
)
SELECT 
    semana,
    -- Cálculo do Índice Sintético para manter a escala de 199 ações
    (SUM(preco_medio_ticker) / COUNT(DISTINCT ticker)) * (SELECT total_geral FROM TotalSetor) as preco_sintetico
FROM PrecosSemanaisPorTicker
GROUP BY semana
HAVING COUNT(DISTINCT ticker) > 0
ORDER BY semana;
""")

print(f"🔄 Gerando análise SEMANAL para '{SETOR_ALVO}' ({ANO_INICIAL}-{ANO_FINAL})...")

try:
    params = {"setor_filtro": SETOR_ALVO, "ano_ini": ANO_INICIAL, "ano_fim": ANO_FINAL}
    
    with engine.connect() as conn:
        df = pd.read_sql(sql_query, conn, params=params)

    if df.empty:
        print("❌ Nenhum dado encontrado para o período.")
    else:
        # Correção do erro de Timezone (Tz-aware)
        df['semana'] = pd.to_datetime(df['semana'], utc=True)
        
        # 1. Normalização Base 100
        df['indice'] = (df['preco_sintetico'] / df['preco_sintetico'].iloc[0]) * 100
        
        # 2. Variação Percentual Semanal (para marcação de risco)
        df['variacao_pct'] = df['indice'].pct_change() * 100
        
        # 3. Performance Final (Valorização ou Queda)
        performance_final = df['indice'].iloc[-1] - 100
        texto_performance = f"{'Valorização' if performance_final >= 0 else 'Queda'}: {performance_final:.2f}%"
        cor_performance = 'green' if performance_final >= 0 else 'red'

        # --- PLOTAGEM ---
        plt.figure(figsize=(15, 8))
        
        # Linha Principal
        plt.plot(df['semana'], df['indice'], color='#003366', linewidth=2, label=f'Índice Semanal {SETOR_ALVO}')

        # Marcação de Violações de Risco (Pontos Vermelhos)
        violacoes = df[df['variacao_pct'] <= -MAX_PERDA_PERMITIDA]
        if not violacoes.empty:
            plt.scatter(violacoes['semana'], violacoes['indice'], 
                        color='red', s=35, zorder=5, label=f'Risco Excedido (> {MAX_PERDA_PERMITIDA}%)')

        # --- ANOTAÇÃO FINAL (VALORIZAÇÃO/QUEDA) ---
        # Coloca o texto exatamente no último ponto da linha
        plt.annotate(texto_performance, 
                     xy=(df['semana'].iloc[-1], df['indice'].iloc[-1]),
                     xytext=(15, 0), textcoords='offset points',
                     color=cor_performance, fontweight='bold', fontsize=12,
                     arrowprops=dict(arrowstyle='->', color=cor_performance))

        # Estilização
        plt.title(f'Análise de Desempenho e Risco: {SETOR_ALVO} ({ANO_INICIAL}-{ANO_FINAL})', fontsize=14)
        plt.ylabel('Retorno Acumulado (Base 100)', fontsize=12)
        plt.axhline(y=100, color='black', linestyle='--', alpha=0.3)
        plt.grid(True, linestyle=':', alpha=0.4)
        plt.legend(loc='upper left')

        plt.tight_layout()
        plt.show()
        
        print(f"✅ Gráfico gerado com sucesso!")
        print(f"📊 Resultado Final: {texto_performance}")

except Exception as e:
    print(f"❌ Erro ao processar: {e}")