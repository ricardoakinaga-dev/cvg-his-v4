#!/usr/bin/env node

import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const apiUrl = (process.env.GAME_DAY_API_URL ?? 'http://127.0.0.1:3111').replace(/\/$/, '');
const username = process.env.GAME_DAY_ADMIN_USERNAME ?? 'admin';
const password = process.env.GAME_DAY_ADMIN_PASSWORD;
const confirmation = process.env.GAME_DAY_CONFIRMATION;
const allowRemote = process.env.GAME_DAY_ALLOW_REMOTE === '1';
const outputDir = resolve(process.env.GAME_DAY_OUTPUT_DIR ?? 'artifacts/game-day');
const releaseSha =
  process.env.GAME_DAY_RELEASE_SHA ?? process.env.GITHUB_SHA ?? 'local-uncommitted';

const experiments = [
  {
    id: 'api-latency',
    input: { durationMs: 30_000, minDelayMs: 5, maxDelayMs: 20, probability: 1 }
  },
  { id: 'network-latency', input: { durationMs: 30_000, minDelayMs: 5, maxDelayMs: 20 } },
  { id: 'redis-failure', input: { durationMs: 30_000 } },
  { id: 'worker-failure', input: { durationMs: 30_000, faultDelayMs: 5, probability: 1 } },
  { id: 'provider-failure', input: { durationMs: 30_000 } },
  { id: 'database-failure', input: { durationMs: 30_000 } }
];

function assertSafeTarget() {
  if (confirmation !== 'EPHEMERAL-TEST-ONLY') {
    throw new Error('GAME_DAY_CONFIRMATION must be EPHEMERAL-TEST-ONLY');
  }
  if (!password) {
    throw new Error('GAME_DAY_ADMIN_PASSWORD is required');
  }

  const parsed = new URL(apiUrl);
  const loopback = ['127.0.0.1', 'localhost', '::1'].includes(parsed.hostname);
  if (!loopback && !allowRemote) {
    throw new Error(
      'Remote game-day targets require GAME_DAY_ALLOW_REMOTE=1 and separate approval'
    );
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('GAME_DAY_API_URL must use HTTP or HTTPS');
  }
}

async function request(path, { token, method = 'GET', body, expected = [200] } = {}) {
  const headers = new Headers();
  if (token) headers.set('authorization', `Bearer ${token}`);
  if (body !== undefined) headers.set('content-type', 'application/json');

  const startedAt = Date.now();
  const response = await fetch(`${apiUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(15_000)
  });
  const elapsedMs = Date.now() - startedAt;
  const raw = await response.text();
  let payload = {};
  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = { raw };
    }
  }
  if (!expected.includes(response.status)) {
    throw new Error(`${method} ${path} returned ${response.status}: ${raw.slice(0, 500)}`);
  }
  return { status: response.status, payload, elapsedMs };
}

function activeExperiment(snapshot, id) {
  return snapshot.experiments?.find((item) => item.id === id && item.active === true);
}

function assertRuntimeImpact(id, snapshot) {
  if (!activeExperiment(snapshot, id)) {
    throw new Error(`${id} did not become active`);
  }

  if (id === 'database-failure' && snapshot.runtimeState?.persistenceMode !== 'unavailable') {
    throw new Error('database-failure did not expose persistenceMode=unavailable');
  }
  if (id === 'redis-failure' && snapshot.runtimeState?.rateLimiterMode !== 'fail-closed') {
    throw new Error('redis-failure did not expose rateLimiterMode=fail-closed');
  }
  if (id === 'worker-failure' && snapshot.runtimeState?.workerReady !== false) {
    throw new Error('worker-failure did not expose workerReady=false');
  }
  if (id === 'provider-failure' && snapshot.runtimeState?.externalProvidersHealthy !== false) {
    throw new Error('provider-failure did not expose externalProvidersHealthy=false');
  }
}

async function ensureNoActiveExperiments(token) {
  const snapshot = await request('/chaos/experiments', { token });
  const active = snapshot.payload.experiments?.filter((item) => item.active) ?? [];
  for (const item of active) {
    await request(`/chaos/experiments/${encodeURIComponent(item.id)}/stop`, {
      token,
      method: 'POST',
      expected: [200, 409]
    });
  }

  const clean = await request('/chaos/experiments', { token });
  if (clean.payload.experiments?.some((item) => item.active)) {
    throw new Error('One or more chaos experiments remained active after cleanup');
  }
  return clean.payload;
}

async function main() {
  assertSafeTarget();
  mkdirSync(outputDir, { recursive: true });

  const login = await request('/auth/login', {
    method: 'POST',
    body: { username, password }
  });
  const token = login.payload.accessToken;
  if (typeof token !== 'string' || token.length < 20) {
    throw new Error('Game-day login did not return a valid access token');
  }

  const initial = await ensureNoActiveExperiments(token);
  const knownIds = new Set(initial.experiments?.map((item) => item.id) ?? []);
  for (const experiment of experiments) {
    if (!knownIds.has(experiment.id)) {
      throw new Error(`Required chaos experiment is not registered: ${experiment.id}`);
    }
  }

  const report = {
    schemaVersion: 1,
    releaseSha,
    apiUrl: new URL(apiUrl).origin,
    targetClass: allowRemote ? 'approved-remote-test' : 'loopback-ephemeral-test',
    startedAt: new Date().toISOString(),
    experiments: [],
    recovery: null
  };

  try {
    for (const experiment of experiments) {
      const startedAt = new Date().toISOString();
      let stopped = false;
      try {
        const start = await request(`/chaos/experiments/${experiment.id}/start`, {
          token,
          method: 'POST',
          body: experiment.input
        });
        const snapshot = await request('/chaos/experiments', { token });
        assertRuntimeImpact(experiment.id, snapshot.payload);

        let readinessStatus = 200;
        if (experiment.id === 'database-failure' || experiment.id === 'provider-failure') {
          const readiness = await request('/ready', { expected: [503] });
          readinessStatus = readiness.status;
        }

        const stop = await request(`/chaos/experiments/${experiment.id}/stop`, {
          token,
          method: 'POST'
        });
        stopped = true;
        const recovered = await request('/chaos/experiments', { token });
        if (activeExperiment(recovered.payload, experiment.id)) {
          throw new Error(`${experiment.id} remained active after stop`);
        }

        report.experiments.push({
          id: experiment.id,
          status: 'passed',
          startedAt,
          completedAt: new Date().toISOString(),
          startStatus: start.status,
          stopStatus: stop.status,
          readinessStatus,
          detectionMs: snapshot.elapsedMs
        });
      } finally {
        if (!stopped) {
          await request(`/chaos/experiments/${experiment.id}/stop`, {
            token,
            method: 'POST',
            expected: [200, 409]
          }).catch(() => undefined);
        }
      }
    }
  } finally {
    report.recovery = await ensureNoActiveExperiments(token).catch((error) => ({
      cleanupError: error instanceof Error ? error.message : String(error)
    }));
    report.completedAt = new Date().toISOString();
    writeFileSync(
      resolve(outputDir, 'game-day-report.json'),
      `${JSON.stringify(report, null, 2)}\n`
    );
  }

  const ready = await request('/ready');
  if (ready.status !== 200 || report.recovery?.cleanupError) {
    throw new Error('Game-day recovery verification failed');
  }

  console.log(`GAME_DAY_REPORT=${resolve(outputDir, 'game-day-report.json')}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
