const db = require('../db');

async function addAvatarColumn() {
  try {
    console.log('Adding avatar_url column to users table...');
    
    await db.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS avatar_url TEXT
    `);
    
    console.log('✓ avatar_url column added successfully');
    process.exit(0);
  } catch (err) {
    console.error('Error adding avatar_url column:', err.message);
    process.exit(1);
  }
}

addAvatarColumn();
