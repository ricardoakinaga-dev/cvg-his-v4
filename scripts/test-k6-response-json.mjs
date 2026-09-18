#!/usr/bin/env node
import { execFileSync, spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const root = fileURLToPath(new URL('../', import.meta.url));
const version = execFileSync('k6', ['version'], { encoding: 'utf8' });
if (!/^k6 v0\.55\.0\b/.test(version)) {
  throw new Error(`Expected pinned k6 v0.55.0, received ${version.trim()}`);
}
const specification = JSON.stringify(
  parse(readFileSync(new URL('../apps/api/src/openapi.yaml', import.meta.url), 'utf8'))
);
const server = createServer(async (request, response) => {
  response.setHeader('content-type', 'application/json');
  if (request.method === 'GET' && request.url === '/openapi.json') {
    response.end(specification);
    return;
  }
  if (request.method === 'POST' && request.url === '/echo') {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    response.end(Buffer.concat(chunks));
    return;
  }
  response.statusCode = 404;
  response.end('{}');
});

try {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  const exitCode = await new Promise((resolve, reject) => {
    const child = spawn(
      'k6',
      ['--address', '127.0.0.1:0', 'run', 'benchmarks/k6/response-json-equivalence.js'],
      {
        cwd: root,
        stdio: 'inherit',
        env: {
          ...process.env,
          LOAD_PROFILE: 'operational-minimum-v1',
          FIXTURE_TARGET: `http://127.0.0.1:${address.port}`
        }
      }
    );
    child.once('error', reject);
    child.once('close', (code) => resolve(code ?? 1));
  });
  process.exitCode = exitCode;
} finally {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
    server.closeAllConnections();
  });
}
