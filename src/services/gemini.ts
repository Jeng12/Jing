import { AiError, AskOptions, kindForStatus, postJson } from './aiTypes';

// Direct HTTPS calls to the Gemini API (generateContent) with the user's own key.

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
/** Current stable Flash model; if Google retires it, the "latest Flash" alias is tried next. */
export const GEMINI_MODELS = ['gemini-3.8-flash', 'gemini-flash-latest'];

const BLOCKED_FINISH = ['SAFETY', 'RECITATION', 'BLOCKLIST', 'PROHIBITED_CONTENT', 'SPII', 'IMAGE_SAFETY'];

interface GenerateResponse {
  candidates?: {
    content?: { parts?: { text?: string; thought?: boolean }[] };
    finishReason?: string;
  }[];
  promptFeedback?: { blockReason?: string };
  error?: { code?: number; message?: string; status?: string };
}

/** Gemini's JSON Schema support is a subset; `additionalProperties` is left out to stay within it. */
function toGeminiSchema(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(toGeminiSchema);
  if (schema && typeof schema === 'object') {
    return Object.fromEntries(
      Object.entries(schema as Record<string, unknown>)
        .filter(([key]) => key !== 'additionalProperties')
        .map(([key, value]) => [key, toGeminiSchema(value)]),
    );
  }
  return schema;
}

export async function askGemini({ apiKey, system, messages, schema }: AskOptions): Promise<string> {
  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents: messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
    generationConfig: {
      maxOutputTokens: 16384,
      ...(schema ? { responseMimeType: 'application/json', responseJsonSchema: toGeminiSchema(schema) } : {}),
    },
  };
  const headers = { 'content-type': 'application/json', 'x-goog-api-key': apiKey };

  for (let i = 0; i < GEMINI_MODELS.length; i++) {
    const { status, json } = await postJson(`${API_BASE}/${GEMINI_MODELS[i]}:generateContent`, headers, body);
    const response = (json ?? {}) as GenerateResponse;
    // Model retired or renamed: try the next one.
    if (status === 404 && i < GEMINI_MODELS.length - 1) continue;
    if (status >= 300) {
      const message = response.error?.message ?? `HTTP ${status}`;
      // An invalid key comes back as 400 INVALID_ARGUMENT with an "API key" message.
      if (status === 400 && /api key/i.test(message)) throw new AiError('auth', message);
      throw new AiError(kindForStatus(status), message);
    }

    if (response.promptFeedback?.blockReason) throw new AiError('refusal', response.promptFeedback.blockReason);
    const candidate = response.candidates?.[0];
    if (!candidate) throw new AiError('refusal', 'No answer');
    const finish = candidate.finishReason ?? '';
    if (BLOCKED_FINISH.includes(finish)) throw new AiError('refusal', finish);
    if (finish === 'MAX_TOKENS') throw new AiError('truncated', 'Reply cut off');
    // Thought summaries, when present, are marked and are not part of the answer.
    const text = (candidate.content?.parts ?? [])
      .filter(part => !part.thought && typeof part.text === 'string')
      .map(part => part.text)
      .join('');
    if (!text.trim()) throw new AiError('bad_request', 'Empty reply');
    return text;
  }
  throw new AiError('bad_request', 'No Gemini model available');
}
