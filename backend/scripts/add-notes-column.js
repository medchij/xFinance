const { pool } = require('../db');

async function addNotesColumn() {
  try {
    console.log('Adding notes column to daily_tasks table...');
    
    await pool.query(`
      ALTER TABLE daily_tasks
      ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT ''
    `);
    
    console.log('✅ Notes column added successfully');
  } catch (error) {
    console.error('❌ Error adding notes column:', error);
  }
}

addNotesColumn();
