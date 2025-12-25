const { pool } = require('../db');

async function addImagePositionColumn() {
  const client = await pool.connect();
  
  try {
    console.log('📝 Adding image_position column to daily_tasks table...');
    
    await client.query(`
      ALTER TABLE daily_tasks 
      ADD COLUMN IF NOT EXISTS image_position VARCHAR(20) DEFAULT 'contain';
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

addImagePositionColumn();
