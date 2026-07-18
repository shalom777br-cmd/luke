import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('SUPABASE_URL or keys are missing from environment!');
  process.exit(1);
}

const supabase = createClient(url, key);

async function run() {
  console.log('Fetching all tables and views if possible...');
  
  // Try querying sqlite_master or pg_catalog via RPC if possible
  // Since we cannot run raw sql, let's try reading a table that might list other tables,
  // or see if we can do something else.
  // Actually, we can check memory_sources, memory_timeline_events etc.
  const tables = ['memory_sources', 'memory_timeline_events', 'joanna_value', 'memory_chatgpt'];
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    console.log(`Table ${table} exists:`, !error, error ? error.message : `Row count: ${data?.length}`);
  }
}

run().catch(console.error);
