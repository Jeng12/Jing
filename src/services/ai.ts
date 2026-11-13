import { AiError, AskOptions } from './aiTypes';
import { askClaude } from './claude';
import { askGemini } from './gemini';

export type { ChatTurn } from './aiTypes';
export { AiError } from './aiTypes';

export type AiProvider = 'gemini' | 'claude';

export const PROVIDER_NAMES: Record<AiProvider, string> = { gemini: 'Gemini', claude: 'Claude' };

/** Which service a key belongs to, from its prefix: Google keys start "AIza", Anthropic keys "sk-ant-". */
export function providerForKey(key: string | null | undefined): AiProvider | null {
  const k = key?.trim() ?? '';
  if (k.startsWith('AIza')) return 'gemini';
  if (k.startsWith('sk-ant-')) return 'claude';
  return null;
}

/** Sends the request to whichever service the key belongs to. */
export function askAI(options: AskOptions): Promise<string> {
  const provider = providerForKey(options.apiKey);
  if (provider === 'gemini') return askGemini(options);
  if (provider === 'claude') return askClaude(options);
  return Promise.reject(new AiError('auth', 'Unknown API key type'));
}

/** Plain-language text for each failure, shown in the app. */
export function describeAiError(e: unknown, provider: AiProvider | null): string {
  const name = provider ? PROVIDER_NAMES[provider] : 'The AI service';
  if (!(e instanceof AiError)) return 'Something went wrong. Please try again.';
  switch (e.kind) {
    case 'auth':
      return 'Your API key was not accepted. In AI Coach, remove it at the bottom and enter it again.';
    case 'rate_limit':
      return provider === 'gemini'
        ? 'Gemini usage limit reached for now (the free tier has a daily and per-minute limit). Try again later.'
        : 'Too many requests right now. Wait a minute and try again.';
    case 'overloaded':
    case 'server':
      return `${name} is busy at the moment. Please try again shortly.`;
    case 'refusal':
      return `${name} declined to answer this request.`;
    case 'truncated':
      return 'The answer was cut off. Please try again.';
    case 'timeout':
      return 'This took too long. Check your connection and try again.';
    case 'network':
      return `No connection to ${name}. Check your internet and try again.`;
    case 'bad_request':
      return `Request failed: ${e.message}`;
  }
}
