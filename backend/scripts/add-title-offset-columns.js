const { pool } = require('../db');

async function addTitleOffsetColumns() {
  const client = await pool.connect();

  try {
    console.log('📝 Adding title_offset_x and title_offset_y columns to daily_tasks table...');

    await client.query(`
      ALTER TABLE daily_tasks
      ADD COLUMN IF NOT EXISTS title_offset_x INTEGER DEFAULT 0;
    `);

    await client.query(`
      ALTER TABLE daily_tasks
      ADD COLUMN IF NOT EXISTS title_offset_y INTEGER DEFAULT 0;
    `);

    console.log('✅ Columns added successfully!');
    console.log('✅ Migration completed!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addTitleOffsetColumns();
