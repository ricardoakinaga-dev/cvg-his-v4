import { readFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';

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

function loadOpenApiYaml(): string {
  try {
    return readFileSync(new URL('./openapi.yaml', import.meta.url), 'utf8');
  } catch {
    return readFileSync(new URL('../openapi.yaml', import.meta.url), 'utf8');
  }
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
    try {
      const openApiSpec = parseYaml(loadOpenApiYaml());
      return sendJson(response, 200, openApiSpec);
    } catch {
      return sendJson(response, 200, FALLBACK_OPENAPI_SPEC);
    }
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
