import yfinance as yf
import json
from datetime import datetime

# Baixar dados do S&P 500 de 2010 até 2025
print("Baixando dados do S&P 500 de 2010 até 2025...")
sp500 = yf.download("^GSPC", start="2010-01-01", end="2025-12-31", progress=False, auto_adjust=False)

# Converter para dicionário
data_dict = {
    "simbolo": "^GSPC",
    "descricao": "S&P 500",
    "periodo_inicio": "2010-01-01",
    "periodo_fim": "2025-12-31",
    "total_registros": len(sp500),
    "data_extracao": datetime.now().isoformat(),
    "dados": []
}

# Adicionar cada linha de dados
for data, row in sp500.iterrows():
    data_dict["dados"].append({
        "data": data.strftime("%Y-%m-%d"),
        "abertura": round(float(row["Open"].item()), 2),
        "maximo": round(float(row["High"].item()), 2),
        "minimo": round(float(row["Low"].item()), 2),
        "fechamento": round(float(row["Close"].item()), 2),
        "volume": int(row["Volume"].item())
    })

# Salvar em JSON
with open("dadosSP500.json", "w", encoding="utf-8") as f:
    json.dump(data_dict, f, indent=2, ensure_ascii=False)

print(f"✓ Dados salvos em 'dadosSP500.json'")
print(f"✓ Total de registros: {len(sp500)}")
print(f"✓ Período: 2010-01-01 até 2025-12-31")
