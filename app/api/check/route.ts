import { NextRequest, NextResponse } from "next/server";
import { requireCode } from "../_shared";

export const runtime = "nodejs";

/** Verifies an access code without calling Claude, so signing in costs nothing. */
export async function POST(req: NextRequest) {
  const r = await requireCode(req);
  if ("res" in r) return r.res;
  return NextResponse.json({ ok: true });
}
