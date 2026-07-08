import fs from 'fs';
import path from 'path';
import os from 'os';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { MemoryEntry, SearchFilters } from '../types.js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const isSupabaseConfigured = !!(supabaseUrl && supabaseKey);

// Use /tmp for safe write access, or fallback to OS tmpdir if on Windows
const tmpBase = process.platform === 'win32' ? os.tmpdir() : '/tmp';
const DATA_DIR = path.join(tmpBase, 'memory_app_data');
const LOCAL_DB_PATH = path.join(DATA_DIR, 'memory_entries.json');
const LOCAL_PUBLIC_DB_PATH = path.join(DATA_DIR, 'public_memories.json');

// Ensure data directory exists ONLY if Supabase is not configured
if (!isSupabaseConfigured) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    // Ensure database file exists
    if (!fs.existsSync(LOCAL_DB_PATH)) {
      fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify([], null, 2), 'utf-8');
    }
  } catch (err) {
    console.error('Failed to initialize local filesystem database in /tmp:', err);
  }
}

// Default local public memories
const DEFAULT_PUBLIC_MEMORIES = [
  {
    id: 'pub-1',
    title: '全国規模の合同防災・避難計画 2026',
    content: '2026年9月1日10:00より、全国自治体合同の大規模防災訓練および避難経路の確認プロセスが実施されます。各自、防災バッグの中身のチェック and 避難場所の再確認を行ってください。',
    category: 'event',
    tags: ['防災', '避難訓練', '安全'],
    occurred_at: '2026-09-01T10:00:00.000Z',
    created_at: '2026-07-01T00:00:00.000Z',
    author_name: '日本防災協会',
    importance: 4
  },
  {
    id: 'pub-2',
    title: '2026年度版花粉症・アレルギー対策ガイド',
    content: '最新の免疫療法および市販医薬品のトレンドに関する要約。今年はスギ花粉の飛散量が前年比130%と予測されており、早めの抗ヒスタミン薬処方が推奨されています。',
    category: 'health',
    tags: ['花粉症', 'アレルギー', '健康'],
    occurred_at: '2026-03-15T09:00:00.000Z',
    created_at: '2026-03-01T00:00:00.000Z',
    author_name: 'ルカ健康推進委員会',
    importance: 5
  },
  {
    id: 'pub-3',
    title: '生成AIプロンプトエンジニアリング基礎知識',
    content: 'GeminiやClaude等で望む出力を得るための役割付与(Persona)・Few-Shot学習プロンプトの解説。回答に一貫性を持たせるため、JSONスキーマを明示してシステムプロンプトに組み込む手法が有効です。',
    category: 'note',
    tags: ['AI', 'プロンプト', '技術'],
    occurred_at: '2026-07-01T12:00:00.000Z',
    created_at: '2026-07-01T12:00:00.000Z',
    author_name: 'AI開発チーム',
    importance: 3
  },
  {
    id: 'pub-4',
    title: '新NISA成長投資枠と積立分散投資の最適配分',
    content: '長期資産形成を目的としたアセットアロケーション例。全世界株式インデックス（オルカン）と米国株（S&P500）の組み合わせにおいて、信託報酬や分配方針の比較を行い複利効果を最大化する方法。',
    category: 'finance',
    tags: ['投資', 'NISA', '資産運用'],
    occurred_at: '2026-05-10T15:30:00.000Z',
    created_at: '2026-05-10T15:30:00.000Z',
    author_name: 'ファイナンシャルラボ',
    importance: 3
  },
  {
    id: 'pub-5',
    title: '良好な人間関係を維持するためのアクティブリスニング術',
    content: '相手の言葉を遮らずに傾聴し、感情に共感を示す「バックトラッキング（おうむ返し）」の具体例。カウンセリングや家族間の対話、ビジネスにおける信頼関係（ラポール）構築に欠かせない対話法です。',
    category: 'relationship',
    tags: ['コミュニケーション', '心理学', '人間関係'],
    occurred_at: '2026-06-20T18:00:00.000Z',
    created_at: '2026-06-20T18:00:00.000Z',
    author_name: '共感対話サークル',
    importance: 3
  }
];

function readLocalPublicDb(): any[] {
  try {
    if (!fs.existsSync(LOCAL_PUBLIC_DB_PATH)) {
      fs.writeFileSync(LOCAL_PUBLIC_DB_PATH, JSON.stringify(DEFAULT_PUBLIC_MEMORIES, null, 2), 'utf-8');
      return DEFAULT_PUBLIC_MEMORIES;
    }
    const raw = fs.readFileSync(LOCAL_PUBLIC_DB_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    console.error('Failed to read local public DB', error);
    return DEFAULT_PUBLIC_MEMORIES;
  }
}

function writeLocalPublicDb(entries: any[]): void {
  try {
    const dir = path.dirname(LOCAL_PUBLIC_DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(LOCAL_PUBLIC_DB_PATH, JSON.stringify(entries, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to write local public DB', error);
  }
}

// Read database from file
function readLocalDb(): MemoryEntry[] {
  try {
    if (!fs.existsSync(LOCAL_DB_PATH)) {
      return [];
    }
    const raw = fs.readFileSync(LOCAL_DB_PATH, 'utf-8');
    const entries = JSON.parse(raw) as MemoryEntry[];
    let migrated = false;
    const updated = entries.map(entry => {
      if (entry.user_id === 'temote-main') {
        entry.user_id = '00000000-0000-0000-0000-000000000001';
        migrated = true;
      } else if (entry.user_id === 'concertante-log') {
        entry.user_id = '00000000-0000-0000-0000-000000000002';
        migrated = true;
      } else if (entry.user_id === '050call-voice') {
        entry.user_id = '00000000-0000-0000-0000-000000000003';
        migrated = true;
      } else if (entry.user_id === 'personal-scratch') {
        entry.user_id = '00000000-0000-0000-0000-000000000004';
        migrated = true;
      }
      return entry;
    });
    if (migrated) {
      writeLocalDb(updated);
    }
    return updated;
  } catch (error) {
    console.error('Failed to read local DB, initializing empty array', error);
    return [];
  }
}

// Write database to file
function writeLocalDb(entries: MemoryEntry[]): void {
  try {
    const dir = path.dirname(LOCAL_DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(entries, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to write local DB', error);
  }
}

export class MemoryGatewayDb {
  private supabase: SupabaseClient | null = null;
  public mode: 'supabase' | 'local' = 'local';
  private isTableVerified: boolean | null = null;
  private isPublicTableVerified: boolean | null = null;
  public publicTableMissing: boolean = false;
  public publicOccurredAtMissing: boolean = false;

  constructor() {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

    if (url && key) {
      try {
        this.supabase = createClient(url, key);
        this.mode = 'supabase';
        console.log('Database Mode: SUPABASE (PostgreSQL)');
      } catch (err) {
        console.error('Supabase initialization failed, falling back to local storage', err);
        this.mode = 'local';
      }
    } else {
      console.log('Database Mode: LOCAL FILE STORAGE (data/memory_entries.json)');
      this.mode = 'local';
    }
  }

  // Ensure and check table exists status dynamically to avoid relation errors
  async ensureTableExists(): Promise<boolean> {
    if (this.mode !== 'supabase' || !this.supabase) {
      return false;
    }
    if (this.isTableVerified === true) {
      return true;
    }
    const status = await this.checkTableStatus();
    this.isTableVerified = status.exists && status.isSchemaValid !== false;
    return this.isTableVerified;
  }

  // Ensure and check memories table exists status dynamically to avoid relation errors
  async ensurePublicTableExists(): Promise<boolean> {
    if (this.mode !== 'supabase' || !this.supabase) {
      return false;
    }
    if (this.isPublicTableVerified === true && !this.publicOccurredAtMissing) {
      return true;
    }
    const status = await this.checkPublicTableStatus();
    this.isPublicTableVerified = status.exists;
    return this.isPublicTableVerified;
  }

  // Check if the memory_entries table is correctly provisioned
  async checkTableStatus(): Promise<{ exists: boolean; error: string | null; isSchemaValid?: boolean }> {
    if (!this.supabase) {
      return { exists: false, error: 'Supabase client not initialized', isSchemaValid: false };
    }
    try {
      // 1. Verify table exists by requesting 1 ID
      const { error: existError } = await this.supabase
        .from('memory_entries')
        .select('id')
        .limit(1);

      if (existError) {
        console.error('Supabase table status check returned error:', existError.message, 'Code:', existError.code, 'Details:', existError.details);
        if (existError.code === '42P01') {
          this.isTableVerified = false;
          return { exists: false, error: 'table_missing', isSchemaValid: false };
        }
        return { exists: false, error: existError.message, isSchemaValid: false };
      }

      // 2. Verify schema (user_id type) by selecting with a valid UUID format
      const { error: schemaError } = await this.supabase
        .from('memory_entries')
        .select('id')
        .eq('user_id', '00000000-0000-0000-0000-000000000001')
        .limit(1);

      if (schemaError) {
        console.error('Supabase schema verification returned error:', schemaError.message, 'Code:', schemaError.code, 'Details:', schemaError.details);
        if (schemaError.code === '22P02') {
          // This means user_id is of type uuid instead of text!
          this.isTableVerified = false; // Force fallback to local to avoid crashes
          return { exists: true, error: 'schema_invalid_user_id_uuid', isSchemaValid: false };
        }
        this.isTableVerified = false;
        return { exists: true, error: schemaError.message, isSchemaValid: false };
      }

      this.isTableVerified = true;
      return { exists: true, error: null, isSchemaValid: true };
    } catch (err: any) {
      console.error('Supabase table status check threw exception:', err.message || err);
      return { exists: false, error: err.message || 'Unknown error', isSchemaValid: false };
    }
  }

  // Insert a new memory entry
  async insertEntry(entry: MemoryEntry): Promise<void> {
    const tableExists = await this.ensureTableExists();
    // Rule: Save to Supabase if category is 'faith' OR (category is NOT 'task' AND importance >= 4)
    const isBrainLibraryItem =
      entry.category === 'faith' ||
      (entry.category !== 'task' && entry.importance >= 4);

    if (this.mode === 'supabase' && this.supabase && tableExists && isBrainLibraryItem) {
      console.log(`Saving Brain Library item [${entry.category}] with importance [${entry.importance}] to Supabase...`);
      const { error } = await this.supabase
        .from('memory_entries')
        .insert({
          id: entry.id,
          user_id: entry.user_id,
          raw_input: entry.raw_input,
          input_type: entry.input_type,
          category: entry.category,
          summary: entry.summary,
          structured: entry.structured,
          tags: entry.tags,
          search_text: entry.search_text,
          importance: entry.importance,
          occurred_at: entry.occurred_at,
          created_at: entry.created_at
        });

      if (error) {
        console.error('Supabase insert failed. Error details:', error);
        console.log('Falling back to local storage for this insert to prevent data loss...');
        this.insertEntryLocally(entry);
      }
    } else {
      console.log(`Saving standard item [${entry.category}] with importance [${entry.importance}] to local database...`);
      this.insertEntryLocally(entry);
    }
  }

  private insertEntryLocally(entry: MemoryEntry): void {
    const db = readLocalDb();
    db.push(entry);
    writeLocalDb(db);
  }

  // Delete a memory entry from both local database and Supabase (if configured)
  async deleteEntry(id: string, user_id: string): Promise<void> {
    // Delete locally
    const db = readLocalDb();
    const filtered = db.filter((entry) => entry.id !== id);
    writeLocalDb(filtered);

    // Delete from Supabase if configured
    const tableExists = await this.ensureTableExists();
    if (this.mode === 'supabase' && this.supabase && tableExists) {
      try {
        await this.supabase
          .from('memory_entries')
          .delete()
          .eq('id', id)
          .eq('user_id', user_id);
        console.log(`Successfully deleted entry [${id}] from Supabase.`);
      } catch (err: any) {
        console.error('Supabase delete failed:', err?.message || err);
      }
    }
  }

  // Update an existing memory entry (such as re-compiling with AI)
  async updateEntry(id: string, user_id: string, updatedFields: Partial<MemoryEntry>): Promise<boolean> {
    // 1. Update locally
    const dbLocal = readLocalDb();
    const idx = dbLocal.findIndex((entry) => entry.id === id && entry.user_id === user_id);
    let updatedLocally = false;
    if (idx !== -1) {
      dbLocal[idx] = { ...dbLocal[idx], ...updatedFields };
      writeLocalDb(dbLocal);
      updatedLocally = true;
    }

    // 2. Update Supabase if exists
    let updatedSupabase = false;
    const tableExists = await this.ensureTableExists();
    if (this.mode === 'supabase' && this.supabase && tableExists) {
      try {
        const { error } = await this.supabase
          .from('memory_entries')
          .update(updatedFields)
          .eq('id', id)
          .eq('user_id', user_id);
        if (!error) {
          updatedSupabase = true;
        } else {
          console.error('Supabase update failed:', error);
        }
      } catch (err: any) {
        console.error('Supabase update exception:', err?.message || err);
      }
    }
    return updatedLocally || updatedSupabase;
  }

  // Get a single memory entry by ID (for sharing)
  async getEntryById(id: string): Promise<MemoryEntry | null> {
    // 1. Try to find locally first
    const db = readLocalDb();
    const localEntry = db.find((entry) => entry.id === id);
    if (localEntry) {
      return localEntry;
    }

    // 2. Try to find on Supabase if configured
    const tableExists = await this.ensureTableExists();
    if (this.mode === 'supabase' && this.supabase && tableExists) {
      try {
        const { data, error } = await this.supabase
          .from('memory_entries')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (error) {
          throw error;
        }
        return data as MemoryEntry | null;
      } catch (err: any) {
        console.error('Supabase query by ID failed:', err?.message || err);
      }
    }
    return null;
  }

  // Query memory entries based on filters
  async queryEntries(filters: SearchFilters): Promise<MemoryEntry[]> {
    const localResults = this.queryEntriesLocally(filters);
    const tableExists = await this.ensureTableExists();
    if (this.mode === 'supabase' && this.supabase && tableExists) {
      try {
        let query = this.supabase
          .from('memory_entries')
          .select('*')
          .eq('user_id', filters.user_id);

        if (filters.category && filters.category !== 'all') {
          query = query.eq('category', filters.category);
        }

        if (filters.date_from) {
          query = query.gte('occurred_at', filters.date_from);
        }

        if (filters.date_to) {
          query = query.lte('occurred_at', filters.date_to);
        }

        const { data, error } = await query.order('occurred_at', { ascending: false });

        if (error) {
          throw error;
        }

        let results = (data as MemoryEntry[]) || [];

        // Apply Tag Filter and Text Query search filter if needed
        if (filters.tags && filters.tags.length > 0) {
          results = results.filter((entry) =>
            filters.tags!.every((tag) => entry.tags && entry.tags.includes(tag))
          );
        }

        if (filters.query_text) {
          const q = filters.query_text.toLowerCase();
          results = results.filter((entry) =>
            entry.search_text.toLowerCase().includes(q)
          );
        }

        // Merge local database and Supabase database results, deduplicating by ID
        const mergedMap = new Map<string, MemoryEntry>();
        localResults.forEach((entry) => mergedMap.set(entry.id, entry));
        results.forEach((entry) => mergedMap.set(entry.id, entry));

        const mergedList = Array.from(mergedMap.values());
        // Sort merged results by occurred_at desc, then created_at desc
        return mergedList.sort((a, b) => {
          const aTime = a.occurred_at ? new Date(a.occurred_at).getTime() : new Date(a.created_at).getTime();
          const bTime = b.occurred_at ? new Date(b.occurred_at).getTime() : new Date(b.created_at).getTime();
          return bTime - aTime;
        });
      } catch (err: any) {
        console.error('Supabase query failed, returning local search results. Message:', err?.message || err);
        return localResults;
      }
    } else {
      return localResults;
    }
  }

  private queryEntriesLocally(filters: SearchFilters): MemoryEntry[] {
    const db = readLocalDb();
    let results = db.filter((entry) => entry.user_id === filters.user_id);

    // Filter by Category
    if (filters.category && filters.category !== 'all') {
      results = results.filter((entry) => entry.category === filters.category);
    }

    // Filter by date_from (occurred_at >= date_from)
    if (filters.date_from) {
      const fromTime = new Date(filters.date_from).getTime();
      results = results.filter((entry) => {
        if (!entry.occurred_at) return false;
        return new Date(entry.occurred_at).getTime() >= fromTime;
      });
    }

    // Filter by date_to (occurred_at <= date_to)
    if (filters.date_to) {
      const toTime = new Date(filters.date_to).getTime();
      results = results.filter((entry) => {
        if (!entry.occurred_at) return false;
        return new Date(entry.occurred_at).getTime() <= toTime;
      });
    }

    // Filter by tags (must contain ALL selected tags)
    if (filters.tags && filters.tags.length > 0) {
      results = results.filter((entry) =>
        filters.tags!.every((tag) => entry.tags && entry.tags.includes(tag))
      );
    }

    // Filter by keyword query_text
    if (filters.query_text) {
      const q = filters.query_text.toLowerCase();
      results = results.filter((entry) =>
        entry.search_text.toLowerCase().includes(q)
      );
    }

    // Sort by occurred_at desc, then created_at desc
    return results.sort((a, b) => {
      const aTime = a.occurred_at ? new Date(a.occurred_at).getTime() : new Date(a.created_at).getTime();
      const bTime = b.occurred_at ? new Date(b.occurred_at).getTime() : new Date(b.created_at).getTime();
      return bTime - aTime;
    });
  }

  // Get all unique tags for a user to display in filter chips
  async getAllTags(user_id: string): Promise<string[]> {
    const localTags = this.getAllTagsLocally(user_id);
    const tableExists = await this.ensureTableExists();
    if (this.mode === 'supabase' && this.supabase && tableExists) {
      try {
        const { data, error } = await this.supabase
          .from('memory_entries')
          .select('tags')
          .eq('user_id', user_id);

        if (error) throw error;

        const allTags = new Set<string>(localTags);
        data?.forEach((row: { tags: string[] }) => {
          if (row.tags) {
            row.tags.forEach((tag) => allTags.add(tag));
          }
        });
        return Array.from(allTags);
      } catch (err: any) {
        console.error('Supabase tag fetch failed, returning combined list from local tags. Message:', err?.message || err);
        return localTags;
      }
    } else {
      return localTags;
    }
  }

  private getAllTagsLocally(user_id: string): string[] {
    const db = readLocalDb();
    const allTags = new Set<string>();
    db.filter((entry) => entry.user_id === user_id).forEach((entry) => {
      if (entry.tags) {
        entry.tags.forEach((tag) => allTags.add(tag));
      }
    });
    return Array.from(allTags);
  }

  // Query public memories in Supabase with local fallback
  async queryPublicMemories(queryText?: string, category?: string): Promise<any[]> {
    const localPublicDb = readLocalPublicDb();

    const publicTableExists = await this.ensurePublicTableExists();
    if (this.mode === 'supabase' && this.supabase && publicTableExists) {
      try {
        let query = this.supabase.from('memories').select('*');
        if (category && category !== 'all') {
          query = query.eq('category', category);
        }
        
        let data: any[] | null = null;
        if (!this.publicOccurredAtMissing) {
          const { data: orderedData, error } = await query.order('occurred_at', { ascending: false });
          if (error) {
            if (error.message?.includes('occurred_at') && error.message?.includes('does not exist')) {
              this.publicOccurredAtMissing = true;
              const { data: unorderedData, error: secondError } = await query;
              if (secondError) throw secondError;
              data = unorderedData;
            } else {
              throw error;
            }
          } else {
            data = orderedData;
          }
        } else {
          const { data: unorderedData, error } = await query;
          if (error) throw error;
          data = unorderedData;
        }

        this.publicTableMissing = false;
        
        // Sort in memory using whatever date fields are available
        const sortedList = (data || []).sort((a: any, b: any) => {
          const dateA = a.occurred_at || a.created_at || '';
          const dateB = b.occurred_at || b.created_at || '';
          return new Date(dateB).getTime() - new Date(dateA).getTime();
        });

        return this.filterLocalPublic(sortedList, queryText, category);
      } catch (err: any) {
        if (err.code === '42P01' || err.message?.includes('relation') || err.message?.includes('does not exist') || err.message?.includes('cache')) {
          this.publicTableMissing = true;
        }
        console.log('memories query exception:', err?.message || err);
        return this.filterLocalPublic(localPublicDb, queryText, category);
      }
    } else {
      // If table is missing, ensure state is set to missing so UI displays notice
      if (this.mode === 'supabase') {
        this.publicTableMissing = true;
      } else {
        this.publicTableMissing = false;
      }
      return this.filterLocalPublic(localPublicDb, queryText, category);
    }
  }

  // Check if the memories table is correctly provisioned
  async checkPublicTableStatus(): Promise<{ exists: boolean; error: string | null }> {
    if (this.mode !== 'supabase' || !this.supabase) {
      return { exists: false, error: 'Supabase client not initialized' };
    }
    try {
      const { error } = await this.supabase
          .from('memories')
          .select('id, occurred_at')
          .limit(1);

      if (!error) {
        this.publicTableMissing = false;
        this.publicOccurredAtMissing = false;
        return { exists: true, error: null };
      }

      if (error.message?.includes('occurred_at') && error.message?.includes('does not exist')) {
        this.publicTableMissing = false;
        this.publicOccurredAtMissing = true;
        return { exists: true, error: null };
      }

      if (error.code === '42P01' || error.message?.includes('relation') || error.message?.includes('does not exist') || error.message?.includes('cache')) {
        this.publicTableMissing = true;
        this.publicOccurredAtMissing = false;
        return { exists: false, error: 'table_missing' };
      }

      // Try selecting without occurred_at
      const { error: existError } = await this.supabase
          .from('memories')
          .select('id')
          .limit(1);

      if (existError) {
        if (existError.code === '42P01' || existError.message?.includes('relation') || existError.message?.includes('does not exist') || existError.message?.includes('cache')) {
          this.publicTableMissing = true;
          return { exists: false, error: 'table_missing' };
        }
        return { exists: false, error: existError.message };
      }

      this.publicTableMissing = false;
      this.publicOccurredAtMissing = true;
      return { exists: true, error: null };
    } catch (err: any) {
      return { exists: false, error: err?.message || 'Unknown error' };
    }
  }

  private filterLocalPublic(list: any[], queryText?: string, category?: string): any[] {
    let results = [...list];
    if (category && category !== 'all') {
      results = results.filter(item => item.category === category);
    }
    if (queryText && queryText.trim()) {
      const q = queryText.toLowerCase();
      results = results.filter(item => 
        (item.title && item.title.toLowerCase().includes(q)) ||
        (item.content && item.content.toLowerCase().includes(q)) ||
        (item.tags && item.tags.some((t: string) => t.toLowerCase().includes(q)))
      );
    }
    return results;
  }

  // Publish memory to public database
  async publishMemoryEntry(entry: { title: string; content: string; category: string; tags: string[]; occurred_at: string; author_name?: string; importance?: number }): Promise<boolean> {
    const publicTableExists = await this.ensurePublicTableExists();
    if (this.mode === 'supabase' && this.supabase && publicTableExists) {
      try {
        const payload: any = {
          id: 'pub-' + Math.random().toString(36).substring(2, 11),
          title: entry.title,
          content: entry.content,
          category: entry.category,
          tags: entry.tags,
          created_at: new Date().toISOString(),
          author_name: entry.author_name || 'Anonymous',
          importance: entry.importance || 3
        };

        if (!this.publicOccurredAtMissing) {
          payload.occurred_at = entry.occurred_at;
        }

        const { error } = await this.supabase
          .from('memories')
          .insert(payload);

        if (error) {
          if (error.message?.includes('occurred_at') && error.message?.includes('does not exist')) {
            this.publicOccurredAtMissing = true;
            delete payload.occurred_at;
            const { error: retryError } = await this.supabase
              .from('memories')
              .insert(payload);
            if (retryError) {
              console.warn('Failed to insert into memories on retry:', retryError.message);
              return false;
            }
            return true;
          }
          console.warn('Failed to insert into memories:', error.message);
          return false;
        }
        return true;
      } catch (err) {
        console.error('publishMemoryEntry error:', err);
        return false;
      }
    } else {
      // Local fallback publishing
      const list = readLocalPublicDb();
      list.push({
        id: 'pub-' + Math.random().toString(36).substring(2, 11),
        title: entry.title,
        content: entry.content,
        category: entry.category,
        tags: entry.tags,
        occurred_at: entry.occurred_at,
        created_at: new Date().toISOString(),
        author_name: entry.author_name || '匿名のルカユーザー',
        importance: entry.importance || 3
      });
      writeLocalPublicDb(list);
      return true;
    }
  }

  // Update public memory (category/importance)
  async updatePublicMemory(id: string, fields: { category?: string; importance?: number }): Promise<boolean> {
    const publicTableExists = await this.ensurePublicTableExists();
    if (this.mode === 'supabase' && this.supabase && publicTableExists) {
      try {
        const { error } = await this.supabase
          .from('memories')
          .update(fields)
          .eq('id', id);
        if (error) {
          console.error('Failed to update public memory in Supabase:', error.message);
          return false;
        }
        return true;
      } catch (err) {
        console.error('updatePublicMemory error:', err);
        return false;
      }
    } else {
      const list = readLocalPublicDb();
      const updated = list.map(item => {
        if (item.id === id) {
          return { ...item, ...fields };
        }
        return item;
      });
      writeLocalPublicDb(updated);
      return true;
    }
  }
}
