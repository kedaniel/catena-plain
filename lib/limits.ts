import { Redis } from "@upstash/redis";

/**
 * Usage guards. Two layers:
 *
 * 1. Hard cap (outside this app): the Anthropic Console workspace spend
 *    limit. Nothing here can ever spend past it. See README.
 * 2. Soft caps (this file): a monthly dollar budget, a daily request cap,
 *    per-code hourly limits, and wrong-code lockouts. These need a Redis
 *    store (Upstash, free tier) because serverless functions forget
 *    everything between requests. Without Redis, only a best-effort
 *    in-memory limiter runs and the monthly budget is not enforced.
 */

const num = (v: string | undefined, d: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : d;
};

export const LIMITS = {
  monthlyBudgetUsd: num(process.env.MONTHLY_BUDGET_USD, 5),
  dailyRequests: num(process.env.DAILY_REQUEST_LIMIT, 500),
  perCodePerHour: num(process.env.PER_PERSON_HOURLY_LIMIT || process.env.PER_CODE_HOURLY_LIMIT, 20),
  badCodeAttemptsPerHour: 10,
  // Prices per million tokens, used to estimate spend. Defaults: Claude Haiku 5.5 (prompts under 100K tokens).
  inputPricePerMTok: num(process.env.INPUT_PRICE_PER_MTOK, 0.1),
  outputPricePerMTok: num(process.env.OUTPUT_PRICE_PER_MTOK, 0.5),
};

let redis: Redis | null = null;
const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
if (url && token) redis = new Redis({ url, token });

export const hasStore = () => redis !== null;

// ---- fallback in-memory counters (per server instance, best effort) ----
const mem = new Map<string, { n: number; exp: number }>();
function memIncr(key: string, ttlSec: number): number {
  const now = Date.now();
  const e = mem.get(key);
  if (!e || e.exp < now) {
    mem.set(key, { n: 1, exp: now + ttlSec * 1000 });
    return 1;
  }
  e.n += 1;
  return e.n;
}

async function incr(key: string, ttlSec: number): Promise<number> {
  if (!redis) return memIncr(key, ttlSec);
  const n = await redis.incr(key);
  if (n === 1) await redis.expire(key, ttlSec);
  return n;
}

const month = () => new Date().toISOString().slice(0, 7); // 2026-10
const day = () => new Date().toISOString().slice(0, 10); // 2026-10-08
const hour = () => new Date().toISOString().slice(0, 13);

export type LimitResult = { ok: true } | { ok: false; status: number; message: string };

/**
 * The hourly allowance belongs to a PERSON, not to a code. A group sharing one
 * code would otherwise share one bucket, and whoever read first would lock the
 * others out. Each browser gets its own id, so each reader gets their own
 * allowance. Clearing browser data resets it — this is for fairness between
 * friends, not a security boundary; the daily cap and the monthly budget are
 * what actually protect the bill.
 */

/** Count a wrong access code from this IP; true if the IP is now locked out. */
export async function noteBadCode(ip: string): Promise<boolean> {
  const n = await incr(`bad:${ip}:${hour()}`, 3600);
  return n > LIMITS.badCodeAttemptsPerHour;
}

export async function isLockedOut(ip: string): Promise<boolean> {
  const key = `bad:${ip}:${hour()}`;
  const n = redis ? Number((await redis.get(key)) ?? 0) : mem.get(key)?.n ?? 0;
  return n >= LIMITS.badCodeAttemptsPerHour;
}

/** Check every soft cap before calling the model, and count this request. */
export async function reserve(
  codeKey: string,
  personKey?: string,
  opts?: { ownKey?: boolean },
): Promise<LimitResult> {
  // A reader using their own key spends their own quota, so the app's shared
  // budget and daily cap don't apply to them. Their hourly allowance still
  // does, to keep one person from hammering this server.
  if (redis && !opts?.ownKey) {
    const spent = Number((await redis.get(`spend:${month()}`)) ?? 0);
    if (spent >= LIMITS.monthlyBudgetUsd) {
      return {
        ok: false,
        status: 429,
        message: "This month's budget for the app is used up. It resets on the 1st of next month.",
      };
    }
  }
  const today = opts?.ownKey ? 0 : await incr(`day:${day()}`, 60 * 60 * 26);
  if (today > LIMITS.dailyRequests) {
    return { ok: false, status: 429, message: "The app has reached today's limit. Try again tomorrow." };
  }
  const who = personKey ? `${codeKey}:${personKey}` : codeKey;
  const mine = await incr(`who:${who}:${hour()}`, 3600);
  if (mine > LIMITS.perCodePerHour) {
    return {
      ok: false,
      status: 429,
      message: `You've read ${LIMITS.perCodePerHour} commentaries this hour, which is this app's limit per person. Try again a bit later.`,
    };
  }
  return { ok: true };
}

/** Record the estimated cost of a finished call against the monthly budget. */
export async function recordSpend(inputTokens: number, outputTokens: number): Promise<void> {
  if (!redis) return;
  const usd =
    (inputTokens / 1e6) * LIMITS.inputPricePerMTok + (outputTokens / 1e6) * LIMITS.outputPricePerMTok;
  const key = `spend:${month()}`;
  await redis.incrbyfloat(key, Number(usd.toFixed(6)));
  await redis.expire(key, 60 * 60 * 24 * 40);
}

export async function monthSpend(): Promise<number | null> {
  if (!redis) return null;
  return Number((await redis.get(`spend:${month()}`)) ?? 0);
}

/**
 * Finished answers are kept so the same commentary is only ever paid for once,
 * however many people in the group read it. Keyed by what would change the
 * answer: the source, the language, the level and the model.
 */
const CACHE_TTL = 60 * 60 * 24 * Number(process.env.CACHE_DAYS || 180);

export async function cacheGet(key: string): Promise<string | null> {
  if (!redis) return null;
  try {
    const v = await redis.get<string>(`out:${key}`);
    return typeof v === "string" && v.length > 0 ? v : null;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: string): Promise<void> {
  if (!redis || value.length < 40) return;
  try {
    await redis.set(`out:${key}`, value, { ex: CACHE_TTL });
  } catch {
    /* caching is best effort */
  }
}

/**
 * Which URL code Catena actually accepts for a book. Learned on first use, so a
 * wrong guess costs one extra request once rather than on every lookup.
 */
export async function rememberBookCode(book: string, code: string): Promise<void> {
  if (!redis) return;
  try {
    await redis.set(`book:${book}`, code, { ex: 60 * 60 * 24 * 365 });
  } catch {
    /* best effort */
  }
}

export async function recallBookCode(book: string): Promise<string | null> {
  if (!redis) return null;
  try {
    const v = await redis.get<string>(`book:${book}`);
    return typeof v === "string" && v ? v : null;
  } catch {
    return null;
  }
}
