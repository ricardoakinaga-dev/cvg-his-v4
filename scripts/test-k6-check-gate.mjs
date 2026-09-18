#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));

function run(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, options);
    let output = '';
    child.stdout.on('data', (chunk) => {
      output += chunk;
    });
    child.stderr.on('data', (chunk) => {
      output += chunk;
    });
    child.once('error', reject);
    child.once('close', (code) => resolve({ code, output }));
  });
}

export async function testBenchmarkCheckGate() {
  const version = execFileSync('k6', ['version'], { encoding: 'utf8' });
  assert.match(version, /^k6 v0\.55\.0\b/);
  const directory = await mkdtemp(join(tmpdir(), 'cvg-k6-check-gate-'));
  let currentCase = 'good';
  const requests = [];
  const server = createServer(async (request, response) => {
    requests.push(`${request.method} ${request.url.split('?')[0]}`);
    response.setHeader('content-type', 'application/json');
    if (request.url === '/auth/login') {
      response.end(
        JSON.stringify({
          accessToken: 'fixture-token',
          principal: { user: { accountId: 'fixture-account' } }
        })
      );
      return;
    }
    if (request.url === '/health' && currentCase === 'slow-health') {
      await new Promise((resolve) => setTimeout(resolve, 90));
    }
    if (request.url === '/owners' && currentCase === 'malformed-owners') {
      response.end('{broken');
      return;
    }
    if (request.url === '/openapi.json') {
      response.end(
        JSON.stringify({ paths: currentCase === 'empty-openapi' ? {} : { '/health': {} } })
      );
      return;
    }
    response.statusCode = request.method === 'POST' && request.url === '/inventory' ? 201 : 200;
    response.end('{"ok":true,"items":[]}');
  });
  try {
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
    const target = `http://127.0.0.1:${server.address().port}`;
    const reportPath = join(directory, 'report.json');
    const fixturePath = join(directory, 'fixture.js');
    const benchmarkPath = join(root, 'benchmarks/k6/api-benchmark.js');
    // Import the actual workload, predicates, thresholds and summary handler.
    // Only the fixture execution length and report destination differ.
    await writeFile(
      fixturePath,
      `
import workload, { setup as authenticate, options as benchmarkOptions, handleSummary as summarize } from ${JSON.stringify(benchmarkPath)};
const { stages, ...optionsWithoutStages } = benchmarkOptions;
export const options = { ...optionsWithoutStages, vus: 1, iterations: 1 };
export const setup = authenticate;
export default workload;
export function handleSummary(data) {
  const result = summarize(data);
  return { stdout: result.stdout, [${JSON.stringify(reportPath)}]: result['benchmarks/k6/results/performance-report.json'] };
}
`
    );
    const cases = [
      ['good', null],
      ['malformed-owners', '::Owners - List::owners has valid JSON'],
      ['empty-openapi', '::OpenAPI - Spec::openapi has paths'],
      ['slow-health', '::Health::health latency < 50ms']
    ];
    for (const [name, failedPath] of cases) {
      currentCase = name;
      requests.length = 0;
      const result = await run('k6', ['--address', '127.0.0.1:0', 'run', '--quiet', fixturePath], {
        cwd: root,
        env: {
          ...process.env,
          TARGET: target,
          LOAD_PROFILE: 'operational-minimum-v1',
          GOMAXPROCS: '1'
        },
        stdio: ['ignore', 'pipe', 'pipe']
      });
      assert.equal(result.code, failedPath ? 99 : 0, `${name}: ${result.output}`);
      const report = JSON.parse(await readFile(reportPath, 'utf8'));
      assert.equal(report.slo._summary.total, 9);
      assert.equal(report.slo._summary.allPassed, true, `${name}: ${result.output}`);
      assert.deepEqual(report.thresholds.checks, ['rate==1']);
      assert.equal(report.checks.length, 16);
      assert.equal(report.metrics.checks.passes, failedPath ? 15 : 16);
      assert.equal(report.metrics.checks.fails, failedPath ? 1 : 0);
      assert.deepEqual(
        report.checks.filter((check) => check.fails > 0).map((check) => check.path),
        failedPath ? [failedPath] : []
      );
      assert.equal(requests.length, 15, 'one login plus all 14 workload requests');
      assert.match(
        result.output,
        new RegExp(`Aggregate: ${failedPath ? 15 : 16} passed, ${failedPath ? 1 : 0} failed`)
      );
      for (const flags of [[], ['--markdown']]) {
        const parsed = await run(
          process.execPath,
          [join(root, 'benchmarks/k6/parse-results.js'), reportPath, ...flags],
          {
            cwd: root,
            stdio: ['ignore', 'pipe', 'pipe']
          }
        );
        assert.equal(parsed.code, failedPath ? 1 : 0, `${name} parser: ${parsed.output}`);
        if (failedPath) assert.ok(parsed.output.includes(failedPath));
      }
      console.log(
        `k6 check gate fixture ${name}: expected exit ${result.code}, all 9 SLOs passed, ${report.metrics.checks.fails} attributed check failures`
      );
    }
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
      server.closeAllConnections();
    });
    await rm(directory, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await testBenchmarkCheckGate();
}
