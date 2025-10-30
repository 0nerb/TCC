import yfinance as yf
import json
import time

# --- Configuração ---
INPUT_FILE = 'siglaTodasAcoes.json'
OUTPUT_FILE = 'datasListagem.json'

def get_trading_dates(ticker_symbol):
    """
    Busca a primeira e a última data de negociação para um ticker.
    Retorna uma tupla (primeira_data, ultima_data) no formato YYYY-MM-DD.
    """
    stock = yf.Ticker(ticker_symbol)
    
    # Busca o histórico máximo de dados disponíveis
    hist = stock.history(period="max")
    
    if not hist.empty:
        # Pega o primeiro índice (data de listagem)
        first_date = hist.index[0]
        # Pega o último índice (última data disponível)
        last_date = hist.index[-1]
        
        return first_date.strftime('%Y-%m-%d'), last_date.strftime('%Y-%m-%d')
    else:
        # Retorna None para ambas as datas se não encontrar histórico
        return None, None

# --- Lógica Principal ---
if __name__ == "__main__":
    try:
        with open(INPUT_FILE, 'r', encoding='utf-8') as f:
            lista_acoes = json.load(f)
    except FileNotFoundError:
        print(f"ERRO: Arquivo de entrada '{INPUT_FILE}' não encontrado.")
        exit()

    # Dicionário para armazenar os resultados finais
    resultados_finais = {}
    total_acoes = len(lista_acoes)
    
    print(f"Iniciando a busca da primeira e última data para {total_acoes} ações...")

    # Itera sobre a lista de ações do arquivo JSON
    for i, acao in enumerate(lista_acoes):
        sigla = acao.get("sigla")
        if not sigla:
            continue
        
        print(f"Processando {i+1}/{total_acoes}: {sigla}...")
        
        try:
            # Chama a função para obter a primeira e a última data
            primeira_data, ultima_data = get_trading_dates(sigla)
            
            if primeira_data and ultima_data:
                # Armazena os resultados em um dicionário aninhado
                resultados_finais[sigla] = {
                    "primeira_data": primeira_data,
                    "ultima_data": ultima_data
                }
            else:
                resultados_finais[sigla] = "Não encontrado"
            
            # Pausa para não sobrecarregar a API
            time.sleep(1)

        except Exception as e:
            print(f"  !! Erro ao buscar dados para {sigla}: {e}")
            resultados_finais[sigla] = "Erro na busca"
            continue

    # Salva o dicionário de resultados no arquivo de saída
    try:
        with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
            json.dump(resultados_finais, f, ensure_ascii=False, indent=4)
        print(f"\nProcesso finalizado! Resultados salvos em '{OUTPUT_FILE}'.")
    except IOError as e:
        print(f"ERRO ao salvar o arquivo de saída: {e}")