import assert from 'node:assert/strict';
import test from 'node:test';
import {
  collectDeclaredRequests,
  missingDeclaredRequests
} from './frontend-backend-contract.helper.mjs';
test('nested query template preserves the declared endpoint identity', () => {
  const result = collectDeclaredRequests(
    "const params = search.toString(); apiRequest(`/breeds${params ? `?${params}` : ''}`);"
  );
  assert.deepEqual(result.unresolved, []);
  assert.deepEqual(
    result.requests.map(({ method, path }) => ({ method, path })),
    [{ method: 'GET', path: '/breeds' }]
  );
});
test('resolves query builder return and local URL without executing service code', () => {
  const result = collectDeclaredRequests(
    "function buildQuery(filters) { return filters ? `?q=${filters.q}` : ''; } const path = `/breeds${buildQuery(filters)}`; apiRequest(path);"
  );
  assert.deepEqual(result.unresolved, []);
  assert.deepEqual(
    result.requests.map((r) => r.path),
    ['/breeds']
  );
});
test('checks HTTP verb and parameter segments against canonical OpenAPI', () => {
  const result = collectDeclaredRequests(
    "apiRequest(`/breeds/${encodeURIComponent(id)}`, {method: 'PATCH'}); apiRequest('/missing'); apiRequest('/breeds', {method:'DELETE'});"
  );
  const missing = missingDeclaredRequests(result.requests, {
    paths: { '/breeds/{id}': { patch: {} }, '/breeds': { get: {} } }
  });
  assert.deepEqual(
    missing.map(({ method, path }) => ({ method, path })),
    [
      { method: 'GET', path: '/missing' },
      { method: 'DELETE', path: '/breeds' }
    ]
  );
});
test('unknown endpoint structure is exposed instead of discarded or wildcard accepted', () => {
  const result = collectDeclaredRequests(
    "apiRequest(resolveEndpoint()); apiRequest(`/breeds${suffix}`); apiRequest('/breeds', options);"
  );
  assert.equal(result.unresolved.length, 3);
});
test('absolute API fetch, query branches, comments and string decoys are handled', () => {
  const result = collectDeclaredRequests(
    "// apiRequest('/fake')\nconst decoy = \"apiRequest('/fake')\"; fetch(`${API_BASE}/api/webhooks/whatsapp/inbound`, {method:'POST'}); apiRequest(q ? `/breeds?${q}` : '/breeds');"
  );
  assert.deepEqual(result.unresolved, []);
  assert.deepEqual(
    result.requests.map((r) => r.path),
    ['/webhooks/whatsapp/inbound', '/breeds']
  );
});
test('import and local aliases preserve computed method literals and reject unknown keys', () => {
  const result = collectDeclaredRequests(
    "import {apiRequest as request} from './api'; const send = request; send('/owners', {['method']:'DELETE'}); send('/owners', {[key]:'POST'});"
  );
  assert.equal(result.requests[0].method, 'DELETE');
  assert.equal(result.unresolved.length, 1);
});
test('unknown dynamic calls cannot masquerade as a single path parameter', () => {
  const result = collectDeclaredRequests(
    "apiRequest(`/prefix/${resolveEndpoint()}`); function suffix(){return 'child/grandchild';} apiRequest(`/prefix/${suffix()}`);"
  );
  assert.equal(result.unresolved.length, 1);
  assert.deepEqual(
    result.requests.map((r) => r.path),
    ['/prefix/child/grandchild']
  );
});
test('endpoint properties follow Vue ref/computed/filter/map dataflow', () => {
  const result = collectDeclaredRequests(
    "const rows=ref([{endpoint:'/owners'}, {endpoint:'/missing'}]); const visible=computed(() => rows.value.filter(row => row)); const tiles=visible.value; tiles.map(tile => apiRequest(tile.endpoint));",
    'page.vue'
  );
  assert.deepEqual(result.unresolved, []);
  assert.deepEqual(
    result.requests.map((r) => r.path),
    ['/owners', '/missing']
  );
});
test('whole SPA traversal parses normal and setup Vue scripts and exposes missing routes', async () => {
  const { mkdtempSync, writeFileSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { collectSpaRequests } = await import('./frontend-backend-contract.helper.mjs');
  const dir = mkdtempSync(join(tmpdir(), 'spa-contract-'));
  try {
    writeFileSync(
      join(dir, 'Page.vue'),
      '<template><div>apiRequest("/decoy")</div></template><script lang="ts">apiRequest("/normal")</script><script setup lang="ts">import {apiRequest as send} from "./api"; send("/setup", {["method"]:"POST"})</script>'
    );
    const result = collectSpaRequests(dir);
    assert.deepEqual(result.unresolved, []);
    assert.deepEqual(
      result.requests.map((r) => [r.method, r.path]),
      [
        ['GET', '/normal'],
        ['POST', '/setup']
      ]
    );
    assert.equal(
      missingDeclaredRequests(result.requests, { paths: { '/normal': { get: {} } } }).length,
      1
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
test('local function arguments retain multi-segment paths and unknown returned values fail closed', () => {
  const result = collectDeclaredRequests(
    "function identity(x){return x;} apiRequest(`/prefix/${identity('child/grandchild')}`); apiRequest(`/prefix/${identity(dynamic)}`); apiRequest(`/prefix/${factory().path}`);"
  );
  assert.deepEqual(
    result.requests.map((r) => r.path),
    ['/prefix/child/grandchild']
  );
  assert.equal(result.unresolved.length, 2);
});
test('unknown literal method values and namespace imports are not silently treated as GET', () => {
  const result = collectDeclaredRequests(
    "import * as transport from './api'; transport.apiRequest('/owners', {method: dynamic}); transport.apiRequest('/owners', {['method']:'DELETE'});"
  );
  assert.equal(result.unresolved.length, 1);
  assert.equal(result.requests.at(-1).method, 'DELETE');
});
test('whole SPA traversal follows imported aliases across local re-export modules', async () => {
  const { mkdtempSync, writeFileSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { collectSpaRequests } = await import('./frontend-backend-contract.helper.mjs');
  const dir = mkdtempSync(join(tmpdir(), 'spa-alias-'));
  try {
    writeFileSync(
      join(dir, 'transport.ts'),
      "import {apiRequest} from './api'; export const send=apiRequest;"
    );
    writeFileSync(join(dir, 'barrel.ts'), "export {send as submit} from './transport';");
    writeFileSync(
      join(dir, 'Page.vue'),
      '<script setup lang="ts">import {submit as post} from "./barrel"; post("/missing",{method:"POST"});</script>'
    );
    const result = collectSpaRequests(dir);
    assert.deepEqual(result.unresolved, []);
    assert.deepEqual(
      result.requests.map((r) => [r.method, r.path]),
      [['POST', '/missing']]
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
