import { BaseProvider } from './BaseProvider.js';
import { GeminiProvider } from './GeminiProvider.js';
import { AnthropicProvider } from './AnthropicProvider.js';
import { OpenAIProvider } from './OpenAIProvider.js';

export function getProvider(): BaseProvider {
  const providerName = (process.env.LLM_PROVIDER || 'gemini').toLowerCase();

  if (providerName === 'anthropic') {
    console.log('LLM Provider active: ANTHROPIC (Claude)');
    return new AnthropicProvider();
  }

  if (providerName === 'openai') {
    console.log('LLM Provider active: OPENAI (ChatGPT)');
    return new OpenAIProvider();
  }

  console.log('LLM Provider active: GEMINI (Google)');
  return new GeminiProvider();
}

export { BaseProvider, GeminiProvider, AnthropicProvider, OpenAIProvider };
