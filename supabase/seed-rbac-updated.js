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

  console.log('🔐 Seeding RBAC: Permissions and Roles (Updated for Your UI)...\n');

  try {
    // ================================================
    // 1. SEED PERMISSIONS - MATCHING YOUR SIDEBAR
    // ================================================
    console.log('📋 Seeding permissions...');
    
    const permissions = [
      // Dashboard/Overview
      { name: 'dashboard.read', display_name: 'View Dashboard', resource: 'dashboard', action: 'read', description: 'View overview dashboard and statistics' },
      
      // Enterprise Management
      { name: 'enterprises.create', display_name: 'Create Enterprise', resource: 'enterprises', action: 'create', description: 'Create new enterprises' },
      { name: 'enterprises.read', display_name: 'View Enterprises', resource: 'enterprises', action: 'read', description: 'View enterprise details' },
      { name: 'enterprises.update', display_name: 'Update Enterprise', resource: 'enterprises', action: 'update', description: 'Update enterprise information' },
      { name: 'enterprises.delete', display_name: 'Delete Enterprise', resource: 'enterprises', action: 'delete', description: 'Soft delete enterprises' },
      { name: 'enterprises.restore', display_name: 'Restore Enterprise', resource: 'enterprises', action: 'manage', description: 'Restore deleted enterprises' },
      
      // Detections
      { name: 'detections.read', display_name: 'View Detections', resource: 'detections', action: 'read', description: 'View detection analytics and data' },
      
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
      
      // Package Management
      { name: 'packages.create', display_name: 'Create Package', resource: 'packages', action: 'create', description: 'Create billing packages' },
      { name: 'packages.read', display_name: 'View Packages', resource: 'packages', action: 'read', description: 'View package details' },
      { name: 'packages.update', display_name: 'Update Package', resource: 'packages', action: 'update', description: 'Update package information' },
      { name: 'packages.delete', display_name: 'Delete Package', resource: 'packages', action: 'delete', description: 'Deactivate packages' },
      
      // Billing Records
      { name: 'billing.create', display_name: 'Create Billing Record', resource: 'billing', action: 'create', description: 'Create billing records manually' },
      { name: 'billing.read', display_name: 'View Billing Records', resource: 'billing', action: 'read', description: 'View billing records' },
      { name: 'billing.update', display_name: 'Update Billing Record', resource: 'billing', action: 'update', description: 'Update billing status' },
      { name: 'billing.delete', display_name: 'Delete Billing Record', resource: 'billing', action: 'delete', description: 'Delete billing records' },
      
      // Audit Logs
      { name: 'audit_logs.read', display_name: 'View Audit Logs', resource: 'audit_logs', action: 'read', description: 'View system audit logs' },
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
    // 2. SEED ROLES (keep existing)
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

    const getPermissionIds = (permNames) => {
      return allPermissions
        .filter(p => permNames.includes(p.name))
        .map(p => p.id);
    };

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
      'dashboard.read',
      'enterprises.create', 'enterprises.read', 'enterprises.update', 'enterprises.delete', 'enterprises.restore',
      'detections.read',
      'users.read',
      'roles.read',
      'permissions.read',
      'packages.read',
      'billing.read',
      'audit_logs.read'
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
      'dashboard.read',
      'enterprises.read',
      'detections.read',
      'users.read',
      'roles.read',
      'permissions.read',
      'packages.read',
      'billing.read'
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
      'dashboard.read',
      'enterprises.read',
      'packages.create', 'packages.read', 'packages.update',
      'billing.create', 'billing.read', 'billing.update'
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
      'dashboard.read',
      'enterprises.create', 'enterprises.read', 'enterprises.update', 'enterprises.delete', 'enterprises.restore',
      'detections.read',
      'users.read'
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
    console.log('  🎉 RBAC SEEDING COMPLETED (UPDATED)');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`  ✅ ${permissions.length} permissions created`);
    console.log(`  ✅ ${roles.length} roles created`);
    console.log('  ✅ Permissions assigned to all roles');
    console.log('═══════════════════════════════════════════════════════\n');
    
    console.log('📊 NEW PERMISSION MODULES IN UI:');
    console.log('  1. Dashboard/Overview');
    console.log('  2. Enterprises');
    console.log('  3. Detections');
    console.log('  4. Users');
    console.log('  5. Roles & Permissions');
    console.log('  6. Packages');
    console.log('  7. Billing Records');
    console.log('  8. Audit Logs\n');

  } catch (error) {
    console.error('❌ Error seeding RBAC:', error.message);
    process.exit(1);
  }
}

seedRBAC();
