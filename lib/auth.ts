import { createHash, timingSafeEqual } from "crypto";

/**
 * Two versions of the app, chosen by which access code someone signs in with:
 *
 * - ACCESS_CODES         -> the full version: English, Arabic or both.
 * - ARABIC_ACCESS_CODES  -> the Arabic version: Arabic interface, Arabic output.
 *
 * Both are comma-separated. Give one code per person if you want to be able to
 * revoke a single person later.
 */
export type Profile = "full" | "arabic";

export type Session = { code: string; profile: Profile };

function list(env: string | undefined): string[] {
  return (env ?? "")
    .split(",")
    .map((c) => c.trim())
    .filter((c) => c.length > 0);
}

function configured(): { code: string; profile: Profile }[] {
  return [
    ...list(process.env.ACCESS_CODES).map((code) => ({ code, profile: "full" as const })),
    ...list(process.env.ARABIC_ACCESS_CODES).map((code) => ({ code, profile: "arabic" as const })),
  ];
}

const digest = (s: string) => createHash("sha256").update(s).digest();

/** Returns the matching code and its version, or null. */
export function checkAccessCode(given: string | null): Session | null {
  if (!given) return null;
  const g = digest(given.trim());
  let match: Session | null = null;
  // Compare against every code in constant time so timing leaks nothing.
  for (const entry of configured()) {
    if (timingSafeEqual(g, digest(entry.code))) match = entry;
  }
  return match;
}

export function accessCodesConfigured(): boolean {
  return configured().length > 0;
}

/** A short, non-reversible label for a code, safe to use as a storage key. */
export function codeKey(code: string): string {
  return digest(code).toString("hex").slice(0, 16);
}
