/**
 * Gemini's own REST API, rather than its OpenAI compatibility layer.
 *
 * Google AI Studio now issues "auth keys" that begin with `AQ.` instead of the
 * older `AIza` keys. Those are sent in the `x-goog-api-key` header, which is
 * what Google's documentation specifies; the compatibility layer's
 * `Authorization: Bearer` style rejects them with 401 UNAUTHENTICATED. Calling
 * the native endpoint works for both old and new keys.
 */

export const GEMINI_ROOT = "https://generativelanguage.googleapis.com/v1beta";

export class GeminiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body: string,
  ) {
    super(message);
  }
}

export type GeminiStreamResult = {
  text: string;
  usageIn: number;
  usageOut: number;
  truncated: boolean;
  finishReason: string;
};

type Part = { text?: string; thought?: boolean };
type Chunk = {
  candidates?: { content?: { parts?: Part[] }; finishReason?: string }[];
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
  error?: { message?: string; status?: string };
};

export async function geminiStream(opts: {
  root?: string;
  apiKey: string;
  model: string;
  system: string;
  user: string;
  maxOutputTokens: number;
  signal: AbortSignal;
  onDelta: (delta: string) => void;
}): Promise<GeminiStreamResult> {
  const root = (opts.root ?? GEMINI_ROOT).replace(/\/+$/, "");
  const url = `${root}/models/${encodeURIComponent(opts.model)}:streamGenerateContent?alt=sse`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": opts.apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: opts.system }] },
      contents: [{ role: "user", parts: [{ text: opts.user }] }],
      generationConfig: { maxOutputTokens: opts.maxOutputTokens, temperature: 0.2 },
    }),
    signal: opts.signal,
  });

  if (!res.ok || !res.body) {
    const body = await res.text().catch(() => "");
    let message = `Gemini returned HTTP ${res.status}`;
    try {
      const parsed = JSON.parse(body) as Chunk;
      if (parsed.error?.message) message = parsed.error.message;
    } catch {
      /* keep the status-based message */
    }
    throw new GeminiError(message, res.status, body.slice(0, 600));
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  let usageIn = 0;
  let usageOut = 0;
  let finishReason = "";

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // Server-sent events: records separated by a blank line, payload on "data:".
    let sep: number;
    while ((sep = buffer.search(/\r?\n\r?\n/)) !== -1) {
      const record = buffer.slice(0, sep);
      buffer = buffer.slice(sep + (buffer[sep] === "\r" ? 4 : 2));
      handle(record);
    }
  }
  if (buffer.trim()) handle(buffer);

  function handle(record: string) {
    for (const line of record.split(/\r?\n/)) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      let chunk: Chunk;
      try {
        chunk = JSON.parse(payload) as Chunk;
      } catch {
        continue;
      }
      const cand = chunk.candidates?.[0];
      for (const part of cand?.content?.parts ?? []) {
        // A reasoning model marks its private thinking; that is not the answer.
        if (part.thought === true) continue;
        if (typeof part.text === "string" && part.text) {
          text += part.text;
          opts.onDelta(part.text);
        }
      }
      if (cand?.finishReason) finishReason = cand.finishReason;
      if (chunk.usageMetadata) {
        usageIn = chunk.usageMetadata.promptTokenCount ?? usageIn;
        usageOut = chunk.usageMetadata.candidatesTokenCount ?? usageOut;
      }
    }
  }

  return { text, usageIn, usageOut, truncated: finishReason === "MAX_TOKENS", finishReason };
}

/** Model names this key may actually use, for the setup check. */
export async function geminiModels(
  apiKey: string,
  root = GEMINI_ROOT,
): Promise<{ ok: true; models: string[] } | { ok: false; status: number; body: string }> {
  const res = await fetch(`${root.replace(/\/+$/, "")}/models?pageSize=200`, {
    headers: { "x-goog-api-key": apiKey },
    signal: AbortSignal.timeout(25_000),
  });
  const body = await res.text().catch(() => "");
  if (!res.ok) return { ok: false, status: res.status, body: body.slice(0, 500) };
  try {
    const parsed = JSON.parse(body) as {
      models?: { name?: string; supportedGenerationMethods?: string[] }[];
    };
    const models = (parsed.models ?? [])
      .filter((m) => {
        const methods = m.supportedGenerationMethods;
        // Older responses list the methods; newer ones may omit the field.
        return !methods || methods.includes("generateContent");
      })
      .map((m) => (m.name ?? "").replace(/^models\//, ""))
      .filter(Boolean);
    return { ok: true, models };
  } catch {
    return { ok: false, status: res.status, body: "Couldn't read Google's model list." };
  }
}
