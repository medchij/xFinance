/**
 * Add required admin permissions to database
 * This ensures all admin features have proper permissions
 */

const { query } = require('../db');

async function addAdminPermissions() {
  try {
    console.log('🔧 Adding admin permissions...');

    // Define all required permissions
    const permissions = [
      { name: 'view_admin_page', description: 'Админ хуудсыг харах' },
      { name: 'manage_users', description: 'Хэрэглэгч удирдах (нэмэх, устгах, засах)' },
      { name: 'manage_roles', description: 'Ажил үүрэг удирдах' },
      { name: 'manage_groups', description: 'Хэрэглэгчийн бүлэг удирдах' },
      { name: 'manage_permissions', description: 'Эрх удирдах' },
      { name: 'view_dashboard', description: 'Хяналтын самбарыг харах' },
      { name: 'submit_transaction', description: 'Гүйлгээ хийх' },
      { name: 'approve_transaction', description: 'Гүйлгээ батлах' },
      { name: 'view_reports', description: 'Тайлан харах' },
      { name: 'manage_settings', description: 'Тохиргоо удирдах' },
    ];

    // Insert each permission (ignore if already exists)
    for (const perm of permissions) {
      try {
        await query(
          `INSERT INTO permissions (name, description) 
           VALUES ($1, $2) 
           ON CONFLICT (name) DO UPDATE SET description = $2`,
          [perm.name, perm.description]
        );
        console.log(`✅ Added/Updated permission: ${perm.name}`);
      } catch (err) {
        console.error(`❌ Error adding permission ${perm.name}:`, err.message);
      }
    }

    // Assign all permissions to admin role (role_id = 1)
    const result = await query('SELECT id FROM permissions');
    const permissionIds = result.rows.map(row => row.id);

    for (const permId of permissionIds) {
      try {
        await query(
          `INSERT INTO role_permissions (role_id, permission_id) 
           VALUES (1, $1) 
           ON CONFLICT (role_id, permission_id) DO NOTHING`,
          [permId]
        );
      } catch (err) {
        // Ignore duplicate errors
      }
    }

    console.log('✅ Admin permissions setup complete!');
    console.log(`📊 Total permissions: ${permissions.length}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting up admin permissions:', error);
    process.exit(1);
  }
}

addAdminPermissions();
