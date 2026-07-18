import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import express from 'express';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

// Utility for Trigram Similarity
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

export const mcpServer = new Server({
  name: "luke-memory-compiler",
  version: "1.0.0"
}, {
  capabilities: {
    tools: {}
  }
});

// Set up tools list
mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "save_noah_session_summary",
        description: "Save a counseling, worry, or mental wellness session summary to joanna_value in the Supabase database. Integrates automated similarity checks, duplicate prevention, and optional linking support.",
        inputSchema: {
          type: "object",
          properties: {
            content: {
              type: "string",
              description: "The complete text content of the session summary or insights."
            },
            category: {
              type: "string",
              description: "Optional. The category of this entry (e.g., 'values', 'ifs_parts', 'health'). Defaults to 'values'."
            },
            source: {
              type: "string",
              description: "Optional. The source of this record. Defaults to 'ChatGPT/Noah Session'."
            },
            occurred_at: {
              type: "string",
              description: "Optional ISO-8601 string representing when the session occurred. Defaults to current time."
            },
            importance: {
              type: "integer",
              minimum: 1,
              maximum: 5,
              description: "Optional. Importance rating from 1 to 5. If 5, insertion is unconditionally executed even if highly similar records exist. Defaults to 3."
            }
          },
          required: ["content"]
        }
      },
      {
        name: "search_noah_memory",
        description: "Search for existing memories, counselling notes, or insights across the database (joanna_value and/or memory_timeline_events).",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The search term, keyword, or phrase to look for."
            },
            table: {
              type: "string",
              enum: ["all", "save_noah_session_summary", "joanna_value", "timeline"],
              description: "Optional. Limit search to a specific table. Defaults to 'all'."
            },
            limit: {
              type: "integer",
              description: "Optional. Maximum number of results to return. Defaults to 10."
            }
          },
          required: ["query"]
        }
      }
    ]
  };
});

// Handle tool execution
mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (!supabase) {
    return {
      content: [
        {
          type: "text",
          text: "Error: Supabase is not configured on this server instance. Please configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
        }
      ],
      isError: true
    };
  }

  try {
    if (name === "save_noah_session_summary") {
      const { content, category = 'values', source = 'ChatGPT/Noah Session', occurred_at, importance = 3 } = (args || {}) as any;

      if (!content || typeof content !== 'string') {
        return {
          content: [{ type: "text", text: "Error: 'content' parameter is required and must be a string." }],
          isError: true
        };
      }

      // Try to fetch from save_noah_session_summary first. If it fails due to table missing, use joanna_value.
      let targetTable = 'save_noah_session_summary';
      let existingEntries: any[] | null = null;
      let fetchErr: any = null;

      const { data: noahData, error: noahErr } = await supabase
        .from('save_noah_session_summary')
        .select('*');

      if (noahErr) {
        const isTableMissing = noahErr.message?.includes('relation') || noahErr.message?.includes('does not exist') || noahErr.message?.includes('cache');
        if (isTableMissing) {
          console.log(`Table 'save_noah_session_summary' not found. Falling back to 'joanna_value'.`);
          targetTable = 'joanna_value';
          const { data: fallbackEntries, error: fallbackFetchErr } = await supabase
            .from('joanna_value')
            .select('*');
          
          if (fallbackFetchErr) {
            return {
              content: [{ type: "text", text: `Database error while fetching fallback entries from 'joanna_value': ${fallbackFetchErr.message}` }],
              isError: true
            };
          }
          existingEntries = fallbackEntries;
        } else {
          return {
            content: [{ type: "text", text: `Database error while fetching existing entries from 'save_noah_session_summary': ${noahErr.message}` }],
            isError: true
          };
        }
      } else {
        existingEntries = noahData;
      }

      // B. Exact duplicate check
      const exactMatch = existingEntries?.find(e => (e.content || '').trim() === content.trim());
      if (exactMatch) {
        return {
          content: [{
            type: "text",
            text: `[SKIP] Exact content duplicate found in database. Skipped saving to avoid redundant copies.\nExisting Record ID: ${exactMatch.id}\nSource: ${exactMatch.source}\nSaved At: ${exactMatch.created_at}`
          }]
        };
      }

      // C. Similarity (Trigram) calculation
      const similarityThreshold = 0.8; // 80% similarity
      const relatedToIds: string[] = [];

      existingEntries?.forEach(e => {
        const sim = calculateTrigramSimilarity(content, e.content || '');
        if (sim >= similarityThreshold) {
          relatedToIds.push(e.id);
        }
      });

      const recordId = crypto.randomUUID();
      const occurredAtVal = occurred_at || new Date().toISOString();

      const insertDataWithRelated = {
        id: recordId,
        category,
        content,
        source,
        importance,
        occurred_at: occurredAtVal,
        related_to: relatedToIds
      };

      const insertDataWithoutRelated = {
        id: recordId,
        category,
        content,
        source,
        importance,
        occurred_at: occurredAtVal
      };

      // D. Attempt Insertion
      const { data: insertResult, error: insertErr } = await supabase
        .from(targetTable)
        .insert(insertDataWithRelated)
        .select();

      if (insertErr) {
        // Check if the error is missing column error
        const isMissingColumn = insertErr.message?.includes('column') || insertErr.message?.includes('related_to') || insertErr.code === 'PGRST204';
        
        if (isMissingColumn) {
          // Fallback to inserting without related_to column
          const { data: fallbackResult, error: fallbackErr } = await supabase
            .from(targetTable)
            .insert(insertDataWithoutRelated)
            .select();

          if (fallbackErr) {
            return {
              content: [{ type: "text", text: `Failed fallback database insertion on '${targetTable}': ${fallbackErr.message}` }],
              isError: true
            };
          }

          let responseText = `[SUCCESS] Entry saved successfully to '${targetTable}' table (Fallback Mode without relationship linking).\n` +
            `Record ID: ${recordId}\n` +
            `Category: ${category}\n` +
            `Source: ${source}\n` +
            `Importance: ${importance}\n` +
            `Occurred At: ${occurredAtVal}\n\n`;

          if (targetTable === 'save_noah_session_summary') {
            responseText += `[NOTICE] The 'related_to' column is not yet provisioned in your 'save_noah_session_summary' table.\n` +
              `Make sure your table schema matches the definition in /save_noah_session_summary.sql.`;
          } else {
            responseText += `[NOTICE] Running in legacy 'joanna_value' table. The 'related_to' column is not yet provisioned in this table.\n` +
              `To migrate to the dedicated table, run the SQL in /save_noah_session_summary.sql in your Supabase Dashboard.`;
          }

          return {
            content: [{ type: "text", text: responseText }]
          };
        } else {
          return {
            content: [{ type: "text", text: `Failed to insert entry into '${targetTable}': ${insertErr.message}` }],
            isError: true
          };
        }
      }

      // Insertion with related_to succeeded!
      let responseText = `[SUCCESS] Entry saved successfully to '${targetTable}' table with relationship mappings.\n` +
        `Record ID: ${recordId}\n` +
        `Category: ${category}\n` +
        `Source: ${source}\n` +
        `Importance: ${importance}\n` +
        `Occurred At: ${occurredAtVal}\n` +
        `Linked Similar Entries: ${relatedToIds.length} (${JSON.stringify(relatedToIds)})`;

      if (targetTable === 'joanna_value') {
        responseText += `\n\n[MIGRATION TIP] You are running in legacy 'joanna_value' table fallback.\n` +
          `To use the dedicated table, execute the SQL contents of '/save_noah_session_summary.sql' in your Supabase SQL Editor.`;
      }

      return {
        content: [{ type: "text", text: responseText }]
      };

    } else if (name === "search_noah_memory") {
      const { query, table = 'all', limit = 10 } = (args || {}) as any;

      if (!query || typeof query !== 'string') {
        return {
          content: [{ type: "text", text: "Error: 'query' parameter is required and must be a string." }],
          isError: true
        };
      }

      const results: any[] = [];

      // A. Query save_noah_session_summary or joanna_value
      if (table === 'all' || table === 'joanna_value' || table === 'save_noah_session_summary') {
        let joannaData: any[] | null = null;
        let joannaErr: any = null;
        let queriedTable = 'save_noah_session_summary';

        if (table === 'joanna_value') {
          queriedTable = 'joanna_value';
          const res = await supabase
            .from('joanna_value')
            .select('*')
            .or(`content.ilike.%${query}%,category.ilike.%${query}%,source.ilike.%${query}%`)
            .limit(limit);
          joannaData = res.data;
          joannaErr = res.error;
        } else {
          // If table is 'all' or 'save_noah_session_summary', first try save_noah_session_summary
          const res = await supabase
            .from('save_noah_session_summary')
            .select('*')
            .or(`content.ilike.%${query}%,category.ilike.%${query}%,source.ilike.%${query}%`)
            .limit(limit);
          
          joannaData = res.data;
          joannaErr = res.error;

          // If table is 'all' and save_noah_session_summary doesn't exist, fallback to joanna_value
          if (joannaErr && table === 'all') {
            const isTableMissing = joannaErr.message?.includes('relation') || joannaErr.message?.includes('does not exist') || joannaErr.message?.includes('cache');
            if (isTableMissing) {
              console.log(`Table 'save_noah_session_summary' not found during search. Falling back to 'joanna_value'.`);
              queriedTable = 'joanna_value';
              const fallbackRes = await supabase
                .from('joanna_value')
                .select('*')
                .or(`content.ilike.%${query}%,category.ilike.%${query}%,source.ilike.%${query}%`)
                .limit(limit);
              joannaData = fallbackRes.data;
              joannaErr = fallbackRes.error;
            }
          }
        }

        if (joannaErr) {
          console.error(`Error searching ${queriedTable}:`, joannaErr);
        } else if (joannaData) {
          joannaData.forEach(row => {
            results.push({
              source_table: queriedTable,
              id: row.id,
              content: row.content,
              category: row.category,
              source: row.source,
              importance: row.importance,
              occurred_at: row.occurred_at,
              created_at: row.created_at,
              related_to: row.related_to
            });
          });
        }
      }

      // B. Query memory_timeline_events
      if (table === 'all' || table === 'timeline') {
        const { data: timelineData, error: timelineErr } = await supabase
          .from('memory_timeline_events')
          .select('id, title, primary_category, categories, summary, body, meta, created_at, occurred_at')
          .or(`title.ilike.%${query}%,summary.ilike.%${query}%,body.ilike.%${query}%`)
          .limit(limit);

        if (timelineErr) {
          console.error('Error searching memory_timeline_events:', timelineErr);
        } else if (timelineData) {
          timelineData.forEach(row => {
            results.push({
              source_table: 'memory_timeline_events',
              id: row.id,
              title: row.title,
              primary_category: row.primary_category,
              categories: row.categories,
              summary: row.summary,
              body: row.body,
              occurred_at: row.occurred_at,
              created_at: row.created_at,
              meta: row.meta
            });
          });
        }
      }

      // Sort combined results by occurred_at (descending)
      results.sort((a, b) => {
        const dateA = new Date(a.occurred_at || a.created_at || 0).getTime();
        const dateB = new Date(b.occurred_at || b.created_at || 0).getTime();
        return dateB - dateA;
      });

      const slicedResults = results.slice(0, limit);

      if (slicedResults.length === 0) {
        return {
          content: [{ type: "text", text: `No memories or counseling insights found matching: "${query}"` }]
        };
      }

      const formattedResults = slicedResults.map((row, index) => {
        let output = `[${index + 1}] Table: ${row.source_table} | ID: ${row.id}\n`;
        if (row.source_table === 'joanna_value' || row.source_table === 'save_noah_session_summary') {
          output += `Category: ${row.category} | Source: ${row.source} | Date: ${row.occurred_at || 'Unknown'}\n`;
          if (row.importance !== undefined) {
            output += `Importance: ${row.importance}/5\n`;
          }
          output += `Content:\n${row.content}\n`;
          if (row.related_to && row.related_to.length > 0) {
            output += `Related To IDs: ${JSON.stringify(row.related_to)}\n`;
          }
        } else {
          output += `Title: ${row.title}\n`;
          output += `Primary Category: ${row.primary_category} | Categories: ${JSON.stringify(row.categories)}\n`;
          output += `Date: ${row.occurred_at || 'Unknown'}\n`;
          output += `Summary: ${row.summary || 'None'}\n`;
          if (row.body) {
            output += `Body:\n${row.body}\n`;
          }
        }
        output += `----------------------------------------`;
        return output;
      }).join('\n\n');

      return {
        content: [
          {
            type: "text",
            text: `Found ${slicedResults.length} matching entries:\n\n${formattedResults}`
          }
        ]
      };

    } else {
      return {
        content: [{ type: "text", text: `Unknown tool: ${name}` }],
        isError: true
      };
    }
  } catch (error: any) {
    return {
      content: [{ type: "text", text: `Error executing tool ${name}: ${error?.message || error}` }],
      isError: true
    };
  }
});

// Setup Express routing for MCP SSE
export function registerMcpRoutes(app: express.Express) {
  const transports = new Map<string, SSEServerTransport>();

  app.get("/mcp/sse", async (req, res) => {
    console.log("New MCP SSE client connection request received.");
    const transport = new SSEServerTransport("/mcp/messages", res);
    transports.set(transport.sessionId, transport);
    
    await mcpServer.connect(transport);
    console.log(`Connected MCP Server to client session: ${transport.sessionId}`);

    req.on("close", () => {
      console.log(`MCP client connection closed for session: ${transport.sessionId}`);
      transports.delete(transport.sessionId);
    });
  });

  app.post("/mcp/messages", async (req, res) => {
    const sessionId = req.query.sessionId as string;
    const transport = transports.get(sessionId);

    if (transport) {
      await transport.handlePostMessage(req, res);
    } else {
      res.status(400).send(`Session not found: ${sessionId}`);
    }
  });
}
