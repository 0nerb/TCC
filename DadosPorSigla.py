"""Pegar: 
* preço da acao
* volume de negociacao(diario) - Quantidade de ações negociadas em um determinado período (geralmente diário).
* valor de mercado - Preço da ação multiplicado pelo número total de ações em circulação. Indica o tamanho da empresa.
* RSI (Relative Strength Index) - Indicador técnico que mede a velocidade e a mudança dos movimentos de preço. Valores acima de 70 indicam que a ação pode estar sobrecomprada, enquanto valores abaixo de 30 sugerem que pode estar sobrevendida.
* P/L  - Indica quantos anos seriam necessários para recuperar o valor investido na ação com os lucros da empresa. Um P/L baixo pode sugerir uma ação barata.
* P/VPA - Compara o preço da ação com o valor do patrimônio líquido da empresa por ação. Um P/VPA abaixo de 1 pode indicar que a ação está sendo negociada abaixo do seu valor contábil.
* EV/EBITDA	- Compara o valor da firma com sua geração de caixa operacional. É considerado um múltiplo mais completo que o P/L, pois inclui a dívida.
* PSR (Price to Sales Ratio) - Compara o valor de mercado da empresa com sua receita. Útil para empresas que ainda não dão lucro.
* ROE (Return on Equity) - Mede a rentabilidade do capital próprio investido na empresa. Um ROE alto indica eficiência na geração de lucros com o capital dos acionistas.
* ROIC (Return on Invested Capital) - Mede a eficiência da empresa em gerar lucros com o capital investido, incluindo dívida e capital próprio. Um ROIC alto indica uma boa gestão do capital.
* Margem EBITDA - Mede a porcentagem da receita que se transforma em lucro operacional antes de juros, impostos, depreciação e amortização. Uma margem EBITDA alta indica eficiência operacional.
* Margem Bruta - Mede a porcentagem da receita que se transforma em lucro líquido. Uma margem bruta alta indica eficiência na produção e venda de produtos ou serviços.
* Margem Líquida - Mede a porcentagem da receita que se transforma em lucro líquido após todas as despesas. Uma margem líquida alta indica eficiência geral da empresa.
* Setor - Indica o setor de atuação da empresa, como tecnologia, saúde, finanças, etc. Ajuda a entender o contexto do negócio.
* Industria - Indica a indústria específica dentro do setor, como software, farmacêutica, bancos, etc. Fornece uma visão mais detalhada do mercado em que a empresa opera.
"""
import yfinance as yf
import pandas as pd
import json
import time

# --- Configuração ---
INPUT_FILE = "siglasComErro.json"
OUTPUT_FILE = "dadosPorAcaoComErro.json"

def calcular_rsi_manual(precos, periodo=14):
    """
    Calcula o Índice de Força Relativa (RSI) manualmente a partir de uma Série de preços.
    """
    # Passo 1: Calcular a mudança de preço
    delta = precos.diff()

    # Passo 2: Separar Ganhos e Perdas
    ganhos = delta.where(delta > 0, 0)
    perdas = -delta.where(delta < 0, 0)

    # Passo 3: Calcular as Médias Móveis Exponenciais
    media_ganhos = ganhos.ewm(com=periodo - 1, min_periods=periodo).mean()
    media_perdas = perdas.ewm(com=periodo - 1, min_periods=periodo).mean()

    # Passo 4: Calcular a Força Relativa (RS)
    rs = media_ganhos / media_perdas

    # Passo 5: Calcular o RSI
    rsi = 100 - (100 / (1 + rs))
    
    return rsi

def get_stock_data(ticker_symbol):
    """
    Coleta, processa e estrutura os dados para um único ticker.
    """
    stock = yf.Ticker(ticker_symbol)

    # 1. Obter dados de snapshot (setor, indústria, etc.)
    info = stock.info
    info_gerais = {
        "nome": info.get('shortName'),
        "setor": info.get('sector'),
        "industria": info.get('industry'),
        "valor_mercado_atual": info.get('marketCap'),
        "pl_atual": info.get('trailingPE'),
        "pvpa_atual": info.get('priceToBook')
    }

    # 2. Obter dados históricos e amostrar a cada 3 dias
    hist_df = stock.history(start="2021-01-01", end="2022-12-31")
    if hist_df.empty:
        return {"info_gerais": info_gerais, "dados_historicos": []}

    # Calcula o RSI usando o método manual e cria a nova coluna 'RSI_14'
    hist_df['RSI_14'] = calcular_rsi_manual(hist_df['Close'])
    
    # Amostra a cada 3 dias
    sampled_hist_df = hist_df.iloc[::3].copy()
    
    dados_historicos = []
    for index, row in sampled_hist_df.iterrows():
        dados_historicos.append({
            "data": index.strftime('%Y-%m-%d'),
            "preco_fechamento": row.get('Close'),
            "volume": row.get('Volume'),
            "rsi_14": row.get('RSI_14')
        })
    
    return {
        "info_gerais": info_gerais,
        "dados_historicos": dados_historicos,
    }

#Ler o arquivo JSON completo de todas as siglas

# # --- Lógica Principal ---
# if __name__ == "__main__":
#     try:
#         with open(INPUT_FILE, 'r', encoding='utf-8') as f:
#             acoes_para_processar = json.load(f)
#     except FileNotFoundError:
#         exit()

#     dados_finais = {}
    
#     for acao in acoes_para_processar:
#         sigla = acao.get("sigla", [])
#         if not sigla:
#             continue
        
#         try:
#             dados_da_acao = get_stock_data(sigla)
#             dados_finais[sigla] = dados_da_acao
#             time.sleep(1) 
#         except Exception as e:
#             dados_finais[sigla] = {"erro": str(e)}
#             continue

#     try:
#         with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
#             json.dump(dados_finais, f, ensure_ascii=False, indent=2)
#     except IOError:
#         print("Erro ao escrever o arquivo de saída.")
#         pass


# --- Lógica Principal ---
if __name__ == "__main__":
    try:
        with open(INPUT_FILE, 'r', encoding='utf-8') as f:
            # 1. Carrega o JSON inteiro em um dicionário
            dados_json = json.load(f)
            # 2. Extrai a lista de siglas de dentro do dicionário usando a chave 'tickers'
            acoes_para_processar = dados_json['tickers']

    except FileNotFoundError:
        print(f"ERRO: Arquivo de entrada '{INPUT_FILE}' não encontrado.")
        exit()
    except KeyError:
        print(f"ERRO: A chave 'tickers' não foi encontrada no arquivo '{INPUT_FILE}'. Verifique o formato do JSON.")
        exit()

    dados_finais = {}
    total_acoes = len(acoes_para_processar)
    print(f"Iniciando processamento para {total_acoes} ações...")
    
    # 3. Agora o loop itera sobre a lista de siglas diretamente
    for i, sigla in enumerate(acoes_para_processar):
        # A variável 'sigla' já é a string que queremos (ex: "AACT")
        if not sigla:
            continue
        
        # Adicionei um print para você acompanhar o progresso
        print(f"Processando {i+1}/{total_acoes}: {sigla}...")
        
        try:
            dados_da_acao = get_stock_data(sigla)
            dados_finais[sigla] = dados_da_acao
            time.sleep(1) 
        except Exception as e:
            print(f"  !! Erro ao processar {sigla}: {e}")
            dados_finais[sigla] = {"erro": str(e)}
            continue

    print("\nProcessamento finalizado. Salvando o arquivo de saída...")
    try:
        with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
            json.dump(dados_finais, f, ensure_ascii=False, indent=2)
        print(f"Arquivo '{OUTPUT_FILE}' salvo com sucesso!")
    except IOError:
        print("Erro ao escrever o arquivo de saída.")
        pass