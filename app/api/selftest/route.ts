import { NextRequest, NextResponse } from "next/server";
import { arabicFatherName } from "@/lib/fathers";
import { CatenaError, fetchCatenaText, fetchFathers, inspectCommentary } from "@/lib/catena";
import { config, friendlyError, streamCompletion } from "@/lib/llm";
import { buildUserPrompt, SYSTEM } from "@/lib/prompt";
import { readerKey, requireCode } from "../_shared";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * One step of the self-test. The page calls this once per passage.
 *
 * Retrieval check (free, no model): list the Fathers Catena shows for the
 * verse, then open every listed commentary and confirm that the excerpt Catena
 * showed can be found in the page the app would read.
 *
 * Model check (one model call): run the first commentary through the model in
 * one language and report how complete the answer is against its source.
 */
export async function POST(req: NextRequest) {
  const auth = await requireCode(req);
  if ("res" in auth) return auth.res;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  const verse = typeof body.verse === "string" ? body.verse.trim().slice(0, 80) : "";
  if (!verse) return NextResponse.json({ error: "No verse." }, { status: 400 });
  const lang = body.lang === "ar" ? "ar" : body.lang === "en" ? "en" : null;

  let found;
  try {
    found = await fetchFathers(verse);
  } catch (e) {
    return NextResponse.json({ verse, ok: false, error: e instanceof CatenaError ? e.message : "Couldn't reach Catena." });
  }

  // ---- Model check -------------------------------------------------------
  if (lang) {
    const cfg = config({ apiKey: readerKey(req) });
    if (!cfg.ok) return NextResponse.json({ verse, lang, ok: false, error: cfg.error });
    const first = found.options[0];
    try {
      const page = await fetchCatenaText(first.url, first.preview);
      const source = page.text.slice(0, 15000);
      let out = "";
      const r = await streamCompletion(cfg, {
        system: SYSTEM,
        user: buildUserPrompt({
          text: source,
          fromPage: true,
          pageTitle: page.title,
          verse: found.verse,
          father: first.father,
          excerpt: first.preview,
          lang,
          level: "simple",
        }),
        maxTokens: cfg.thinks ? 8000 : 2500,
        signal: AbortSignal.timeout(50_000),
        onDelta: (d) => {
          out += d;
        },
      });
      const arabicLetters = (out.match(/[؀-ۿ]/g) ?? []).length;
      const latinLetters = (out.match(/[A-Za-z]/g) ?? []).length;
      const expectedName = lang === "ar" ? arabicFatherName(first.father) : null;
      return NextResponse.json({
        verse,
        lang,
        ok: true,
        father: first.father,
        model: r.modelUsed ?? cfg.model,
        sourceChars: source.length,
        outputChars: out.length,
        ratio: Number((out.length / Math.max(1, source.length)).toFixed(2)),
        truncated: r.truncated,
        hasFullTextHeading: /##\s*(Full text in plain language|النص الكامل)/.test(out),
        hasSummaryHeading: /##\s*(Summary|الملخص)/.test(out),
        mismatchNote: /\*\*(Note|ملاحظة)/.test(out),
        scriptShare: Number((arabicLetters / Math.max(1, arabicLetters + latinLetters)).toFixed(2)),
        arabicNameUsed: expectedName ? out.includes(expectedName.split(" ").slice(0, 2).join(" ")) : null,
        firstLine: out.trim().split("\n")[0].slice(0, 120),
      });
    } catch (e) {
      return NextResponse.json({
        verse,
        lang,
        ok: false,
        father: first.father,
        error: e instanceof CatenaError ? e.message : friendlyError(e, cfg),
      });
    }
  }

  // ---- Retrieval check ---------------------------------------------------
  const todo = found.options.slice(0, 14);
  const results: Record<string, unknown>[] = new Array(todo.length);
  let next = 0;
  async function worker() {
    for (;;) {
      const i = next++;
      if (i >= todo.length) return;
      const o = todo[i];
      try {
        const r = await inspectCommentary(o.url, o.preview);
        results[i] = { father: o.father, excerptChars: o.preview.length, ...r };
      } catch (e) {
        results[i] = { father: o.father, error: e instanceof Error ? e.message.slice(0, 90) : "failed" };
      }
    }
  }
  await Promise.all([worker(), worker(), worker()]);

  return NextResponse.json({
    verse,
    ok: true,
    title: found.verse,
    listed: found.options.length,
    hidden: found.hidden,
    commentaries: results,
  });
}
