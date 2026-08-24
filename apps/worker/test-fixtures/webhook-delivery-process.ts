import { createInterface } from 'node:readline';

import { WebhooksService } from '@cvg-his-v2/module-webhooks';
import { createDatabaseClient, getDatabaseClient, getPool, closeDatabaseClient } from '@cvg-his-v2/shared-database';
import { runWithTenantContext } from '@cvg-his-v2/tenant-context';
import { DatabaseWebhookRepository } from '@cvg-his-v2/module-webhooks';

const databaseUrl = process.env.DATABASE_URL;
const accountId = process.env.WEBHOOK_PROCESS_ACCOUNT_ID;
const workerId = process.env.WEBHOOK_PROCESS_WORKER_ID;
const receiverUrl = process.env.WEBHOOK_PROCESS_RECEIVER_URL;
const leaseMs = Number(process.env.WEBHOOK_PROCESS_LEASE_MS ?? 1_500);
const waitForRelease = process.env.WEBHOOK_PROCESS_WAIT_FOR_RELEASE === '1';
const waitBeforeComplete = process.env.WEBHOOK_PROCESS_WAIT_BEFORE_COMPLETE === '1';

function emit(event: string, payload: Record<string, unknown>): void {
  process.stdout.write(`${event} ${JSON.stringify(payload)}\n`);
}

async function main(): Promise<void> {
  if (!databaseUrl || !accountId || !workerId || !receiverUrl) {
    throw new Error('Webhook process fixture requires DATABASE_URL, account, worker id and receiver URL');
  }

  createDatabaseClient(databaseUrl);
  const currentUser = await getPool().query<{ readonly current_user: string }>('SELECT current_user');
  emit('WEBHOOK_READY', { databaseUser: currentUser.rows[0]?.current_user ?? null });

  const control = createInterface({ input: process.stdin });
  const release = waitForRelease
    ? new Promise<void>((resolve) => {
        control.on('line', (line) => {
          if (line.trim() === 'WEBHOOK_RELEASE') resolve();
      });
      })
    : Promise.resolve();
  const completeRelease = waitBeforeComplete
    ? new Promise<void>((resolve) => {
        control.on('line', (line) => {
          if (line.trim() === 'WEBHOOK_RELEASE_COMPLETE') resolve();
        });
      })
    : Promise.resolve();

  const databaseRepository = new DatabaseWebhookRepository(getDatabaseClient());
  const repository = new Proxy(databaseRepository, {
    get(target, property, receiver) {
      if (property === 'completeClaim' && waitBeforeComplete) {
        return async (...args: Parameters<DatabaseWebhookRepository['completeClaim']>) => {
          emit('WEBHOOK_BEFORE_COMPLETE', { workerId });
          await completeRelease;
          return target.completeClaim(...args);
        };
      }
      const value = Reflect.get(target, property, receiver);
      return typeof value === 'function' ? value.bind(target) : value;
    }
  });
  const service = new WebhooksService({
    repository: repository as DatabaseWebhookRepository,
    resolveHostname: async () => ['1.1.1.1'],
    deliverRequest: async (request) => {
      emit('WEBHOOK_ATTEMPT', { workerId });
      const response = await fetch(receiverUrl, {
        method: 'POST',
        headers: request.headers,
        body: request.body,
        signal: AbortSignal.timeout(request.timeoutMs)
      });
      const responseBody = await response.text();
      await release;
      emit('WEBHOOK_PROVIDER_ACCEPTED', {
        workerId,
        statusCode: response.status,
        idempotencyKey: request.headers['Idempotency-Key'] ?? null
      });
      return { success: response.ok, statusCode: response.status, body: responseBody };
    }
  });

  const result = await runWithTenantContext(
    { tenantId: accountId, accountId, correlationId: `webhook-process-${process.pid}` },
    () =>
      service.processPendingDeliveries(accountId as never, {
        workerId,
        leaseMs,
        limit: 1
      })
  );
  emit('WEBHOOK_RESULT', { result });
  control.close();
  await closeDatabaseClient();
}

main().catch(async (error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  await closeDatabaseClient().catch(() => undefined);
  process.exitCode = 1;
});
