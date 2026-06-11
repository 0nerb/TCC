import os
import pandas as pd
from sqlalchemy import create_engine, text

# 1. Configuração da ligação
ENGINE_URL = 'postgresql://postgres:admin@localhost:3000/tcc_indices' 
engine = create_engine(ENGINE_URL)

# 2. Diretório base
# Pega automaticamente o diretório onde este arquivo Python está salvo
base_dir = os.path.dirname(os.path.abspath(__file__))

# 3. Plano de Carga
load_plan = [
    {'table': 'dim_acao', 'file': 'Dim_Acao.csv'},
    {'table': 'dim_tempo', 'file': 'Dim_Tempo.csv'},
    {'table': 'dim_tipoindicador', 'file': 'Dim_TipoIdicador.csv'},
    {'table': 'fato_indicadores', 'file': 'Fato_Indicadores.csv'},
    {'table': 'fato_infoacaodiario', 'file': 'Fato_InfoAcaoDiario.csv'}
]

with engine.begin() as conn:
    # 4. Limpeza do banco de dados
    print("A esvaziar todas as tabelas...")
    tables_to_truncate = ", ".join([item['table'] for item in load_plan])
    conn.execute(text(f"TRUNCATE TABLE {tables_to_truncate} CASCADE;"))
    print("Banco esvaziado com sucesso.\n")

    # 5. Carga na ordem correta
    for item in load_plan:
        table_name = item['table']
        file_path = os.path.join(base_dir, item['file'])
        
        print(f"A carregar {item['file']} na tabela {table_name}...")
        df = pd.read_csv(file_path)
        
        # --- Renomeação Específica para Dimensão Ação ---
        if table_name == 'dim_acao' and 'data_de_coleta' in df.columns:
            df = df.rename(columns={'data_de_coleta': 'data_coleta_dados'})
            
        # --- Renomeação Específica para Dimensão Tempo ---
        if table_name == 'dim_tempo' and 'data' in df.columns:
            df = df.rename(columns={'data': 'data_completa'})
        
        # --- Renomeação de Colunas para Tabelas Fato ---
        if table_name.startswith('fato_'):
            rename_dict = {}
            if 'data_key' in df.columns: 
                rename_dict['data_key'] = 'fk_dim_tempo_data_key'
            if 'acao_key' in df.columns: 
                rename_dict['acao_key'] = 'fk_dim_acao_acao_key'
            
            # Mapeamento para a tabela fato_indicadores
            if 'tipo_indicador_id' in df.columns: 
                rename_dict['tipo_indicador_id'] = 'fk_dim_tipoindicador_indicador_key'
            if 'indicador_key' in df.columns: 
                rename_dict['indicador_key'] = 'fk_dim_tipoindicador_indicador_key'
                
            # Mapeamento para a tabela fato_infoacaodiario
            if 'risco_normalizado' in df.columns:
                rename_dict['risco_normalizado'] = 'risk_score_normalizado'
                
            if rename_dict:
                df = df.rename(columns=rename_dict)

        # Inserção em blocos
        df.to_sql(
            name=table_name,
            con=conn,
            if_exists='append',
            index=False,
            chunksize=10000
        )
        print(f"{len(df)} linhas inseridas em {table_name}.\n")

print("Carga completa. O banco está atualizado.")