import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { resolve } from 'node:path';

import YAML from 'yaml';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '../../..');
const composeText = readFileSync(resolve(root, 'docker-compose.v2.yml'), 'utf8');
const envExample = readFileSync(resolve(root, '.env.v2.example'), 'utf8');
const prometheusText = readFileSync(resolve(root, 'infra/observability/prometheus.yml'), 'utf8');
const observabilityReadme = readFileSync(resolve(root, 'infra/observability/README.md'), 'utf8');
const cutoverScript = readFileSync(resolve(root, 'infra/scripts/cutover-v2.sh'), 'utf8');
const ciWorkflow = readFileSync(resolve(root, '.github/workflows/ci.yml'), 'utf8');

type ComposeService = {
  readonly environment?: Record<string, string>;
  readonly healthcheck?: { readonly test?: unknown[] };
  readonly ports?: unknown[];
};

type ComposeDocument = {
  readonly services?: Record<string, ComposeService>;
};

type PrometheusJob = {
  readonly job_name?: string;
  readonly static_configs?: Array<{ readonly targets?: string[] }>;
};

type PrometheusDocument = {
  readonly scrape_configs?: PrometheusJob[];
};

const compose = YAML.parse(composeText) as ComposeDocument;
const prometheus = YAML.parse(prometheusText) as PrometheusDocument;

function service(name: string): ComposeService {
  const value = compose.services?.[name];
  if (!value) throw new Error(`missing Compose service ${name}`);
  return value;
}

function publishedPorts(name: string): string[] {
  return (service(name).ports ?? []).map((port) => {
    if (typeof port === 'string') return port;
    if (typeof port === 'object' && port !== null) {
      const record = port as Record<string, unknown>;
      return `${String(record.host_ip)}:${String(record.published)}:${String(record.target)}`;
    }
    return String(port);
  });
}

function prometheusTargets(jobName: string): string[] {
  return (
    prometheus.scrape_configs?.find((job) => job.job_name === jobName)?.static_configs?.[0]
      ?.targets ?? []
  );
}

async function runWorkerHealthProbe(command: string, statusCode: number): Promise<number> {
  const server = createServer((_request, response) => {
    response.statusCode = statusCode;
    response.end();
  });

  await new Promise<void>((resolveServer, rejectServer) => {
    server.once('error', rejectServer);
    server.listen(0, '127.0.0.1', resolveServer);
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    server.close();
    throw new Error('worker health probe test server did not expose a TCP address');
  }

  const prefix = 'node -e "';
  const script = command
    .slice(prefix.length, -1)
    .replace('http://127.0.0.1:3002/ready', `http://127.0.0.1:${address.port}/ready`);
  const child = spawn(process.execPath, ['-e', script], { stdio: 'ignore' });

  try {
    const [exitCode] = (await once(child, 'exit')) as [number | null, NodeJS.Signals | null];
    return exitCode ?? 1;
  } finally {
    server.close();
  }
}

describe('canonical local Compose security and observability contracts', () => {
  it('binds every published canonical service port to loopback', () => {
    const expected = {
      postgres: '127.0.0.1:5432:5432',
      redis: '127.0.0.1:6380:6379',
      'otel-collector': '127.0.0.1:4318:4318',
      prometheus: '127.0.0.1:9090:9090',
      grafana: '127.0.0.1:3005:3000',
      'cvg-his-v2-api': '127.0.0.1:3003:3001',
      'cvg-his-v2-spa': '127.0.0.1:3002:3002'
    };

    for (const [name, binding] of Object.entries(expected)) {
      expect(publishedPorts(name), `${name} must be loopback-only`).toEqual([binding]);
    }
  });

  it('fails closed instead of defaulting Grafana to admin/admin', () => {
    expect(service('grafana').environment?.GF_SECURITY_ADMIN_PASSWORD).toBe(
      '${GRAFANA_ADMIN_PASSWORD:?GRAFANA_ADMIN_PASSWORD is required}'
    );
    expect(envExample).toMatch(/^GRAFANA_ADMIN_PASSWORD=$/m);
    expect(envExample).not.toMatch(/^GRAFANA_ADMIN_PASSWORD=admin$/m);
  });

  it('declares an executable worker readiness probe and requires strict healthy status in cutover', async () => {
    const healthcheck = service('cvg-his-v2-worker').healthcheck?.test;
    expect(healthcheck?.[0]).toBe('CMD-SHELL');
    const command = String(healthcheck?.[1]);
    expect(command).toMatch(/^node -e ".*http:\/\/127\.0\.0\.1:3002\/ready.*"$/);
    expect(await runWorkerHealthProbe(command, 200)).toBe(0);
    expect(await runWorkerHealthProbe(command, 503)).toBe(1);
    expect(cutoverScript).toContain('if [[ "$status" == "healthy" ]]');
    expect(cutoverScript).not.toContain('|| "$status" == "running"');
    expect(cutoverScript).not.toContain(
      'skipping worker HTTP health validation because the compose does not publish a worker port by default'
    );
  });

  it('scrapes API and worker through canonical Compose service DNS', () => {
    expect(prometheusTargets('cvg-api')).toEqual(['cvg-his-v2-api:3001']);
    expect(prometheusTargets('cvg-worker')).toEqual(['cvg-his-v2-worker:3002']);
    expect(service('prometheus')).not.toHaveProperty('extra_hosts');
    expect(prometheusText).not.toContain('host.docker.internal');
    expect(prometheus.scrape_configs).toHaveLength(3);
  });

  it('keeps the active observability README consistent with Compose networking', () => {
    expect(observabilityReadme).toContain(
      'docker compose --env-file .env.v2 -f docker-compose.v2.yml --profile observability up -d otel-collector prometheus grafana'
    );
    expect(observabilityReadme).toContain('GRAFANA_ADMIN_PASSWORD');
    expect(observabilityReadme).toMatch(/valor não\s+vazio em `\.env\.v2`/);
    expect(observabilityReadme).toContain("targets: ['cvg-his-v2-api:3001']");
    expect(observabilityReadme).toContain("targets: ['cvg-his-v2-worker:3002']");
    expect(observabilityReadme).not.toContain('host.docker.internal');
  });

  it('gives CI a synthetic Grafana password for Compose config validation', () => {
    expect(ciWorkflow).toContain(
      'GRAFANA_ADMIN_PASSWORD="${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}-compose-validation" docker compose --env-file .env.v2.example -f docker-compose.v2.yml config --quiet'
    );
  });
});
