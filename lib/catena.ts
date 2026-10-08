import * as cheerio from "cheerio";
import { parseReference } from "./books";

const MAX_BYTES = 2_500_000;
const MAX_TEXT = 20_000;
const UA = "TheobibliaTranslator/1.0 (church study group reader)";

export class CatenaError extends Error {}

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
  if (res.status === 404) throw new CatenaError("Catena has no page at that address.");
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
  const s = raw.trim();
  const mk = (code: string, ch: number | string, v: number | string) =>
    new URL(`https://catenabible.com/verse/nkjv/${code}/${ch}/${v}`);

  if (/^https?:\/\//i.test(s)) {
    const u = parseCatenaUrl(s);
    const parts = u.pathname.split("/").filter(Boolean);
    // Find <book>/<chapter>/<verse> anywhere in the path.
    for (let i = 0; i + 2 < parts.length + 1; i++) {
      const [b, c, v] = [parts[i], parts[i + 1], parts[i + 2]];
      if (b && /^\d{1,3}$/.test(c ?? "") && /^\d{1,3}$/.test(v ?? "")) return [mk(b, c, v)];
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
  return ref.codes.map((c) => mk(c, ref.chapter, ref.verse));
}

const clean = (s: string) => s.replace(/\s+/g, " ").trim();

/** The Fathers who commented on a verse, with a link to each commentary. */
export async function fetchFathers(raw: string): Promise<{ verse: string; url: string; options: FatherOption[] }> {
  const candidates = verseUrlCandidates(raw);
  let last: CatenaError | null = null;

  for (const candidate of candidates) {
    let page: { $: cheerio.CheerioAPI; url: URL };
    try {
      page = await get(candidate);
    } catch (e) {
      last = e instanceof CatenaError ? e : new CatenaError("Couldn't reach Catena.");
      continue;
    }
    const { $, url } = page;

    const verse =
      clean($('meta[property="og:title"]').attr("content") ?? "") ||
      clean($("h1").first().text()) ||
      clean($("title").first().text());

    const seen = new Set<string>();
    const options: FatherOption[] = [];
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href");
      if (!href) return;
      let abs: URL;
      try {
        abs = new URL(href, url);
      } catch {
        return;
      }
      if (!/^\/(com|commentary)\//.test(abs.pathname)) return;
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
      const preview = (unique[unique.length - 1] ?? whole).slice(0, 220);

      options.push({ url: key, father, work, preview: preview === father ? "" : preview });
    });

    if (options.length) return { verse, url: url.toString(), options };
    last = new CatenaError(
      "Catena didn't list any commentaries for that verse on the page. Try another verse, or open one commentary in Catena and paste its link.",
    );
  }
  throw last ?? new CatenaError("Couldn't read that verse page.");
}

/**
 * The readable text of a single commentary page. Page chrome is stripped and
 * the rest is passed to Claude, which is told to use only the commentary.
 * That is sturdier than depending on class names that may change.
 */
export async function fetchCatenaText(raw: string): Promise<{ title: string; text: string; url: string }> {
  const { $, url } = await get(parseCatenaUrl(raw));

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
  text = text.slice(0, MAX_TEXT);

  if (text.length < 80) {
    throw new CatenaError(
      "I couldn't find commentary text on that page. Open one Father's commentary in Catena, tap Share, and copy that link. Or paste the text instead.",
    );
  }
  return { title, text, url: url.toString() };
}
