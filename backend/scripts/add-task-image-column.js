const { pool } = require('../db');

async function addTaskImageColumn() {
  const client = await pool.connect();
  
  try {
    console.log('📝 Adding image_url column to daily_tasks table...');
    await client.query(`
      ALTER TABLE daily_tasks 
      ADD COLUMN IF NOT EXISTS image_url TEXT;
    `);
    
    console.log('✅ Column added successfully!');
  } catch (error) {
    console.error('❌ Error adding column:', error);
    throw error;
  } finally {
    client.release();
  }
}

addTaskImageColumn()
  .then(() => {
    console.log('✅ Migration completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
