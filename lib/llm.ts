import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

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
export type ProviderName = "anthropic" | "gemini" | "deepseek" | "groq" | "openrouter" | "custom";

type Preset = { baseURL: string; defaultModel?: string; label: string };

const PRESETS: Record<Exclude<ProviderName, "anthropic">, Preset> = {
  gemini: {
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    defaultModel: "gemini-3.8-flash",
    label: "Google Gemini",
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
  | { ok: true; provider: ProviderName; label: string; model: string; baseURL?: string; apiKey: string }
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
      model: process.env.ANTHROPIC_MODEL || "claude-haiku-5-5",
      apiKey,
    };
  }

  const preset = PRESETS[provider];
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) return { ok: false, error: "The app isn't set up yet: LLM_API_KEY is missing." };

  const baseURL = (process.env.LLM_BASE_URL || preset.baseURL).trim();
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
  return { ok: true, provider, label: preset.label, model, baseURL, apiKey };
}

export type StreamOpts = {
  system: string;
  user: string;
  maxTokens: number;
  signal: AbortSignal;
  onDelta: (delta: string) => void;
};

export type StreamResult = { text: string; usageIn: number; usageOut: number; truncated: boolean };

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
    return {
      text,
      usageIn: final.usage.input_tokens,
      usageOut: final.usage.output_tokens,
      truncated: final.stop_reason === "max_tokens",
    };
  }

  const client = new OpenAI({ apiKey: cfg.apiKey, baseURL: cfg.baseURL });
  const stream = await client.chat.completions.create(
    {
      model: cfg.model,
      max_tokens: o.maxTokens,
      messages: [
        { role: "system", content: o.system },
        { role: "user", content: o.user },
      ],
      stream: true,
      stream_options: { include_usage: true },
    },
    { signal: o.signal },
  );

  let text = "";
  let usageIn = 0;
  let usageOut = 0;
  let truncated = false;
  for await (const chunk of stream) {
    const choice = chunk.choices?.[0];
    const delta = choice?.delta?.content;
    if (typeof delta === "string" && delta) {
      text += delta;
      o.onDelta(delta);
    }
    if (choice?.finish_reason === "length") truncated = true;
    if (chunk.usage) {
      usageIn = chunk.usage.prompt_tokens ?? 0;
      usageOut = chunk.usage.completion_tokens ?? 0;
    }
  }
  return { text, usageIn, usageOut, truncated };
}

/** Viewer-facing copy for a provider failure. */
export function friendlyError(e: unknown, label: string): string {
  const status =
    e instanceof Anthropic.APIError ? e.status : e instanceof OpenAI.APIError ? e.status : undefined;
  const msg = (e instanceof Error ? e.message : String(e)).toLowerCase();

  if (msg.includes("usage limit") || msg.includes("credit balance") || msg.includes("insufficient"))
    return `${label} says the account has no credit or has hit its spending limit.`;
  if (status === 400 && (msg.includes("model") || msg.includes("not found")))
    return `${label} doesn't recognise the model name. Check the LLM_MODEL setting.`;
  if (status === 401 || status === 403) return `The app's ${label} key isn't valid. Tell the person who runs the app.`;
  if (status === 404) return `${label} couldn't find that model. Check the LLM_MODEL setting.`;
  if (status === 429) return `${label} is rate-limiting the app. Wait a minute and try again.`;
  if (status === 529 || (status ?? 0) >= 500) return `${label} is busy right now. Try again shortly.`;
  return "Couldn't process this. Try a different or shorter passage.";
}
