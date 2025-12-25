const { pool } = require('../db');

async function addTextStyleColumns() {
  const client = await pool.connect();

  try {
    console.log('📝 Adding text style columns to daily_tasks table...');

    await client.query(`
      ALTER TABLE daily_tasks
      ADD COLUMN IF NOT EXISTS title_font_size INTEGER DEFAULT 17;
    `);

    await client.query(`
      ALTER TABLE daily_tasks
      ADD COLUMN IF NOT EXISTS title_color VARCHAR(7) DEFAULT '#ffffff';
    `);

    console.log('✅ Text style columns added successfully!');
    console.log('✅ Migration completed!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addTextStyleColumns();
