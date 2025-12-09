const db = require('../db');

async function updateAdminCompanies() {
  try {
    const result = await db.query(
      "UPDATE users SET allowed_companies = ARRAY['data', 'dataAP', 'dataMall', 'dataMeta', 'dataNany', 'dataSoyombo', 'dataGI'] WHERE username = 'admin' RETURNING id, username, allowed_companies"
    );
    console.log('✅ Updated admin:', result.rows[0]);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

updateAdminCompanies();
