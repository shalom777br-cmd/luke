import { BaseProvider } from './BaseProvider.js';
import { StructuredMemory, MemoryEntry } from '../../types.js';

export class AnthropicProvider extends BaseProvider {
  private apiKey: string | undefined;

  constructor() {
    super();
    this.apiKey = process.env.ANTHROPIC_API_KEY;
    if (!this.apiKey) {
      console.warn('Warning: ANTHROPIC_API_KEY is not defined in the environment variables.');
    }
  }

  async convertToStructured(rawInput: string, refDate?: string): Promise<StructuredMemory> {
    const todayStr = refDate || new Date().toISOString();

    if (!this.apiKey) {
      console.warn('Anthropic API key is missing. Falling back to structured parsing logic mock.');
      // Fallback structured generation
      return {
        category: 'note',
        summary: rawInput.slice(0, 40),
        entities: { people: [], places: [], dates: [] },
        occurred_at: todayStr,
        tags: ['Anthropic接続待機中'],
        importance: 3,
        action_required: false,
      };
    }

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1000,
          system: `You are Ruka's Memory Gateway Engine. You compile natural language voice and text logs into JSON schemas.
Your output must be a single raw JSON object, without markdown codeblock formatting or introductory text.
The JSON must strictly match this schema:
{
  "category": "task" | "event" | "note" | "health" | "finance" | "relationship" | "faith" | "other",
  "summary": "Japanese summary, 20-40 characters",
  "entities": {
    "people": ["name1", "name2"],
    "places": ["place1", "place2"],
    "dates": ["date_expression1"]
  },
  "occurred_at": "ISO8601 string or null",
  "tags": ["tag1", "tag2"],
  "importance": 1-5,
  "action_required": boolean
}
Reference datetime for resolving dates: ${todayStr}`,
          messages: [
            {
              role: 'user',
              content: `Please convert this input: "${rawInput}"`,
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`Anthropic API returned status ${response.status}: ${await response.text()}`);
      }

      const data = await response.json() as any;
      const text = data.content?.[0]?.text;
      if (!text) {
        throw new Error('Anthropic returned empty content');
      }

      const jsonStart = text.indexOf('{');
      const jsonEnd = text.lastIndexOf('}') + 1;
      const cleanJson = text.substring(jsonStart, jsonEnd);

      return JSON.parse(cleanJson) as StructuredMemory;
    } catch (err) {
      console.error('Anthropic structured conversion failed:', err);
      throw err;
    }
  }

  async answerFromEntries(queryText: string, entries: MemoryEntry[]): Promise<string> {
    if (!this.apiKey) {
      console.warn('Anthropic API key is missing.');
      return 'Anthropic APIキーが設定されていません。Geminiプロバイダーを使用するか、環境変数を設定してください。';
    }

    const contextText = entries
      .map((entry, idx) => {
        return `[Record #${idx + 1}]
Date: ${entry.occurred_at || entry.created_at}
Category: ${entry.category}
Summary: ${entry.summary}
Tags: ${entry.tags.join(', ')}
Importance: ${entry.importance}
Body: ${entry.raw_input}
`;
      })
      .join('\n\n');

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1000,
          system: 'You are Ruka, a Shared Memory companion. Answer the user\'s natural language query truthfully based on the memory records in Japanese.',
          messages: [
            {
              role: 'user',
              content: `User Question: "${queryText}"\n\nMemory Entries:\n${contextText}`,
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`Anthropic API returned status ${response.status}`);
      }

      const data = await response.json() as any;
      return data.content?.[0]?.text || '回答を作成できませんでした。';
    } catch (err) {
      console.error('Anthropic answer formulation failed:', err);
      return 'Claudeでの回答生成中にエラーが発生しました。';
    }
  }
}
