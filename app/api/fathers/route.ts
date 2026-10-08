import { NextRequest, NextResponse } from "next/server";
import { codeKey } from "@/lib/auth";
import { CatenaError, fetchFathers } from "@/lib/catena";
import { reserve } from "@/lib/limits";
import { fail, requireCode } from "../_shared";

export const runtime = "nodejs";
export const maxDuration = 30;

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
  const verse = typeof body.verse === "string" ? body.verse.trim().slice(0, 300) : "";
  if (!verse) return fail(400, "Type a verse, or paste its link from Catena.");

  // Guards Catena against a flood from this app, though no credits are spent.
  const gate = await reserve(codeKey(auth.code));
  if (!gate.ok) return fail(gate.status, gate.message);

  try {
    const found = await fetchFathers(verse);
    return NextResponse.json(found);
  } catch (e) {
    if (e instanceof CatenaError) return fail(422, e.message);
    return fail(502, "Couldn't reach Catena. Try again in a moment.");
  }
}
