import { readFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { resolve } from 'node:path';

import { parse as parseYaml } from 'yaml';

type OpenApiRouteDependencies = Readonly<{
  readFile?: typeof readFileSync;
  currentWorkingDirectory?: () => string;
}>;

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

function loadOpenApiYaml(dependencies: OpenApiRouteDependencies = {}): string {
  const readFile = dependencies.readFile ?? readFileSync;
  const currentWorkingDirectory = dependencies.currentWorkingDirectory ?? process.cwd;
  const candidates: Array<URL | string> = [
    new URL('../openapi.yaml', import.meta.url),
    resolve(currentWorkingDirectory(), 'apps/api/dist/openapi.yaml'),
    resolve(currentWorkingDirectory(), 'apps/api/src/openapi.yaml'),
    resolve(currentWorkingDirectory(), 'openapi.yaml')
  ];
  let lastError: unknown;

  for (const candidate of candidates) {
    try {
      return readFile(candidate, 'utf8');
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('OpenAPI specification not found');
}

function sendJson(response: ServerResponse, statusCode: number, payload: unknown): true {
  response.setHeader('content-type', 'application/json');
  response.statusCode = statusCode;
  response.end(JSON.stringify(payload));
  return true;
}

export function handleOpenApiRoutes(
  request: IncomingMessage,
  response: ServerResponse,
  dependencies: OpenApiRouteDependencies = {}
): boolean {
  if (request.method !== 'GET') {
    return false;
  }

  if (request.url === '/openapi.json') {
    try {
      const openApiSpec = parseYaml(loadOpenApiYaml(dependencies));
      return sendJson(response, 200, openApiSpec);
    } catch {
      return sendJson(response, 500, {
        code: 'OPENAPI_SPEC_UNAVAILABLE',
        message: 'OpenAPI specification is not available'
      });
    }
  }

  if (request.url === '/openapi.yaml') {
    try {
      response.setHeader('content-type', 'text/yaml');
      response.statusCode = 200;
      response.end(loadOpenApiYaml(dependencies));
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
