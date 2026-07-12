import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('SUPABASE_URL or keys are missing!');
  process.exit(1);
}

const supabase = createClient(url, key);

async function run() {
  console.log('Fetching all memory_timeline_events...');
  const { data, error } = await supabase
    .from('memory_timeline_events')
    .select('id, title, meta, event_date');
    
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`Fetched ${data?.length} events.`);
  if (data) {
    for (const item of data) {
      console.log(`ID: ${item.id} | Date: ${item.event_date} | Title: ${item.title} | Meta: ${JSON.stringify(item.meta)}`);
    }
  }
}

run().catch(console.error);
