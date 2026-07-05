import { BaseProvider } from './BaseProvider.js';
import { GeminiProvider } from './GeminiProvider.js';
import { AnthropicProvider } from './AnthropicProvider.js';

export function getProvider(): BaseProvider {
  const providerName = (process.env.LLM_PROVIDER || 'gemini').toLowerCase();
  
  if (providerName === 'anthropic') {
    console.log('LLM Provider active: ANTHROPIC (Claude)');
    return new AnthropicProvider();
  }
  
  console.log('LLM Provider active: GEMINI (Google)');
  return new GeminiProvider();
}

export { BaseProvider, GeminiProvider, AnthropicProvider };
