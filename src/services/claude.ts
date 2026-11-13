import { Platform } from 'react-native';
import { AiError, AskOptions, kindForStatus, postJson } from './aiTypes';

// Direct HTTPS calls to the Claude Messages API with the user's own key.
// The official TypeScript SDK states that React Native is not supported, so this uses fetch
// with the request shape from the API reference.

const API_URL = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2026-10-21';
export const CLAUDE_MODEL = 'claude-opus-5-5';
/** Lets the API re-run a declined request on another model instead of returning the refusal. */
const FALLBACK_BETA = 'server-side-fallback-2026-07-01';

interface MessagesResponse {
  content?: { type: string; text?: string }[];
  stop_reason?: string | null;
  error?: { message?: string };
}

/** Sends one request and returns the reply text (JSON text when `schema` is given). */
export async function askClaude({ apiKey, system, messages, schema }: AskOptions): Promise<string> {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': API_VERSION,
    'anthropic-beta': FALLBACK_BETA,
  };
  // Browsers need this explicit opt-in; the key is the user's own, entered on their device.
  if (Platform.OS === 'web') headers['anthropic-dangerous-direct-browser-access'] = 'true';

  const { status, json } = await postJson(API_URL, headers, {
    model: CLAUDE_MODEL,
    max_tokens: 16000,
    fallbacks: 'default',
    system,
    messages,
    output_config: {
      effort: 'medium',
      ...(schema ? { format: { type: 'json_schema', schema } } : {}),
    },
  });
  const response = (json ?? {}) as MessagesResponse;
  if (status >= 300) throw new AiError(kindForStatus(status), response.error?.message ?? `HTTP ${status}`);

  // Check why it stopped before trusting the content.
  if (response.stop_reason === 'refusal') throw new AiError('refusal', 'Declined');
  if (response.stop_reason === 'max_tokens') throw new AiError('truncated', 'Reply cut off');
  const text = (response.content ?? [])
    .filter(block => block.type === 'text' && typeof block.text === 'string')
    .map(block => block.text)
    .join('');
  if (!text.trim()) throw new AiError('bad_request', 'Empty reply');
  return text;
}
