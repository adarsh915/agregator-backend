const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function testUsers() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SECRET_KEY');
    process.exit(1);
  }

  const client = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  console.log('🧪 Testing user queries...\n');

  try {
    // 1. Simple query - get all users
    console.log('1️⃣ Testing simple user query...');
    const { data: simpleUsers, error: simpleError } = await client
      .from('aggregator_users')
      .select('*')
      .order('created_at', { ascending: false });

    if (simpleError) {
      console.error('❌ Simple query error:', simpleError);
      throw simpleError;
    }

    console.log(`✅ Found ${simpleUsers.length} users`);
    simpleUsers.forEach(u => {
      console.log(`   - ${u.email} (${u.display_name})`);
    });

    // 2. Query with user_roles join
    console.log('\n2️⃣ Testing user query with roles join...');
    const { data: usersWithRoles, error: joinError } = await client
      .from('aggregator_users')
      .select(`
        *,
        user_roles!user_roles_user_id_fkey (
          role:roles (
            id,
            name,
            display_name
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (joinError) {
      console.error('❌ Join query error:', joinError);
      throw joinError;
    }

    console.log(`✅ Query with roles successful! Found ${usersWithRoles.length} users`);
    usersWithRoles.forEach(u => {
      const roleCount = u.user_roles?.length || 0;
      console.log(`   - ${u.email}: ${roleCount} role(s)`);
      if (u.user_roles) {
        u.user_roles.forEach(ur => {
          console.log(`      └─ ${ur.role?.display_name || 'Unknown Role'}`);
        });
      }
    });

    // 3. Test the exact transformation used by getAllUsers
    console.log('\n3️⃣ Testing data transformation...');
    const transformed = usersWithRoles.map(row => ({
      id: row.id,
      email: row.email,
      displayName: row.display_name,
      isActive: row.is_active,
      roles: (row.user_roles || []).map(ur => ({
        id: ur.role?.id,
        name: ur.role?.name,
        displayName: ur.role?.display_name
      })),
      createdAt: row.created_at,
      lastLoginAt: row.last_login_at
    }));

    console.log('✅ Transformation successful!');
    console.log('Sample transformed user:', JSON.stringify(transformed[0], null, 2));

    console.log('\n═══════════════════════════════════════');
    console.log('  ✅ ALL TESTS PASSED');
    console.log('═══════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testUsers();
