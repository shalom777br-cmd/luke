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
  console.log('Testing insert into joanna_value with related_to column...');
  
  const testId = '00000000-0000-0000-0000-000000000000';
  
  // First clean up if any
  await supabase.from('joanna_value').delete().eq('id', testId);

  const { data, error } = await supabase
    .from('joanna_value')
    .insert({
      id: testId,
      category: 'values',
      content: 'テスト用の内容です。',
      source: 'test_script',
      related_to: [] // Try specifying empty array for uuid[]
    })
    .select();

  if (error) {
    console.error('Insert failed:', error.message);
    if (error.message.includes('column') && error.message.includes('related_to')) {
      console.log('CONFIRMED: related_to column DOES NOT exist yet!');
    }
  } else {
    console.log('Insert SUCCESSFUL! Data:', data);
    console.log('CONFIRMED: related_to column ALREADY exists!');
    // Cleanup
    await supabase.from('joanna_value').delete().eq('id', testId);
  }
}

run().catch(console.error);
