// server.js
const express = require('express');
const cors = require('cors');
const apiRoutes = require('./routes/api');

const app = express();
const port = 5001;

// Middlewares Globais
app.use(cors());
app.use(express.json());

// Montagem da Camada de Rotas
app.use('/api', apiRoutes);

// Inicialização do Socket TCP
app.listen(port, () => console.log(`🚀 Server na porta ${port}`));