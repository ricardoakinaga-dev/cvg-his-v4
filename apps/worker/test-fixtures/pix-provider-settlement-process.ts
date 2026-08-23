import { createServer } from 'node:http';
import { createWriteStream } from 'node:fs';

import {
  closeDatabaseClient,
  createDatabaseClient,
  getPool
} from '@cvg-his-v2/shared-database';

import { DatabasePixProviderEventDeliveryRepository } from '../src/jobs/pix-provider-event-delivery-repository.js';
import {
  PixProviderSettlementConsumer,
  type PixProviderSettlementCheckpoint
} from '../src/jobs/pix-provider-settlement-consumer.js';
import { getWorkerMetricsText } from '../src/worker-metrics.js';

const accountId = process.env.PIX_SETTLEMENT_ACCOUNT_ID?.trim();
const databaseUrl = process.env.DATABASE_URL?.trim();
const workerId = process.env.PIX_SETTLEMENT_WORKER_ID?.trim() || `process-${process.pid}`;
const checkpointValue = process.env.PIX_SETTLEMENT_CHECKPOINT?.trim();
const checkpoint = checkpointValue
  ? (checkpointValue as PixProviderSettlementCheckpoint)
  : undefined;
const leaseMs = Number(process.env.PIX_SETTLEMENT_LEASE_MS ?? '250');
const healthPort = Number(process.env.PIX_SETTLEMENT_HEALTH_PORT ?? '0');
const exitAfterResult = process.env.PIX_SETTLEMENT_EXIT_AFTER_RESULT === '1';

const checkpoints: readonly PixProviderSettlementCheckpoint[] = [
  'after_claim_commit',
  'before_b1',
  'after_b1_before_cas',
  'after_applied_cas'
];

// File descriptor 3 is a machine-readable control channel owned by the
// integration harness. It is intentionally separate from stdout/stderr so
// checkpoint synchronization never parses application logs.
let controlChannel: ReturnType<typeof createWriteStream> | undefined;

function getConfig(): { readonly accountId: string; readonly databaseUrl: string } {
  if (process.env.NODE_ENV !== 'test' || process.env.PIX_SETTLEMENT_SYNTHETIC_FIXTURE !== '1') {
    throw new Error('synthetic settlement process requires NODE_ENV=test and PIX_SETTLEMENT_SYNTHETIC_FIXTURE=1');
  }
  if (!accountId || !databaseUrl) throw new Error('process fixture requires account and database');
  if (!checkpoints.includes(checkpoint as PixProviderSettlementCheckpoint)) {
    if (checkpoint !== undefined) throw new Error(`unknown checkpoint: ${checkpoint}`);
  }
  if (!Number.isSafeInteger(leaseMs) || leaseMs <= 0 || leaseMs > 60_000) {
    throw new Error('process fixture lease is invalid');
  }
  if (!Number.isInteger(healthPort) || healthPort < 0 || healthPort > 65_535) {
    throw new Error('process fixture health port is invalid');
  }
  return { accountId, databaseUrl };
}

function writeLine(event: string, payload: Record<string, unknown> = {}): void {
  if (!controlChannel) throw new Error('synthetic settlement control channel is not initialized');
  controlChannel.write(`${event} ${JSON.stringify(payload)}\n`);
}

function waitForever(): Promise<void> {
  return new Promise(() => undefined);
}

async function main(): Promise<void> {
  const config = getConfig();
  controlChannel = createWriteStream(null as unknown as string, { fd: 3, autoClose: false });
  createDatabaseClient(config.databaseUrl);
  await getPool().query('SELECT 1');

  const server = createServer(async (request, response) => {
    if (request.url === '/ready' || request.url === '/health/ready') {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ ready: true, pid: process.pid, workerId }));
      return;
    }
    if (request.url === '/metrics') {
      response.writeHead(200, { 'content-type': 'text/plain; version=0.0.4; charset=utf-8' });
      response.end(await getWorkerMetricsText());
      return;
    }
    response.writeHead(404, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ error: 'not found' }));
  });

  const shutdown = async (exitCode: number): Promise<void> => {
    server.close();
    await closeDatabaseClient();
    process.exit(exitCode);
  };
  process.once('SIGTERM', () => void shutdown(0));
  process.once('SIGINT', () => void shutdown(0));

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(healthPort, '127.0.0.1', () => resolve());
  });
  const address = server.address();
  const boundPort = typeof address === 'object' && address ? address.port : healthPort;
  writeLine('PIX_READY', { pid: process.pid, port: boundPort, workerId });

  const repository = new DatabasePixProviderEventDeliveryRepository(getPool());
  const consumer = new PixProviderSettlementConsumer(repository, {
    workerId,
    leaseMs,
    allowSyntheticProviders: true,
    onCheckpoint: async (name, context) => {
      if (name !== checkpoint) return;
      writeLine('PIX_CHECKPOINT', { checkpoint: name, ...context, pid: process.pid });
      await waitForever();
    }
  });

  try {
    const result = await consumer.processNext(config.accountId);
    writeLine('PIX_RESULT', { pid: process.pid, result });
    if (exitAfterResult) {
      await shutdown(0);
      return;
    }
    await waitForever();
  } finally {
    if (!exitAfterResult) {
      await closeDatabaseClient();
    }
  }
}

main().catch(async (error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  await closeDatabaseClient().catch(() => undefined);
  process.exitCode = 1;
});
