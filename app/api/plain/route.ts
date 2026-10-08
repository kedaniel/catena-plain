import { createHash } from "crypto";
import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { codeKey } from "@/lib/auth";
import { CatenaError, fetchCatenaText, isCommentaryUrl, parseCatenaUrl } from "@/lib/catena";
import { cacheGet, cacheSet, recordSpend, reserve } from "@/lib/limits";
import { buildUserPrompt, Lang, Level, SYSTEM } from "@/lib/prompt";
import { fail, requireCode } from "../_shared";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-5-5";
const MAX_OUTPUT_TOKENS = Math.min(Number(process.env.MAX_OUTPUT_TOKENS) || 2500, 6000);
const MAX_INPUT_CHARS = Math.min(Number(process.env.MAX_INPUT_CHARS) || 15000, 40000);

const clip = (s: unknown, n: number) => (typeof s === "string" ? s.trim().slice(0, n) : "");
const sha = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 32);

export async function POST(req: NextRequest) {
  const auth = await requireCode(req);
  if ("res" in auth) return auth.res;
  if (!process.env.ANTHROPIC_API_KEY) return fail(503, "The app isn't set up yet: the API key is missing.");

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return fail(400, "Bad request.");
  }

  const link = clip(body.link, 500);
  const pasted = clip(body.text, MAX_INPUT_CHARS + 1);
  const verse = clip(body.verse, 80);
  const father = clip(body.father, 120);
  const lang: Lang = body.lang === "ar" || body.lang === "both" ? body.lang : "en";
  const level: Level = body.level === "study" ? "study" : "simple";

  if (!link && !pasted) return fail(400, "Choose a commentary, or paste the text.");
  if (pasted.length > MAX_INPUT_CHARS) {
    return fail(413, `That text is too long. Paste up to about ${MAX_INPUT_CHARS.toLocaleString()} characters at a time.`);
  }

  let canonical = "";
  if (!pasted && link) {
    try {
      const u = parseCatenaUrl(link);
      if (!isCommentaryUrl(u)) {
        return fail(422, "That's a verse link. Look up the verse first, then choose a Father.");
      }
      canonical = u.toString();
    } catch (e) {
      return fail(422, (e as Error).message);
    }
  }

  // A commentary already turned into plain language is served from the cache,
  // so the group only ever pays for it once.
  const cacheKey = sha([canonical || `text:${sha(pasted)}`, lang, level, MODEL].join("|"));
  const cached = await cacheGet(cacheKey);
  if (cached) {
    return new Response(cached, {
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", "x-cache": "hit" },
    });
  }

  const gate = await reserve(codeKey(auth.code));
  if (!gate.ok) return fail(gate.status, gate.message);

  let text = pasted;
  let pageTitle = "";
  let sourceUrl = "";
  if (!pasted && canonical) {
    try {
      const page = await fetchCatenaText(canonical);
      text = page.text.slice(0, MAX_INPUT_CHARS);
      pageTitle = page.title;
      sourceUrl = page.url;
    } catch (e) {
      if (e instanceof CatenaError) return fail(422, e.message);
      return fail(502, "Couldn't reach Catena. Try again, or paste the text instead.");
    }
  }

  const client = new Anthropic();
  const userPrompt = buildUserPrompt({ text, fromPage: !pasted, pageTitle, verse, father, lang, level });

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let usageIn = 0;
      let usageOut = 0;
      let answer = "";
      let failed = false;
      try {
        const s = client.messages.stream(
          {
            model: MODEL,
            max_tokens: MAX_OUTPUT_TOKENS,
            system: SYSTEM,
            messages: [{ role: "user", content: userPrompt }],
          },
          { signal: req.signal },
        );
        s.on("text", (delta) => {
          answer += delta;
          controller.enqueue(encoder.encode(delta));
        });
        const final = await s.finalMessage();
        usageIn = final.usage.input_tokens;
        usageOut = final.usage.output_tokens;
        if (final.stop_reason === "max_tokens") {
          failed = true; // don't cache a half answer
          controller.enqueue(encoder.encode("\n\n_(Cut short — try a shorter passage.)_"));
        }
        if (sourceUrl) {
          const tail = `\n\nSource: ${sourceUrl}`;
          answer += tail;
          controller.enqueue(encoder.encode(tail));
        }
      } catch (e) {
        failed = true;
        const msg = e instanceof Anthropic.APIError ? friendlyApiError(e) : "Something went wrong. Try again.";
        controller.enqueue(encoder.encode(`\n\n[[ERROR]] ${msg}`));
      } finally {
        try {
          await recordSpend(usageIn, usageOut);
          if (!failed && !req.signal.aborted) await cacheSet(cacheKey, answer);
        } catch {
          /* budget tracking and caching are best effort */
        }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", "x-cache": "miss" },
  });
}

function friendlyApiError(e: InstanceType<typeof Anthropic.APIError>): string {
  const m = (e.message || "").toLowerCase();
  if (m.includes("usage limit")) return "The app's monthly spending limit has been reached. It resets next month.";
  if (e.status === 429) return "Too busy right now. Wait a minute and try again.";
  if (e.status === 401) return "The app's API key isn't valid. Tell the person who runs the app.";
  if (e.status === 529 || (e.status ?? 0) >= 500) return "Claude is busy right now. Try again shortly.";
  return "Claude couldn't process this. Try a different or shorter passage.";
}
