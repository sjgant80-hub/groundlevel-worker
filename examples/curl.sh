#!/bin/bash
# examples/curl.sh · self-documenting REST tour
# usage: BASE=https://groundlevel-worker.yourname.workers.dev ./examples/curl.sh
BASE="${BASE:-http://localhost:8787}"

echo "▶ GET /health"
curl -s "$BASE/health" | jq

echo "▶ GET /v1/info"
curl -s "$BASE/v1/info" | jq '.endpoints'

echo "▶ POST /v1/case-search (landlord deposit)"
curl -s -X POST "$BASE/v1/case-search" \
  -H 'content-type: application/json' \
  -d '{"query":"landlord deposit not protected","area":"housing"}' | jq '.hits[] | {cite: .citation, score: ._score}'

echo "▶ POST /v1/weave (unfair dismissal)"
curl -s -X POST "$BASE/v1/weave" \
  -H 'content-type: application/json' \
  -d '{"query":"employer dismissed me without process","pattern":"unfair_dismissal"}' \
  | jq '.results[] | {strand, top: .cases[0].citation, weight}'

echo "▶ POST /v1/risk (one-shot weave + score)"
curl -s -X POST "$BASE/v1/risk" \
  -H 'content-type: application/json' \
  -d '{"query":"landlord deposit unprotected","pattern":"deposit_dispute"}' | jq .risk

echo "▶ POST /v1/draft (witness statement)"
curl -s -X POST "$BASE/v1/draft" \
  -H 'content-type: application/json' \
  -d '{"type":"witness_statement","facts":"On 12 May, I was summarily dismissed.\nNo investigation took place.","parties":"Smith v Acme Ltd","court":"EMPLOYMENT TRIBUNAL"}' \
  | jq '{type, draft: (.draft | split("\n")[:6] | join("\n"))}'

echo "▶ POST /v1/compliance-audit (EU SaaS with AI no audit log)"
curl -s -X POST "$BASE/v1/compliance-audit" \
  -H 'content-type: application/json' \
  -d '{"ca_size":"10-49","ca_uses_ai":"yes","ca_eu_users":"yes","ca_audit_log":"no","ca_dpa":"no","ca_breach_plan":"no"}' | jq '{score, gaps: [.gaps[] | {severity, id, gap}]}'
