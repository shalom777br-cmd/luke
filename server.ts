import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import crypto from 'crypto';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import { MemoryGatewayDb } from './src/server/db.js';
import { getProvider } from './src/server/providers/index.js';
import { MemoryEntry, StructuredMemory, MemoryCategory } from './src/types.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for body parsing
  app.use(express.json());

  // Initialize DB and AI Providers
  const db = new MemoryGatewayDb();
  const provider = getProvider();

  // API Route: Get Database and LLM system status
  app.get('/api/status', (req, res) => {
    const hasGeminiKey = !!process.env.GEMINI_API_KEY;
    const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;
    const activeProvider = process.env.LLM_PROVIDER || 'gemini';
    const hasSupabase = db.mode === 'supabase';

    res.json({
      db_mode: db.mode,
      active_llm_provider: activeProvider,
      secrets: {
        gemini_api_key_configured: hasGeminiKey,
        anthropic_api_key_configured: hasAnthropicKey,
        supabase_configured: hasSupabase,
      },
    });
  });

  // API Route: Ingest natural language voice or text
  app.post('/api/ingest', async (req, res) => {
    const { user_id, input_type, raw_input } = req.body;

    if (!user_id || !input_type || !raw_input) {
      res.status(400).json({ error: 'Missing required parameters: user_id, input_type, or raw_input' });
      return;
    }

    console.log(`Ingesting memory for user: ${user_id}, type: ${input_type}`);

    let structured: StructuredMemory;
    let fallbackUsed = false;

    try {
      // Resolve structured output using LLM Provider
      structured = await provider.convertToStructured(raw_input);
    } catch (err) {
      console.warn('AI compilation failed. Applying graceful degradation fallback...', err);
      fallbackUsed = true;
      // Graceful degradation: standard safe fallback to prevent any loss of data
      const limitSummary = raw_input.trim().slice(0, 40);
      structured = {
        category: 'note',
        summary: limitSummary || '無題の記録',
        entities: {
          people: [],
          places: [],
          dates: [],
        },
        occurred_at: new Date().toISOString(),
        tags: ['自動保存', 'AI未処理'],
        importance: 3,
        action_required: false,
      };
    }

    // Build the search_text search string (summary + raw_input + tags space-separated)
    const combinedTags = structured.tags ? structured.tags.join(' ') : '';
    const search_text = `${structured.summary || ''} ${raw_input} ${combinedTags}`.toLowerCase();

    // Inferred or created date
    const occurred_at = structured.occurred_at || new Date().toISOString();

    const entry: MemoryEntry = {
      id: crypto.randomUUID(),
      user_id: user_id,
      raw_input: raw_input,
      input_type: input_type as 'voice' | 'text',
      category: structured.category || 'note',
      summary: structured.summary || '無題の記録',
      structured: structured,
      tags: structured.tags || [],
      search_text: search_text,
      importance: typeof structured.importance === 'number' ? structured.importance : 3,
      occurred_at: occurred_at,
      created_at: new Date().toISOString(),
    };

    try {
      await db.insertEntry(entry);
      res.json({
        success: true,
        entry: entry,
        fallback_used: fallbackUsed,
      });
    } catch (dbErr) {
      console.error('DB insertion error', dbErr);
      res.status(500).json({ error: 'Failed to persist memory entry' });
    }
  });

  // API Route: Search memories and optionally answer in natural language
  app.post('/api/search', async (req, res) => {
    const { user_id, category, tags, date_from, date_to, query_text } = req.body;

    if (!user_id) {
      res.status(400).json({ error: 'Missing user_id parameter' });
      return;
    }

    console.log(`Searching memories for user ${user_id} with query_text: "${query_text || ''}"`);

    try {
      // Get matched entries matching filters & keyword
      const entries = await db.queryEntries({
        user_id,
        category,
        tags,
        date_from,
        date_to,
        query_text,
      });

      let answer: string | undefined = undefined;

      // If a natural language query is supplied, synthesize an answer from the matched entries (up to top 20)
      if (query_text && query_text.trim().length > 0) {
        const topEntries = entries.slice(0, 20);
        try {
          answer = await provider.answerFromEntries(query_text, topEntries);
        } catch (aiErr) {
          console.error('AI synthesis for search answer failed:', aiErr);
          answer = '自然文の回答生成中に一時的なエラーが発生しました。以下の一致する記録をご確認ください。';
        }
      }

      res.json({
        entries,
        answer,
      });
    } catch (err) {
      console.error('Search operation failed:', err);
      res.status(500).json({ error: 'Failed to search memory entries' });
    }
  });

  // API Route: Get all unique tags for user filters
  app.get('/api/tags', async (req, res) => {
    const { user_id } = req.query;

    if (!user_id) {
      res.status(400).json({ error: 'Missing user_id parameter' });
      return;
    }

    try {
      const tags = await db.getAllTags(user_id as string);
      res.json({ tags });
    } catch (err) {
      console.error('Get tags failed:', err);
      res.status(500).json({ error: 'Failed to load tags' });
    }
  });

  // Setup Vite middleware or static serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Database Mode: ${db.mode.toUpperCase()}`);
    console.log(`LLM Provider: ${(process.env.LLM_PROVIDER || 'gemini').toUpperCase()}`);
  });
}

startServer();
