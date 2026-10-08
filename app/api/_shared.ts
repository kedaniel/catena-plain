import { NextRequest, NextResponse } from "next/server";
import { accessCodesConfigured, checkAccessCode, Session } from "@/lib/auth";
import { isLockedOut, noteBadCode } from "@/lib/limits";

export function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

export const fail = (status: number, message: string) => NextResponse.json({ error: message }, { status });

/** Returns the signed-in session, or a ready error response. */
export async function requireCode(req: NextRequest): Promise<{ session: Session } | { res: NextResponse }> {
  if (!accessCodesConfigured()) {
    return { res: fail(503, "The app isn't set up yet: no access codes are configured.") };
  }
  const ip = clientIp(req);
  if (await isLockedOut(ip)) {
    return { res: fail(429, "Too many wrong codes. Wait an hour and try again.") };
  }
  const session = checkAccessCode(req.headers.get("x-access-code"));
  if (!session) {
    await noteBadCode(ip);
    return { res: fail(401, "That access code isn't right. Ask the person who shared the app.") };
  }
  return { session };
}
