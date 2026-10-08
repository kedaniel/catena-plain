import * as cheerio from "cheerio";
import { parseReference } from "./books";
import { recallBookCode, rememberBookCode } from "./limits";

const MAX_BYTES = 2_500_000;
const MAX_TEXT = 20_000;
const UA = "TheobibliaTranslator/1.0 (church study group reader)";

export class CatenaError extends Error {}

/** A page Catena does not have. Callers phrase this for their own context. */
export class NotFoundError extends CatenaError {
  constructor() {
    super("Catena has no page at that address.");
  }
}

export type FatherOption = {
  url: string;
  father: string;
  work: string;
  preview: string;
};

/** Only Catena pages over HTTPS, so the server can't be used to fetch anything else. */
export function parseCatenaUrl(raw: string): URL {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    throw new CatenaError("That doesn't look like a link. Copy it from Catena, or type a verse like John 3:16.");
  }
  const host = u.hostname.toLowerCase();
  const okHost = host === "catenabible.com" || host.endsWith(".catenabible.com");
  if (u.protocol !== "https:" || !okHost) {
    throw new CatenaError("Only catenabible.com links are supported.");
  }
  return u;
}

/** A single commentary page, vs. a verse page listing many Fathers. */
export function isCommentaryUrl(u: URL): boolean {
  return /^\/(com|commentary)\//.test(u.pathname);
}

async function get(u: URL): Promise<{ $: cheerio.CheerioAPI; url: URL }> {
  let cur = u;
  let res: Response | null = null;
  for (let hop = 0; hop < 3; hop++) {
    res = await fetch(cur, {
      redirect: "manual",
      signal: AbortSignal.timeout(14_000),
      headers: { "user-agent": UA, accept: "text/html" },
    });
    const loc = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && loc) {
      cur = parseCatenaUrl(new URL(loc, cur).toString());
      continue;
    }
    break;
  }
  if (!res) throw new CatenaError("Couldn't reach Catena.");
  if (res.status === 404) throw new NotFoundError();
  if (!res.ok) throw new CatenaError(`Catena didn't return the page (status ${res.status}).`);
  const buf = await res.arrayBuffer();
  if (buf.byteLength > MAX_BYTES) throw new CatenaError("That page is too large to read.");
  return { $: cheerio.load(new TextDecoder().decode(buf)), url: cur };
}

/**
 * Work out which verse page to read, from a pasted Catena link of any shape
 * (/jn/3/16, /bible/nkjv/jn/3/16, /verse/nkjv/jn/3/16) or a typed reference
 * ("John 3:16"). Returns candidates to try in order.
 */
export function verseUrlCandidates(raw: string): URL[] {
  return verseLookup(raw).urls;
}

/** The pages to try for a verse, plus the book key used to cache the winner. */
export function verseLookup(raw: string): { urls: URL[]; bookKey?: string; chapter?: number; verse?: number } {
  const s = raw.trim();
  const mk = (code: string, ch: number | string, v: number | string) =>
    new URL(`https://catenabible.com/verse/nkjv/${code}/${ch}/${v}`);

  if (/^https?:\/\//i.test(s)) {
    const u = parseCatenaUrl(s);
    const parts = u.pathname.split("/").filter(Boolean);
    // Find <book>/<chapter>/<verse> anywhere in the path.
    for (let i = 0; i + 2 < parts.length + 1; i++) {
      const [b, c, v] = [parts[i], parts[i + 1], parts[i + 2]];
      // A pasted link already names the book, so there is nothing to guess.
      if (b && /^\d{1,3}$/.test(c ?? "") && /^\d{1,3}$/.test(v ?? "")) return { urls: [mk(b, c, v)] };
    }
    throw new CatenaError(
      "That link doesn't point to a verse. Open the verse in Catena and copy its link, or type a verse like John 3:16.",
    );
  }

  const ref = parseReference(s);
  if (!ref) {
    throw new CatenaError(
      "I couldn't read that verse. Try the form John 3:16, or paste the verse's link from Catena.",
    );
  }
  return {
    urls: ref.codes.map((c) => mk(c, ref.chapter, ref.verse)),
    bookKey: ref.codes[0],
    chapter: ref.chapter,
    verse: ref.verse,
  };
}

const clean = (s: string) => s.replace(/\s+/g, " ").trim();

/** Commentary links on one already-fetched verse page. */
function harvest($: cheerio.CheerioAPI, url: URL, seen: Set<string>): FatherOption[] {
  const found: FatherOption[] = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    let abs: URL;
    try {
      abs = new URL(href, url);
    } catch {
      return;
    }
    // /com/<id> or /commentary/<hash>/<n> — anything else is not a commentary.
    if (!/^\/com\/[^/]+\/?$/.test(abs.pathname) && !/^\/commentary\/[^/]+\/\d+\/?$/.test(abs.pathname)) return;
    const key = abs.toString();
    if (seen.has(key)) return;

    const whole = clean($(el).text());
    if (whole.length < 3) return;
    seen.add(key);

    // Catena puts the author, the work title and an excerpt in separate
    // elements inside the link. Take the shortest leading ones as author
    // and work, and fall back to the link's own text.
    const bits = $(el)
      .find("*")
      .toArray()
      .map((e) => clean($(e).text()))
      .filter((t) => t.length > 1);
    const unique = bits.filter((t, i) => bits.indexOf(t) === i && t !== whole);
    const father = unique.find((t) => t.length <= 46) ?? whole.slice(0, 46);
    const work = unique.find((t) => t !== father && t.length <= 110) ?? "";
    const preview = (unique[unique.length - 1] ?? whole).slice(0, 400);

    found.push({ url: key, father, work, preview: preview === father ? "" : preview });
  });
  return found;
}

/** A "next page" link, if the page offers one. */
function nextPageUrl($: cheerio.CheerioAPI, url: URL): URL | null {
  const samePage = (u: URL) => u.pathname === url.pathname && u.hostname === url.hostname;
  const candidates = [
    $('link[rel="next"]').attr("href"),
    $('a[rel="next"]').attr("href"),
    ...$("a[href]")
      .toArray()
      .map((el) => {
        const text = clean($(el).text()).toLowerCase();
        const href = $(el).attr("href") ?? "";
        const looksLikeMore =
          /\bnext\b|\bmore\b|»|›/.test(text) || (/[?&]page=\d+/.test(href) && !/page=1\b/.test(href));
        return looksLikeMore ? href : undefined;
      }),
  ].filter((h): h is string => typeof h === "string" && h.length > 0);

  for (const href of candidates) {
    try {
      const abs = new URL(href, url);
      // Same verse, different page only: anything else is a related-verse link,
      // and following it would list another verse's commentaries.
      if (samePage(abs) && abs.search !== url.search) return abs;
    } catch {
      /* skip an unparseable href */
    }
  }
  return null;
}

const MAX_PAGES = 6;

/**
 * Catena renders only the first batch of commentaries into the page and loads
 * the rest with JavaScript, behind a button reading "Show 12 more (53 left)".
 * Reading that number lets the app say how many it cannot reach, rather than
 * presenting a partial list as if it were complete.
 */
function hiddenCount($: cheerio.CheerioAPI): number {
  const text = clean($("body").text());
  const m =
    text.match(/show\s+\d+\s+more\s*\((\d+)\s*left\)/i) ??
    text.match(/\((\d+)\s*left\)/i) ??
    text.match(/show\s+(\d+)\s+more/i);
  const n = m ? Number(m[1]) : 0;
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * The Fathers who commented on a verse, with a link to each commentary.
 *
 * Catena shows only part of a long list at once — some verses have dozens of
 * commentaries — so further pages are followed until one adds nothing new.
 * An explicit "next" link is preferred; otherwise ?page=N is tried, and if
 * Catena ignores it the second page repeats the first and the loop stops.
 */
export async function fetchFathers(
  raw: string,
): Promise<{
  verse: string;
  url: string;
  options: FatherOption[];
  pages: number;
  complete: boolean;
  hidden: number;
  total: number;
}> {
  const lookup = verseLookup(raw);
  let candidates = lookup.urls;
  let last: CatenaError | null = null;
  // A page that loaded but listed nothing explains more than a later 404 on a
  // spelling variant, so it wins.
  let loadedButEmpty = false;

  // A code already known to work for this book is tried first, so a wrong guess
  // costs one extra request once rather than on every lookup.
  if (lookup.bookKey && lookup.chapter && lookup.verse) {
    const known = await recallBookCode(lookup.bookKey);
    if (known) {
      const first = new URL(`https://catenabible.com/verse/nkjv/${known}/${lookup.chapter}/${lookup.verse}`);
      candidates = [first, ...candidates.filter((u) => u.toString() !== first.toString())];
    }
  }

  for (const candidate of candidates) {
    let page: { $: cheerio.CheerioAPI; url: URL };
    try {
      page = await get(candidate);
    } catch (e) {
      last =
        e instanceof NotFoundError
          ? new CatenaError(
              "Catena doesn't have a page for that verse. Check the chapter and verse numbers, or paste the verse's link from Catena.",
            )
          : e instanceof CatenaError
            ? e
            : new CatenaError("Couldn't reach Catena.");
      continue;
    }
    const { $, url } = page;

    const verse =
      clean($('meta[property="og:title"]').attr("content") ?? "") ||
      clean($("h1").first().text()) ||
      clean($("title").first().text());

    const seen = new Set<string>();
    const options = harvest($, url, seen);
    if (!options.length) {
      loadedButEmpty = true;
      continue;
    }

    let pages = 1;
    let complete = true;
    let current = { $, url };
    // Only an explicit next-page link on the verse's own path is followed.
    // Guessing "?page=2" was wrong: Catena ignores the verse filter on those
    // pages and returns unrelated commentaries, so a verse with 13 of them
    // came back with 150, and those extra links 404 when opened.
    while (pages < MAX_PAGES) {
      const next = nextPageUrl(current.$, current.url);
      if (!next) break;
      let fetched: { $: cheerio.CheerioAPI; url: URL };
      try {
        fetched = await get(next);
      } catch {
        break;
      }
      const more = harvest(fetched.$, fetched.url, seen);
      pages += 1;
      if (!more.length) break;
      options.push(...more);
      current = fetched;
      if (pages >= MAX_PAGES) complete = false;
    }

    const hidden = hiddenCount($);
    if (lookup.bookKey) {
      const code = url.pathname.split("/").filter(Boolean)[2];
      if (code) void rememberBookCode(lookup.bookKey, code);
    }
    return {
      verse,
      url: url.toString(),
      options,
      pages,
      complete: complete && hidden === 0,
      hidden,
      total: options.length + hidden,
    };
  }
  if (loadedButEmpty) {
    throw new CatenaError(
      "Catena has no commentaries on that verse yet. Try a nearby verse — the Fathers often comment on a passage at its opening verse.",
    );
  }
  throw (
    last ??
    new CatenaError(
      "Catena doesn't have a page for that verse. Check the chapter and verse numbers, or paste the verse's link from Catena.",
    )
  );
}

/**
 * The readable text of a single commentary page. Page chrome is stripped and
 * the rest is passed to Claude, which is told to use only the commentary.
 * That is sturdier than depending on class names that may change.
 */
/**
 * Catena indexes long works by every passage they touch. A homily on Acts can
 * be listed under Genesis 37:18 because it discusses Joseph part-way through,
 * and the linked page holds the WHOLE homily. The verse page's excerpt is the
 * opening of the portion that belongs to this verse, so it is used to find
 * where that portion starts.
 */
function sliceFromExcerpt(text: string, excerpt?: string): string {
  if (!excerpt) return text;
  // Catena's excerpt and its page body differ in quote style and spacing, so
  // every apostrophe and quote is folded to one form before matching.
  const norm = (t: string) =>
    t
      .replace(/[\u2018\u2019\u02bc\u00b4`']/g, "'")
      .replace(/[\u201c\u201d"]/g, '"')
      .replace(/[\u2013\u2014]/g, "-")
      .replace(/[\s\u00a0]+/g, " ")
      .trim();
  const needle = norm(excerpt).replace(/[.…]+$/, "").slice(0, 60);
  if (needle.length < 25) return text;
  const hayNorm = norm(text);
  let at = hayNorm.indexOf(needle);
  if (at < 0) {
    // Try a shorter opening, in case the excerpt was trimmed mid-word.
    const shorter = needle.slice(0, 35);
    at = shorter.length >= 25 ? hayNorm.indexOf(shorter) : -1;
  }
  if (at < 0) return text;
  // Map the position back to the original string by counting non-space chars.
  const target = hayNorm.slice(0, at).replace(/\s/g, "").length;
  let seen = 0;
  for (let i = 0; i < text.length; i++) {
    if (!/\s/.test(text[i])) {
      if (seen === target) return text.slice(i);
      seen++;
    }
  }
  return text;
}

export async function fetchCatenaText(
  raw: string,
  excerpt?: string,
): Promise<{ title: string; text: string; url: string; scoped: boolean }> {
  const target = parseCatenaUrl(raw);
  let page: { $: cheerio.CheerioAPI; url: URL };
  try {
    page = await get(target);
  } catch (e) {
    // The "?p=" token scopes a commentary to the verse it was listed under.
    // Retrying without it returns a different portion of the same work, so the
    // reader would silently get a commentary on another passage. Fail instead.
    if (e instanceof NotFoundError) {
      throw new CatenaError(
        "Catena wouldn't open that commentary. Pick another Father, or open it in Catena and paste its link.",
      );
    }
    throw e;
  }
  const { $, url } = page;

  const title = clean($('meta[property="og:title"]').attr("content") ?? "") || clean($("title").first().text());
  const metaDesc = clean($('meta[property="og:description"], meta[name="description"]').attr("content") ?? "");

  $("script, style, noscript, svg, nav, header, footer, iframe, form, button").remove();
  const blocks: string[] = [];
  $("body")
    .find("h1, h2, h3, h4, p, li, blockquote, div")
    .each((_, el) => {
      const $el = $(el);
      // Leaf-ish blocks only, so nested divs don't repeat the same text.
      if ($el.children("p, div, li, blockquote, h1, h2, h3, h4").length > 0) return;
      const t = clean($el.text());
      if (t) blocks.push(t);
    });
  let text = Array.from(new Set(blocks)).join("\n");
  if (text.length < 200 && metaDesc.length > text.length) text = metaDesc;

  if (text.length < 80) {
    throw new CatenaError(
      "I couldn't find commentary text on that page. Open one Father's commentary in Catena, tap Share, and copy that link. Or paste the text instead.",
    );
  }

  // Find the verse's portion in the WHOLE page before any length cap. A
  // homily's moral section sits at the end, so capping first would cut away the
  // very part being searched for.
  const scopedText = sliceFromExcerpt(text, excerpt);
  const scoped = scopedText.length < text.length;
  return { title, text: scopedText.slice(0, MAX_TEXT), url: url.toString(), scoped };
}
