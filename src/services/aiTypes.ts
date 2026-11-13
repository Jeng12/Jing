// Shared by the Claude and Gemini clients.

export type AiProvider = 'gemini' | 'claude';

/** The user's key and which service it belongs to (chosen on the AI Coach screen). */
export interface AiCredentials {
  provider: AiProvider;
  key: string;
}

/**
 * Guesses the service from a key's prefix: Anthropic keys start "sk-ant-"; Google AI Studio keys
 * start "AQ." (current format) or "AIza" (older format). Returns null for anything else.
 */
export function detectProvider(key: string | null | undefined): AiProvider | null {
  const k = key?.trim() ?? '';
  if (k.startsWith('sk-ant-')) return 'claude';
  if (k.startsWith('AQ.') || k.startsWith('AIza')) return 'gemini';
  return null;
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

/** Earlier versions stored the bare key; those load with the provider guessed from the prefix. */
export function parseStoredCredentials(raw: string | null): AiCredentials | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<AiCredentials>;
    if (parsed && typeof parsed.key === 'string' && (parsed.provider === 'gemini' || parsed.provider === 'claude')) {
      return { key: parsed.key, provider: parsed.provider };
    }
  } catch {
    // not JSON: a bare key
  }
  return { key: raw, provider: detectProvider(raw) ?? 'gemini' };
}

export interface AskOptions {
  apiKey: string;
  system: string;
  messages: ChatTurn[];
  /** JSON Schema the reply must follow. Omit for free text. */
  schema?: object;
}

export type AiErrorKind =
  | 'auth'
  | 'rate_limit'
  | 'overloaded'
  | 'server'
  | 'bad_request'
  | 'refusal'
  | 'truncated'
  | 'timeout'
  | 'network';

export class AiError extends Error {
  constructor(
    readonly kind: AiErrorKind,
    message: string,
  ) {
    super(message);
  }
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * POST with a timeout and retries for network errors, 429 and 5xx/529.
 * Returns the parsed JSON body of a 2xx response; throws AiError otherwise.
 */
export async function postJson(
  url: string,
  headers: Record<string, string>,
  body: object,
  { timeoutMs = 120_000, maxRetries = 2 } = {},
): Promise<{ status: number; json: unknown }> {
  for (let attempt = 0; ; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let res: Response;
    try {
      res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), signal: controller.signal });
    } catch (e) {
      clearTimeout(timer);
      if (controller.signal.aborted) throw new AiError('timeout', 'Request timed out');
      if (attempt < maxRetries) {
        await sleep(1000 * 2 ** attempt);
        continue;
      }
      throw new AiError('network', e instanceof Error ? e.message : String(e));
    }
    clearTimeout(timer);
    const json: unknown = await res.json().catch(() => null);
    if (res.ok) return { status: res.status, json };
    const retryable = res.status === 429 || res.status === 529 || res.status >= 500;
    if (retryable && attempt < maxRetries) {
      const retryAfter = Number(res.headers.get('retry-after'));
      await sleep(retryAfter > 0 ? Math.min(retryAfter, 20) * 1000 : 1500 * 2 ** attempt);
      continue;
    }
    return { status: res.status, json };
  }
}

/** Error kind for an HTTP status that is not 2xx. */
export function kindForStatus(status: number): AiErrorKind {
  if (status === 401 || status === 403) return 'auth';
  if (status === 429) return 'rate_limit';
  if (status === 529 || status === 503) return 'overloaded';
  if (status >= 500) return 'server';
  return 'bad_request';
}
