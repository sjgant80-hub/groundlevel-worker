// src/openapi.js · OpenAPI 3.1 spec for groundlevel-worker
// served at GET /v1/openapi.json · also publishable to RapidAPI etc.

import { DOC_TYPES, PATTERN_KEYS } from '@sjgant80-hub/groundlevel-sdk';

export function openapi(req) {
  const origin = req ? new URL(req.url).origin : 'https://groundlevel-worker.workers.dev';
  return {
    openapi: '3.1.0',
    info: {
      title: 'GroundLevel Worker',
      version: '0.1.0',
      description: 'REST API wrapping the @sjgant80-hub/groundlevel-sdk · case search · 7-strand weave · risk · document drafting · compliance audit.',
      license: { name: 'MIT', url: 'https://github.com/sjgant80-hub/groundlevel-worker/blob/main/LICENSE' },
      contact: { name: 'Simon Gant', url: 'https://github.com/sjgant80-hub/groundlevel-worker' },
    },
    servers: [{ url: origin }],
    components: {
      schemas: {
        Case: {
          type: 'object',
          properties: {
            id: { type: 'string' }, citation: { type: 'string' }, court: { type: 'string' },
            year: { type: 'integer' }, area: { type: 'string' }, sub: { type: 'string' },
            summary: { type: 'string' }, principle: { type: 'string' }, statute: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            outcome: { type: 'string' },
            strands: { type: 'array', items: { type: 'string' } },
          },
        },
        SearchRequest: {
          type: 'object', required: ['query'],
          properties: {
            query: { type: 'string', example: 'landlord deposit not protected' },
            area: { type: 'string', example: 'housing' },
            limit: { type: 'integer', default: 8 },
          },
        },
        WeaveRequest: {
          type: 'object', required: ['query'],
          properties: {
            query: { type: 'string', example: 'employer dismissed me without process' },
            pattern: { type: 'string', enum: PATTERN_KEYS },
            perStrand: { type: 'integer', default: 4 },
          },
        },
        DraftRequest: {
          type: 'object', required: ['facts'],
          properties: {
            type: { type: 'string', enum: DOC_TYPES, default: 'legal_brief' },
            facts: { type: 'string', example: 'On 12 May...\nNo investigation took place.' },
            parties: { type: 'string', example: 'Smith v Acme Ltd' },
            court: { type: 'string', example: 'EMPLOYMENT TRIBUNAL' },
            relief: { type: 'string' },
          },
        },
        AuditRequest: {
          type: 'object',
          properties: {
            ca_jurisdiction: { type: 'string', enum: ['uk','eu','us'] },
            ca_size: { type: 'string', enum: ['1','2-9','10-49','50-249','250+'] },
            ca_personal_data: { type: 'string', enum: ['none','minimal','standard','sensitive'] },
            ca_dpa: { type: 'string', enum: ['yes','no'] },
            ca_privacy_policy: { type: 'string', enum: ['yes','no','stale'] },
            ca_dsar_process: { type: 'string', enum: ['documented','informal','no'] },
            ca_records: { type: 'string', enum: ['yes','no'] },
            ca_uses_ai: { type: 'string', enum: ['yes','planning','no'] },
            ca_eu_users: { type: 'string', enum: ['yes','no','maybe'] },
            ca_audit_log: { type: 'string', enum: ['yes','no'] },
            ca_employment_contracts: { type: 'string', enum: ['yes','no'] },
            ca_handbook: { type: 'string', enum: ['yes','no'] },
            ca_t_and_c: { type: 'string', enum: ['recent','old','never'] },
            ca_subscription: { type: 'string', enum: ['yes','no'] },
            ca_breach_plan: { type: 'string', enum: ['yes','no'] },
            ca_health_safety: { type: 'string', enum: ['yes','no'] },
            ca_cyber: { type: 'string', enum: ['none','incident','near_miss'] },
          },
        },
        Error: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
    paths: {
      '/health': {
        get: { summary: 'Liveness probe', responses: { 200: { description: 'OK' } } },
      },
      '/v1/info': {
        get: { summary: 'Machine-readable surface' },
      },
      '/v1/cases': {
        get: {
          summary: 'List cases',
          parameters: [
            { name: 'area', in: 'query', schema: { type: 'string' } },
            { name: 'strand', in: 'query', schema: { type: 'string' } },
          ],
          responses: { 200: { description: 'OK' } },
        },
      },
      '/v1/cases/{id}': {
        get: {
          summary: 'Fetch a single case',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'OK' }, 404: { description: 'Not found' } },
        },
      },
      '/v1/case-search': {
        post: {
          summary: 'Keyword search the case DB',
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/SearchRequest' } } } },
          responses: { 200: { description: 'OK' }, 400: { description: 'Bad input' } },
        },
      },
      '/v1/weave': {
        post: {
          summary: '7-strand parallel research weave',
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/WeaveRequest' } } } },
          responses: { 200: { description: 'OK' } },
        },
      },
      '/v1/risk': {
        post: {
          summary: 'Convenience: weave + score in one call',
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/WeaveRequest' } } } },
          responses: { 200: { description: 'OK' } },
        },
      },
      '/v1/draft': {
        post: {
          summary: 'Draft a court-ready document',
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/DraftRequest' } } } },
          responses: { 200: { description: 'OK' } },
        },
      },
      '/v1/compliance-audit': {
        post: {
          summary: 'Run the UK/EU compliance audit',
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/AuditRequest' } } } },
          responses: { 200: { description: 'OK' } },
        },
      },
    },
  };
}
