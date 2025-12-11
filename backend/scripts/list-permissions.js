const { query } = require('../db');

async function listPermissions() {
  try {
    const result = await query('SELECT * FROM permissions ORDER BY id');
    console.log('\n=== ОДОО БАЙГАА PERMISSIONS ===\n');
    result.rows.forEach(p => {
      console.log(`${p.id}. ${p.name}`);
      console.log(`   Тайлбар: ${p.description}\n`);
    });
    console.log(`Нийт: ${result.rows.length} эрх\n`);
    process.exit(0);
  } catch (error) {
    console.error('Алдаа:', error);
    process.exit(1);
  }
}

listPermissions();
