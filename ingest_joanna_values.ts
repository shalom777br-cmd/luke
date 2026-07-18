import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('SUPABASE_URL or keys are missing from environment!');
  process.exit(1);
}

const supabase = createClient(url, key);

// 1. トリグラム類似度（Trigram Similarity）の計算関数
function getTrigrams(str: string): Set<string> {
  const s = (str || '').toLowerCase().replace(/\s+/g, '');
  const trigrams = new Set<string>();
  for (let i = 0; i < s.length - 2; i++) {
    trigrams.add(s.substring(i, i + 3));
  }
  return trigrams;
}

function calculateTrigramSimilarity(str1: string, str2: string): number {
  const set1 = getTrigrams(str1);
  const set2 = getTrigrams(str2);
  
  if (set1.size === 0 && set2.size === 0) return 1.0;
  if (set1.size === 0 || set2.size === 0) return 0.0;
  
  let intersectionCount = 0;
  set1.forEach(t => {
    if (set2.has(t)) {
      intersectionCount++;
    }
  });
  
  const unionCount = set1.size + set2.size - intersectionCount;
  return intersectionCount / unionCount;
}

// 2. インジェスト対象の「ノアによるカウンセリング心理学の要約」データ
const targetData = {
  id: crypto.randomUUID(),
  category: 'values',
  source: 'Noah Counseling 2026-07-12',
  importance: 5, // 最重要 5/5
  content: 'この経験を通じてジョアンナが得た重要な自己洞察：①失った相手そのものよりも、その関係の中で湧いていたやる気・エネルギー・安心感・期待・ワクワク感という内的状態を取り戻したいと気づいた。②愛してくれない人に接近しすぎる傾向があり、その理由は「愛してくれないとわかっているから責任が生じない」「本当に愛してくれる人が現れると自分が変わらなければならず重い」「自分の気持ちが変わりやすく相手を傷つけることへの恐れがある」という自己防衛の構造があるとわかった。③根底にある欲求は「そこに居ていいよ、そこはあなたの場所だよ」と言われる感覚＝存在を許可される感覚であり、これは子どもの頃からの強い寂しさに由来している。これらの気づきは、フォローしている心理カウンセラーの動画（「人はいつか必ず裏切ると思っている人」というテーマ）を参考に、現在の身体感覚に意識を置きながら過去の感情体験に触れるというエクササイズを自分で実践した結果として生まれた。このアプローチはトラウマ処理に近い手法で、ジョアンナは自分でそれを応用できる。​​​​​​​​​​​​​​​​',
  occurred_at: '2026-07-12T21:13:00.000Z'
};

async function run() {
  console.log('=== Joanna Value Ingestion Logic Improvement ===');
  
  // A. 既存の joanna_value レコードを全件取得
  console.log('Fetching existing joanna_value entries...');
  const { data: existingEntries, error: fetchErr } = await supabase
    .from('joanna_value')
    .select('*');

  if (fetchErr) {
    console.error('Failed to fetch existing entries:', fetchErr.message);
    process.exit(1);
  }

  console.log(`Fetched ${existingEntries?.length || 0} existing entries.`);

  // B. 既存データの完全一致（重複）チェック＆報告
  console.log('\nChecking for exact duplicate content in existing database...');
  const contentMap = new Map<string, any[]>();
  
  existingEntries?.forEach(entry => {
    const normContent = (entry.content || '').trim();
    if (!contentMap.has(normContent)) {
      contentMap.set(normContent, []);
    }
    contentMap.get(normContent)!.push(entry);
  });

  let exactDuplicatesCount = 0;
  console.log('--- Exact Duplicates Report ---');
  contentMap.forEach((entries, content) => {
    if (entries.length > 1) {
      exactDuplicatesCount += (entries.length - 1);
      console.log(`[DUPLICATE FOUND] Found ${entries.length} exact copies for content:`);
      console.log(`- Truncated Content: "${content.substring(0, 100)}..."`);
      console.log('- Entry IDs:');
      entries.forEach(e => console.log(`  * ID: ${e.id} (Source: ${e.source}, CreatedAt: ${e.created_at})`));
      console.log('----------------------------------------');
    }
  });
  
  if (exactDuplicatesCount === 0) {
    console.log('No exact duplicates found in existing entries.');
  } else {
    console.log(`Found a total of ${exactDuplicatesCount} redundant duplicate entries.`);
  }

  // C. 新規エントリの投入・類似度判定・重要度優先ルールの適用
  console.log('\nProcessing Ingestion for Noah\'s Counseling Psychology Summary...');
  console.log(`Target Content (trunc): "${targetData.content.substring(0, 100)}..."`);
  console.log(`Importance: ${targetData.importance}/5`);

  // 1. 完全一致チェック
  const exactMatch = existingEntries?.find(e => (e.content || '').trim() === targetData.content.trim());
  if (exactMatch) {
    console.log(`[SKIP] This content is an EXACT match with an existing entry (ID: ${exactMatch.id}). Skipped insertion to prevent actual duplicates.`);
    return;
  }

  // 2. トリグラム類似度チェック
  const relatedToIds: string[] = [];
  const similarityThreshold = 0.8; // 80%以上

  existingEntries?.forEach(e => {
    const sim = calculateTrigramSimilarity(targetData.content, e.content || '');
    if (sim >= 0.05) {
      console.log(`- Compared with Entry [ID: ${e.id.substring(0, 8)}, Source: ${e.source}]: Similarity = ${(sim * 100).toFixed(1)}%`);
    }
    if (sim >= similarityThreshold) {
      console.log(`  => [MATCH] Similarity ${(sim * 100).toFixed(1)}% exceeds threshold ${similarityThreshold * 100}%! Added to related_to list.`);
      relatedToIds.push(e.id);
    }
  });

  console.log(`Related entry UUIDs found: ${JSON.stringify(relatedToIds)}`);

  // 3. インサート実行
  console.log('\nAttempting to insert new record into joanna_value...');
  
  const insertDataWithRelatedTo = {
    id: targetData.id,
    category: targetData.category,
    content: targetData.content,
    source: targetData.source,
    occurred_at: targetData.occurred_at,
    related_to: relatedToIds // Array of UUIDs
  };

  const insertDataWithoutRelatedTo = {
    id: targetData.id,
    category: targetData.category,
    content: targetData.content,
    source: targetData.source,
    occurred_at: targetData.occurred_at
  };

  // Try inserting with related_to column
  const { data: insertResult, error: insertErr } = await supabase
    .from('joanna_value')
    .insert(insertDataWithRelatedTo)
    .select();

  if (insertErr) {
    console.warn(`\n[WARNING] Failed to insert with related_to column: ${insertErr.message}`);
    console.log('This is likely because the "related_to" column does not exist in the database table schema yet.');
    console.log('Attempting graceful fallback insertion without specifying related_to column...');
    
    const { data: fallbackResult, error: fallbackErr } = await supabase
      .from('joanna_value')
      .insert(insertDataWithoutRelatedTo)
      .select();

    if (fallbackErr) {
      console.error('Graceful fallback insertion failed too:', fallbackErr.message);
    } else {
      console.log('=> [SUCCESS] Gracefully inserted record into joanna_value without related_to column!');
      console.log('Inserted Row:', fallbackResult);
      console.log('\n[CRITICAL MANUAL ACTION REQUIRED]');
      console.log('Please execute the following SQL statement in your Supabase SQL Editor to add the related_to column:');
      console.log('ALTER TABLE public.joanna_value ADD COLUMN IF NOT EXISTS related_to uuid[] DEFAULT \'{}\'::uuid[];');
    }
  } else {
    console.log('=> [SUCCESS] Record inserted successfully with related_to mapping!');
    console.log('Inserted Row:', insertResult);
  }
}

run().catch(console.error);
