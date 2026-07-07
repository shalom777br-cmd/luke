export type MemoryCategory =
  | 'task'
  | 'value'
  | 'event'
  | 'note'
  | 'health'
  | 'finance'
  | 'relationship'
  | 'faith'
  | 'other';

export interface StructuredMemory {
  category: MemoryCategory;
  summary: string;
  entities: {
    people: string[];
    places: string[];
    dates: string[];
  };
  occurred_at: string | null;
  tags: string[];
  importance: number; // 1 to 5
  action_required: boolean;
  is_ai_executable?: boolean;
  task_explanation?: string;
}

export interface MemoryEntry {
  id: string;
  user_id: string;
  raw_input: string;
  input_type: 'voice' | 'text';
  category: MemoryCategory;
  summary: string;
  structured: StructuredMemory;
  tags: string[];
  search_text: string;
  importance: number;
  occurred_at: string | null; // ISO8601
  created_at: string; // ISO8601
}

export interface SearchFilters {
  user_id: string;
  category?: MemoryCategory | 'all';
  tags?: string[];
  date_from?: string;
  date_to?: string;
  query_text?: string;
}

export interface SearchResponse {
  entries: MemoryEntry[];
  answer?: string;
}

export interface IngestRequest {
  user_id: string;
  input_type: 'voice' | 'text';
  raw_input: string;
}

export interface IngestResponse {
  success: boolean;
  entry: MemoryEntry;
}
