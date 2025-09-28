import json
def extrair_tickers(nome_arquivo):
    tickers = set()
    with open(nome_arquivo, 'r', encoding='utf-8') as arquivo:
        for linha in arquivo:
            if '$' in linha and ':' in linha:
                inicio = linha.find('$') + 1
                fim = linha.find(':', inicio)
                ticker = linha[inicio:fim].strip()
                if ticker:
                    tickers.add(ticker)
    return sorted(tickers)

# Exemplo de uso:
if __name__ == "__main__":
    arquivo = "acoesComErro.txt"  # Substitua pelo nome do seu arquivo
    resultado = extrair_tickers(arquivo)
    print(json.dumps({"tickers": resultado}, ensure_ascii=False, indent=2))