# Theobiblia Translator

A small web app for a church study group. Enter a Bible verse, pick a Church Father, and get his commentary from the [Catena](https://catenabible.com) Bible app in plain language:

- the **whole** commentary rendered in plain modern English, Arabic, or both — every sentence, in his order, not a summary
- the old or theological words explained
- a short summary with his main point

Your friends don't need any AI account; they only need the link and the access code.

## Choosing a model provider

The app talks to Claude **or** to any OpenAI-compatible provider, so it can run on a free tier instead of paid credits. Set `LLM_PROVIDER` and `LLM_API_KEY`:

| `LLM_PROVIDER` | Where the key comes from | Notes |
|---|---|---|
| *(unset)* + `ANTHROPIC_API_KEY` | platform.claude.com | Best quality. Needs paid credits. |
| `gemini` | aistudio.google.com/apikey | Free tier. Calls Google's own API, so it accepts both current `AQ.` keys and older `AIza` ones. Default model `gemini-3.8-flash`. |
| `gemini-openai` | aistudio.google.com/apikey | Gemini through its OpenAI compatibility layer. Only for an older `AIza` key; `AQ.` keys are rejected there. |
| `deepseek` | platform.deepseek.com | Very cheap, but still needs a top-up. Default model `deepseek-chat`. |
| `groq` | console.groq.com | Free tier. Set `LLM_MODEL` to a model it currently serves. |
| `openrouter` | openrouter.ai | Some models are free. Set `LLM_MODEL`. |
| `custom` | anywhere OpenAI-compatible | Set `LLM_BASE_URL` and `LLM_MODEL` too. |

Model names and free-tier limits change, so check the provider's own console for the current model name. If the name is wrong the app says so plainly rather than failing silently.

**Setup check.** The page has a collapsed "Setup check" section at the bottom with a **Test connection** button. It probes the provider's endpoint directly, then runs the same streaming call the app uses, and reports the provider, model, request path, HTTP status and the provider's own error text. Use it first whenever something doesn't work; full errors also go to Vercel → your project → Logs.

**Reasoning models.** Gemini 3 models think before they write, and that thinking is charged against the answer budget. Too small a budget and the model spends it all thinking and returns nothing, so the app defaults to 8000 output tokens for Gemini instead of 2500.

**Google API keys.** AI Studio now issues "auth keys" beginning `AQ.` instead of the older `AIza` keys. These must be sent in an `x-goog-api-key` header, so Gemini's OpenAI compatibility layer — which sends `Authorization: Bearer` — rejects them with HTTP 401 `ACCESS_TOKEN_TYPE_UNSUPPORTED`. The `gemini` provider calls Google's native API and works with either key format.

Quality differs by provider. The prompt is the same for all of them: keep every point in the Father's order, add no interpretation, flag unclear phrases. A smaller model follows that less exactly, so the "check against the original" note on the page matters more, not less.

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
`catenabible.com/verse/nkjv/<book>/<chapter>/<verse>`, which is what the app reads.

The app follows a further page only when the verse page offers an explicit "next" link on its own path. It does **not** guess `?page=N`: Catena serves those pages without applying the verse filter, so guessing returned unrelated commentaries — a verse with 13 of them came back with 150, and the extra links 404 when opened. For the same reason a "related verse" link is never followed, however its text reads. If a commentary is missing from the list, open it in Catena and paste its own link.

## Caching

Every finished plain version is stored, keyed by the commentary, language, level and model. If anyone in the group has already read a passage, the next person gets it instantly and it costs nothing. Set how long with `CACHE_DAYS` (default 180).

## Deploy (about 10 minutes)

1. **Create a dedicated API workspace with a spend limit** (this is your hard cap, see below).
2. **Import this repo on [Vercel](https://vercel.com/new)** (free Hobby plan is fine). Framework: Next.js, no settings to change.
3. **Add environment variables** in Vercel → Project → Settings → Environment Variables:
   - a provider: either `ANTHROPIC_API_KEY` (a key created *inside the dedicated workspace*), or `LLM_PROVIDER` plus `LLM_API_KEY` from the table above
   - `ACCESS_CODES` — e.g. `stmark-study-2026` (comma-separate several codes to give each person their own)
   - `ARABIC_ACCESS_CODES` — optional; codes that get the Arabic version, e.g. `theo-26`
4. **Add Upstash Redis** (Vercel → Storage / Marketplace → Upstash Redis, free plan) and connect it to the project. This turns on the monthly budget, daily cap and per-person limits.
5. **Redeploy**, open the URL, enter your code, and try a link.

See `.env.example` for all optional settings.

## Keeping costs under control

If you're on a free tier, skip to the soft caps: there is no bill to cap. Set `INPUT_PRICE_PER_MTOK=0` and `OUTPUT_PRICE_PER_MTOK=0` so the dollar budget doesn't get in the way, and rely on the request limits below.

With Claude there are two layers.

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
