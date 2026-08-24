import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  DatabaseMarketingRepository,
  DeterministicMarketingSandboxGateway,
  MarketingService,
  type MarketingDispatchGateway
} from '../../../packages/modules/marketing/src/index.js';
import {
  createDatabaseClient,
  getPool,
  runInTenantTransactionContext
} from '../../../packages/shared/database/src/index.js';
import type { AccountId, UserId } from '../../../packages/shared/types/src/index.js';
import { runWithTenantContext } from '../../../packages/tenant-context/src/index.js';
import { getTestPool } from '../../db/db-admin.js';
import { TEST_DB_URL } from '../../setup/env.js';

const TENANT_ID = randomUUID();
const ACCOUNT_A = randomUUID() as AccountId;
const ACCOUNT_B = randomUUID() as AccountId;
const USER_A = randomUUID() as UserId;
const USER_B = randomUUID() as UserId;
const OWNER_A = randomUUID();
const OWNER_B = randomUUID();

describe('marketing delivery guarantees on PostgreSQL', () => {
  const pool = getTestPool();

  async function command<T>(
    accountId: AccountId,
    userId: UserId,
    operation: () => Promise<T> | T
  ): Promise<T> {
    const correlationId = `marketing-guarantees-${randomUUID()}`;
    return runWithTenantContext(
      { tenantId: TENANT_ID, accountId, correlationId },
      () => runInTenantTransactionContext(
        getPool(),
        { accountId, actorUserId: userId, correlationId },
        async () => operation()
      )
    );
  }

  beforeAll(async () => {
    createDatabaseClient(TEST_DB_URL);
    await pool.query(
      `INSERT INTO tenants (id, slug, name, status, activated_at)
       VALUES ($1, $2, 'Marketing guarantees tenant', 'active', now())`,
      [TENANT_ID, `marketing-guarantees-${TENANT_ID.slice(0, 12)}`]
    );
    await pool.query(
      `INSERT INTO accounts (id, tenant_id, slug, name, is_active)
       VALUES ($1, $3, $4, 'Marketing account A', true),
              ($2, $3, $5, 'Marketing account B', true)`,
      [
        ACCOUNT_A,
        ACCOUNT_B,
        TENANT_ID,
        `marketing-a-${ACCOUNT_A.slice(0, 12)}`,
        `marketing-b-${ACCOUNT_B.slice(0, 12)}`
      ]
    );
    await pool.query(
      `INSERT INTO users (id, account_id, username, email, password_hash, full_name)
       VALUES ($1, $3, $4, $5, 'marketing-test-hash', 'Marketing operator A'),
              ($2, $3, $6, $7, 'marketing-test-hash', 'Marketing operator B')`,
      [
        USER_A,
        USER_B,
        ACCOUNT_A,
        `marketing-a-${USER_A}`,
        `marketing-a-${USER_A}@example.test`,
        `marketing-b-${USER_B}`,
        `marketing-b-${USER_B}@example.test`
      ]
    );
  });

  afterAll(async () => {
    await pool.query('DELETE FROM accounts WHERE id IN ($1, $2)', [ACCOUNT_A, ACCOUNT_B]);
    await pool.query('DELETE FROM tenants WHERE id = $1', [TENANT_ID]);
  });

  it('persists opt-out, blocks dispatch, deduplicates delivery, retries and keeps tenants isolated', async () => {
    const repository = new DatabaseMarketingRepository();
    let now = new Date('2026-08-07T12:00:00.000Z');
    const service = new MarketingService({
      repository,
      clock: () => new Date(now),
      retryBaseDelayMs: 1_000,
      retryMaxDelayMs: 4_000
    });

    const optOut = await command(ACCOUNT_A, USER_A, () =>
      service.setConsent(ACCOUNT_A, USER_A, OWNER_A, 'revoked')
    );
    expect(optOut.status).toBe('revoked');
    const persistedOptOut = await pool.query(
      `SELECT status, subject_id, account_id
         FROM consent_records
        WHERE account_id = $1 AND subject_id = $2::uuid
          AND subject_type = 'owner' AND purpose = 'marketing'`,
      [ACCOUNT_A, OWNER_A]
    );
    expect(persistedOptOut.rows).toEqual([
      { status: 'revoked', subject_id: OWNER_A, account_id: ACCOUNT_A }
    ]);

    const segment = await command(ACCOUNT_A, USER_A, () => service.createSegment(ACCOUNT_A, USER_A, {
      name: 'Marketing consentido',
      criteria: { consentPurpose: 'marketing' }
    }));
    const template = await command(ACCOUNT_A, USER_A, () => service.createTemplate(ACCOUNT_A, USER_A, {
      name: 'Marketing SMS',
      channel: 'sms',
      body: 'Mensagem {{ownerName}}'
    }));
    const blockedCampaign = await command(ACCOUNT_A, USER_A, () => service.createCampaign(ACCOUNT_A, USER_A, {
      name: 'Bloqueada por opt-out',
      channel: 'sms',
      segmentId: segment.id,
      templateId: template.id,
      scheduledAt: now.toISOString()
    }));
    await command(ACCOUNT_A, USER_A, () => service.scheduleCampaign(ACCOUNT_A, USER_A, blockedCampaign.id));
    const blocked = await command(ACCOUNT_A, USER_A, () => service.dispatchCampaign(
      ACCOUNT_A,
      USER_A,
      blockedCampaign.id,
      {
        audience: [{
          ownerId: OWNER_A,
          ownerName: 'Opt-out',
          consentPurposes: ['marketing'],
          contacts: [{ type: 'sms', value: '5511999999999' }]
        }],
        gateway: new DeterministicMarketingSandboxGateway({ clock: () => new Date(now) })
      }
    ));
    expect(blocked.summary).toEqual({ total: 0, sent: 0, failed: 0, skipped: 1 });
    expect(await command(ACCOUNT_A, USER_A, () => repository.findDeliveries(ACCOUNT_A))).toHaveLength(0);

    await command(ACCOUNT_A, USER_A, () => service.setConsent(ACCOUNT_A, USER_A, OWNER_A, 'granted'));
    await command(ACCOUNT_A, USER_A, () => service.setConsent(ACCOUNT_A, USER_A, OWNER_B, 'granted'));
    const campaign = await command(ACCOUNT_A, USER_A, () => service.createCampaign(ACCOUNT_A, USER_A, {
      name: 'Idempotência e retry',
      channel: 'sms',
      segmentId: segment.id,
      templateId: template.id,
      scheduledAt: now.toISOString()
    }));
    await command(ACCOUNT_A, USER_A, () => service.scheduleCampaign(ACCOUNT_A, USER_A, campaign.id));

    const memberA = {
      ownerId: OWNER_A,
      ownerName: 'Permitido',
      consentPurposes: ['marketing'] as const,
      contacts: [{ type: 'sms' as const, value: '5511999999999' }]
    };
    const memberB = {
      ownerId: OWNER_B,
      ownerName: 'Falha determinística',
      consentPurposes: ['marketing'] as const,
      contacts: [{ type: 'sms' as const, value: '5511000000000' }]
    };
    const dispatched = await command(ACCOUNT_A, USER_A, () => service.dispatchCampaign(
      ACCOUNT_A,
      USER_A,
      campaign.id,
      {
        audience: [memberA, memberA, memberB],
        gateway: new DeterministicMarketingSandboxGateway({ clock: () => new Date(now) })
      }
    ));
    expect(dispatched.summary).toEqual({ total: 2, sent: 1, failed: 1, skipped: 1 });
    const failed = dispatched.deliveries.find((delivery) => delivery.status === 'failed');
    expect(failed).toMatchObject({
      provider: 'marketing-sandbox',
      attemptCount: 1,
      nextAttemptAt: '2026-08-07T12:00:01.000Z'
    });
    expect(new Set(dispatched.deliveries.map((delivery) => delivery.deliveryKey)).size).toBe(2);

    now = new Date('2026-08-07T12:00:01.000Z');
    const successfulRetryGateway: MarketingDispatchGateway = {
      async send(input) {
        return {
          status: 'sent',
          provider: 'marketing-reprocess-test',
          providerMessageId: `reprocessed-${input.idempotencyKey}`,
          sentAt: now.toISOString()
        };
      }
    };
    const retried = await command(ACCOUNT_A, USER_A, () => service.retryDelivery(
      ACCOUNT_A,
      USER_A,
      failed!.id,
      successfulRetryGateway
    ));
    expect(retried).toMatchObject({
      status: 'sent',
      attemptCount: 2,
      deliveryKey: failed!.deliveryKey,
      nextAttemptAt: undefined
    });

    const persistedDeliveries = await command(ACCOUNT_A, USER_A, () => repository.findDeliveries(ACCOUNT_A, campaign.id));
    expect(persistedDeliveries).toHaveLength(2);
    expect(persistedDeliveries.every((delivery) => delivery.status === 'sent')).toBe(true);
    const persistedFailedRetry = persistedDeliveries.find((delivery) => delivery.id === failed!.id);
    expect(persistedFailedRetry?.attemptCount).toBe(2);

    const foreignRepository = new DatabaseMarketingRepository();
    await expect(command(ACCOUNT_B, USER_B, () => foreignRepository.findDeliveries(ACCOUNT_B))).resolves.toEqual([]);
    await expect(
      command(ACCOUNT_B, USER_B, () => foreignRepository.findDeliveryByKey(ACCOUNT_B, failed!.deliveryKey))
    ).resolves.toBeNull();
  });
});
