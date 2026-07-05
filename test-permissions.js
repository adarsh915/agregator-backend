const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function testPermissions() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SECRET_KEY');
    process.exit(1);
  }

  const client = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  console.log('🧪 Testing database queries...\n');

  try {
    // 1. Test admin user exists
    console.log('1️⃣ Checking admin user...');
    const { data: adminUser, error: userError } = await client
      .from('aggregator_users')
      .select('id, email, display_name, is_active')
      .eq('email', 'admin@kael.com')
      .maybeSingle();

    if (userError) throw new Error(`User query error: ${userError.message}`);
    if (!adminUser) throw new Error('Admin user not found!');
    
    console.log('✅ Admin user found:', adminUser.email);
    console.log('   User ID:', adminUser.id);
    console.log('   Active:', adminUser.is_active);

    // 2. Test user_roles
    console.log('\n2️⃣ Checking user roles...');
    const { data: userRoles, error: rolesError } = await client
      .from('user_roles')
      .select(`
        role_id,
        assigned_at,
        revoked_at,
        role:roles (
          id,
          name,
          display_name,
          is_active
        )
      `)
      .eq('user_id', adminUser.id);

    if (rolesError) throw new Error(`User roles query error: ${rolesError.message}`);
    
    console.log('✅ User roles:', userRoles.length);
    userRoles.forEach(ur => {
      console.log(`   - ${ur.role.display_name} (${ur.role.name})`);
      console.log(`     Active: ${ur.role.is_active}, Revoked: ${ur.revoked_at ? 'Yes' : 'No'}`);
    });

    // 3. Test getUserPermissions query
    console.log('\n3️⃣ Testing getUserPermissions query...');
    const { data: permData, error: permError } = await client
      .from('user_roles')
      .select(`
        role:roles!inner (
          role_permissions!inner (
            permission:permissions (
              name
            )
          )
        )
      `)
      .eq('user_id', adminUser.id)
      .is('revoked_at', null);

    if (permError) {
      console.error('❌ Permission query error:', permError);
      throw permError;
    }

    console.log('✅ Query successful, extracting permissions...');
    
    const permissions = new Set();
    (permData || []).forEach(ur => {
      if (ur.role && ur.role.role_permissions) {
        ur.role.role_permissions.forEach(rp => {
          if (rp.permission && rp.permission.name) {
            permissions.add(rp.permission.name);
          }
        });
      }
    });

    const permArray = Array.from(permissions);
    console.log(`✅ Found ${permArray.length} permissions:`);
    permArray.forEach(p => console.log(`   - ${p}`));

    // 4. Check if roles.read permission exists
    console.log('\n4️⃣ Checking for roles.read permission...');
    const hasRolesRead = permArray.includes('roles.read');
    console.log(hasRolesRead ? '✅ Has roles.read permission' : '❌ Missing roles.read permission');

    // 5. Check all permissions in database
    console.log('\n5️⃣ Checking all permissions in database...');
    const { data: allPerms, error: allPermsError } = await client
      .from('permissions')
      .select('name')
      .order('name');

    if (allPermsError) throw allPermsError;
    console.log(`✅ Total permissions in database: ${allPerms.length}`);

    console.log('\n═══════════════════════════════════════');
    console.log('  📊 TEST SUMMARY');
    console.log('═══════════════════════════════════════');
    console.log(`Admin user: ${adminUser.email}`);
    console.log(`User roles: ${userRoles.length}`);
    console.log(`User permissions: ${permArray.length}`);
    console.log(`Has roles.read: ${hasRolesRead ? 'Yes' : 'No'}`);
    console.log('═══════════════════════════════════════\n');

    if (permArray.length === 0) {
      console.log('⚠️  WARNING: User has no permissions!');
      console.log('   This means user_roles or role_permissions is empty.');
      console.log('   Run: npm run assign:admin');
    }

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testPermissions();
