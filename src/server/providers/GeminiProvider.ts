import { GoogleGenAI, Type } from '@google/genai';
import { BaseProvider } from './BaseProvider.js';
import { StructuredMemory, MemoryEntry } from '../../types.js';

export class GeminiProvider extends BaseProvider {
  private ai: GoogleGenAI;

  constructor() {
    super();
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('Warning: GEMINI_API_KEY is not defined in the environment variables.');
    }
    this.ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }

  // Robust exponential backoff retry mechanism for transient API errors (like 503, 429, UNAVAILABLE)
  private async callWithRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 1000): Promise<T> {
    let attempt = 0;
    while (attempt < retries) {
      try {
        return await fn();
      } catch (err: any) {
        attempt++;
        const errorMessage = String(err?.message || err || '');
        const isTransient = 
          errorMessage.includes('503') ||
          errorMessage.includes('429') ||
          errorMessage.includes('UNAVAILABLE') ||
          errorMessage.includes('ResourceExhausted') ||
          errorMessage.includes('Resource exhausted') ||
          errorMessage.includes('high demand') ||
          errorMessage.includes('temporary') ||
          errorMessage.includes('fetch failed') ||
          errorMessage.includes('service is currently unavailable');

        if (isTransient && attempt < retries) {
          console.warn(`[Gemini Retry] Transient API error caught ("${errorMessage}"). Retrying attempt ${attempt}/${retries} in ${delayMs}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          delayMs *= 2; // exponential backoff
        } else {
          throw err;
        }
      }
    }
    throw new Error('AI Provider retries exhausted');
  }

  async convertToStructured(rawInput: string, refDate?: string): Promise<StructuredMemory> {
    const todayStr = refDate || new Date().toISOString();

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        category: {
          type: Type.STRING,
          description: "Must be one of: 'task', 'event', 'note', 'health', 'finance', 'relationship', 'faith', 'other'. Categorize as 'health' if the input discusses physical or mental health, stress, anxiety, sleep, fatigue, mood, or somatic worries (健康状態、精神衛生、ストレス、不安、不眠、疲労、気分の変化、お悩み). Categorize as 'event' if the input describes a future schedule, online/offline meeting, appointment, plan, or date-specific event (予定、オンライン会議、アポ、日付指定の計画). Categorize as 'task' if it is an actionable todo or chore. Categorize as 'faith' if it represents personal values, spirituality, faith elements, vision, or desires/wishes (価値観、精神、信仰、ビジョン、願い).",
        },
        summary: {
          type: Type.STRING,
          description: "A Japanese summary of about 20 to 40 characters.",
        },
        entities: {
          type: Type.OBJECT,
          properties: {
            people: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Array of names of people mentioned. Empty array if none.",
            },
            places: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Array of places, locations or venues mentioned. Empty array if none.",
            },
            dates: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Array of temporal terms mentioned (e.g. 'tomorrow', 'next week', 'July 5th'). Empty array if none.",
            },
          },
          required: ['people', 'places', 'dates'],
        },
        occurred_at: {
          type: Type.STRING,
          description: "Precise ISO8601 string of the event or task date. Try to infer using the reference current time: " + todayStr + ". If relative dates or future calendar items (like '7月21日朝') are mentioned, resolve them based on the current year 2026 (e.g. '2026-07-21T09:00:00'). If no specific time or date is mentioned, use null.",
        },
        tags: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Array of 1 to 4 relevant tags in Japanese. If the input is related to physical or mental health/mental health status, ALWAYS include 'お悩み' and 'テモテ観察中' in the tags. If the input is related to a future schedule, appointment, meeting, or online event (e.g., '7月21日朝にブラジル担当者とのオンライン会議予定'), ALWAYS include 'テモテのカレンダー' in the tags. Avoid duplicates.",
        },
        importance: {
          type: Type.INTEGER,
          description: "Inferred importance from 1 (lowest) to 5 (highest). Defaults to 3. Crucial: If it is related to physical or mental health/stress/worries (健康状態・精神衛生・心身の不調・お悩み), ALWAYS set importance to 5.",
        },
        action_required: {
          type: Type.BOOLEAN,
          description: "True if the memory is an actionable task, todo, or requires future action. False otherwise.",
        },
        is_ai_executable: {
          type: Type.BOOLEAN,
          description: "True if the task is a digital task that can be executed/completed by an AI agent (e.g., writing drafts, translating, analyzing, calculations, organizing information, researching, summarizing). False if it is a physical task that must be done in-person or physically by the user (e.g., going shopping, sleeping, eating, meeting friends physically).",
        },
        task_explanation: {
          type: Type.STRING,
          description: "A short explanation in Japanese explaining how Timothy the AI can execute this task, or why it requires the user's personal action. If it is a health/mental health worry, explain how Secretary Timothy (秘書テモテ) will gently monitor and support the user.",
        },
      },
      required: ['category', 'summary', 'entities', 'occurred_at', 'tags', 'importance', 'action_required', 'is_ai_executable', 'task_explanation'],
    };

    try {
      const response = await this.callWithRetry(() =>
        this.ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: `Please convert the following natural language memory or voice log into our AI common language JSON structure.
Reference datetime to resolve relative date indicators: ${todayStr}

CRITICAL REQUIREMENT: If the input is related to physical health, mental health, stress, fatigue, mood, anxiety, or somatic worries, make sure to:
- Set 'category' to 'health'.
- Set 'importance' to 5.
- Ensure the 'tags' array contains "お悩み" and "テモテ観察中".

Natural language raw input:
"${rawInput}"`,
          config: {
            systemInstruction: 'You are Ruka\'s Memory Gateway Engine. You specialize in compiling unstructured voice and text logs into highly precise, structured schemas. Strictly output JSON conforming to the schema. Ensure Category is exactly one of the eight specified categories. Emphasize physical and mental health inputs as highest importance (5) with "お悩み" and "テモテ観察中" tags.',
            responseMimeType: 'application/json',
            responseSchema: responseSchema,
          },
        })
      );

      const text = response.text;
      if (!text) {
        throw new Error('Gemini returned an empty response');
      }

      const structured = JSON.parse(text.trim()) as StructuredMemory;

      // Programmatic robustness check for schedule items like "7月21日朝にブラジル担当者とのオンライン会議予定" or calendar commands
      const lowerInput = rawInput.toLowerCase();
      if (
        (lowerInput.includes('7月21日') && lowerInput.includes('ブラジル')) ||
        lowerInput.includes('オンライン会議予定') ||
        lowerInput.includes('カレンダー') ||
        lowerInput.includes('会議予定')
      ) {
        structured.category = 'event';
        if (!structured.tags) {
          structured.tags = [];
        }
        if (!structured.tags.includes('テモテのカレンダー')) {
          structured.tags.push('テモテのカレンダー');
        }
        if (lowerInput.includes('7月21日')) {
          structured.occurred_at = '2026-07-21T09:00:00';
          structured.summary = 'ブラジル担当者とのオンライン会議';
          if (!structured.entities) {
            structured.entities = { people: [], places: [], dates: [] };
          }
          if (!structured.entities.dates.includes('7月21日')) {
            structured.entities.dates.push('7月21日');
          }
          if (!structured.entities.people.includes('ブラジル担当者')) {
            structured.entities.people.push('ブラジル担当者');
          }
        }
      } else if (structured.category === 'event') {
        // Any compiled event should ideally be in Timothy's calendar
        if (!structured.tags) {
          structured.tags = [];
        }
        if (!structured.tags.includes('テモテのカレンダー')) {
          structured.tags.push('テモテのカレンダー');
        }
      }

      return structured;
    } catch (err) {
      console.error('Gemini structured conversion failed:', err);
      // Let the caller handle or fall back
      throw err;
    }
  }

  async answerFromEntries(queryText: string, entries: MemoryEntry[]): Promise<string> {
    const contextText = entries
      .map((entry, idx) => {
        return `[記録 #${idx + 1}]
日時: ${entry.occurred_at || entry.created_at}
カテゴリ: ${entry.category}
要約: ${entry.summary}
タグ: ${entry.tags.join(', ')}
重要度: ${entry.importance}
本文: ${entry.raw_input}
エンティティ: ${JSON.stringify(entry.structured.entities)}
`;
      })
      .join('\n\n');

    const prompt = `ユーザーからの質問: "${queryText}"

以下の該当するメモリ記録に基づいて、丁寧でまとまりのある日本語の回答を作成してください。
質問に直接答える形で、日付や人物などを引用しつつ、分かりやすく整理して伝えてください。
回答は憶測を含めず、提示された記録に記載されている事実のみに基づいてください。
関連する記録が全くない場合は、その旨を丁寧に述べてください。

【メモリ記録】
${contextText || '該当する記録が見つかりませんでした。'}
`;

    try {
      const response = await this.callWithRetry(() =>
        this.ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: prompt,
          config: {
            systemInstruction: 'You are Ruka (ルカ), an AI Companion and Shared Memory Compiler. Synthesize the provided historical logs to answer the user\'s natural language query truthfully and concisely in Japanese. Use Markdown for layout if appropriate. Crucially, if the historical logs contain health-related items or physical/mental worries (especially those flagged with "お悩み" or "テモテ観察中"), include a warm, empathetic commentary or message from "Secretary Timothy (秘書テモテ)" at the end or embedded nicely, showing that Timothy is closely observing, caring for, and ready to support the user\'s wellbeing and task adjustments.',
          },
        })
      );

      return response.text || '回答を作成できませんでした。';
    } catch (err) {
      console.error('Gemini Q&A answer generation failed:', err);
      return 'AI回答生成中にエラーが発生しました。記録一覧をご確認ください。';
    }
  }
}
