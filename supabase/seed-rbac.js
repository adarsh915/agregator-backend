const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function seedRBAC() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SECRET_KEY in .env file');
    process.exit(1);
  }

  const client = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  console.log('🔐 Seeding RBAC: Permissions and Roles...\n');

  try {
    // ================================================
    // 1. SEED PERMISSIONS
    // ================================================
    console.log('📋 Seeding permissions...');
    
    const permissions = [
      // Enterprise Management
      { name: 'enterprises.create', display_name: 'Create Enterprise', resource: 'enterprises', action: 'create', description: 'Create new enterprises' },
      { name: 'enterprises.read', display_name: 'View Enterprises', resource: 'enterprises', action: 'read', description: 'View enterprise details' },
      { name: 'enterprises.update', display_name: 'Update Enterprise', resource: 'enterprises', action: 'update', description: 'Update enterprise information' },
      { name: 'enterprises.delete', display_name: 'Delete Enterprise', resource: 'enterprises', action: 'delete', description: 'Soft delete enterprises' },
      { name: 'enterprises.restore', display_name: 'Restore Enterprise', resource: 'enterprises', action: 'manage', description: 'Restore deleted enterprises' },
      
      // User Management
      { name: 'users.create', display_name: 'Create User', resource: 'users', action: 'create', description: 'Create new admin users' },
      { name: 'users.read', display_name: 'View Users', resource: 'users', action: 'read', description: 'View user details' },
      { name: 'users.update', display_name: 'Update User', resource: 'users', action: 'update', description: 'Update user information' },
      { name: 'users.delete', display_name: 'Delete User', resource: 'users', action: 'delete', description: 'Deactivate users' },
      { name: 'users.manage', display_name: 'Manage User Roles', resource: 'users', action: 'manage', description: 'Assign/remove user roles' },
      
      // Role Management
      { name: 'roles.create', display_name: 'Create Role', resource: 'roles', action: 'create', description: 'Create new custom roles' },
      { name: 'roles.read', display_name: 'View Roles', resource: 'roles', action: 'read', description: 'View role details' },
      { name: 'roles.update', display_name: 'Update Role', resource: 'roles', action: 'update', description: 'Update role information' },
      { name: 'roles.delete', display_name: 'Delete Role', resource: 'roles', action: 'delete', description: 'Delete custom roles' },
      { name: 'roles.assign', display_name: 'Assign Role to User', resource: 'roles', action: 'manage', description: 'Assign roles to users' },
      
      // Permission Management
      { name: 'permissions.read', display_name: 'View Permissions', resource: 'permissions', action: 'read', description: 'View all permissions' },
      { name: 'permissions.manage', display_name: 'Manage Permissions', resource: 'permissions', action: 'manage', description: 'Assign permissions to roles' },
      
      // Analytics & Reports
      { name: 'analytics.read', display_name: 'View Analytics', resource: 'analytics', action: 'read', description: 'View analytics dashboard' },
      { name: 'reports.create', display_name: 'Generate Reports', resource: 'reports', action: 'create', description: 'Generate custom reports' },
      { name: 'reports.read', display_name: 'View Reports', resource: 'reports', action: 'read', description: 'View generated reports' }
    ];


    // Insert permissions (ignore duplicates)
    for (const perm of permissions) {
      const { error } = await client
        .from('permissions')
        .upsert(perm, { onConflict: 'name' });
      
      if (error && !error.message.includes('duplicate')) {
        console.error(`  ❌ Error inserting permission ${perm.name}:`, error.message);
      }
    }
    
    console.log(`  ✅ ${permissions.length} permissions seeded\n`);

    // ================================================
    // 2. SEED ROLES
    // ================================================
    console.log('🎭 Seeding roles...');
    
    const roles = [
      {
        name: 'super_admin',
        display_name: 'Super Administrator',
        description: 'Full system access with all permissions',
        is_system: true,
        is_active: true
      },
      {
        name: 'admin',
        display_name: 'Administrator',
        description: 'Manage enterprises and view system data',
        is_system: true,
        is_active: true
      },
      {
        name: 'viewer',
        display_name: 'Viewer',
        description: 'Read-only access to all data',
        is_system: true,
        is_active: true
      },
      {
        name: 'billing_manager',
        display_name: 'Billing Manager',
        description: 'Manage enterprise billing and subscriptions',
        is_system: false,
        is_active: true
      },
      {
        name: 'enterprise_manager',
        display_name: 'Enterprise Manager',
        description: 'Full enterprise management without system access',
        is_system: false,
        is_active: true
      }
    ];

    // Insert roles (ignore duplicates)
    for (const role of roles) {
      const { error } = await client
        .from('roles')
        .upsert(role, { onConflict: 'name' });
      
      if (error && !error.message.includes('duplicate')) {
        console.error(`  ❌ Error inserting role ${role.name}:`, error.message);
      }
    }
    
    console.log(`  ✅ ${roles.length} roles seeded\n`);


    // ================================================
    // 3. ASSIGN PERMISSIONS TO ROLES
    // ================================================
    console.log('🔗 Assigning permissions to roles...');

    // Get all permissions and roles
    const { data: allPermissions } = await client
      .from('permissions')
      .select('id, name');
    
    const { data: allRoles } = await client
      .from('roles')
      .select('id, name');

    if (!allPermissions || !allRoles) {
      throw new Error('Failed to fetch permissions or roles');
    }

    // Helper function to get permission IDs by names
    const getPermissionIds = (permNames) => {
      return allPermissions
        .filter(p => permNames.includes(p.name))
        .map(p => p.id);
    };

    // Helper function to get role ID by name
    const getRoleId = (roleName) => {
      return allRoles.find(r => r.name === roleName)?.id;
    };

    // SUPER ADMIN - ALL PERMISSIONS
    const superAdminId = getRoleId('super_admin');
    const allPermissionIds = allPermissions.map(p => p.id);
    
    for (const permId of allPermissionIds) {
      await client
        .from('role_permissions')
        .upsert({ role_id: superAdminId, permission_id: permId }, 
                { onConflict: 'role_id,permission_id' });
    }
    console.log(`  ✅ super_admin: ${allPermissionIds.length} permissions assigned`);

    // ADMIN ROLE
    const adminId = getRoleId('admin');
    const adminPermissions = getPermissionIds([
      'enterprises.create', 'enterprises.read', 'enterprises.update', 'enterprises.delete', 'enterprises.restore',
      'users.read',
      'roles.read',
      'permissions.read',
      'analytics.read'
    ]);
    
    for (const permId of adminPermissions) {
      await client
        .from('role_permissions')
        .upsert({ role_id: adminId, permission_id: permId }, 
                { onConflict: 'role_id,permission_id' });
    }
    console.log(`  ✅ admin: ${adminPermissions.length} permissions assigned`);

    // VIEWER ROLE
    const viewerId = getRoleId('viewer');
    const viewerPermissions = getPermissionIds([
      'enterprises.read',
      'users.read',
      'roles.read',
      'permissions.read',
      'analytics.read'
    ]);
    
    for (const permId of viewerPermissions) {
      await client
        .from('role_permissions')
        .upsert({ role_id: viewerId, permission_id: permId }, 
                { onConflict: 'role_id,permission_id' });
    }
    console.log(`  ✅ viewer: ${viewerPermissions.length} permissions assigned`);


    // BILLING MANAGER ROLE
    const billingManagerId = getRoleId('billing_manager');
    const billingManagerPermissions = getPermissionIds([
      'enterprises.read',
      'enterprises.update',
      'reports.read'
    ]);
    
    for (const permId of billingManagerPermissions) {
      await client
        .from('role_permissions')
        .upsert({ role_id: billingManagerId, permission_id: permId }, 
                { onConflict: 'role_id,permission_id' });
    }
    console.log(`  ✅ billing_manager: ${billingManagerPermissions.length} permissions assigned`);

    // ENTERPRISE MANAGER ROLE
    const enterpriseManagerId = getRoleId('enterprise_manager');
    const enterpriseManagerPermissions = getPermissionIds([
      'enterprises.create', 'enterprises.read', 'enterprises.update', 'enterprises.delete', 'enterprises.restore',
      'users.read',
      'analytics.read'
    ]);
    
    for (const permId of enterpriseManagerPermissions) {
      await client
        .from('role_permissions')
        .upsert({ role_id: enterpriseManagerId, permission_id: permId }, 
                { onConflict: 'role_id,permission_id' });
    }
    console.log(`  ✅ enterprise_manager: ${enterpriseManagerPermissions.length} permissions assigned\n`);

    // ================================================
    // 4. SUMMARY
    // ================================================
    console.log('═══════════════════════════════════════════════════════');
    console.log('  🎉 RBAC SEEDING COMPLETED SUCCESSFULLY');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`  ✅ ${permissions.length} permissions created`);
    console.log(`  ✅ ${roles.length} roles created`);
    console.log('  ✅ Permissions assigned to all roles');
    console.log('═══════════════════════════════════════════════════════\n');
    
    console.log('📝 NEXT STEPS:');
    console.log('1. Assign super_admin role to your admin user:');
    console.log('   Run this SQL in Supabase SQL Editor:\n');
    console.log('   INSERT INTO user_roles (user_id, role_id, assigned_by)');
    console.log('   SELECT');
    console.log("     (SELECT id FROM aggregator_users WHERE email = 'admin@kael.com'),");
    console.log("     (SELECT id FROM roles WHERE name = 'super_admin'),");
    console.log("     (SELECT id FROM aggregator_users WHERE email = 'admin@kael.com');\n");
    console.log('2. Start the backend: npm run dev');
    console.log('3. Test RBAC APIs in Postman\n');

  } catch (error) {
    console.error('❌ Error seeding RBAC:', error.message);
    process.exit(1);
  }
}

seedRBAC();
