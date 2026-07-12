import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

dotenv.config();

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('SUPABASE_URL or keys are missing from environment!');
  process.exit(1);
}

const supabase = createClient(url, key);

// Fixed Source ID for "ブラジル日記" source
const BRAZIL_DIARY_SOURCE_ID = 'bda211d1-b7a9-4b82-9602-0e98037fa9c0';

function deterministicUuid(idStr: string): string {
  const hash = crypto.createHash('sha1').update(idStr).digest('hex');
  // Format as standard UUID format: 8-4-4-4-12
  return `${hash.substring(0, 8)}-${hash.substring(8, 12)}-4${hash.substring(13, 16)}-a${hash.substring(17, 20)}-${hash.substring(20, 32)}`;
}

async function run() {
  console.log('Starting Ingestion of Brazil Blog Data...');

  const dataPath = path.join(process.cwd(), 'brazil_blog_importance_scored.json');
  if (!fs.existsSync(dataPath)) {
    console.error(`Data file not found at: ${dataPath}`);
    process.exit(1);
  }

  const blogPosts = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  console.log(`Loaded ${blogPosts.length} posts from JSON file.`);

  // Filter out '低' tier items as instructed
  const filteredPosts = blogPosts.filter((post: any) => post.tier !== '低');
  console.log(`Filtered out '低' tier posts. Remaining posts to ingest: ${filteredPosts.length}`);

  // Register the "ブラジル日記" source first in memory_sources to satisfy foreign key constraint
  console.log('Registering "ブラジル日記" source in memory_sources...');
  const sourceRecord = {
    id: BRAZIL_DIARY_SOURCE_ID,
    source_slug: 'brazil-diary',
    source_title: 'ブラジル日記',
    original_file_name: 'brazil_blog_importance_scored.json',
    original_format: 'json',
    raw_markdown: '# ブラジル日記\n\n「ブラジル日記」ブログ（2011〜2019年、全217件）の記事データ。',
    meta: {
      description: "ブラジル日記ブログ (2011〜2019年、全217件) 重要度スコアリング済みデータ",
      total_records: 217,
      ingested_records: filteredPosts.length,
      ingested_at: new Date().toISOString()
    }
  };

  const { error: sourceError } = await supabase
    .from('memory_sources')
    .upsert(sourceRecord, { onConflict: 'id' });

  if (sourceError) {
    console.error('Failed to register source in memory_sources:', sourceError);
    process.exit(1);
  }
  console.log('Successfully registered source in memory_sources.');

  // Fetch existing timeline events to build mapping from short IDs (first 8 chars of UUID) to full UUIDs

  console.log('Fetching existing timeline events for short ID mapping...');
  const { data: existingEvents, error: fetchError } = await supabase
    .from('memory_timeline_events')
    .select('id, title');

  if (fetchError) {
    console.error('Failed to fetch existing timeline events:', fetchError);
    process.exit(1);
  }

  console.log(`Fetched ${existingEvents?.length || 0} existing events.`);
  const shortIdToUuid = new Map<string, string>();
  if (existingEvents) {
    for (const ev of existingEvents) {
      const shortId = ev.id.substring(0, 8);
      shortIdToUuid.set(shortId, ev.id);
    }
  }

  // Fetch the maximum existing order_no to avoid violating not-null constraints
  console.log('Fetching maximum order_no from database...');
  const { data: maxOrderData, error: maxOrderError } = await supabase
    .from('memory_timeline_events')
    .select('order_no')
    .order('order_no', { ascending: false })
    .limit(1);

  if (maxOrderError) {
    console.error('Failed to fetch maximum order_no:', maxOrderError);
    process.exit(1);
  }

  let maxOrderNo = maxOrderData && maxOrderData.length > 0 ? (maxOrderData[0].order_no || 0) : 0;
  console.log(`Current maximum order_no is: ${maxOrderNo}`);

  // Prep records for insertion
  const recordsToInsert = [];
  let timelineLinksCount = 0;

  for (const post of filteredPosts) {
    const pubDate = new Date(post.published);
    const eventDateStr = post.published.substring(0, 10); // 'YYYY-MM-DD'
    
    const year = pubDate.getFullYear();
    const month = pubDate.getMonth() + 1;
    const day = pubDate.getDate();
    const yearLabel = `${year}年`;
    const headerDateText = `${year}年${month}月${day}日`;

    // Resolve timeline matches
    const resolvedTimelineMatches: string[] = [];
    if (post.timeline_matches && Array.isArray(post.timeline_matches)) {
      for (const match of post.timeline_matches) {
        const fullUuid = shortIdToUuid.get(match);
        if (fullUuid) {
          resolvedTimelineMatches.push(fullUuid);
          timelineLinksCount++;
        } else {
          console.log(`Warning: Could not resolve timeline match short ID '${match}' for post: "${post.title}"`);
        }
      }
    }

    // Deterministic UUID based on blogger post ID
    const entryId = deterministicUuid(post.id);

    // Summary - truncated version of content
    let summary = post.content || '';
    if (summary.length > 150) {
      summary = summary.substring(0, 150) + '...';
    }

    // Categories
    const categories = Array.isArray(post.labels) && post.labels.length > 0 
      ? [...new Set([...post.labels, 'ブラジル日記'])] 
      : ['ブラジル日記', '宣教活動'];

    // Meta field
    const meta = {
      source: 'ブラジル日記',
      source_url: post.url,
      importance: post.tier,
      score: post.score,
      reasons: post.reasons || [],
      labels: post.labels || [],
      related_timeline_event_ids: resolvedTimelineMatches,
      original_id: post.id,
      import_date: new Date().toISOString()
    };

    maxOrderNo++; // Increment order number

    const record = {
      id: entryId,
      source_id: BRAZIL_DIARY_SOURCE_ID,
      order_no: maxOrderNo, // Assign unique incremented order number
      era: yearLabel,
      year_label: yearLabel,
      year: year,
      month: month,
      day: day,
      approximate_date: false,
      event_date: eventDateStr,
      header_date_text: headerDateText,
      title: post.title,
      primary_category: '宣教活動',
      categories: categories,
      locations: [],
      scripture_refs: [],
      summary: summary,
      body: post.content,
      raw_header: `${headerDateText} ${post.title}`,
      raw_text: `${headerDateText} ${post.title}\n\n${post.content}`,
      meta: meta
    };

    recordsToInsert.push(record);
  }


  console.log(`Prepared ${recordsToInsert.length} records. Resolving timeline matches linked: ${timelineLinksCount}`);

  // Ingest in batches of 50 to prevent size issues
  const BATCH_SIZE = 50;
  let successfulInserts = 0;

  for (let i = 0; i < recordsToInsert.length; i += BATCH_SIZE) {
    const batch = recordsToInsert.slice(i, i + BATCH_SIZE);
    console.log(`Upserting batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} records)...`);
    
    const { data, error } = await supabase
      .from('memory_timeline_events')
      .upsert(batch, { onConflict: 'id' });

    if (error) {
      console.error(`Error in batch starting at index ${i}:`, error.message, error);
    } else {
      successfulInserts += batch.length;
      console.log(`Successfully upserted batch.`);
    }
  }

  console.log(`Ingestion completed! Successfully upserted ${successfulInserts} out of ${recordsToInsert.length} records.`);
}

run().catch(console.error);
