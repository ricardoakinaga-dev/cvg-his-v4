#!/usr/bin/env node
/**
 * Synthetic alert delivery drill (R2-OPS-01).
 *
 * Starts a disposable Alertmanager with the repository configuration, points
 * both receivers at a local HTTP receiver, fires one critical and one warning
 * alert through the Alertmanager API and verifies that each one reaches the
 * receiver that the routing tree assigns to its severity. The result is
 * written as SHA-bound evidence under artifacts/operations/.
 *
 * Usage:
 *   pnpm ops:alerts:drill                       # disposable Alertmanager in Docker
 *   ALERTMANAGER_URL=http://host:9093 \
 *   DRILL_RECEIVER_URL=http://reachable-host:PORT pnpm ops:alerts:drill
 *                                               # against a running Alertmanager whose
 *                                               # secret files already point at this receiver
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const configPath = path.join(rootDir, 'infra', 'observability', 'alertmanager.yml');
const composePath = path.join(rootDir, 'docker-compose.v2.yml');
const DELIVERY_TIMEOUT_MS = Number(process.env.DRILL_DELIVERY_TIMEOUT_MS ?? 120_000);
const EXPECTED = {
  critical: { receiver: 'critical-pager', path: '/webhook/critical' },
  warning: { receiver: 'warning-chat', path: '/webhook/warning' }
};

function log(message) {
  process.stdout.write(`[alert-drill] ${message}\n`);
}

function resolveAlertmanagerImage() {
  const compose = readFileSync(composePath, 'utf8');
  const match = compose.match(/image:\s*(prom\/alertmanager@sha256:[a-f0-9]{64})/);
  if (!match) throw new Error('docker-compose.v2.yml must pin prom/alertmanager by digest');
  return match[1];
}

function sha256(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

function gitHead() {
  const result = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: rootDir, encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : 'unknown';
}

async function startReceiver() {
  const deliveries = [];
  const waiters = new Set();
  const server = createServer((request, response) => {
    let body = '';
    request.on('data', (chunk) => {
      body += chunk;
    });
    request.on('end', () => {
      let payload = null;
      try {
        payload = JSON.parse(body);
      } catch {
        payload = { parseError: true, raw: body.slice(0, 500) };
      }
      const delivery = {
        receivedAt: new Date().toISOString(),
        path: request.url,
        receiver: payload?.receiver ?? null,
        status: payload?.status ?? null,
        alertnames: Array.isArray(payload?.alerts) ? payload.alerts.map((alert) => alert.labels?.alertname) : [],
        severities: Array.isArray(payload?.alerts) ? payload.alerts.map((alert) => alert.labels?.severity) : []
      };
      deliveries.push(delivery);
      for (const waiter of waiters) waiter(delivery);
      response.statusCode = 200;
      response.end('ok');
    });
  });
  const port = Number(process.env.DRILL_RECEIVER_PORT ?? 0);
  await new Promise((resolve) => server.listen(port, '0.0.0.0', resolve));
  const address = server.address();
  return {
    port: address.port,
    deliveries,
    waitFor(predicate, timeoutMs) {
      const existing = deliveries.find(predicate);
      if (existing) return Promise.resolve(existing);
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          waiters.delete(onDelivery);
          reject(new Error(`no delivery matched within ${timeoutMs}ms`));
        }, timeoutMs);
        const onDelivery = (delivery) => {
          if (predicate(delivery)) {
            clearTimeout(timer);
            waiters.delete(onDelivery);
            resolve(delivery);
          }
        };
        waiters.add(onDelivery);
      });
    },
    close: () => new Promise((resolve) => server.close(resolve))
  };
}

function startDisposableAlertmanager(receiverBaseUrl) {
  const image = resolveAlertmanagerImage();
  // Alertmanager runs as an unprivileged user inside the image, so the mounted
  // secret files must be readable by it (mkdtemp defaults to 0700).
  const secretsDir = mkdtempSync(path.join(tmpdir(), 'cvg-alertmanager-drill-'));
  chmodSync(secretsDir, 0o755);
  for (const [file, route] of [
    ['critical-webhook-url', EXPECTED.critical.path],
    ['warning-webhook-url', EXPECTED.warning.path]
  ]) {
    const target = path.join(secretsDir, file);
    writeFileSync(target, `${receiverBaseUrl}${route}\n`, { mode: 0o644 });
    chmodSync(target, 0o644);
  }
  const name = `cvg-alertmanager-drill-${process.pid}`;
  execFileSync('docker', [
    'run',
    '--detach',
    '--rm',
    '--name',
    name,
    '--add-host',
    'host.docker.internal:host-gateway',
    '--publish',
    '127.0.0.1:0:9093',
    '--volume',
    `${configPath}:/etc/alertmanager/alertmanager.yml:ro`,
    '--volume',
    `${secretsDir}:/etc/alertmanager/secrets:ro`,
    image,
    '--config.file=/etc/alertmanager/alertmanager.yml',
    '--storage.path=/alertmanager'
  ]);
  const portLine = execFileSync('docker', ['port', name, '9093/tcp'], { encoding: 'utf8' }).trim().split('\n')[0];
  const hostPort = portLine.split(':').pop();
  return {
    image,
    name,
    url: `http://127.0.0.1:${hostPort}`,
    checkConfig() {
      const result = spawnSync(
        'docker',
        ['exec', name, 'amtool', 'check-config', '/etc/alertmanager/alertmanager.yml'],
        { encoding: 'utf8' }
      );
      return { ok: result.status === 0, output: `${result.stdout}${result.stderr}`.trim() };
    },
    stop() {
      spawnSync('docker', ['rm', '--force', name], { stdio: 'ignore' });
      rmSync(secretsDir, { recursive: true, force: true });
    }
  };
}

async function waitForReady(baseUrl, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/-/ready`);
      if (response.ok) return;
    } catch {
      // not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Alertmanager at ${baseUrl} did not become ready within ${timeoutMs}ms`);
}

async function postAlert(baseUrl, severity, runId) {
  const alertname = `CVG_HIS_SyntheticDrill_${severity[0].toUpperCase()}${severity.slice(1)}`;
  const response = await fetch(`${baseUrl}/api/v2/alerts`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify([
      {
        // Distinct `service` per severity: the inhibit rule would otherwise
        // (correctly) suppress the warning while the critical one is firing.
        labels: { alertname, severity, service: `drill-${severity}`, environment: 'drill', run: runId },
        annotations: {
          summary: `Synthetic ${severity} alert from pnpm ops:alerts:drill`,
          runbook: 'docs/runbooks/observability-alerts.md#entrega'
        },
        startsAt: new Date().toISOString()
      }
    ])
  });
  if (!response.ok) {
    throw new Error(`POST /api/v2/alerts (${severity}) failed: ${response.status} ${await response.text()}`);
  }
  return alertname;
}

async function main() {
  const startedAt = new Date();
  const runId = `${startedAt.toISOString().replace(/[:.]/g, '-')}-${process.pid}`;
  const receiver = await startReceiver();
  const externalUrl = process.env.ALERTMANAGER_URL;
  let alertmanager = null;
  const evidence = {
    drill: 'alertmanager-synthetic-delivery',
    backlogItem: 'R2-OPS-01',
    runId,
    startedAt: startedAt.toISOString(),
    headSha: gitHead(),
    configSha256: sha256(configPath),
    mode: externalUrl ? 'external' : 'disposable-docker',
    alertmanagerImage: null,
    amtoolCheck: null,
    fired: [],
    deliveries: [],
    result: 'FAIL',
    failures: []
  };

  try {
    let baseUrl = externalUrl;
    if (!baseUrl) {
      alertmanager = startDisposableAlertmanager(`http://host.docker.internal:${receiver.port}`);
      baseUrl = alertmanager.url;
      evidence.alertmanagerImage = alertmanager.image;
      log(`disposable Alertmanager ${alertmanager.name} at ${baseUrl}; receiver on port ${receiver.port}`);
    } else {
      log(`using external Alertmanager ${baseUrl}; receiver on port ${receiver.port}`);
    }
    await waitForReady(baseUrl);
    if (alertmanager) {
      evidence.amtoolCheck = alertmanager.checkConfig();
      log(`amtool check-config: ${evidence.amtoolCheck.ok ? 'ok' : 'FAILED'}`);
      if (!evidence.amtoolCheck.ok) evidence.failures.push(`amtool check-config failed: ${evidence.amtoolCheck.output}`);
    }

    for (const severity of ['critical', 'warning']) {
      const alertname = await postAlert(baseUrl, severity, runId);
      evidence.fired.push({ severity, alertname, firedAt: new Date().toISOString() });
      log(`fired ${severity} alert ${alertname}`);
    }

    for (const severity of ['critical', 'warning']) {
      const expected = EXPECTED[severity];
      const firedAt = Date.parse(evidence.fired.find((item) => item.severity === severity).firedAt);
      try {
        const delivery = await receiver.waitFor(
          (item) => item.severities.includes(severity) && item.alertnames.some((name) => name?.includes('SyntheticDrill')),
          DELIVERY_TIMEOUT_MS
        );
        const latencyMs = Date.parse(delivery.receivedAt) - firedAt;
        const routedCorrectly = delivery.receiver === expected.receiver && delivery.path === expected.path;
        evidence.deliveries.push({ severity, ...delivery, latencyMs, routedCorrectly });
        log(`${severity} delivered to ${delivery.receiver} via ${delivery.path} in ${latencyMs}ms`);
        if (!routedCorrectly) {
          evidence.failures.push(
            `${severity} alert reached ${delivery.receiver} (${delivery.path}); expected ${expected.receiver} (${expected.path})`
          );
        }
      } catch (error) {
        evidence.failures.push(`${severity} alert was not delivered: ${error.message}`);
      }
    }

    evidence.result = evidence.failures.length === 0 ? 'PASS' : 'FAIL';
  } catch (error) {
    evidence.failures.push(error.message);
  } finally {
    evidence.finishedAt = new Date().toISOString();
    if (alertmanager) alertmanager.stop();
    await receiver.close();
  }

  const evidenceDir = path.join(rootDir, 'artifacts', 'operations');
  mkdirSync(evidenceDir, { recursive: true });
  const evidencePath = process.env.DRILL_EVIDENCE_PATH ?? path.join(evidenceDir, `alertmanager-drill-${runId}.json`);
  writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
  log(`evidence: ${path.relative(rootDir, evidencePath)}`);
  log(`result: ${evidence.result}${evidence.failures.length ? ` — ${evidence.failures.join('; ')}` : ''}`);
  process.exitCode = evidence.result === 'PASS' ? 0 : 1;
}

main().catch((error) => {
  process.stderr.write(`[alert-drill] fatal: ${error.stack ?? error.message}\n`);
  process.exitCode = 1;
});
