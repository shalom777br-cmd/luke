import { StructuredMemory, MemoryEntry } from '../../types.js';

export abstract class BaseProvider {
  abstract convertToStructured(rawInput: string, refDate?: string): Promise<StructuredMemory>;
  abstract answerFromEntries(queryText: string, entries: MemoryEntry[]): Promise<string>;
}
