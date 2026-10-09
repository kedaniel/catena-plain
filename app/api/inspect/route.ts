import { NextRequest, NextResponse } from "next/server";
import { fetchCatenaText, parseCatenaUrl } from "@/lib/catena";
import { requireCode } from "../_shared";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Diagnostics for one commentary: what the app actually fetched, and whether it
 * managed to find the verse's portion inside it. No model call, so it costs
 * nothing and can be run freely while chasing a wrong-text report.
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
  const link = typeof body.link === "string" ? body.link.trim() : "";
  const excerpt = typeof body.excerpt === "string" ? body.excerpt : "";
  if (!link) return NextResponse.json({ error: "No commentary link." }, { status: 400 });

  try {
    parseCatenaUrl(link);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 422 });
  }

  const letters = (t: string) => t.toLowerCase().replace(/\[[^\]]*\]/g, " ").replace(/[^a-z0-9]/g, "");

  try {
    const full = await fetchCatenaText(link); // no excerpt: the page as fetched
    const scoped = await fetchCatenaText(link, excerpt); // with the excerpt applied
    const hayLetters = letters(full.text);
    const needle = letters(excerpt);

    // How much of the excerpt's opening can be found in the page at all?
    let longestFound = 0;
    for (const len of [120, 80, 60, 45, 30, 20, 15, 10]) {
      if (needle.length >= len && hayLetters.includes(needle.slice(0, len))) {
        longestFound = len;
        break;
      }
    }

    return NextResponse.json({
      pageChars: full.text.length,
      excerptChars: excerpt.length,
      excerptLetters: needle.length,
      excerptStart: excerpt.slice(0, 160),
      longestPrefixFoundInPage: longestFound,
      scoped: scoped.scoped,
      pageStarts: full.text.slice(0, 200),
      scopedStarts: scoped.text.slice(0, 200),
      pageEnds: full.text.slice(-200),
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
