# @sjgant80-hub/groundlevel-worker

> Cloudflare Worker REST API for the [GroundLevel SDK](https://github.com/sjgant80-hub/groundlevel-sdk).
> Self-host on your own Cloudflare account in 5 minutes · MIT · free tier covers ~100K requests/day.

```
the same engines as the SDK · over HTTP · so non-JS clients
(Python, Go, Ruby, curl, n8n, Zapier, your custom GPT) can call them too
```

---

## What it exposes

| Method | Path | Body | What it does |
|---|---|---|---|
| `GET` | `/` | — | HTML landing |
| `GET` | `/health` | — | liveness + sdk/worker version + counts |
| `GET` | `/v1/info` | — | machine-readable endpoint list |
| `GET` | `/v1/openapi.json` | — | OpenAPI 3.1 spec (drop into RapidAPI, Postman, etc.) |
| `GET` | `/v1/cases?area=&strand=` | — | list cases, optionally filtered |
| `GET` | `/v1/cases/:id` | — | single case |
| `GET` | `/v1/areas` · `/v1/patterns` · `/v1/strands` | — | the bundled vocabularies |
| `POST` | `/v1/case-search` | `{query, area?, limit?}` | keyword search across the case DB |
| `POST` | `/v1/weave` | `{query, pattern?, perStrand?}` | 7-strand parallel research + contradiction detection |
| `POST` | `/v1/risk` | `{query, pattern?}` | convenience: weave + score in one call |
| `POST` | `/v1/draft` | `{type?, facts, parties?, court?, relief?}` | court-ready document with auto-cited authorities |
| `POST` | `/v1/compliance-audit` | `{ca_*: ...}` | UK GDPR / EU AI Act / ERA 1996 / CRA 2015 audit |

CORS is open by default (`*`) — lock it down by setting `CORS_ORIGIN` in `wrangler.toml`.

---

## Deploy your own

```bash
git clone https://github.com/sjgant80-hub/groundlevel-worker.git
cd groundlevel-worker
npm install
npx wrangler login    # opens browser · authorises CF account
npx wrangler deploy
```

Output:
```
✨  Deployment complete!
   https://groundlevel-worker.<your-subdomain>.workers.dev
```

That's it. The worker pulls the SDK from this repo's `package.json` dependency (`github:sjgant80-hub/groundlevel-sdk#main`) and bundles it via esbuild at deploy time. No npm registry account needed.

### Bump the SDK

```bash
npm update @sjgant80-hub/groundlevel-sdk
npm test
npx wrangler deploy
```

---

## Try it

After deploying, run the self-documenting tour:

```bash
BASE=https://groundlevel-worker.<your-subdomain>.workers.dev ./examples/curl.sh
```

Or hit the hosted demo (if running):

```bash
# search
curl -s -X POST https://groundlevel-worker.<your>.workers.dev/v1/case-search \
  -H 'content-type: application/json' \
  -d '{"query":"landlord deposit not protected","area":"housing"}'

# weave
curl -s -X POST https://groundlevel-worker.<your>.workers.dev/v1/weave \
  -H 'content-type: application/json' \
  -d '{"query":"employer dismissed me","pattern":"unfair_dismissal"}'

# audit
curl -s -X POST https://groundlevel-worker.<your>.workers.dev/v1/compliance-audit \
  -H 'content-type: application/json' \
  -d '{"ca_size":"10-49","ca_uses_ai":"yes","ca_eu_users":"yes","ca_audit_log":"no"}'
```

---

## OpenAPI · list on RapidAPI / Apigee / Kong

Fetch `/v1/openapi.json` once your Worker is live:

```bash
curl https://groundlevel-worker.<your>.workers.dev/v1/openapi.json > openapi.json
```

Then upload to:
- RapidAPI · paste into the "Add API" wizard
- Postman · "Import" → URL paste
- Kong/Apigee · push as a gateway spec
- Swagger Editor · `https://editor.swagger.io/`

---

## Develop locally

```bash
npm install
npm test            # 18 node --test assertions against the in-process handler
npm run dev         # wrangler dev · http://localhost:8787
```

---

## Architecture

```
        ┌────────────────────────────────┐
client ─▶│  groundlevel-worker (this)     │
        │  · Hono-free vanilla router    │
        │  · CORS open · JSON in/out     │
        └────────────────┬───────────────┘
                          │ imports
                          ▼
        ┌────────────────────────────────┐
        │  @sjgant80-hub/groundlevel-sdk │
        │  · CASE_DB · WEAVE_PATTERNS    │
        │  · searchCases · runWeave      │
        │  · draftDocument · audit       │
        └────────────────────────────────┘
```

Bump the SDK once → every downstream consumer (this Worker, the MCP, the
Chrome ext, the Obsidian plugin) inherits the fix. Single source of truth.

---

## Sister packages

- [`@sjgant80-hub/groundlevel-sdk`](https://github.com/sjgant80-hub/groundlevel-sdk) · the engines (consumed here)
- `@sjgant80-hub/groundlevel-shim` · CDN drop-in `<script>` (next)
- `@sjgant80-hub/groundlevel-mcp` · MCP server (next)
- `@sjgant80-hub/groundlevel-obsidian` · Obsidian plugin (next)
- [GroundLevel Pro](https://github.com/sjgant80-hub/groundlevel) · the full single-file PWA

---

## Caveats

- **Not legal advice.** Information and templates only. Verify before any irreversible step.
- **Cloudflare free tier**: 100K requests/day, 10ms CPU/request. Plenty for an attorney's solo use; rate-limit for public exposure.
- **No auth** out of the box — open by design. Add Cloudflare Access or Workers Bindings for private deployments.

---

## Licence

MIT · the law is public · the templates are simple · the jargon is the paywall.

**◊·κ=φ⁴**
