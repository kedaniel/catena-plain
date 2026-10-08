import { NextRequest, NextResponse } from "next/server";
import { BOOK_OPTIONS } from "@/lib/books";
import { requireCode } from "../_shared";

export const runtime = "nodejs";

/**
 * Verifies an access code without calling Claude, so signing in costs nothing.
 * Also tells the page which version to show and supplies the book list.
 */
export async function POST(req: NextRequest) {
  const r = await requireCode(req);
  if ("res" in r) return r.res;
  return NextResponse.json({ ok: true, profile: r.session.profile, books: BOOK_OPTIONS });
}
