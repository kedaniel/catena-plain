import { NextRequest, NextResponse } from "next/server";
import { hasStore } from "@/lib/limits";
import { config, friendlyError, streamCompletion } from "@/lib/llm";
import { requireCode } from "../_shared";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * A one-line health check, so a setup problem can be seen without reading logs.
 * Makes the smallest possible real call to the provider.
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
    console.error("[diag] provider failed", { provider: cfg.provider, model: cfg.model, error: e });
    return NextResponse.json({ ok: false, stage: "provider", ...base, message: friendlyError(e, cfg) });
  }
}

function safeHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "invalid LLM_BASE_URL";
  }
}
