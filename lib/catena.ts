import * as cheerio from "cheerio";

const MAX_BYTES = 1_500_000;
const MAX_TEXT = 20_000;

export class CatenaError extends Error {}

/** Only Catena pages over HTTPS; this stops the server being used to fetch anything else. */
export function parseCatenaUrl(raw: string): URL {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    throw new CatenaError("That doesn't look like a link. Copy it from Catena's Share button.");
  }
  const host = u.hostname.toLowerCase();
  const okHost = host === "catenabible.com" || host.endsWith(".catenabible.com");
  if (u.protocol !== "https:" || !okHost) {
    throw new CatenaError("Only catenabible.com links are supported.");
  }
  return u;
}

/**
 * Fetch a Catena commentary page and return its readable text.
 * Catena loads verse pages with JavaScript, but single-commentary pages
 * (catenabible.com/com/...) include the text in the HTML.
 * We strip page chrome and pass the rest to Claude, which is told to use
 * only the commentary itself. That is sturdier than depending on exact
 * HTML class names that may change.
 */
export async function fetchCatenaText(raw: string): Promise<{ title: string; text: string; url: string }> {
  let u = parseCatenaUrl(raw);

  let res: Response | null = null;
  for (let hop = 0; hop < 3; hop++) {
    res = await fetch(u, {
      redirect: "manual",
      signal: AbortSignal.timeout(12_000),
      headers: { "user-agent": "CatenaPlain/1.0 (study-group reader)", accept: "text/html" },
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      u = parseCatenaUrl(new URL(res.headers.get("location")!, u).toString());
      continue;
    }
    break;
  }
  if (!res || !res.ok) throw new CatenaError(`Catena didn't return the page (status ${res?.status ?? "none"}).`);

  const buf = await res.arrayBuffer();
  if (buf.byteLength > MAX_BYTES) throw new CatenaError("That page is too large to read.");
  const $ = cheerio.load(new TextDecoder().decode(buf));

  const title =
    $('meta[property="og:title"]').attr("content")?.trim() || $("title").first().text().trim() || "";
  const metaDesc = $('meta[property="og:description"], meta[name="description"]').attr("content")?.trim() ?? "";

  $("script, style, noscript, svg, nav, header, footer, iframe, form, button").remove();
  const blocks: string[] = [];
  $("body")
    .find("h1, h2, h3, h4, p, li, blockquote, div")
    .each((_, el) => {
      const $el = $(el);
      // Only leaf-ish blocks, so nested divs don't repeat the same text.
      if ($el.children("p, div, li, blockquote, h1, h2, h3, h4").length > 0) return;
      const t = $el.text().replace(/\s+/g, " ").trim();
      if (t) blocks.push(t);
    });
  let text = Array.from(new Set(blocks)).join("\n");
  if (text.length < 200 && metaDesc.length > text.length) text = metaDesc;
  text = text.slice(0, MAX_TEXT);

  if (text.length < 80) {
    throw new CatenaError(
      "I couldn't find commentary text on that page. Open one Father's commentary in Catena, tap Share, and copy that link (it contains /com/). Or paste the text instead.",
    );
  }
  return { title, text, url: u.toString() };
}
