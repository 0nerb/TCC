import pandas as pd
import json

def fetch_listed_stocks():
    """
    Busca a lista de todas as ações listadas na NASDAQ e NYSE
    a partir de arquivos de listagem oficiais.
    """
    try:
        # URLs dos arquivos que contêm todos os tickers listados
        # Nota: Esses URLs podem mudar. Se falharem, uma busca por
        # "nasdaq listed symbols file" ou "nyse listed symbols file" pode encontrar os novos.
        url_nasdaq = "ftp://ftp.nasdaqtrader.com/symboldirectory/nasdaqlisted.txt"
        url_nyse = "ftp://ftp.nasdaqtrader.com/symboldirectory/otherlisted.txt"

        print("Baixando lista de ativos da NASDAQ...")
        # O separador nesse arquivo é o pipe '|'
        df_nasdaq = pd.read_csv(url_nasdaq, sep='|')
        # Filtra para manter apenas Ações Comuns (Common Stock)
        df_nasdaq = df_nasdaq[df_nasdaq['Market Category'] == 'Q'] # Q = NASDAQ Global Select Market
        df_nasdaq['bolsa'] = 'NASDAQ'

        print("Baixando lista de ativos da NYSE...")
        df_nyse = pd.read_csv(url_nyse, sep='|')
        # Filtra para manter apenas ações da NYSE
        df_nyse = df_nyse[df_nyse['Exchange'] == 'N'] # N = NYSE
        df_nyse['bolsa'] = 'NYSE'

        # Renomeia as colunas para um nome comum antes de juntar
        df_nasdaq.rename(columns={'Symbol': 'sigla'}, inplace=True)
        df_nyse.rename(columns={'ACT Symbol': 'sigla'}, inplace=True)

        # Junta os dois DataFrames
        df_all_stocks = pd.concat([
            df_nasdaq[['sigla', 'bolsa']],
            df_nyse[['sigla', 'bolsa']]
        ])

        # Remove qualquer ticker que tenha '$' ou '.', que geralmente são de classes especiais ou warrants
        df_all_stocks = df_all_stocks[~df_all_stocks['sigla'].str.contains(r'[\.\$]', regex=True)]
        
        # Remove duplicatas e reseta o índice
        df_all_stocks.drop_duplicates(subset=['sigla'], inplace=True)
        df_all_stocks.reset_index(drop=True, inplace=True)

        return df_all_stocks

    except Exception as e:
        print(f"Ocorreu um erro ao buscar ou processar os arquivos de listagem: {e}")
        return None

# --- Lógica Principal ---
if __name__ == "__main__":
    lista_de_acoes = fetch_listed_stocks()

    if lista_de_acoes is not None:
        # Converte o DataFrame para o formato de lista de dicionários
        output_data = lista_de_acoes.to_dict(orient='records')

        # Escreve os dados no arquivo output.json
        try:
            with open("siglaTodasAcoes.json", "w", encoding="utf-8") as f:
                json.dump(output_data, f, ensure_ascii=False, indent=2)
            print(f"\nArquivo 'output.json' criado com sucesso com {len(output_data)} ações.")
            print("Amostra dos dados:")
            print(json.dumps(output_data[:5], indent=2))
        except IOError as e:
            print(f"Erro ao escrever o arquivo JSON: {e}")