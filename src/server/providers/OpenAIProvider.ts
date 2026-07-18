import { BaseProvider } from './BaseProvider.js';
import { StructuredMemory, MemoryEntry } from '../../types.js';

export class OpenAIProvider extends BaseProvider {
  private apiKey: string | undefined;
  private model: string;

  constructor() {
    super();
    this.apiKey = process.env.OPENAI_API_KEY;
    this.model = process.env.OPENAI_MODEL || 'gpt-4o';
    if (!this.apiKey) {
      console.warn('Warning: OPENAI_API_KEY is not defined in the environment variables.');
    }
  }

  private async callChat(system: string, userContent: string, jsonMode = false): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 1000,
        ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userContent },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API returned status ${response.status}: ${await response.text()}`);
    }

    const data = await response.json() as any;
    const text = data.choices?.[0]?.message?.content;
    if (!text) {
      throw new Error('OpenAI returned empty content');
    }
    return text;
  }

  async convertToStructured(rawInput: string, refDate?: string): Promise<StructuredMemory> {
    const todayStr = refDate || new Date().toISOString();

    if (!this.apiKey) {
      console.warn('OpenAI API key is missing. Falling back to structured parsing logic mock.');
      return {
        category: 'note',
        summary: rawInput.slice(0, 40),
        entities: { people: [], places: [], dates: [] },
        occurred_at: todayStr,
        tags: ['OpenAI接続待機中'],
        importance: 3,
        action_required: false,
      };
    }

    try {
      const text = await this.callChat(
        `You are Ruka's Memory Gateway Engine. You compile natural language voice and text logs into JSON schemas.
Your output must be a single raw JSON object, without markdown codeblock formatting or introductory text.
The JSON must strictly match this schema:
{
  "category": "task" | "event" | "note" | "health" | "finance" | "relationship" | "faith" | "other",
  "summary": "Japanese summary, 20-40 characters",
  "entities": { "people": ["name1"], "places": ["place1"], "dates": ["date_expression1"] },
  "occurred_at": "ISO8601 string or null",
  "tags": ["tag1", "tag2"],
  "importance": 1-5,
  "action_required": boolean
}
Reference datetime for resolving dates: ${todayStr}`,
        `Please convert this input: "${rawInput}"`,
        true
      );

      const jsonStart = text.indexOf('{');
      const jsonEnd = text.lastIndexOf('}') + 1;
      return JSON.parse(text.substring(jsonStart, jsonEnd)) as StructuredMemory;
    } catch (err) {
      console.error('OpenAI structured conversion failed:', err);
      throw err;
    }
  }

  async answerFromEntries(queryText: string, entries: MemoryEntry[]): Promise<string> {
    if (!this.apiKey) {
      return 'OpenAI APIキーが設定されていません。環境変数を設定してください。';
    }

    const contextText = entries
      .map((entry, idx) => `[Record #${idx + 1}]
Date: ${entry.occurred_at || entry.created_at}
Category: ${entry.category}
Summary: ${entry.summary}
Tags: ${entry.tags.join(', ')}
Importance: ${entry.importance}
Body: ${entry.raw_input}`)
      .join('\n\n');

    try {
      return await this.callChat(
        'You are Ruka, a Shared Memory companion. Answer the user\'s natural language query truthfully based on the memory records in Japanese.',
        `User Question: "${queryText}"\n\nMemory Entries:\n${contextText}`
      );
    } catch (err) {
      console.error('OpenAI answer formulation failed:', err);
      return 'ChatGPTでの回答生成中にエラーが発生しました。';
    }
  }

  async reEvaluate(
    content: string,
    currentCategory: string,
    currentImportance: number
  ): Promise<{ suggested_category: string; suggested_importance: number; reason: string }> {
    if (!this.apiKey) {
      return {
        suggested_category: currentCategory,
        suggested_importance: currentImportance,
        reason: 'OpenAI APIキーが設定されていないため、現在の属性を維持することをお勧めします。',
      };
    }

    try {
      const text = await this.callChat(
        `You are Ruka's Memory Auditor. Output a single raw JSON object only:
{
  "suggested_category": "task" | "event" | "note" | "health" | "finance" | "relationship" | "faith" | "other",
  "suggested_importance": 1-5,
  "reason": "Japanese explanation (about 30-60 characters)"
}`,
        `Content: "${content}"\nCurrent Category: ${currentCategory}\nCurrent Importance: ${currentImportance}`,
        true
      );

      const jsonStart = text.indexOf('{');
      const jsonEnd = text.lastIndexOf('}') + 1;
      const parsed = JSON.parse(text.substring(jsonStart, jsonEnd));

      return {
        suggested_category: parsed.suggested_category || currentCategory,
        suggested_importance: typeof parsed.suggested_importance === 'number' ? parsed.suggested_importance : currentImportance,
        reason: parsed.reason || '再評価結果に基づき、設定を推奨します。',
      };
    } catch (err) {
      console.error('OpenAI re-evaluation failed:', err);
      return {
        suggested_category: currentCategory,
        suggested_importance: currentImportance,
        reason: '再評価プロセス中に一時的なエラーが発生しました。',
      };
    }
  }

  async counselWithNoah(worryText: string, healthHistory: MemoryEntry[]): Promise<string> {
    if (!this.apiKey) {
      return `【ノア (AIカウンセラー) のメッセージ】
OpenAI APIキーが未設定のため、デモ回答モードです。

「こんにちは。カウンセラーのノアです。
今はまだお話しする準備が完全に整っていないかもしれませんが、あなたの心細さやモヤモヤはしっかりと受け止めています。
どうか一人で抱え込まず、深く息を吐いてみてくださいね。」`;
    }

    const historyContext = healthHistory.length > 0
      ? healthHistory
          .map((entry, idx) => `[過去の記録 #${idx + 1}] 日時: ${entry.occurred_at || entry.created_at} 内容: ${entry.raw_input}`)
          .join('\n\n')
      : '過去の関連履歴はありません。';

    try {
      return await this.callChat(
        'You are Noah (ノア), an AI Counselor specializing in physical & psychological wellness, values, and faith. You have been building trust with this person over 2 years. Act with deep empathy, active listening, and warmth. Respond in gentle Japanese with soft counseling-style endings ("ですね", "ですよ", "くださいね"). Use Markdown paragraphs.',
        `User Current Worry: "${worryText}"\n\nShared Memory Logs (past 2 years):\n${historyContext}\n\nPlease provide warm, compassionate counseling as counselor Noah, referencing the shared history naturally where relevant.`
      );
    } catch (err) {
      console.error('OpenAI counseling formulation failed:', err);
      return 'カウンセラー・ノアが少し考え込んでしまったようです。もう一度そっと声をかけてみてください。';
    }
  }
}
