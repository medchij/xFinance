/**
 * Create actions table for permission-based system
 * Each action has a numeric code for easy reference
 */

const { query } = require('../db');

async function createActionsTable() {
  try {
    console.log('🔨 Creating actions table...');

    // Create actions table
    await query(`
      CREATE TABLE IF NOT EXISTS actions (
        id SERIAL PRIMARY KEY,
        code INTEGER UNIQUE NOT NULL,
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        category VARCHAR(50) DEFAULT 'general',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Actions table created');

    // Create role_actions junction table
    await query(`
      CREATE TABLE IF NOT EXISTS role_actions (
        id SERIAL PRIMARY KEY,
        role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        action_code INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(role_id, action_code)
      )
    `);
    console.log('✅ Role_actions table created');

    // Insert actions with numeric codes
    const actions = [
      // Dashboard & Navigation - 100 series
      { code: 101, name: 'view_dashboard', description: 'Хяналтын самбарыг харах', category: 'dashboard' },
      { code: 102, name: 'view_admin_page', description: 'Админ хуудсыг харах', category: 'admin' },
      { code: 103, name: 'view_settings_page', description: 'Тохиргооны хуудсыг харах', category: 'settings' },

      // User Management - 200 series
      { code: 201, name: 'view_users', description: 'Хэрэглэгчийн жагсаалт харах', category: 'users' },
      { code: 202, name: 'create_user', description: 'Шинэ хэрэглэгч үүсгэх', category: 'users' },
      { code: 203, name: 'edit_user', description: 'Хэрэглэгч өөрчлөх', category: 'users' },
      { code: 204, name: 'delete_user', description: 'Хэрэглэгч устгах', category: 'users' },
      { code: 205, name: 'reset_user_password', description: 'Хэрэглэгчийн нууц үг сэргээх', category: 'users' },
      { code: 206, name: 'manage_user_roles', description: 'Хэрэглэгчийн ажил үүрэг өгөх', category: 'users' },
      { code: 207, name: 'manage_user_groups', description: 'Хэрэглэгчийг бүлэгт нэмэх/хасах', category: 'users' },

      // Role Management - 300 series
      { code: 301, name: 'view_roles', description: 'Ажил үүргийн жагсаалт харах', category: 'roles' },
      { code: 302, name: 'create_role', description: 'Шинэ ажил үүрэг үүсгэх', category: 'roles' },
      { code: 303, name: 'edit_role', description: 'Ажил үүрэг өөрчлөх', category: 'roles' },
      { code: 304, name: 'delete_role', description: 'Ажил үүрэг устгах', category: 'roles' },
      { code: 305, name: 'assign_role_actions', description: 'Ажил үүргэд үйлдэл хуваарилах', category: 'roles' },

      // Group Management - 400 series
      { code: 401, name: 'view_groups', description: 'Бүлгийн жагсаалт харах', category: 'groups' },
      { code: 402, name: 'create_group', description: 'Шинэ бүлэг үүсгэх', category: 'groups' },
      { code: 403, name: 'edit_group', description: 'Бүлэг өөрчлөх', category: 'groups' },
      { code: 404, name: 'delete_group', description: 'Бүлэг устгах', category: 'groups' },
      { code: 405, name: 'manage_group_members', description: 'Бүлгийн гишүүнийг удирдах', category: 'groups' },

      // Account Management - 500 series
      { code: 501, name: 'view_accounts', description: 'Дансны жагсаалт харах', category: 'accounts' },
      { code: 502, name: 'create_account', description: 'Шинэ данс үүсгэх', category: 'accounts' },
      { code: 503, name: 'edit_account', description: 'Данс өөрчлөх', category: 'accounts' },
      { code: 504, name: 'delete_account', description: 'Данс устгах', category: 'accounts' },

      // Customer Management - 600 series
      { code: 601, name: 'view_customers', description: 'Харилцагчийн жагсаалт харах', category: 'customers' },
      { code: 602, name: 'create_customer', description: 'Шинэ харилцагч үүсгэх', category: 'customers' },
      { code: 603, name: 'edit_customer', description: 'Харилцагч өөрчлөх', category: 'customers' },
      { code: 604, name: 'delete_customer', description: 'Харилцагч устгах', category: 'customers' },

      // Transaction Management - 700 series
      { code: 701, name: 'view_transactions', description: 'Гүйлгээний жагсаалт харах', category: 'transactions' },
      { code: 702, name: 'create_transaction', description: 'Шинэ гүйлгээ үүсгэх', category: 'transactions' },
      { code: 703, name: 'edit_transaction', description: 'Гүйлгээ өөрчлөх', category: 'transactions' },
      { code: 704, name: 'delete_transaction', description: 'Гүйлгээ устгах', category: 'transactions' },
      { code: 705, name: 'submit_transaction', description: 'Гүйлгээ оруулах', category: 'transactions' },
      { code: 706, name: 'approve_transaction', description: 'Гүйлгээ батлах', category: 'transactions' },
      { code: 707, name: 'reject_transaction', description: 'Гүйлгээ буцаах', category: 'transactions' },

      // Report Management - 800 series
      { code: 801, name: 'view_reports', description: 'Тайлан харах', category: 'reports' },
      { code: 802, name: 'generate_report', description: 'Тайлан үүсгэх', category: 'reports' },
      { code: 803, name: 'export_report', description: 'Тайлан экспортлох', category: 'reports' },
      { code: 804, name: 'print_report', description: 'Тайлан хэвлэх', category: 'reports' },

      // Settings & Configuration - 900 series
      { code: 901, name: 'view_settings', description: 'Тохиргоо харах', category: 'settings' },
      { code: 902, name: 'edit_settings', description: 'Тохиргоо өөрчлөх', category: 'settings' },
      { code: 903, name: 'manage_company', description: 'Компани удирдах', category: 'settings' },
      { code: 904, name: 'manage_permissions', description: 'Үйлдэл удирдах', category: 'settings' },

      // OCR & AI Features - 1000 series
      { code: 1001, name: 'use_ocr', description: 'OCR функц ашиглах', category: 'ai' },
      { code: 1002, name: 'use_ai_analysis', description: 'AI анализ ашиглах', category: 'ai' },

      // Export & Import - 1100 series
      { code: 1101, name: 'export_data', description: 'Мэдээлэл экспортлох', category: 'data' },
      { code: 1102, name: 'import_data', description: 'Мэдээлэл импортлох', category: 'data' },
      { code: 1103, name: 'backup_data', description: 'Мэдээлэл backup хийх', category: 'data' },

      // Audit & Logs - 1200 series
      { code: 1201, name: 'view_audit_logs', description: 'Аудит логийг харах', category: 'audit' },
      { code: 1202, name: 'view_error_logs', description: 'Алдааны логийг харах', category: 'audit' },
    ];

    for (const action of actions) {
      try {
        await query(
          `INSERT INTO actions (code, name, description, category) 
           VALUES ($1, $2, $3, $4) 
           ON CONFLICT (name) DO UPDATE SET 
           description = $3, category = $4`,
          [action.code, action.name, action.description, action.category]
        );
      } catch (err) {
        if (!err.message.includes('duplicate')) {
          console.error(`⚠️ Error adding ${action.name}:`, err.message);
        }
      }
    }

    console.log(`✅ Added ${actions.length} actions`);

    // Assign all actions to admin role (role_id = 1)
    const adminActions = await query('SELECT code FROM actions');
    for (const action of adminActions.rows) {
      try {
        await query(
          `INSERT INTO role_actions (role_id, action_code) 
           VALUES (1, $1) 
           ON CONFLICT (role_id, action_code) DO NOTHING`,
          [action.code]
        );
      } catch (err) {
        // Ignore errors
      }
    }

    console.log(`✅ Assigned all actions to admin role`);
    console.log('\n🎉 Actions table setup complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating actions table:', error);
    process.exit(1);
  }
}

createActionsTable();
