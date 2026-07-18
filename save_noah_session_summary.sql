-- ====================================================================
-- SUPABASE MIGRATION: Create 'save_noah_session_summary' Table
-- Description: This table stores counselling, worry, and mental wellness
--              session summaries integrated with similarity checking.
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.save_noah_session_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    category TEXT DEFAULT 'values',
    source TEXT DEFAULT 'ChatGPT/Noah Session',
    importance INTEGER DEFAULT 3,
    occurred_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    related_to UUID[] DEFAULT '{}'::uuid[]
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.save_noah_session_summary ENABLE ROW LEVEL SECURITY;

-- Create Policies for Public / App access (adjust based on production needs)
CREATE POLICY "Allow public select" ON public.save_noah_session_summary FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.save_noah_session_summary FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.save_noah_session_summary FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON public.save_noah_session_summary FOR DELETE USING (true);

-- Create Indexes for performance optimization on key lookup fields
CREATE INDEX IF NOT EXISTS idx_noah_summary_occurred_at ON public.save_noah_session_summary (occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_noah_summary_category ON public.save_noah_session_summary (category);
