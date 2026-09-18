import { readFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { resolve } from 'node:path';

import { parse as parseYaml } from 'yaml';

const FALLBACK_OPENAPI_SPEC = {
  openapi: '3.0.3',
  info: {
    title: 'CVG HIS API',
    version: '1.0.0',
    description: 'CVG Hospital Information System REST API'
  },
  servers: [{ url: '/', description: 'Local development' }],
  paths: {}
};

const API_DOCS_RESPONSE = {
  title: 'CVG HIS API',
  version: '1.0.0',
  description: 'CVG Hospital Information System REST API',
  endpoints: {
    health: { url: '/health', method: 'GET', description: 'Health check' },
    ready: { url: '/ready', method: 'GET', description: 'Readiness check' },
    metrics: { url: '/metrics', method: 'GET', description: 'Prometheus metrics' },
    slos: { url: '/slos', method: 'GET', description: 'SLO compliance report' },
    openapi: {
      url: '/openapi.json',
      method: 'GET',
      description: 'OpenAPI 3.0 specification'
    }
  },
  documentation: {
    swagger_ui: 'Use /openapi.json with external Swagger UI tools',
    postman: 'Import /openapi.json into Postman or Insomnia'
  },
  rate_limits: {
    header_prefix: 'X-RateLimit',
    headers: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset']
  },
  authentication: {
    type: 'Bearer Token',
    header: 'Authorization: Bearer <access_token>',
    alternative: 'X-API-Key header for API keys'
  }
};

let cachedOpenApiYaml: string | undefined;
let cachedOpenApiSpec: unknown | undefined;
let cachedOpenApiJson: string | undefined;

function openApiYamlCandidates(): Array<string | URL> {
  const moduleRelativeCandidates = [
    new URL('./openapi.yaml', import.meta.url),
    new URL('../openapi.yaml', import.meta.url)
  ].filter((candidate) => candidate.protocol === 'file:');

  return [
    ...moduleRelativeCandidates,
    resolve(process.cwd(), 'apps/api/src/openapi.yaml'),
    resolve(process.cwd(), 'apps/api/dist/openapi.yaml')
  ];
}

function loadOpenApiYaml(): string {
  if (cachedOpenApiYaml !== undefined) {
    return cachedOpenApiYaml;
  }

  let lastError: unknown;
  for (const candidate of openApiYamlCandidates()) {
    try {
      cachedOpenApiYaml = readFileSync(candidate, 'utf8');
      return cachedOpenApiYaml;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('OpenAPI spec not available');
}

function loadOpenApiSpec(): unknown {
  if (cachedOpenApiSpec !== undefined) {
    return cachedOpenApiSpec;
  }

  try {
    cachedOpenApiSpec = parseYaml(loadOpenApiYaml());
  } catch {
    cachedOpenApiSpec = FALLBACK_OPENAPI_SPEC;
  }

  return cachedOpenApiSpec;
}

function sendJson(response: ServerResponse, statusCode: number, payload: unknown): true {
  response.setHeader('content-type', 'application/json');
  response.statusCode = statusCode;
  response.end(JSON.stringify(payload));
  return true;
}

export function handleOpenApiRoutes(
  request: IncomingMessage,
  response: ServerResponse
): boolean {
  if (request.method !== 'GET') {
    return false;
  }

  if (request.url === '/openapi.json') {
    // The source and parsed specification are immutable for this process.
    // Serialize once so concurrent documentation reads do not block the
    // event loop repeatedly while unrelated API requests are waiting.
    cachedOpenApiJson ??= JSON.stringify(loadOpenApiSpec());
    response.setHeader('content-type', 'application/json');
    response.statusCode = 200;
    response.end(cachedOpenApiJson);
    return true;
  }

  if (request.url === '/openapi.yaml') {
    try {
      response.setHeader('content-type', 'text/yaml');
      response.statusCode = 200;
      response.end(loadOpenApiYaml());
    } catch {
      response.statusCode = 500;
      response.end('OpenAPI spec not available');
    }
    return true;
  }

  if (request.url === '/api-docs') {
    return sendJson(response, 200, API_DOCS_RESPONSE);
  }

  return false;
}
