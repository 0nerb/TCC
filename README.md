# QuantLab

Ambiente analítico integrado para análise de risco e retorno de ações da NYSE e NASDAQ, com benchmark contra o S&P 500. Combina uma camada de coleta em Python, um Data Warehouse em PostgreSQL, uma API REST em Node.js e um dashboard interativo em React.

Este guia descreve como (1) executar o pipeline de coleta e carga dos dados e (2) subir o dashboard localmente.

---

## 1. Pré-requisitos

Instale as seguintes ferramentas antes de começar:

| Ferramenta | Versão mínima | Uso |
|---|---|---|
| Python | 3.10 | Scripts de coleta e carga |
| Node.js | 18 | Backend (Express) e frontend (Vite) |
| npm | 9 | Gerenciador de pacotes do Node |
| PostgreSQL | 14 | Data Warehouse |
| Git | qualquer | Clonagem do repositório |

O banco deve estar acessível em `localhost:3000`, com usuário `postgres`, senha `admin` e um banco chamado `tcc_indices` já criado. As tabelas do esquema estrela devem existir antes da carga; o DDL está em `Fisico.txt` na raiz do repositório.

---

## 2. Clonagem do repositório

```bash
git clone <URL_DO_REPOSITORIO> quantlab
cd quantlab
```

A estrutura relevante do projeto é:

```
quantlab/
├── SiglasAcoes.py
├── DataDeListagemAcoes.py
├── DadosPorSigla.py
├── dadosSP500.py
├── AlterarBanco.py
├── Fisico.txt
├── requirements.txt
└── Dashboard/
    ├── backend/
    └── frontend/
```

---

## 3. Coleta e carga dos dados (Python)

### 3.1. Ambiente virtual e dependências

Na raiz do projeto:

```bash
python -m venv .venv
# Linux/macOS
source .venv/bin/activate
# Windows
.venv\Scripts\activate

pip install -r requirements.txt
```

As principais bibliotecas usadas são `yfinance`, `pandas`, `SQLAlchemy` e `psycopg2-binary`.

### 3.2. Ordem de execução dos scripts

Os scripts são independentes, mas dependem dos artefatos gerados pelos anteriores. Execute nesta ordem, a partir da raiz do repositório:

```bash
# 1. Baixa a lista oficial de tickers da NASDAQ e NYSE via FTP e gera siglaTodasAcoes.json.
python SiglasAcoes.py

# 2. Para cada ticker, coleta a primeira e a última data de negociação. Gera datasListagem.json.
python DataDeListagemAcoes.py

# 3. Coleta preços, fundamentos e calcula o RSI-14 para cada ação. Gera dadosPorSigla.json (~772 MB).
python DadosPorSigla.py

# 4. Baixa o histórico diário do S&P 500 (^GSPC) entre 2010 e 2025. Gera dadosSP500.json.
python dadosSP500.py
```

Cada execução usa `time.sleep(1)` entre requisições para respeitar os limites da API do Yahoo Finance. O tempo total da coleta completa varia entre poucas horas e mais de um dia, dependendo da estabilidade da conexão e da resposta do provedor.

### 3.3. Geração dos CSVs dimensionais

A etapa entre os JSONs brutos e a carga no banco foi implementada externamente no fluxo de preparação, produzindo os arquivos:

- `Dim_Acao.csv`
- `Dim_Tempo.csv`
- `Dim_TipoIdicador.csv`
- `Fato_Indicadores.csv`
- `Fato_InfoAcaoDiario.csv`

Coloque esses cinco arquivos na pasta configurada no início do `AlterarBanco.py` (variável `base_dir`) antes de rodar a carga.

### 3.4. Carga no PostgreSQL

Com o banco `tcc_indices` já criado e as tabelas materializadas via `Fisico.txt`, rode:

```bash
python AlterarBanco.py
```

O script executa `TRUNCATE ... CASCADE` em todas as tabelas destino e recarrega os CSVs na ordem correta de dependência (dimensões antes das fatos), preservando integridade referencial.

---

## 4. Dashboard

O dashboard é composto por dois serviços que rodam em paralelo:

- Backend Node.js/Express na porta 5001.
- Frontend React (Vite) na porta 5173.

### 4.1. Backend

Em um terminal:

```bash
cd Dashboard/backend
npm install
node server.js
```

A API sobe em `http://localhost:5001/api` e expõe os endpoints usados pelas abas do dashboard (`/indice`, `/volatilidade`, `/sazonalidade`, `/correlacao`, `/anomalia-risco`, `/estresse-risco`, `/exposicao-setorial`, `/evolucao-risco`, `/mapa-mercado`, `/indice-customizado`, `/listagem-acoes`, `/benchmark-sp500`, `/filtros`).

A conexão com o banco é feita via pool `pg`, com as credenciais definidas em `Dashboard/backend/config/database.js`.

### 4.2. Frontend

Em outro terminal:

```bash
cd Dashboard/frontend
npm install
npm run dev
```

Ao final, o Vite exibe a URL local de acesso, tipicamente `http://localhost:5173`. Abra no navegador para interagir com o dashboard.

### 4.3. Uso

O painel oferece filtros em cascata (país, setor, indústria, faixa de risco) e um intervalo de anos entre 2010 e 2025. Cada aba responde a uma pergunta analítica específica, agrupada em três blocos: comportamento agregado por setor, comportamento por faixa de risco e construção de carteira individual.

---

## 5. Resolução de problemas comuns

| Sintoma | Causa provável | Ação |
|---|---|---|
| `psycopg2.OperationalError` na carga | Postgres não está rodando na porta 3000 ou credenciais divergem | Verifique o serviço e a URL em `AlterarBanco.py` |
| `psycopg2.errors.UndefinedTable` na carga | Tabelas do esquema estrela não foram criadas | Execute o DDL em `Fisico.txt` antes de rodar `AlterarBanco.py` |
| API responde 500 em todas as rotas | Banco vazio ou credenciais incorretas no backend | Verifique se a carga foi executada e revise `Dashboard/backend/config/database.js` |
| Frontend carrega mas gráficos ficam vazios | Backend não está no ar ou está em outra porta | Confirme que `node server.js` está rodando na porta 5001 |
| `yfinance` retorna erros intermitentes | Rate limit do Yahoo Finance | Aguarde alguns minutos e rode o script novamente; os JSONs já baixados são preservados |
| Coleta interrompida no meio | Timeout ou perda de conexão | Rode `extracaoDeTicket.py` sobre o log de erros para reprocessar apenas os tickers pendentes |

---

## 6. Observações

- Os arquivos de dados pesados (`*.json`, `*.csv`) estão listados no `.gitignore`. Apenas o código é versionado.
- As credenciais do banco estão fixas no código, adequadas ao uso local e acadêmico. Em qualquer cenário de exposição pública, mova-as para variáveis de ambiente.
- O período de análise padrão é de 2010 a 2025. Alterar esse recorte exige revisar os limites definidos nos scripts de coleta e no seletor de anos do frontend.
