const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function testConnection() {
  console.log('🔍 Testing Supabase Connection...\n');

  // Check environment variables
  console.log('📋 Environment Variables:');
  console.log(`   SUPABASE_URL: ${process.env.SUPABASE_URL}`);
  console.log(`   SUPABASE_SECRET_KEY: ${process.env.SUPABASE_SECRET_KEY ? process.env.SUPABASE_SECRET_KEY.substring(0, 20) + '...' : 'NOT SET'}`);
  console.log(`   JWT_SECRET: ${process.env.JWT_SECRET ? '✓ Set' : '✗ Not Set'}`);
  console.log('');

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SECRET_KEY in .env file');
    process.exit(1);
  }

  try {
    // Create Supabase client
    const client = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SECRET_KEY,
      {
        auth: { persistSession: false, autoRefreshToken: false }
      }
    );

    console.log('🔌 Attempting to connect to Supabase...');

    // Test 1: Check if we can query any table
    console.log('\n📊 Test 1: Checking database connection...');
    const { data: tables, error: tablesError } = await client
      .from('aggregator_users')
      .select('id', { count: 'exact', head: true });

    if (tablesError) {
      if (tablesError.message.includes('relation') || tablesError.message.includes('does not exist')) {
        console.log('⚠️  Table "aggregator_users" does not exist');
        console.log('   → You need to run the schema.sql file in Supabase SQL Editor');
        console.log('   → File: backend/supabase/schema.sql');
        console.log('');
        console.log('✅ Connection successful, but tables not created yet!');
        return;
      } else {
        throw tablesError;
      }
    }

    console.log('✅ Connection successful!');
    console.log('✅ Table "aggregator_users" exists!');

    // Test 2: Check if admin user exists
    console.log('\n📊 Test 2: Checking for admin user...');
    const { data: users, error: usersError } = await client
      .from('aggregator_users')
      .select('email')
      .eq('email', 'admin@kael.com')
      .maybeSingle();

    if (usersError) throw usersError;

    if (users) {
      console.log('✅ Admin user exists!');
      console.log(`   Email: ${users.email}`);
    } else {
      console.log('⚠️  Admin user not found');
      console.log('   → Run: npm run seed');
    }

    // Test 3: Check enterprises table
    console.log('\n📊 Test 3: Checking enterprises table...');
    const { count, error: countError } = await client
      .from('enterprises')
      .select('*', { count: 'exact', head: true });

    if (countError) throw countError;

    console.log(`✅ Enterprises table exists!`);
    console.log(`   Current enterprises: ${count || 0}`);

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  🎉 ALL TESTS PASSED!');
    console.log('═══════════════════════════════════════════════════════');
    console.log('  Your Supabase connection is working correctly.');
    console.log('  You can now start the backend server: npm run dev');
    console.log('═══════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Connection test failed!');
    console.error('');
    console.error('Error details:');
    console.error(`   Message: ${error.message}`);
    console.error(`   Code: ${error.code || 'N/A'}`);
    console.error('');

    if (error.message.includes('Invalid API key')) {
      console.error('💡 Solution:');
      console.error('   1. Go to Supabase Dashboard > Settings > API');
      console.error('   2. Copy the "service_role" secret key (NOT anon public)');
      console.error('   3. Update SUPABASE_SECRET_KEY in .env file');
      console.error('   4. Make sure the key is complete (starts with "eyJ...")');
    } else if (error.message.includes('fetch')) {
      console.error('💡 Solution:');
      console.error('   1. Check your SUPABASE_URL is correct');
      console.error('   2. Check your internet connection');
      console.error('   3. Make sure the URL starts with "https://"');
    } else {
      console.error('💡 General troubleshooting:');
      console.error('   1. Verify your .env file has correct values');
      console.error('   2. Check Supabase Dashboard > Settings > API');
      console.error('   3. Make sure you created the Supabase project');
    }

    process.exit(1);
  }
}

testConnection();
