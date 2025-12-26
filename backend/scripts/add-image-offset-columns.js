const { Pool } = require('pg');
const logger = require('../logger');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function addImageOffsetColumns() {
  try {
    await pool.query(`
      ALTER TABLE daily_tasks 
      ADD COLUMN IF NOT EXISTS image_offset_x INTEGER DEFAULT 0
    `);
    logger.info('Added image_offset_x column to daily_tasks');

    await pool.query(`
      ALTER TABLE daily_tasks 
      ADD COLUMN IF NOT EXISTS image_offset_y INTEGER DEFAULT 0
    `);
    logger.info('Added image_offset_y column to daily_tasks');

    console.log('✅ Image offset columns added successfully');
  } catch (error) {
    console.error('❌ Error adding image offset columns:', error);
  } finally {
    await pool.end();
  }
}

addImageOffsetColumns();
