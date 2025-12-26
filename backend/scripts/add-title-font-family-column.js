const { Pool } = require('pg');
const logger = require('../logger');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function addTitleFontFamilyColumn() {
  try {
    await pool.query(`
      ALTER TABLE daily_tasks 
      ADD COLUMN IF NOT EXISTS title_font_family TEXT DEFAULT 'Headline'
    `);
    logger.info('Added title_font_family column to daily_tasks');

    console.log('✅ Title font family column added successfully');
  } catch (error) {
    console.error('❌ Error adding title font family column:', error);
  } finally {
    await pool.end();
  }
}

addTitleFontFamilyColumn();
