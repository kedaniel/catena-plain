import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { GEMINI_ROOT, GeminiError, geminiStream } from "./gemini";

/**
 * The app can talk to Claude or to any OpenAI-compatible provider, so you can
 * run it on a free tier instead of paid credits. Pick one with LLM_PROVIDER:
 *
 *   anthropic   ANTHROPIC_API_KEY            (paid credits)
 *   gemini      LLM_API_KEY                  (Google AI Studio has a free tier)
 *   deepseek    LLM_API_KEY                  (very cheap, but needs a top-up)
 *   groq        LLM_API_KEY + LLM_MODEL      (free tier, fast)
 *   openrouter  LLM_API_KEY + LLM_MODEL      (some models are free)
 *   custom      LLM_API_KEY + LLM_BASE_URL + LLM_MODEL
 *
 * Everything else in the app is unchanged: the same prompt, the same caching,
 * the same access codes and limits.
 */
export type ProviderName =
  | "anthropic"
  | "gemini"
  | "gemini-openai"
  | "deepseek"
  | "groq"
  | "openrouter"
  | "custom";

type Preset = {
  baseURL: string;
  defaultModel?: string;
  label: string;
  thinks?: boolean;
  /** Set when the provider is called through its own API instead of the OpenAI shape. */
  native?: "gemini";
};

const PRESETS: Record<Exclude<ProviderName, "anthropic">, Preset> = {
  // Gemini uses its own REST API, not the OpenAI compatibility layer: AI Studio
  // now issues keys beginning "AQ." that must travel in the x-goog-api-key
  // header, which the compatibility layer's Bearer style rejects.
  gemini: {
    baseURL: GEMINI_ROOT,
    defaultModel: "gemini-3.8-flash",
    label: "Google Gemini",
    // Gemini 3 models reason before answering, and that reasoning is charged
    // against the output budget, so the budget has to be generous.
    thinks: true,
    native: "gemini",
  },
  // The compatibility layer, kept for anyone whose older AIza key prefers it.
  "gemini-openai": {
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
    defaultModel: "gemini-3.8-flash",
    label: "Google Gemini (OpenAI-compatible)",
    thinks: true,
  },
  deepseek: { baseURL: "https://api.deepseek.com/v1", defaultModel: "deepseek-chat", label: "DeepSeek" },
  groq: { baseURL: "https://api.groq.com/openai/v1", label: "Groq" },
  openrouter: { baseURL: "https://openrouter.ai/api/v1", label: "OpenRouter" },
  custom: { baseURL: "", label: "Custom provider" },
};

function providerName(): ProviderName {
  const raw = (process.env.LLM_PROVIDER || "").trim().toLowerCase();
  if (raw in PRESETS || raw === "anthropic") return raw as ProviderName;
  // No provider named: use whichever key is present.
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.LLM_API_KEY) return "custom";
  return "anthropic";
}

export type Config =
  | {
      ok: true;
      provider: ProviderName;
      label: string;
      model: string;
      baseURL?: string;
      apiKey: string;
      thinks: boolean;
      native?: "gemini";
    }
  | { ok: false; error: string };

export function config(): Config {
  const provider = providerName();

  if (provider === "anthropic") {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return {
        ok: false,
        error:
          "The app isn't set up yet: no model provider is configured. Set ANTHROPIC_API_KEY, or set LLM_PROVIDER and LLM_API_KEY to use a free provider.",
      };
    }
    return {
      ok: true,
      provider,
      label: "Claude",
      model: (process.env.ANTHROPIC_MODEL || "claude-haiku-5-5").trim(),
      apiKey: apiKey.trim(),
      thinks: false,
    };
  }

  const preset = PRESETS[provider];
  // Trimmed: a key pasted into a dashboard easily picks up a space or newline,
  // which makes the Authorization header invalid.
  const apiKey = (process.env.LLM_API_KEY || "").trim();
  if (!apiKey) return { ok: false, error: "The app isn't set up yet: LLM_API_KEY is missing." };

  const baseURL = (process.env.LLM_BASE_URL || preset.baseURL).trim().replace(/\/+$/, "");
  if (!baseURL) {
    return { ok: false, error: "The app isn't set up yet: LLM_BASE_URL is missing for this provider." };
  }
  const model = (process.env.LLM_MODEL || preset.defaultModel || "").trim();
  if (!model) {
    return {
      ok: false,
      error: `The app isn't set up yet: LLM_MODEL is missing. Pick a model from ${preset.label} and set it.`,
    };
  }
  return {
    ok: true,
    provider,
    label: preset.label,
    model,
    baseURL,
    apiKey,
    thinks: preset.thinks === true,
    native: preset.native,
  };
}

export type StreamOpts = {
  system: string;
  user: string;
  maxTokens: number;
  signal: AbortSignal;
  onDelta: (delta: string) => void;
};

export type StreamResult = { text: string; usageIn: number; usageOut: number; truncated: boolean };

/** Thrown when the provider answered but wrote no usable text. */
export class EmptyAnswerError extends Error {
  constructor(public reason: string) {
    super(`no text returned (${reason})`);
  }
}

export async function streamCompletion(cfg: Extract<Config, { ok: true }>, o: StreamOpts): Promise<StreamResult> {
  if (cfg.provider === "anthropic") {
    const client = new Anthropic({ apiKey: cfg.apiKey });
    const s = client.messages.stream(
      {
        model: cfg.model,
        max_tokens: o.maxTokens,
        system: o.system,
        messages: [{ role: "user", content: o.user }],
      },
      { signal: o.signal },
    );
    let text = "";
    s.on("text", (d) => {
      text += d;
      o.onDelta(d);
    });
    const final = await s.finalMessage();
    if (!text.trim()) throw new EmptyAnswerError(final.stop_reason ?? "unknown");
    return {
      text,
      usageIn: final.usage.input_tokens,
      usageOut: final.usage.output_tokens,
      truncated: final.stop_reason === "max_tokens",
    };
  }

  if (cfg.native === "gemini") {
    const r = await geminiStream({
      root: cfg.baseURL,
      apiKey: cfg.apiKey,
      model: cfg.model,
      system: o.system,
      user: o.user,
      maxOutputTokens: o.maxTokens,
      signal: o.signal,
      onDelta: o.onDelta,
    });
    if (!r.text.trim()) throw new EmptyAnswerError(r.finishReason || "no finish reason");
    return { text: r.text, usageIn: r.usageIn, usageOut: r.usageOut, truncated: r.truncated };
  }

  const client = new OpenAI({ apiKey: cfg.apiKey, baseURL: cfg.baseURL, maxRetries: 1 });

  // stream_options is not supported everywhere, so it is opt-in. Usage is read
  // from any chunk that happens to carry it, which most providers send anyway.
  const body: Record<string, unknown> = {
    model: cfg.model,
    max_tokens: o.maxTokens,
    messages: [
      { role: "system", content: o.system },
      { role: "user", content: o.user },
    ],
    stream: true,
  };
  if (process.env.LLM_STREAM_USAGE === "1") body.stream_options = { include_usage: true };
  const effort = (process.env.LLM_REASONING_EFFORT || "").trim();
  if (effort) body.reasoning_effort = effort;

  const stream = await client.chat.completions.create(
    body as unknown as OpenAI.ChatCompletionCreateParamsStreaming,
    { signal: o.signal },
  );

  let text = "";
  let usageIn = 0;
  let usageOut = 0;
  let truncated = false;
  let finish = "";
  for await (const chunk of stream) {
    const choice = chunk.choices?.[0];
    const delta = choice?.delta?.content;
    if (typeof delta === "string" && delta) {
      text += delta;
      o.onDelta(delta);
    }
    if (choice?.finish_reason) {
      finish = choice.finish_reason;
      if (choice.finish_reason === "length") truncated = true;
    }
    if (chunk.usage) {
      usageIn = chunk.usage.prompt_tokens ?? usageIn;
      usageOut = chunk.usage.completion_tokens ?? usageOut;
    }
  }
  if (!text.trim()) throw new EmptyAnswerError(finish || "no finish reason");
  return { text, usageIn, usageOut, truncated };
}

const scrub = (s: string) =>
  s
    .replace(/sk-[A-Za-z0-9_-]{8,}/g, "sk-***")
    .replace(/AIza[A-Za-z0-9_-]{10,}/g, "AIza***")
    .replace(/key=[A-Za-z0-9_-]+/gi, "key=***")
    .slice(0, 300);

/** Viewer-facing copy for a provider failure. */
export function friendlyError(e: unknown, cfg: { label: string; model: string }): string {
  const { label, model } = cfg;

  if (e instanceof EmptyAnswerError) {
    if (e.reason === "SAFETY" || e.reason === "PROHIBITED_CONTENT")
      return `${label} declined to answer on this passage. Try a different one.`;
    if (e.reason === "RECITATION")
      return `${label} stopped because the passage looked like material it won't reproduce. Try a shorter extract.`;
    if (e.reason === "length" || e.reason === "max_tokens" || e.reason === "MAX_TOKENS") {
      return `${label} ran out of its answer budget before writing anything. Raise MAX_OUTPUT_TOKENS (try 6000) or use a smaller model.`;
    }
    return `${label} returned no text (${e.reason}). Try a shorter passage, or a different model.`;
  }

  const status =
    e instanceof GeminiError
      ? e.status
      : e instanceof Anthropic.APIError
        ? e.status
        : e instanceof OpenAI.APIError
          ? e.status
          : undefined;
  const raw =
    e instanceof GeminiError
      ? `${e.message}${e.body ? ` | ${e.body}` : ""}`
      : e instanceof Error
        ? e.message
        : String(e);
  const msg = raw.toLowerCase();

  if (msg.includes("usage limit") || msg.includes("credit balance") || msg.includes("insufficient"))
    return `${label} says the account has no credit or has hit its spending limit.`;
  if (status === 401 || status === 403)
    return (
      `${label} rejected the key (HTTP ${status}). ` +
      `If it is a Google AI Studio key beginning "AQ.", make sure LLM_PROVIDER is "gemini" and not "gemini-openai". Details: ${scrub(raw)}`
    );
  if (status === 404 || (status === 400 && (msg.includes("model") || msg.includes("not found"))))
    return `${label} doesn't recognise the model "${model}". Set LLM_MODEL to a model it offers. Details: ${scrub(raw)}`;
  if (status === 429) return `${label} is rate-limiting the app. Wait a minute and try again.`;
  if (status === 400)
    return `${label} rejected the request. Details: ${scrub(raw)}`;
  if (status === 529 || (status ?? 0) >= 500)
    return `${label} returned a server error (HTTP ${status}) even after a retry. Details: ${scrub(raw)}`;
  return `Couldn't get an answer from ${label}. Details: ${scrub(raw)}`;
}
