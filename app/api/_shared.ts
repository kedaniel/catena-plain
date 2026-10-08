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

/**
 * Who is asking, for the per-person hourly allowance: the id this browser
 * generated for itself, falling back to the network address.
 */
export function personKey(req: NextRequest): string {
  const id = (req.headers.get("x-device-id") ?? "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 64);
  return id.length >= 8 ? id : `ip:${clientIp(req)}`;
}

/**
 * A key the reader supplied for themselves. It is used for that request only
 * and never stored on the server. Shape is checked so a stray value doesn't
 * get sent to Google as a credential.
 */
export function readerKey(req: NextRequest): string {
  const k = (req.headers.get("x-llm-key") ?? "").trim();
  if (!/^(AQ\.|AIza)[A-Za-z0-9_.\-]{10,200}$/.test(k)) return "";
  return k;
}

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
