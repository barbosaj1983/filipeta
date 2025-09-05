import pkg from 'pg';
const { Pool } = pkg;

const isSSLRequired = process.env.PGSSLMODE === 'require';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isSSLRequired ? { rejectUnauthorized: false } : false
});

export async function query(text, params){
  const start = Date.now();
  const res = await pool.query(text, params);
  const ms = Date.now() - start;
  if (ms > 200) console.log('SQL lenta:', { ms, text: text.slice(0,80)+'...' });
  return res;
}
