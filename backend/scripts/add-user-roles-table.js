const { query } = require('../db');

const addUserRolesTable = async () => {
  try {
    console.log('🔄 Checking if user_roles table exists...');
    
    // Check if table exists
    const checkTable = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'user_roles'
      );
    `);

    if (checkTable.rows[0].exists) {
      console.log('✅ user_roles table already exists');
      return;
    }

    // Create user_roles junction table
    console.log('📝 Creating user_roles table...');
    await query(`
      CREATE TABLE user_roles (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role_id INT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, role_id)
      );
    `);

    console.log('✅ user_roles table created successfully');

    // Create index for faster lookups
    console.log('📝 Creating index on user_roles...');
    await query(`
      CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
    `);
    await query(`
      CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);
    `);

    console.log('✅ Indexes created successfully');

    // Migrate existing role_id data to user_roles table
    console.log('🔄 Migrating existing role assignments...');
    await query(`
      INSERT INTO user_roles (user_id, role_id)
      SELECT id, role_id FROM users
      WHERE role_id IS NOT NULL
      ON CONFLICT (user_id, role_id) DO NOTHING;
    `);

    console.log('✅ Migration completed');

    console.log('🎉 user_roles table setup completed successfully');
  } catch (error) {
    console.error('❌ Error setting up user_roles table:', error.message);
    throw error;
  }
};

// Run if executed directly
if (require.main === module) {
  addUserRolesTable()
    .then(() => {
      console.log('✅ Script completed');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Script failed:', err);
      process.exit(1);
    });
}

module.exports = { addUserRolesTable };
