import { NextRequest, NextResponse } from "next/server";
import { codeKey } from "@/lib/auth";
import { bookById } from "@/lib/books";
import { CatenaError, fetchFathers } from "@/lib/catena";
import { reserve } from "@/lib/limits";
import { fail, requireCode } from "../_shared";

export const runtime = "nodejs";
export const maxDuration = 30;

const digits = (v: unknown) => String(v ?? "").replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));

/** Lists the Fathers who commented on a verse. Costs nothing: no Claude call. */
export async function POST(req: NextRequest) {
  const auth = await requireCode(req);
  if ("res" in auth) return auth.res;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return fail(400, "Bad request.");
  }

  // Either the book dropdown plus chapter and verse, or a pasted link.
  let query = "";
  if (typeof body.book === "string" && body.book !== "") {
    const book = bookById(body.book);
    const ch = Number(digits(body.chapter));
    const v = Number(digits(body.verse));
    if (!book) return fail(400, "Choose a book.");
    if (!Number.isInteger(ch) || ch < 1 || ch > 150) return fail(400, "Enter a chapter number.");
    if (!Number.isInteger(v) || v < 1 || v > 200) return fail(400, "Enter a verse number.");
    query = `${book.en} ${ch}:${v}`;
  } else if (typeof body.verse === "string") {
    query = body.verse.trim().slice(0, 300);
  }
  if (!query) return fail(400, "Choose a book, chapter and verse.");

  // Guards Catena against a flood from this app, though no credits are spent.
  const gate = await reserve(codeKey(auth.session.code));
  if (!gate.ok) return fail(gate.status, gate.message);

  try {
    const found = await fetchFathers(query);
    return NextResponse.json(found);
  } catch (e) {
    if (e instanceof CatenaError) return fail(422, e.message);
    return fail(502, "Couldn't reach Catena. Try again in a moment.");
  }
}
