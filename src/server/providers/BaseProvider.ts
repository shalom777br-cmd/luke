import { StructuredMemory, MemoryEntry } from '../../types.js';

export abstract class BaseProvider {
  abstract convertToStructured(rawInput: string, refDate?: string): Promise<StructuredMemory>;
  abstract answerFromEntries(queryText: string, entries: MemoryEntry[]): Promise<string>;
  abstract reEvaluate(
    content: string,
    currentCategory: string,
    currentImportance: number
  ): Promise<{ suggested_category: string; suggested_importance: number; reason: string }>;
  abstract counselWithNoah(worryText: string, healthHistory: MemoryEntry[]): Promise<string>;
}

