import { createHash, timingSafeEqual } from "crypto";

/**
 * Access codes come from the ACCESS_CODES env var, comma-separated.
 * Give one code to your whole group, or one per person so you can
 * revoke a single person later by removing their code.
 */
function configuredCodes(): string[] {
  return (process.env.ACCESS_CODES ?? "")
    .split(",")
    .map((c) => c.trim())
    .filter((c) => c.length > 0);
}

const digest = (s: string) => createHash("sha256").update(s).digest();

/** Returns the matching code (used as the per-person usage key), or null. */
export function checkAccessCode(given: string | null): string | null {
  if (!given) return null;
  const g = digest(given.trim());
  let match: string | null = null;
  // Compare against every code in constant time so timing leaks nothing.
  for (const code of configuredCodes()) {
    if (timingSafeEqual(g, digest(code))) match = code;
  }
  return match;
}

export function accessCodesConfigured(): boolean {
  return configuredCodes().length > 0;
}

/** A short, non-reversible label for a code, safe to use as a storage key. */
export function codeKey(code: string): string {
  return digest(code).toString("hex").slice(0, 16);
}
