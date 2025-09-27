const { Pool } = require('pg');

// Vercel-ийн production орчинд SSL холболт шаардлагатай.
const isProduction = process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  // Production орчинд (Vercel дээр) SSL тохиргоог идэвхжүүлнэ.
  // rejectUnauthorized: false гэдэг нь self-signed гэрчилгээг зөвшөөрөх бөгөөд
  // Vercel Postgres-д холбогдоход ихэвчлэн шаардлагатай байдаг.
  ssl: isProduction ? { rejectUnauthorized: false } : false,
});

// query гэдэг функц экспорт хийж, бусад файлуудад ашиглах боломжийг олгоно.
module.exports = {
  query: (text, params) => pool.query(text, params),
};
