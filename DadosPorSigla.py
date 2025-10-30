import yfinance as yf
import pandas as pd  # Importação necessária para a função de RSI
import json
import time

# --- Configuração ---
# Coloque aqui o nome do arquivo que você gerou na etapa anterior
INPUT_FILE = "siglaTodasAcoes2.json" 
OUTPUT_FILE = "dadosPorSigla.json"

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

def get_stock_data(ticker_symbol, data_de_inicio_raw):
    """
    Coleta, processa e estrutura os dados para um único ticker,
    usando uma data de início dinâmica.
    """
    stock = yf.Ticker(ticker_symbol)

    # 1. Obter dados de snapshot (setor, indústria, etc.)
    info = stock.info
    info_gerais = {
        "nome": info.get('shortName'),
        "country": info.get('country'),
        "setor": info.get('sector'),
        "industria": info.get('industry'),
        "valor_mercado_atual": info.get('marketCap'),
        "pl_atual": info.get('trailingPE'),
        "pvpa_atual": info.get('priceToBook'),
        "trailing_dividend_yield": info.get('trailingAnnualDividendYield'),
        "five_year_avg_dividend_yield": info.get('fiveYearAvgDividendYield'),
        "ebitda_margin": info.get('ebitdaMargins'),
        "enterprise_to_ebitda": info.get('enterpriseToEbitda'),
        "price_to_sales": info.get('priceToSalesTrailing12Months'),
    }

    # --- LÓGICA DA DATA DE INÍCIO DINÂMICA ---
    # Se não houver data de início, não podemos buscar o histórico
    if not data_de_inicio_raw or data_de_inicio_raw == "Não encontrado":
        return {"info_gerais": info_gerais, "dados_historicos": [], "erro_data": "Data de início não encontrada."}

    data_limite = '2010-01-01'
    start_date_final = ''

    # Compara as datas como strings (funciona para o formato YYYY-MM-DD)
    if data_de_inicio_raw < data_limite:
        # Regra 1: Data é anterior a 2010, usa 2010
        start_date_final = data_limite
    else:
        # Regra 2: Data é 2010 ou posterior, usa a própria data
        start_date_final = data_de_inicio_raw
    # ----------------------------------------

    # 2. Obter dados históricos com a data de início correta
    hist_df = stock.history(start=start_date_final, end="2025-12-31")
    if hist_df.empty:
        return {"info_gerais": info_gerais, "dados_historicos": []}

    # Calcula o RSI usando o método manual
    hist_df['RSI_14'] = calcular_rsi_manual(hist_df['Close'])
    
    # Amostra a cada 3 dias
    sampled_hist_df = hist_df.iloc[::3].copy()
    
    dados_historicos = []
    for index, row in sampled_hist_df.iterrows():
        dados_historicos.append({
            "data": index.strftime('%Y-%m-%d'),
            "preco_fechamento": row.get('Close'),
            "volume": row.get('Volume'),
            "rsi_14": row.get('RSI_14'),
        })
    
    return {
        "info_gerais": info_gerais,
        "dados_historicos": dados_historicos,
    }

# --- Lógica Principal ---
if __name__ == "__main__":
    try:
        with open(INPUT_FILE, 'r', encoding='utf-8') as f:
            # 1. Carrega o JSON (que agora é uma LISTA de dicionários)
            acoes_para_processar = json.load(f)

    except FileNotFoundError:
        print(f"ERRO: Arquivo de entrada '{INPUT_FILE}' não encontrado.")
        exit()
    except json.JSONDecodeError:
        print(f"ERRO: O arquivo '{INPUT_FILE}' não é um JSON válido.")
        exit()

    dados_finais = {}
    total_acoes = len(acoes_para_processar)
    print(f"Iniciando processamento para {total_acoes} ações...")
    
    # 3. Agora o loop itera sobre a LISTA de ações
    for i, acao in enumerate(acoes_para_processar):
        
        # Extrai os dados do dicionário 'acao'
        sigla = acao.get("sigla")
        primeira_data = acao.get("primeira_data") # <--- Pega a data de início

        if not sigla:
            continue
        
        print(f"Processando {i+1}/{total_acoes}: {sigla} (Data de início: {primeira_data})...")
        
        try:
            # Passa a sigla E a data de início para a função
            dados_da_acao = get_stock_data(sigla, primeira_data)
            dados_finais[sigla] = dados_da_acao
            time.sleep(1)  # Pausa para evitar sobrecarga de requisições
        
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