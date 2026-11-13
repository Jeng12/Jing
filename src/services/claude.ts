import { Platform } from 'react-native';

// Direct HTTPS calls to the Claude Messages API with the user's own key.
// The official TypeScript SDK states that React Native is not supported, so this uses fetch
// with the request shape from the API reference.

const API_URL = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2026-10-21';
export const CLAUDE_MODEL = 'claude-opus-5-5';
/** Lets the API re-run a declined request on another model instead of returning the refusal. */
const FALLBACK_BETA = 'server-side-fallback-2026-07-01';
const TIMEOUT_MS = 120_000;
const MAX_RETRIES = 2;

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export type ClaudeErrorKind =
  | 'auth'
  | 'rate_limit'
  | 'overloaded'
  | 'server'
  | 'bad_request'
  | 'refusal'
  | 'truncated'
  | 'timeout'
  | 'network';

export class ClaudeError extends Error {
  constructor(
    readonly kind: ClaudeErrorKind,
    message: string,
  ) {
    super(message);
  }
}

/** Plain-language text for each failure, shown in the app. */
export function describeClaudeError(e: unknown): string {
  if (!(e instanceof ClaudeError)) return 'Something went wrong. Please try again.';
  switch (e.kind) {
    case 'auth':
      return 'Your API key was not accepted. In AI Coach, remove it at the bottom and enter it again.';
    case 'rate_limit':
      return 'Too many requests right now. Wait a minute and try again.';
    case 'overloaded':
    case 'server':
      return 'Claude is busy at the moment. Please try again shortly.';
    case 'refusal':
      return 'Claude declined to answer this request.';
    case 'truncated':
      return 'The answer was cut off. Please try again.';
    case 'timeout':
      return 'This took too long. Check your connection and try again.';
    case 'network':
      return 'No connection to Claude. Check your internet and try again.';
    case 'bad_request':
      return `Request failed: ${e.message}`;
  }
}

interface MessagesResponse {
  content: { type: string; text?: string }[];
  stop_reason: string | null;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function postMessages(apiKey: string, body: object): Promise<MessagesResponse> {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': API_VERSION,
    'anthropic-beta': FALLBACK_BETA,
  };
  // Browsers need this explicit opt-in; the key is the user's own, entered on their device.
  if (Platform.OS === 'web') headers['anthropic-dangerous-direct-browser-access'] = 'true';

  for (let attempt = 0; ; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(API_URL, { method: 'POST', headers, body: JSON.stringify(body), signal: controller.signal });
    } catch (e) {
      clearTimeout(timer);
      if (controller.signal.aborted) throw new ClaudeError('timeout', 'Request timed out');
      if (attempt < MAX_RETRIES) {
        await sleep(1000 * 2 ** attempt);
        continue;
      }
      throw new ClaudeError('network', e instanceof Error ? e.message : String(e));
    }
    clearTimeout(timer);
    if (res.ok) return (await res.json()) as MessagesResponse;

    const payload = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    const message = payload?.error?.message ?? `HTTP ${res.status}`;
    const retryable = res.status === 429 || res.status === 529 || res.status >= 500;
    if (retryable && attempt < MAX_RETRIES) {
      const retryAfter = Number(res.headers.get('retry-after'));
      await sleep(retryAfter > 0 ? Math.min(retryAfter, 20) * 1000 : 1500 * 2 ** attempt);
      continue;
    }
    if (res.status === 401 || res.status === 403) throw new ClaudeError('auth', message);
    if (res.status === 429) throw new ClaudeError('rate_limit', message);
    if (res.status === 529) throw new ClaudeError('overloaded', message);
    if (res.status >= 500) throw new ClaudeError('server', message);
    throw new ClaudeError('bad_request', message);
  }
}

interface AskOptions {
  apiKey: string;
  system: string;
  messages: ChatTurn[];
  /** JSON Schema the reply must follow (structured outputs). Omit for free text. */
  schema?: object;
}

/** Sends one request and returns the reply text (JSON text when `schema` is given). */
export async function askClaude({ apiKey, system, messages, schema }: AskOptions): Promise<string> {
  const response = await postMessages(apiKey, {
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
  // Check why it stopped before trusting the content.
  if (response.stop_reason === 'refusal') throw new ClaudeError('refusal', 'Declined');
  if (response.stop_reason === 'max_tokens') throw new ClaudeError('truncated', 'Reply cut off');
  const text = response.content
    .filter(block => block.type === 'text' && typeof block.text === 'string')
    .map(block => block.text)
    .join('');
  if (!text.trim()) throw new ClaudeError('bad_request', 'Empty reply');
  return text;
}
