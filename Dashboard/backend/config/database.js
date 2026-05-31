const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:admin@localhost:3000/tcc_indices',
});

module.exports = pool;