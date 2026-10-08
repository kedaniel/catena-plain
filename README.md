# Theobiblia Translator

A small web app for a church study group. Enter a Bible verse, pick a Church Father, and get his commentary from the [Catena](https://catenabible.com) Bible app in plain language:

- a faithful plain version in modern English, Arabic, or both
- the old or theological words explained
- the Bible verses the Father quotes or alludes to
- the main point in 2–3 sentences

It runs on your own Anthropic API key. Your friends don't need a Claude account; they only need the link and the access code.

## Two versions

Which version someone sees depends on the code they sign in with:

| Env var | Version |
|---|---|
| `ACCESS_CODES` | Full: English interface, output in English, Arabic or both. |
| `ARABIC_ACCESS_CODES` | Arabic: right-to-left Arabic interface, output always in Arabic. |

Both accept comma-separated lists. The Arabic version's language is enforced on the server, not just hidden in the page.

## How people use it

1. Pick the book from the dropdown (listed in English and Arabic) and type the chapter and verse. A "paste a Catena link" field is tucked underneath for anything the lookup can't reach.
2. Tap **Find Fathers**. The app lists the Fathers who commented on that verse.
3. Tap a Father. His commentary comes back in plain language.

A **Paste text** tab handles text copied straight out of Catena.

Catena's own verse pages render the commentary list server-side at
`catenabible.com/verse/nkjv/<book>/<chapter>/<verse>`, which is what the app reads. Commentaries hidden behind Catena's "Show more" button aren't in that HTML; for one of those, open it in Catena and paste its own link.

## Caching

Every finished plain version is stored, keyed by the commentary, language, level and model. If anyone in the group has already read a passage, the next person gets it instantly and it costs nothing. Set how long with `CACHE_DAYS` (default 180).

## Deploy (about 10 minutes)

1. **Create a dedicated API workspace with a spend limit** (this is your hard cap, see below).
2. **Import this repo on [Vercel](https://vercel.com/new)** (free Hobby plan is fine). Framework: Next.js, no settings to change.
3. **Add environment variables** in Vercel → Project → Settings → Environment Variables:
   - `ANTHROPIC_API_KEY` — a key created *inside the dedicated workspace*
   - `ACCESS_CODES` — e.g. `stmark-study-2026` (comma-separate several codes to give each person their own)
   - `ARABIC_ACCESS_CODES` — optional; codes that get the Arabic version, e.g. `theo-26`
4. **Add Upstash Redis** (Vercel → Storage / Marketplace → Upstash Redis, free plan) and connect it to the project. This turns on the monthly budget, daily cap and per-person limits.
5. **Redeploy**, open the URL, enter your code, and try a link.

See `.env.example` for all optional settings.

## Keeping costs under control

There are two layers.

**1. Hard cap: Anthropic Console workspace spend limit.** Anthropic lets you set a custom monthly spend limit per workspace (not on the Default workspace). Create a workspace just for this app (e.g. "catena-plain"), set its monthly spend limit, and create the API key inside it. Once the workspace reaches its limit, Claude refuses further requests from that key until the month resets, and the app shows "monthly spending limit reached". Nothing in this app can go past that number, and your other projects keep the rest of your organization's budget.

To keep the app at 10% of your budget: if your organization spend limit is $50/month, set this workspace to $5/month.

**2. Soft caps inside the app** (need Upstash):

| Setting | Default | What it does |
|---|---|---|
| `MONTHLY_BUDGET_USD` | 5 | Estimated spend from token usage; the app stops at this amount. Set it slightly under the workspace limit. |
| `DAILY_REQUEST_LIMIT` | 150 | Requests per day for the whole app. |
| `PER_CODE_HOURLY_LIMIT` | 15 | Requests per hour per access code. |
| Wrong-code lockout | 10/hour | An IP that enters 10 wrong codes is blocked for the rest of the hour. |

Inputs are capped at 15,000 characters and answers at 2,500 tokens.

**Rough cost:** the app uses Claude Haiku 5.5 by default ($0.10 / $0.50 per million tokens for prompts under 100K tokens). A typical commentary is about 2,000 tokens in and 1,500 out, so roughly $0.001 per passage: $1 covers around a thousand passages. For higher quality, set `ANTHROPIC_MODEL=claude-sonnet-5-5` with `INPUT_PRICE_PER_MTOK=2` and `OUTPUT_PRICE_PER_MTOK=10` (about $0.02 per passage).

## Access codes

- Codes are checked on the server; the API key never reaches the browser.
- The code is remembered on each phone so people only type it once. **Sign out** forgets it.
- To revoke someone, remove their code from `ACCESS_CODES` and redeploy.
- The site asks search engines not to index it.

## Local development

```bash
cp .env.example .env.local   # fill in ANTHROPIC_API_KEY and ACCESS_CODES
npm install
npm run dev
```

Without Upstash, the app falls back to in-memory limits that reset when the server restarts, and the monthly budget isn't tracked. That's fine locally; in production rely on the workspace limit plus Upstash.

## Faithfulness

The prompt tells Claude to keep every point in the Father's order, add no interpretation, flag unclear phrases instead of guessing, and work only from the text provided. Simplifying can still soften precise theological wording, so the page reminds readers to check against the original.
