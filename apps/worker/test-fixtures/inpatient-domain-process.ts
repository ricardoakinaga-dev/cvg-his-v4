import { writeSync } from 'node:fs';

import { closeDatabaseClient, createDatabaseClient, getPool } from '@cvg-his-v2/shared-database';
import { DatabaseOutboxRepository } from '@cvg-his-v2/module-event-bus';
import { runWithTenantContext } from '@cvg-his-v2/tenant-context';

const processFixtureEnabled = process.env.DOMAIN_PROCESS_FIXTURE === '1';
const databaseUrl = process.env.DATABASE_URL?.trim();
const accountId = process.env.DOMAIN_ACCOUNT_ID?.trim();
const tenantId = process.env.DOMAIN_TENANT_ID?.trim();
const eventId = process.env.DOMAIN_OUTBOX_EVENT_ID?.trim();
const apiUrl = process.env.DOMAIN_API_URL?.trim();
const accessToken = process.env.DOMAIN_ACCESS_TOKEN?.trim();
const workerId = process.env.DOMAIN_WORKER_ID?.trim() || `domain-process-${process.pid}`;
const checkpoint = process.env.DOMAIN_CHECKPOINT?.trim();
const leaseMs = Number(process.env.DOMAIN_LEASE_MS ?? '1000');
const pauseUntilSignal = process.env.DOMAIN_PAUSE_UNTIL_SIGNAL === '1';
const exitAfterResult = process.env.DOMAIN_EXIT_AFTER_RESULT === '1';

interface DomainPayload {
  readonly accountId?: string;
  readonly encounterId?: string;
  readonly inventoryItemId?: string;
  readonly sourceEntityId?: string;
  readonly quantity?: number;
  readonly idempotencyKey?: string;
}

function writeEvent(event: string, payload: Record<string, unknown> = {}): void {
  writeSync(3, `${event} ${JSON.stringify(payload)}\n`);
}

function waitForever(): Promise<void> {
  return new Promise(() => undefined);
}

function waitForResumeSignal(): Promise<void> {
  return new Promise((resolve) => {
    const resume = (): void => {
      process.off('SIGUSR2', resume);
      resolve();
    };
    process.on('SIGUSR2', resume);
  });
}

function waitAtCheckpoint(): Promise<void> {
  return pauseUntilSignal ? waitForResumeSignal() : waitForever();
}

function validateConfig(): void {
  if (process.env.NODE_ENV !== 'test' || !processFixtureEnabled) {
    throw new Error(
      'inpatient domain process fixture requires NODE_ENV=test and DOMAIN_PROCESS_FIXTURE=1'
    );
  }
  if (!databaseUrl || !accountId || !tenantId || !eventId || !apiUrl || !accessToken) {
    throw new Error('inpatient domain process fixture has incomplete configuration');
  }
  if (!Number.isSafeInteger(leaseMs) || leaseMs < 1_000 || leaseMs > 60_000) {
    throw new Error('inpatient domain process lease must be between 1000 and 60000 milliseconds');
  }
  if (
    checkpoint !== '' &&
    checkpoint !== undefined &&
    checkpoint !== 'after_claim' &&
    checkpoint !== 'after_domain_command_before_cas'
  ) {
    throw new Error(`unknown inpatient domain process checkpoint: ${checkpoint}`);
  }
}

async function requestInventoryConsumption(payload: DomainPayload): Promise<{
  readonly status: number;
  readonly body: unknown;
}> {
  if (
    payload.accountId !== accountId ||
    !payload.encounterId ||
    !payload.inventoryItemId ||
    !payload.sourceEntityId ||
    !Number.isFinite(payload.quantity) ||
    !payload.idempotencyKey
  ) {
    throw new Error('inpatient domain event payload is incomplete or cross-account');
  }
  const response = await fetch(`${apiUrl}/inventory/consumptions`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'x-tenant-id': tenantId as string,
      'x-account-id': accountId as string,
      'content-type': 'application/json',
      'idempotency-key': payload.idempotencyKey
    },
    body: JSON.stringify({
      encounterId: payload.encounterId,
      inventoryItemId: payload.inventoryItemId,
      quantity: payload.quantity,
      sourceEntityType: 'inpatient_stay',
      sourceEntityId: payload.sourceEntityId
    })
  });
  const text = await response.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text) as unknown;
    } catch {
      body = text;
    }
  }
  if (response.status !== 201) {
    throw new Error(`inpatient inventory command failed with HTTP ${response.status}: ${text}`);
  }
  return { status: response.status, body };
}

async function main(): Promise<void> {
  validateConfig();
  createDatabaseClient(databaseUrl as string);
  await getPool().query('SELECT 1');
  const identity = await getPool().query<{
    readonly current_user: string;
    readonly rolsuper: boolean;
    readonly rolbypassrls: boolean;
  }>(
    `SELECT current_user, rolsuper, rolbypassrls
       FROM pg_roles WHERE rolname = current_user`
  );
  const runtimeIdentity = identity.rows[0];
  writeEvent('DOMAIN_READY', {
    pid: process.pid,
    workerId,
    currentUser: runtimeIdentity?.current_user,
    rolsuper: runtimeIdentity?.rolsuper,
    rolbypassrls: runtimeIdentity?.rolbypassrls
  });

  const repository = new DatabaseOutboxRepository();
  const context = {
    tenantId: tenantId as string,
    accountId: accountId as string,
    correlationId: `domain-process-${process.pid}-${eventId}`
  };

  await runWithTenantContext(context, async () => {
    const [claim] = await repository.claimPending({
      limit: 1,
      leaseOwner: workerId,
      leaseMs
    });
    if (!claim) {
      writeEvent('DOMAIN_RESULT', { pid: process.pid, status: 'idle', outboxCompletion: false });
      return;
    }
    if (claim.event.id !== eventId) {
      throw new Error(`claimed unexpected event ${claim.event.id}; expected ${eventId}`);
    }
    writeEvent('DOMAIN_CHECKPOINT', {
      pid: process.pid,
      checkpoint: checkpoint || 'after_claim',
      eventId: claim.event.id,
      leaseVersion: claim.leaseVersion
    });
    if (checkpoint === 'after_claim') await waitAtCheckpoint();

    const commandResult = await requestInventoryConsumption(claim.event.payload as DomainPayload);
    writeEvent('DOMAIN_COMMAND_RESULT', {
      pid: process.pid,
      httpStatus: commandResult.status,
      body: commandResult.body
    });
    if (checkpoint === 'after_domain_command_before_cas') await waitAtCheckpoint();

    const outboxCompletion = await repository.completeClaim(claim, new Date().toISOString());
    writeEvent('DOMAIN_RESULT', {
      pid: process.pid,
      httpStatus: commandResult.status,
      body: commandResult.body,
      outboxCompletion,
      leaseLost: !outboxCompletion
    });
  });

  if (exitAfterResult) {
    await closeDatabaseClient();
    process.exit(0);
  }
  await waitForever();
}

process.once('SIGTERM', () => {
  void closeDatabaseClient().finally(() => process.exit(0));
});

main().catch(async (error) => {
  process.stderr.write(
    `${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`
  );
  await closeDatabaseClient().catch(() => undefined);
  process.exitCode = 1;
});
