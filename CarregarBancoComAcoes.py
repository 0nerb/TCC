import pandas as pd
from sqlalchemy import create_engine
import os

#pip install psycopg2-binary

# --- 1. CONFIGURAÇÕES ---
PASTA_ATUAL = os.path.dirname(os.path.abspath(__file__))

# Configuração atualizada com porta 3000 e senha admin
# Estou assumindo usuario 'postgres' e senha 'admin'. Se o usuário for 'admin', troque 'postgres' por 'admin'
DB_URL = 'postgresql://postgres:admin@localhost:3000/tcc_indices' 
engine = create_engine(DB_URL)

# Mapeamentos ESPECÍFICOS por tabela (A solução do problema)
MAP_DIMENSAO_ACAO = {
    'data_de_coleta': 'data_coleta_dados'
    # Nota: acao_key NÃO muda aqui, pois é chave primária
}

MAP_DIMENSAO_TEMPO = {
    'data': 'data_completa' 
    # Mapeia 'data' do CSV para 'data_completa' do banco
}

MAP_DIMENSAO_TIPO = {
    'descrição': 'descricao_indicador',
    'descrição_indicador': 'descricao_indicador'
}

# Nas Fatos, aí sim transformamos as chaves em Foreign Keys (fk_...)
MAP_FATOS = {
    'acao_key': 'fk_dim_acao_acao_key',
    'data_key': 'fk_dim_tempo_data_key',
    'indicador_key': 'fk_dim_tipoindicador_indicador_key',
    'volume': 'volume_negociado'
}

def carregar_tabela(nome_arquivo, nome_tabela, mapa_colunas=None):
    caminho = os.path.join(PASTA_ATUAL, nome_arquivo)
    
    if not os.path.exists(caminho):
        print(f"❌ ERRO: '{nome_arquivo}' não encontrado.")
        return

    print(f"⏳ Processando {nome_arquivo}...")
    try:
        df = pd.read_csv(caminho)
        
        # 1. Aplicar renomeação se houver mapa
        if mapa_colunas:
            df.rename(columns=mapa_colunas, inplace=True)
            
        # 2. REMOVER DUPLICATAS (Segurança extra contra UniqueViolation)
        # Remove linhas que sejam exatamente iguais
        linhas_antes = len(df)
        df.drop_duplicates(inplace=True)
        linhas_depois = len(df)
        if linhas_antes != linhas_depois:
            print(f"   ⚠️  Removidas {linhas_antes - linhas_depois} linhas duplicadas no CSV.")

        # 3. Carga no Banco
        print(f"   Enviando {len(df)} linhas para '{nome_tabela}'...")
        df.to_sql(nome_tabela, engine, if_exists='append', index=False, chunksize=10000)
        print(f"✅ Sucesso: {nome_tabela} carregada!\n")
        
    except Exception as e:
        print(f"❌ Falha crítica em {nome_tabela}: {e}\n")

# --- 2. EXECUÇÃO ---
print("🚀 Iniciando carga corrigida (Porta 3000)...\n")

# A. Carregar Dimensões (Usando mapas de Dimensão)
carregar_tabela('Dim_Tempo.csv', 'dim_tempo', MAP_DIMENSAO_TEMPO)
carregar_tabela('Dim_Acao.csv', 'dim_acao', MAP_DIMENSAO_ACAO)
carregar_tabela('Dim_TipoIndicador.csv', 'dim_tipoindicador', MAP_DIMENSAO_TIPO)

# B. Carregar Fatos (Usando mapa de Fatos com FKs)
carregar_tabela('Fato_Indicadores.csv', 'fato_indicadores', MAP_FATOS)
carregar_tabela('Fato_InfoAcaoDiarioCR.csv', 'fato_infoacaodiario', MAP_FATOS)

print("🏁 Finalizado.")