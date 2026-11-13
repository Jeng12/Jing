import { AiCredentials, AiError, AiProvider, AskOptions } from './aiTypes';
import { askClaude } from './claude';
import { askGemini } from './gemini';

export type { AiCredentials, AiProvider, ChatTurn } from './aiTypes';
export { AiError, detectProvider } from './aiTypes';

export const PROVIDER_NAMES: Record<AiProvider, string> = { gemini: 'Gemini', claude: 'Claude' };

/** Sends the request to the service the saved key belongs to. */
export function askAI(creds: AiCredentials, request: Omit<AskOptions, 'apiKey'>): Promise<string> {
  const options = { ...request, apiKey: creds.key };
  return creds.provider === 'claude' ? askClaude(options) : askGemini(options);
}

/** Plain-language text for each failure, shown in the app. */
export function describeAiError(e: unknown, provider: AiProvider | null | undefined): string {
  const name = provider ? PROVIDER_NAMES[provider] : 'The AI service';
  if (!(e instanceof AiError)) return 'Something went wrong. Please try again.';
  switch (e.kind) {
    case 'auth':
      // Include the service's own reason: it tells a wrong key apart from a disabled API or a key restriction.
      return `${name} did not accept your API key (${e.message.split('\n')[0].slice(0, 160)}). Check the key, or remove it at the bottom of AI Coach and add it again.`;
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
