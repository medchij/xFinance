/**
 * List all actions with their codes
 */

const { query } = require('../db');

async function listActions() {
  try {
    const result = await query(`
      SELECT code, name, description, category 
      FROM actions 
      ORDER BY code
    `);

    console.log('\n=== ҮЙЛДЛҮҮДИЙН ЖАГСААЛТ ===\n');
    
    let currentCategory = '';
    result.rows.forEach(action => {
      if (currentCategory !== action.category) {
        currentCategory = action.category;
        console.log(`\n📁 ${currentCategory.toUpperCase()}`);
        console.log('─'.repeat(60));
      }
      console.log(`${action.code.toString().padEnd(5)} | ${action.name.padEnd(25)} | ${action.description}`);
    });

    console.log(`\n\n✅ Нийт: ${result.rows.length} үйлдэл\n`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Алдаа:', error);
    process.exit(1);
  }
}

listActions();
