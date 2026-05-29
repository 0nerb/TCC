import pandas as pd
from sqlalchemy import create_engine, text

# 1. Configuração da conexão
ENGINE_URL = 'postgresql://postgres:admin@localhost:3000/tcc_indices'
engine = create_engine(ENGINE_URL)

# 2. Leitura do CSV
arquivo_csv = 'Fato_InfoAcaoDiarioCR.csv'
df = pd.read_csv(arquivo_csv)

# 3. Mapeamento das colunas para os nomes físicos do banco
df = df.rename(columns={
    'data_key': 'fk_dim_tempo_data_key',
    'acao_key': 'fk_dim_acao_acao_key'
})

# Filtro estrito para enviar apenas o que o banco espera
colunas_banco = [
    'fk_dim_tempo_data_key', 
    'fk_dim_acao_acao_key', 
    'preco_fechamento', 
    'volume_negociado', 
    'rsi_14', 
    'risco_base', 
    'risk_score_normalizado'
]
df_insercao = df[colunas_banco]

# 4. Processo de carga (Truncate and Load)
with engine.begin() as conexao:
    print("Executando TRUNCATE na tabela fato_infoacaodiario...")
    conexao.execute(text("TRUNCATE TABLE fato_infoacaodiario CASCADE;"))
    
    print("Iniciando a inserção dos dados...")
    df_insercao.to_sql(
        name='fato_infoacaodiario',
        con=conexao,
        if_exists='append',
        index=False,
        chunksize=10000
    )

print("Carga finalizada com sucesso.")