const db = require('../db');

async function addAllowedCompaniesColumn() {
  try {
    console.log('Adding allowed_companies column to users table...');
    
    // Check if column exists
    const checkQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='users' AND column_name='allowed_companies'
    `;
    const checkResult = await db.query(checkQuery);
    
    if (checkResult.rows.length === 0) {
      // Add column
      await db.query(`
        ALTER TABLE users 
        ADD COLUMN allowed_companies TEXT[] DEFAULT NULL
      `);
      console.log('✅ Column allowed_companies added successfully');
      
      // Set admin's allowed companies
      await db.query(`
        UPDATE users 
        SET allowed_companies = ARRAY['dataNany', 'dataMall']
        WHERE username = 'admin'
      `);
      console.log('✅ Admin allowed_companies set to dataNany and dataMall');
    } else {
      console.log('⚠️ Column allowed_companies already exists');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

addAllowedCompaniesColumn();
