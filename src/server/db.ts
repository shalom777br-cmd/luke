import fs from 'fs';
import path from 'path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { MemoryEntry, SearchFilters } from '../types.js';

const DATA_DIR = path.join(process.cwd(), 'data');
const LOCAL_DB_PATH = path.join(DATA_DIR, 'memory_entries.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Ensure database file exists
if (!fs.existsSync(LOCAL_DB_PATH)) {
  fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify([], null, 2), 'utf-8');
}

// Read database from file
function readLocalDb(): MemoryEntry[] {
  try {
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
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(entries, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to write local DB', error);
  }
}

export class MemoryGatewayDb {
  private supabase: SupabaseClient | null = null;
  public mode: 'supabase' | 'local' = 'local';
  private isTableVerified: boolean | null = null;

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
    if (this.isTableVerified !== null) {
      return this.isTableVerified;
    }
    const status = await this.checkTableStatus();
    this.isTableVerified = status.exists && status.isSchemaValid !== false;
    return this.isTableVerified;
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
    if (this.mode === 'supabase' && this.supabase && tableExists) {
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
        // Fallback to local
        this.insertEntryLocally(entry);
      }
    } else {
      this.insertEntryLocally(entry);
    }
  }

  private insertEntryLocally(entry: MemoryEntry): void {
    const db = readLocalDb();
    db.push(entry);
    writeLocalDb(db);
  }

  // Query memory entries based on filters
  async queryEntries(filters: SearchFilters): Promise<MemoryEntry[]> {
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

        if (filters.tags && filters.tags.length > 0) {
          // In Postgres array containment is used for array filters.
          // Using cs (contains) or matching tags via manual filtering.
          // We can use a JSON array overlap or filter them on server/client.
          // Let's filter on the server using overlap or query.containedBy, or simply filter after fetching.
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

        return results;
      } catch (err: any) {
        console.error('Supabase query failed, falling back to local search. Message:', err?.message || err);
        if (err?.code) console.error('Error code:', err.code);
        if (err?.details) console.error('Error details:', err.details);
        return this.queryEntriesLocally(filters);
      }
    } else {
      return this.queryEntriesLocally(filters);
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
    const tableExists = await this.ensureTableExists();
    if (this.mode === 'supabase' && this.supabase && tableExists) {
      try {
        const { data, error } = await this.supabase
          .from('memory_entries')
          .select('tags')
          .eq('user_id', user_id);

        if (error) throw error;

        const allTags = new Set<string>();
        data?.forEach((row: { tags: string[] }) => {
          if (row.tags) {
            row.tags.forEach((tag) => allTags.add(tag));
          }
        });
        return Array.from(allTags);
      } catch (err: any) {
        console.error('Supabase tag fetch failed, fetching from local. Message:', err?.message || err);
        if (err?.code) console.error('Error code:', err.code);
        if (err?.details) console.error('Error details:', err.details);
        return this.getAllTagsLocally(user_id);
      }
    } else {
      return this.getAllTagsLocally(user_id);
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
}
