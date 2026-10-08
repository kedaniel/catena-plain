# Fathers Made Plain

A small web app for a church study group. Paste a commentary link from the [Catena](https://catenabible.com) Bible app (or the text itself), and get back:

- a faithful plain version in modern English, Arabic, or both
- the old or theological words explained
- the Bible verses the Father quotes or alludes to
- the main point in 2–3 sentences

It runs on your own Anthropic API key. Your friends don't need a Claude account; they only need the link and the access code.

## How people use it

1. In Catena, open the verse, tap a Father's commentary, then **Share → Copy link** (the link contains `/com/`).
2. Open the app, paste the link, choose language and level, tap **Make it plain**.

Catena's verse pages load commentaries with JavaScript, so a verse link (`/jn/1/1`) won't work. Use the single-commentary share link, or paste the text.

## Deploy (about 10 minutes)

1. **Create a dedicated API workspace with a spend limit** (this is your hard cap, see below).
2. **Import this repo on [Vercel](https://vercel.com/new)** (free Hobby plan is fine). Framework: Next.js, no settings to change.
3. **Add environment variables** in Vercel → Project → Settings → Environment Variables:
   - `ANTHROPIC_API_KEY` — a key created *inside the dedicated workspace*
   - `ACCESS_CODES` — e.g. `stmark-study-2026` (comma-separate several codes to give each person their own)
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

**Rough cost:** a typical commentary is about 2,000 tokens in and 1,500 out. On Claude Sonnet 5.5 ($2 / $10 per million tokens) that's about $0.02 per passage, so $5 covers roughly 250 passages. On Claude Haiku 5.5 it's a small fraction of a cent, at some cost in quality (switch with `ANTHROPIC_MODEL`).

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
