import yfinance as yf
import json
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from tqdm import tqdm

# --- Configuração ---
INPUT_FILE = 'siglaTodasAcoes.json'
OUTPUT_FILE = 'datasListagem.json'
MAX_WORKERS = 10 # Número de "trabalhadores" simultâneos. Ajuste conforme sua conexão.

def get_listing_date(ticker_symbol):
    """
    Busca a primeira data de negociação (data de listagem) para um ticker.
    Retorna a TUPLA (sigla, data_string) ou (sigla, mensagem_de_erro).
    """
    if not ticker_symbol:
        return None, "Sigla vazia"
        
    try:
        stock = yf.Ticker(ticker_symbol)
        hist = stock.history(period="max")
        
        if not hist.empty:
            listing_date = hist.index[0]
            return ticker_symbol, listing_date.strftime('%Y-%m-%d')
        else:
            return ticker_symbol, "Não encontrado"
            
    except Exception as e:
        # Retorna a sigla e a mensagem de erro para ser registrada
        return ticker_symbol, f"Erro na busca: {e}"

# --- Lógica Principal ---
if __name__ == "__main__":
    try:
        with open(INPUT_FILE, 'r', encoding='utf-8') as f:
            lista_acoes = json.load(f)
    except FileNotFoundError:
        print(f"ERRO: Arquivo de entrada '{INPUT_FILE}' não encontrado.")
        exit()

    resultados_finais = {}
    total_acoes = len(lista_acoes)
    
    print(f"Iniciando a busca concorrente para {total_acoes} ações com {MAX_WORKERS} workers...")

    # Usando o ThreadPoolExecutor para gerenciar as threads
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        # Submete todas as tarefas para a "piscina" de workers
        # Cria um "futuro" para cada chamada da função get_listing_date
        futures = [executor.submit(get_listing_date, acao.get("sigla")) for acao in lista_acoes]
        
        # Usa tqdm para criar uma barra de progresso enquanto os resultados chegam
        for future in tqdm(as_completed(futures), total=total_acoes, desc="Processando ações"):
            # Pega o resultado da tarefa assim que ela termina
            sigla, resultado = future.result()
            if sigla:
                resultados_finais[sigla] = resultado

    # Salva o dicionário de resultados no arquivo de saída
    try:
        with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
            json.dump(resultados_finais, f, ensure_ascii=False, indent=4)
        print(f"\nProcesso finalizado! Resultados salvos em '{OUTPUT_FILE}'.")
    except IOError as e:
        print(f"ERRO ao salvar o arquivo de saída: {e}")