#!/usr/bin/env node

/**
 * Quick script to verify if the aggregator_audit_logs table exists
 * Run: node check-audit-table.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

async function checkAuditLogTable() {
  console.log('\n🔍 Checking audit log table...\n');
  
  try {
    // Try to query the table
    const { data, error, count } = await supabase
      .from('aggregator_audit_logs')
      .select('*', { count: 'exact', head: false })
      .limit(5);
    
    if (error) {
      console.error('❌ Table check failed:');
      console.error('   Error:', error.message);
      console.error('   Code:', error.code);
      console.error('\n💡 Solution: Run the SQL schema in Supabase Dashboard');
      console.error('   File: backend/supabase/audit-log-schema.sql\n');
      process.exit(1);
    }
    
    console.log('✅ Table "aggregator_audit_logs" exists!');
    console.log(`   Total records: ${count || 0}`);
    
    if (data && data.length > 0) {
      console.log('\n📊 Sample records:');
      data.forEach((log, i) => {
        console.log(`   ${i + 1}. [${log.created_at}] ${log.action} by ${log.actor_email}`);
      });
    } else {
      console.log('\n📝 No audit logs yet. They will be created when you perform admin actions.');
    }
    
    console.log('\n✅ Audit log system is ready!\n');
    
  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    process.exit(1);
  }
}

checkAuditLogTable();
