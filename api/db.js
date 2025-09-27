const { Pool } = require('@neondatabase/serverless');

// Vercel-д зориулсан тусгай сан нь SSL болон бусад тохиргоог
// process.env.POSTGRES_URL-г ашиглан автоматаар хийдэг.
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
});

// query гэдэг функц экспорт хийж, бусад файлуудад ашиглах боломжийг олгоно.
module.exports = {
  query: (text, params) => pool.query(text, params),
};
