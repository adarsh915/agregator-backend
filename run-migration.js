require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SECRET_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const sql = fs.readFileSync(path.join(__dirname, 'supabase', 'packages-schema.sql'), 'utf-8');
  
  // Try to use Postgres RPC if available, or just log instructions.
  console.log("Running SQL script (via REST API might not work for DDL unless you have an RPC setup)...");
  
  // Since we can't easily run DDL through the standard supabase-js client without a custom RPC function,
  // let's check if there's an 'exec_sql' RPC function available.
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
  
  if (error) {
    console.error("RPC exec_sql failed (maybe it doesn't exist). Please run the SQL manually in the Supabase Dashboard SQL Editor.");
    console.error(error);
  } else {
    console.log("Migration executed successfully!");
    console.log(data);
  }
}

run();
