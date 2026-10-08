import { NextRequest, NextResponse } from "next/server";
import { hasStore } from "@/lib/limits";
import { config, friendlyError, streamCompletion } from "@/lib/llm";
import { requireCode } from "../_shared";

export const runtime = "nodejs";
export const maxDuration = 60;

const scrub = (s: string) =>
  s
    .replace(/sk-[A-Za-z0-9_-]{8,}/g, "sk-***")
    .replace(/AIza[A-Za-z0-9_-]{10,}/g, "AIza***")
    .replace(/key=[A-Za-z0-9_-]+/gi, "key=***");

/**
 * A health check, so a setup problem can be seen without reading logs.
 * It probes the endpoint directly first, because an SDK sometimes discards the
 * provider's own error body — which is exactly the part worth reading.
 */
export async function POST(req: NextRequest) {
  const auth = await requireCode(req);
  if ("res" in auth) return auth.res;

  const cfg = config();
  if (!cfg.ok) return NextResponse.json({ ok: false, stage: "config", message: cfg.error });

  const base: Record<string, unknown> = {
    provider: cfg.provider,
    model: cfg.model,
    endpoint: cfg.baseURL ? safeHost(cfg.baseURL) : "api.anthropic.com",
    cache: hasStore() ? "on" : "off (no Upstash connected)",
  };

  // Step 0 — for Gemini, ask Google which models this key may actually use.
  // That settles both "is the key valid" and "is the model name right".
  if (cfg.provider === "gemini") {
    base.keyShape = describeKey(cfg.apiKey);
    try {
      // Derived from the configured base URL (".../v1beta/openai" -> ".../v1beta/models")
      // rather than hardcoded, so a custom endpoint is checked too.
      const root = (cfg.baseURL ?? "").replace(/\/openai$/, "");
      // Google accepts an API key as a query parameter or as a header. Try both,
      // because a 401 on one and not the other means something quite different.
      let res = await fetch(`${root}/models?key=${encodeURIComponent(cfg.apiKey)}&pageSize=200`, {
        signal: AbortSignal.timeout(25_000),
      });
      let how = "key query parameter";
      if (res.status === 401 || res.status === 403) {
        const alt = await fetch(`${root}/models?pageSize=200`, {
          headers: { "x-goog-api-key": cfg.apiKey },
          signal: AbortSignal.timeout(25_000),
        });
        if (alt.ok) {
          res = alt;
          how = "x-goog-api-key header";
        }
      }
      base.auth = how;
      const text = await res.text();
      if (!res.ok) {
        return NextResponse.json({
          ok: false,
          stage: "key",
          ...base,
          httpStatus: res.status,
          message:
            `Google would not accept this key (HTTP ${res.status}). It must be an API key from Google AI Studio — ` +
            `those begin "AIza". An OAuth client ID or secret, or a key whose project lacks the Generative Language API, fails like this.`,
          body: scrub(text || "(no error text)").slice(0, 400),
        });
      }
      const parsed = JSON.parse(text) as {
        models?: { name?: string; supportedGenerationMethods?: string[] }[];
      };
      const usable = (parsed.models ?? [])
        .filter((m) => (m.supportedGenerationMethods ?? []).includes("generateContent"))
        .map((m) => (m.name ?? "").replace(/^models\//, ""))
        .filter(Boolean);
      base.keyWorks = true;
      base.modelAvailable = usable.includes(cfg.model);
      if (!base.modelAvailable) {
        const flash = usable.filter((m) => m.includes("flash")).slice(0, 12);
        return NextResponse.json({
          ok: false,
          stage: "model",
          ...base,
          message: `Your key works, but it can't use "${cfg.model}". Set LLM_MODEL to one of the names below.`,
          body: (flash.length ? flash : usable.slice(0, 12)).join("\n"),
        });
      }
    } catch (e) {
      return NextResponse.json({
        ok: false,
        stage: "key",
        ...base,
        message: "Couldn't check the API key with Google.",
        body: scrub(e instanceof Error ? e.message : String(e)).slice(0, 300),
      });
    }
  }

  // Step 1 — raw probe, OpenAI-compatible providers only.
  if (cfg.baseURL) {
    const url = `${cfg.baseURL}/chat/completions`;
    base.path = new URL(url).pathname;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${cfg.apiKey}` },
        body: JSON.stringify({
          model: cfg.model,
          messages: [{ role: "user", content: "Say OK." }],
          max_tokens: cfg.thinks ? 2000 : 32,
        }),
        signal: AbortSignal.timeout(40_000),
      });
      const text = await res.text();
      if (!res.ok) {
        return NextResponse.json({
          ok: false,
          stage: "endpoint",
          ...base,
          httpStatus: res.status,
          message: `${cfg.label} refused the request with HTTP ${res.status}.`,
          body: scrub(text || "(the provider sent no error text)").slice(0, 500),
        });
      }
      base.rawProbe = "ok";
    } catch (e) {
      return NextResponse.json({
        ok: false,
        stage: "network",
        ...base,
        message: `Couldn't reach ${cfg.label}.`,
        body: scrub(e instanceof Error ? e.message : String(e)).slice(0, 300),
      });
    }
  }

  // Step 2 — the same path the app really uses, including streaming.
  try {
    const r = await streamCompletion(cfg, {
      system: "Reply with the single word OK.",
      user: "Say OK.",
      maxTokens: cfg.thinks ? 2000 : 32,
      signal: AbortSignal.timeout(45_000),
      onDelta: () => {},
    });
    return NextResponse.json({
      ok: true,
      ...base,
      reply: r.text.trim().slice(0, 120),
      tokens: { in: r.usageIn, out: r.usageOut },
      message: `${cfg.label} answered.`,
    });
  } catch (e) {
    console.error("[diag] stream failed", { provider: cfg.provider, model: cfg.model, error: e });
    return NextResponse.json({
      ok: false,
      stage: "stream",
      ...base,
      message: friendlyError(e, cfg),
      body: scrub(e instanceof Error ? e.message : String(e)).slice(0, 400),
    });
  }
}

/**
 * Enough to tell an AI Studio key from something else, without revealing it:
 * the first four characters and the length. A Gemini key looks like
 * "AIza… (39 chars)"; an OAuth client secret or a stray value will not.
 */
function describeKey(key: string): string {
  const kind = key.startsWith("AIza")
    ? "looks like an AI Studio key"
    : /^GOCSPX-/.test(key)
      ? "looks like an OAuth client SECRET — wrong credential type"
      : /\.apps\.googleusercontent\.com$/.test(key)
        ? "looks like an OAuth client ID — wrong credential type"
        : key.startsWith("ya29.")
          ? "looks like a short-lived OAuth token — wrong credential type"
          : "does not look like an AI Studio key";
  return `${key.slice(0, 4)}… (${key.length} chars, ${kind})`;
}

function safeHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "invalid LLM_BASE_URL";
  }
}
