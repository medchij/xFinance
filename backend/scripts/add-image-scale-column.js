const { pool } = require('../db');

async function addImageScaleColumn() {
  const client = await pool.connect();
  
  try {
    console.log('📝 Adding image_scale column to daily_tasks table...');
    
    await client.query(`
      ALTER TABLE daily_tasks 
      ADD COLUMN IF NOT EXISTS image_scale NUMERIC(3,2) DEFAULT 1.0;
    `);
    
    console.log('✅ Column added successfully!');
    console.log('✅ Migration completed!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addImageScaleColumn();
