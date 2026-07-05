const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function assignSuperAdminRole() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SECRET_KEY in .env file');
    process.exit(1);
  }

  const client = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  console.log('🔐 Assigning super_admin role to admin@kael.com...\n');

  try {
    // Get admin user
    const { data: adminUser, error: userError } = await client
      .from('aggregator_users')
      .select('id, email, display_name')
      .eq('email', 'admin@kael.com')
      .single();

    if (userError || !adminUser) {
      console.error('❌ Admin user not found. Run: node supabase/seed-admin.js first');
      process.exit(1);
    }

    console.log(`✅ Found user: ${adminUser.display_name} (${adminUser.email})`);

    // Get super_admin role
    const { data: superAdminRole, error: roleError } = await client
      .from('roles')
      .select('id, name, display_name')
      .eq('name', 'super_admin')
      .single();

    if (roleError || !superAdminRole) {
      console.error('❌ super_admin role not found. Run: node supabase/seed-rbac.js first');
      process.exit(1);
    }

    console.log(`✅ Found role: ${superAdminRole.display_name}`);

    // Check if already assigned
    const { data: existing } = await client
      .from('user_roles')
      .select('*')
      .eq('user_id', adminUser.id)
      .eq('role_id', superAdminRole.id)
      .maybeSingle();

    if (existing) {
      console.log('\n⚠️  super_admin role already assigned to this user');
      console.log('✅ Assignment verified!\n');
      return;
    }

    // Assign role
    const { error: assignError } = await client
      .from('user_roles')
      .insert({
        user_id: adminUser.id,
        role_id: superAdminRole.id,
        assigned_by: adminUser.id
      });

    if (assignError) {
      throw assignError;
    }

    console.log('\n✅ super_admin role assigned successfully!');
    console.log('═══════════════════════════════════════════════════════');
    console.log('  User can now login with full permissions');
    console.log('═══════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error assigning role:', error.message);
    process.exit(1);
  }
}

assignSuperAdminRole();
