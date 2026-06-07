// test/worker.test.js · exercises the Worker handler against a synthetic Request
// runs without wrangler/miniflare so CI is fast
import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';

const make = (method, path, body) => {
  const init = { method, headers: { 'content-type': 'application/json' } };
  if (body !== undefined) init.body = JSON.stringify(body);
  return new Request(`https://groundlevel-worker.test${path}`, init);
};

test('GET / · returns html', async () => {
  const r = await worker.fetch(make('GET', '/'), {}, {});
  assert.equal(r.status, 200);
  assert.ok(r.headers.get('content-type').includes('text/html'));
  const body = await r.text();
  assert.ok(body.includes('groundlevel-worker'));
});

test('GET /health · returns status ok with counts', async () => {
  const r = await worker.fetch(make('GET', '/health'), {}, {});
  assert.equal(r.status, 200);
  const j = await r.json();
  assert.equal(j.status, 'ok');
  assert.ok(j.cases >= 25);
  assert.ok(j.patterns >= 10);
  assert.equal(j.strands, 7);
});

test('GET /v1/info · endpoints list', async () => {
  const r = await worker.fetch(make('GET', '/v1/info'), {}, {});
  const j = await r.json();
  assert.ok(Array.isArray(j.endpoints));
  assert.ok(j.endpoints.some(e => e.includes('case-search')));
});

test('GET /v1/cases · all', async () => {
  const r = await worker.fetch(make('GET', '/v1/cases'), {}, {});
  const j = await r.json();
  assert.ok(j.count >= 25);
});

test('GET /v1/cases?area=housing · filtered', async () => {
  const r = await worker.fetch(make('GET', '/v1/cases?area=housing'), {}, {});
  const j = await r.json();
  j.cases.forEach(c => assert.equal(c.area, 'housing'));
});

test('GET /v1/cases/:id · single', async () => {
  const r = await worker.fetch(make('GET', '/v1/cases/polkey-1987'), {}, {});
  const j = await r.json();
  assert.equal(j.id, 'polkey-1987');
});

test('GET /v1/cases/nope · 404', async () => {
  const r = await worker.fetch(make('GET', '/v1/cases/not-real-id'), {}, {});
  assert.equal(r.status, 404);
});

test('GET /v1/areas', async () => {
  const r = await worker.fetch(make('GET', '/v1/areas'), {}, {});
  const j = await r.json();
  assert.ok(j.areas.includes('housing'));
});

test('GET /v1/openapi.json · 3.1 spec', async () => {
  const r = await worker.fetch(make('GET', '/v1/openapi.json'), {}, {});
  const j = await r.json();
  assert.equal(j.openapi, '3.1.0');
  assert.ok(j.paths['/v1/case-search']);
});

test('POST /v1/case-search · ranked hits', async () => {
  const r = await worker.fetch(make('POST', '/v1/case-search', { query: 'landlord deposit not protected', area: 'housing' }), {}, {});
  const j = await r.json();
  assert.ok(j.count > 0);
  assert.ok(j.hits[0].citation.includes('Tiensia'));
});

test('POST /v1/case-search · missing query → 400', async () => {
  const r = await worker.fetch(make('POST', '/v1/case-search', {}), {}, {});
  assert.equal(r.status, 400);
});

test('POST /v1/weave · 7 strands', async () => {
  const r = await worker.fetch(make('POST', '/v1/weave', { query: 'employer dismissed me without process', pattern: 'unfair_dismissal' }), {}, {});
  const j = await r.json();
  assert.equal(j.results.length, 7);
});

test('POST /v1/risk · returns label', async () => {
  const r = await worker.fetch(make('POST', '/v1/risk', { query: 'landlord deposit unprotected', pattern: 'deposit_dispute' }), {}, {});
  const j = await r.json();
  assert.ok(['STRONG','MODERATE','WEAK','INADVISABLE'].includes(j.risk.label));
});

test('POST /v1/draft · default type', async () => {
  const r = await worker.fetch(make('POST', '/v1/draft', { facts: 'Acme owes me $4200.\nMultiple invoices unpaid.' }), {}, {});
  const j = await r.json();
  assert.equal(j.type, 'legal_brief');
  assert.ok(j.draft.includes('LEGAL BRIEF'));
});

test('POST /v1/draft · invalid type → 400', async () => {
  const r = await worker.fetch(make('POST', '/v1/draft', { type: 'bogus', facts: 'x' }), {}, {});
  assert.equal(r.status, 400);
});

test('POST /v1/compliance-audit · returns gaps', async () => {
  const r = await worker.fetch(make('POST', '/v1/compliance-audit', { ca_uses_ai: 'yes', ca_eu_users: 'yes', ca_audit_log: 'no' }), {}, {});
  const j = await r.json();
  assert.ok(j.gaps.some(g => g.id === 'eu_ai_act_audit'));
});

test('OPTIONS /v1/anything · CORS preflight 204', async () => {
  const r = await worker.fetch(make('OPTIONS', '/v1/case-search'), {}, {});
  assert.equal(r.status, 204);
  assert.equal(r.headers.get('access-control-allow-origin'), '*');
});

test('GET /not-a-route · 404', async () => {
  const r = await worker.fetch(make('GET', '/does-not-exist'), {}, {});
  assert.equal(r.status, 404);
});
