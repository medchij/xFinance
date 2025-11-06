const db = require('../db');

async function addIsActiveColumn() {
  try {
    console.log('Adding is_active column to users table...');
    
    // Check if column exists
    const checkQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='users' AND column_name='is_active'
    `;
    const checkResult = await db.query(checkQuery);
    
    if (checkResult.rows.length === 0) {
      // Add column
      await db.query(`
        ALTER TABLE users 
        ADD COLUMN is_active BOOLEAN DEFAULT TRUE
      `);
      console.log('✅ Column is_active added successfully');
      
      // Set all existing users as active
      await db.query(`
        UPDATE users 
        SET is_active = TRUE 
        WHERE is_active IS NULL
      `);
      console.log('✅ All existing users set as active');
    } else {
      console.log('⚠️ Column is_active already exists');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

addIsActiveColumn();
