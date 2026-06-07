// groundlevel-worker · Cloudflare Worker REST API
// imports @sjgant80-hub/groundlevel-sdk for engines · MIT

import {
  CASE_DB, AREAS, WEAVE_PATTERNS, WEAVE_STRANDS, DOC_TYPES, COMPLIANCE_RULES, VERSION as SDK_VERSION,
  searchCases, runWeave, scoreRisk, draftDocument, auditCompliance, caseById, casesByArea, casesByStrand,
} from '@sjgant80-hub/groundlevel-sdk';

const WORKER_VERSION = '0.1.0';

const cors = (req) => ({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, authorization',
  'Access-Control-Max-Age': '86400',
});

const json = (req, body, status = 200, extra = {}) => new Response(JSON.stringify(body, null, 2), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', ...cors(req), ...extra },
});

const text = (req, body, status = 200, contentType = 'text/plain; charset=utf-8') => new Response(body, {
  status,
  headers: { 'content-type': contentType, ...cors(req) },
});

const err = (req, msg, status = 400) => json(req, { error: msg }, status);

async function readJson(req) {
  try { return await req.json(); } catch { return null; }
}

// ─────────────────────────────────────────────────────────────
// route handlers

const routes = {
  // GET / · landing
  'GET /': (req) => text(req, banner(), 200, 'text/html; charset=utf-8'),

  // GET /health · k8s-friendly liveness
  'GET /health': (req) => json(req, {
    status: 'ok',
    worker_version: WORKER_VERSION,
    sdk_version: SDK_VERSION,
    cases: CASE_DB.length,
    patterns: Object.keys(WEAVE_PATTERNS).length,
    strands: WEAVE_STRANDS.length,
    rules: COMPLIANCE_RULES.length,
  }),

  // GET /v1/info · machine-readable surface
  'GET /v1/info': (req) => json(req, {
    name: 'groundlevel-worker',
    version: WORKER_VERSION,
    sdk: { name: '@sjgant80-hub/groundlevel-sdk', version: SDK_VERSION },
    endpoints: [
      'GET  /health',
      'GET  /v1/info',
      'GET  /v1/openapi.json',
      'GET  /v1/cases',
      'GET  /v1/cases/:id',
      'GET  /v1/areas',
      'GET  /v1/patterns',
      'GET  /v1/strands',
      'POST /v1/case-search',
      'POST /v1/weave',
      'POST /v1/risk',
      'POST /v1/draft',
      'POST /v1/compliance-audit',
    ],
    docs: 'https://github.com/sjgant80-hub/groundlevel-worker#readme',
    repo: 'https://github.com/sjgant80-hub/groundlevel-worker',
    license: 'MIT',
  }),

  // GET /v1/openapi.json · OpenAPI 3 spec
  'GET /v1/openapi.json': async (req, env) => {
    const { openapi } = await import('./openapi.js');
    return json(req, openapi(req));
  },

  // GET /v1/cases · list all, with optional ?area + ?strand filters
  'GET /v1/cases': (req) => {
    const url = new URL(req.url);
    const area = url.searchParams.get('area');
    const strand = url.searchParams.get('strand');
    let out = CASE_DB;
    if (area) out = casesByArea(area);
    if (strand) out = (area ? out : CASE_DB).filter(c => (c.strands || []).includes(strand));
    return json(req, { count: out.length, cases: out });
  },

  // GET /v1/cases/:id
  'GET /v1/cases/:id': (req, env, params) => {
    const c = caseById(params.id);
    if (!c) return err(req, `case not found: ${params.id}`, 404);
    return json(req, c);
  },

  // GET /v1/areas · list available areas
  'GET /v1/areas': (req) => json(req, { areas: AREAS }),

  // GET /v1/patterns
  'GET /v1/patterns': (req) => json(req, { patterns: WEAVE_PATTERNS }),

  // GET /v1/strands
  'GET /v1/strands': (req) => json(req, { strands: WEAVE_STRANDS }),

  // POST /v1/case-search · { query, area?, limit? }
  'POST /v1/case-search': async (req) => {
    const body = await readJson(req);
    if (!body || !body.query) return err(req, 'expected { query: string, area?: string, limit?: number }');
    const hits = searchCases(body.query, body.area || undefined, { limit: body.limit || 8 });
    return json(req, { query: body.query, area: body.area || null, count: hits.length, hits });
  },

  // POST /v1/weave · { query, pattern?, perStrand? }
  'POST /v1/weave': async (req) => {
    const body = await readJson(req);
    if (!body || !body.query) return err(req, 'expected { query: string, pattern?: string, perStrand?: number }');
    const w = await runWeave(body.query, body.pattern || undefined, { perStrand: body.perStrand || 4 });
    return json(req, w);
  },

  // POST /v1/risk · { query, pattern? } · convenience: weave + score in one call
  'POST /v1/risk': async (req) => {
    const body = await readJson(req);
    if (!body || !body.query) return err(req, 'expected { query: string, pattern?: string }');
    const w = await runWeave(body.query, body.pattern || undefined);
    const r = scoreRisk(w);
    return json(req, { query: body.query, pattern: body.pattern || null, risk: r, contradictions: w.contradictions });
  },

  // POST /v1/draft · { type?, facts, parties?, court?, relief? }
  'POST /v1/draft': async (req) => {
    const body = await readJson(req);
    if (!body || !body.facts) return err(req, 'expected { type?: string, facts: string, parties?: string, court?: string, relief?: string }');
    if (body.type && !DOC_TYPES.includes(body.type)) return err(req, `unknown type · valid: ${DOC_TYPES.join(', ')}`);
    const { draft, citations } = await draftDocument(body);
    return json(req, { type: body.type || 'legal_brief', draft, citations });
  },

  // POST /v1/compliance-audit · { ...vars }
  'POST /v1/compliance-audit': async (req) => {
    const body = await readJson(req);
    if (!body || typeof body !== 'object') return err(req, 'expected an object of ca_* vars · see /v1/info for keys');
    const result = auditCompliance(body);
    return json(req, result);
  },
};

// ─────────────────────────────────────────────────────────────
// tiny router · supports /v1/cases/:id

function match(method, path) {
  // exact
  const exact = `${method} ${path}`;
  if (routes[exact]) return [routes[exact], {}];
  // param `:id`
  for (const key of Object.keys(routes)) {
    const [m, pattern] = key.split(' ');
    if (m !== method) continue;
    if (!pattern.includes(':')) continue;
    const re = new RegExp('^' + pattern.replace(/:([^/]+)/g, '(?<$1>[^/]+)') + '$');
    const mm = path.match(re);
    if (mm) return [routes[key], mm.groups || {}];
  }
  return [null, null];
}

function banner() {
  return `<!doctype html><html><head><meta charset="utf-8"><title>groundlevel-worker</title>
<style>body{margin:40px auto;max-width:720px;font:15px/1.6 -apple-system,system-ui,sans-serif;color:#e8e8ea;background:#0a0a0f;padding:24px}
h1{font-size:20px;margin:0 0 4px}.sub{color:#8a8a92;margin-bottom:18px;font-size:13px}
.card{background:#11131a;border:1px solid #1a1a22;border-radius:8px;padding:14px 16px;margin:10px 0}
.cite{color:#2563eb;font-weight:600}
code{background:#0d0d14;padding:2px 6px;border-radius:3px;font-size:13px}
a{color:#2563eb}
.method{display:inline-block;width:46px;color:#9aa;font-weight:600}
</style></head><body>
<h1>◊ groundlevel-worker</h1>
<div class="sub">REST API for the <a href="https://github.com/sjgant80-hub/groundlevel-sdk">GroundLevel SDK</a> · v${WORKER_VERSION} · sdk v${SDK_VERSION}</div>
<div class="card">
<div><span class="method">GET</span> <code>/health</code> · liveness</div>
<div><span class="method">GET</span> <code>/v1/info</code> · machine-readable surface</div>
<div><span class="method">GET</span> <code>/v1/openapi.json</code> · OpenAPI 3 spec</div>
<div><span class="method">GET</span> <code>/v1/cases?area=housing&strand=GUILD</code></div>
<div><span class="method">GET</span> <code>/v1/cases/:id</code> · single case</div>
<div><span class="method">GET</span> <code>/v1/areas</code> · <code>/v1/patterns</code> · <code>/v1/strands</code></div>
<div><span class="method">POST</span> <code>/v1/case-search</code></div>
<div><span class="method">POST</span> <code>/v1/weave</code></div>
<div><span class="method">POST</span> <code>/v1/risk</code> · weave + score in one call</div>
<div><span class="method">POST</span> <code>/v1/draft</code></div>
<div><span class="method">POST</span> <code>/v1/compliance-audit</code></div>
</div>
<div class="sub">repo: <a href="https://github.com/sjgant80-hub/groundlevel-worker">sjgant80-hub/groundlevel-worker</a> · MIT</div>
</body></html>`;
}

// ─────────────────────────────────────────────────────────────
// entry

export default {
  async fetch(req, env, ctx) {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(req) });
    const url = new URL(req.url);
    const [handler, params] = match(req.method, url.pathname);
    if (!handler) return err(req, `no route · GET / for the index`, 404);
    try {
      return await handler(req, env, params);
    } catch (e) {
      return err(req, `internal: ${e.message}`, 500);
    }
  },
};
