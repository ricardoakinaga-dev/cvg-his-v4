import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Pool } from 'pg';

import {
  CommercialService,
  DatabaseCommercialRepository
} from '../../../packages/modules/commercial/src/index.ts';
import {
  CommissionsService,
  DatabaseCommissionRepository
} from '../../../packages/modules/commissions/src/index.ts';
import {
  DatabaseMarketingRepository,
  MarketingService,
  type MarketingDispatchGateway
} from '../../../packages/modules/marketing/src/index.ts';
import {
  DatabasePackageRepository,
  PackagesService
} from '../../../packages/modules/packages/src/index.ts';
import {
  DatabaseReportRepository,
  ReportsService
} from '../../../packages/modules/reports/src/index.ts';
import {
  closeDatabaseClient,
  createDatabaseClient
} from '../../../packages/shared/database/src/index.ts';
import type { AccountId, UserId } from '../../../packages/shared/types/src/index.ts';
import { runWithTenantContext } from '../../../packages/tenant-context/src/index.ts';
import { TEST_DB_URL } from '../../setup/env.ts';

const tenantId = randomUUID();
const accountId = randomUUID() as AccountId;
const userId = randomUUID() as UserId;
const ownerId = randomUUID();
const patientId = randomUUID();
const staffId = randomUUID();

function inTenant<T>(operation: () => T): T {
  return runWithTenantContext(
    {
      tenantId,
      accountId,
      userId,
      correlationId: `administrative-persistence-${randomUUID()}`
    },
    operation
  );
}

class SuccessfulMarketingGateway implements MarketingDispatchGateway {
  async send(input: { readonly to: string }) {
    return {
      status: 'sent' as const,
      provider: 'integration-gateway',
      providerMessageId: `integration-${input.to}`,
      sentAt: new Date().toISOString()
    };
  }
}

describe('administrative module PostgreSQL persistence', () => {
  beforeAll(async () => {
    await closeDatabaseClient();
    const admin = new Pool({ connectionString: TEST_DB_URL, max: 1 });
    try {
      await admin.query(
        `INSERT INTO tenants (id, slug, name, status)
         VALUES ($1, $2, 'Administrative persistence tenant', 'active')`,
        [tenantId, `administrative-persistence-${process.pid}`]
      );
      await admin.query(
        `INSERT INTO accounts (id, tenant_id, slug, name)
         VALUES ($1, $2, $3, 'Administrative persistence account')`,
        [accountId, tenantId, `administrative-account-${process.pid}`]
      );
      await admin.query(
        `INSERT INTO users (id, account_id, email, password_hash, full_name)
         VALUES ($1, $2, $3, 'integration-password-hash', 'Administrative User')`,
        [userId, accountId, `administrative-${process.pid}@example.test`]
      );
      await admin.query(
        `INSERT INTO owners (id, account_id, full_name, email)
         VALUES ($1, $2, 'Administrative Owner', $3)`,
        [ownerId, accountId, `owner-${process.pid}@example.test`]
      );
      await admin.query(
        `INSERT INTO patients (id, account_id, owner_id, name, species)
         VALUES ($1, $2, $3, 'Administrative Patient', 'canine')`,
        [patientId, accountId, ownerId]
      );
      await admin.query(
        `INSERT INTO staff (
           id, account_id, user_id, employee_code, full_name, department, job_title, is_active
         ) VALUES ($1, $2, $3, $4, 'Administrative Veterinarian', 'Clínica', 'Veterinária', true)`,
        [staffId, accountId, userId, `STAFF-${process.pid}`]
      );
    } finally {
      await admin.end();
    }

    createDatabaseClient(TEST_DB_URL);
  });

  afterAll(async () => {
    await closeDatabaseClient();
  });

  it('persists commercial loyalty, pricing and POS synchronization state', async () => {
    await inTenant(async () => {
      const repository = new DatabaseCommercialRepository();
      const service = new CommercialService({ repository });
      const program = await service.createLoyaltyProgram(accountId, {
        name: 'Programa PostgreSQL',
        pointsPerReal: 1.5,
        redemptionRules: { minimumPoints: 10 }
      });
      await service.awardPoints(accountId, userId, {
        ownerId,
        programId: program.id,
        points: 150,
        sourceType: 'purchase',
        sourceId: 'integration-sale-1'
      });
      await service.redeemPoints(accountId, userId, {
        ownerId,
        programId: program.id,
        pointsUsed: 50,
        rewardDescription: 'Benefício persistente',
        serviceQuantity: 1
      });

      const table = await service.createPriceTable(accountId, {
        legacyId: 'integration-1',
        description: 'Tabela persistente',
        context: 'Integração PostgreSQL'
      });
      await service.addPriceTableItem(accountId, table.id, {
        itemKind: 'service',
        itemId: 'service-integration',
        price: 125.5
      });
      await service.updatePriceTable(accountId, table.id, {
        description: 'Tabela persistente revisada',
        isActive: true
      });
      const job = await service.runPosSyncJob(accountId, userId, {
        syncKind: 'stock',
        metadata: { source: 'integration-test' }
      });

      const rehydrated = new CommercialService({ repository });
      await rehydrated.hydrateFromDatabase(accountId);
      expect(rehydrated.getLoyaltyBalance(accountId, ownerId)).toMatchObject({
        availablePoints: 100,
        redeemedPoints: 50
      });
      expect(rehydrated.getPriceTableDetail(accountId, table.id).items).toHaveLength(1);
      expect(rehydrated.listPosSyncJobs(accountId)[0]).toMatchObject({
        id: job.id,
        status: 'completed'
      });
    });
  });

  it('persists commission rules, calculations, lines and lifecycle changes', async () => {
    await inTenant(async () => {
      const repository = new DatabaseCommissionRepository();
      const service = new CommissionsService({ repository });
      await service.createRule(accountId, userId, {
        description: 'Regra global persistente',
        itemKind: 'service',
        percentage: 5
      });
      const staffRule = await service.createRule(accountId, userId, {
        description: 'Regra profissional persistente',
        staffId,
        itemKind: 'service',
        percentage: 12
      });
      const calculation = await service.calculate(accountId, userId, {
        periodStart: '2026-08-01',
        periodEnd: '2026-08-31',
        notes: 'Fechamento de integração',
        lines: [
          {
            staffId,
            staffName: 'Administrative Veterinarian',
            department: 'Clínica',
            jobTitle: 'Veterinária',
            itemKind: 'service',
            sourceType: 'manual',
            sourceId: 'commission-source-1',
            sourceDescription: 'Consulta persistente',
            baseAmount: 200,
            occurredAt: '2026-08-10'
          }
        ]
      });
      expect(calculation.lines[0]).toMatchObject({ ruleId: staffRule.id, commissionAmount: 24 });
      await service.review(accountId, calculation.id, userId);
      await service.markPaid(accountId, calculation.id, userId);

      const rehydrated = new CommissionsService({ repository });
      await rehydrated.hydrateFromDatabase(accountId);
      expect(rehydrated.detail(accountId, calculation.id)).toMatchObject({
        status: 'paid',
        totalBaseAmount: 200,
        totalCommissionAmount: 24,
        lines: [expect.objectContaining({ sourceId: 'commission-source-1' })]
      });
    });
  });

  it('persists package activation, consumption and reconstructed balance', async () => {
    await inTenant(async () => {
      const repository = new DatabasePackageRepository();
      const service = new PackagesService({ repository });
      const pkg = await service.create(accountId, userId, {
        ownerId,
        patientId,
        startsAt: '2026-08-01',
        expiresAt: '2026-12-31',
        notes: 'Pacote de integração'
      });
      const item = await service.addItem(accountId, pkg.id, {
        itemKind: 'service',
        catalogItemId: 'service-package-integration',
        nameSnapshot: 'Fisioterapia persistente',
        quantityPurchased: 3,
        unitPrice: 120
      });
      await service.activate(accountId, pkg.id);
      await service.consumeItem(accountId, item.id, userId, {
        quantity: 1,
        consumedAt: '2026-08-12',
        sourceType: 'manual',
        sourceId: 'package-source-1',
        notes: 'Consumo persistente'
      });

      const rehydrated = new PackagesService({ repository });
      await rehydrated.hydrateFromDatabase(accountId);
      expect(rehydrated.detail(accountId, pkg.id)).toMatchObject({
        status: 'active',
        balance: [expect.objectContaining({ quantityConsumed: 1, quantityAvailable: 2 })],
        consumptions: [expect.objectContaining({ sourceId: 'package-source-1' })]
      });
    });
  });

  it('persists report execution, export, schedule and delivery history', async () => {
    await inTenant(async () => {
      const repository = new DatabaseReportRepository();
      const service = new ReportsService({ repository });
      const execution = await service.execute(accountId, userId, {
        reportId: 'administrative-executive',
        filters: { dateFrom: '2026-08-01' },
        rows: [
          { domain: 'financial', metric: 'Receita', value: 250, status: 'tracked' }
        ]
      });
      await service.exportExecution(accountId, userId, execution.id, 'csv');
      const schedule = await service.createSchedule(accountId, userId, {
        reportId: execution.reportId,
        name: 'Relatório persistente diário',
        frequency: 'daily',
        format: 'csv',
        recipients: ['financeiro@example.test']
      });
      await service.recordScheduleExecution(accountId, schedule.id, {
        executionId: execution.id,
        ranAt: schedule.nextRunAt
      });
      await service.recordScheduleDeliveries(accountId, schedule.id, {
        executionId: execution.id,
        format: 'csv',
        recipients: schedule.recipients,
        status: 'sent',
        deliveredAt: schedule.nextRunAt
      });

      const rehydrated = new ReportsService({ repository });
      await rehydrated.hydrateFromDatabase(accountId);
      expect(rehydrated.getExecution(accountId, execution.id)).toMatchObject({ rowCount: 1 });
      expect(rehydrated.listSchedules(accountId)).toContainEqual(
        expect.objectContaining({ id: schedule.id, lastExecutionId: execution.id })
      );
      expect(rehydrated.listScheduleDeliveries(accountId, schedule.id)).toHaveLength(1);
    });
  });

  it('persists marketing planning and delivery provider evidence', async () => {
    await inTenant(async () => {
      const repository = new DatabaseMarketingRepository();
      const service = new MarketingService({ repository });
      const segment = await service.createSegment(accountId, userId, {
        name: 'Consentimento persistente',
        criteria: { consentPurpose: 'marketing', patientSpecies: ['canine'] }
      });
      const template = await service.createTemplate(accountId, userId, {
        name: 'Template persistente',
        channel: 'email',
        subject: 'Olá {{ownerName}}',
        body: 'Retorno de {{patientName}}'
      });
      const campaign = await service.createCampaign(accountId, userId, {
        name: 'Campanha persistente',
        channel: 'email',
        segmentId: segment.id,
        templateId: template.id,
        scheduledAt: '2026-08-12T15:00:00.000Z'
      });
      await service.scheduleCampaign(accountId, userId, campaign.id);
      const dispatched = await service.dispatchCampaign(accountId, userId, campaign.id, {
        gateway: new SuccessfulMarketingGateway(),
        audience: [
          {
            ownerId,
            ownerName: 'Administrative Owner',
            patientId,
            patientName: 'Administrative Patient',
            patientSpecies: 'canine',
            consentPurposes: ['marketing'],
            contacts: [{ type: 'email', value: 'owner@example.test' }]
          }
        ]
      });
      expect(dispatched.summary).toMatchObject({ total: 1, sent: 1, failed: 0 });

      const rehydrated = new MarketingService({ repository });
      await rehydrated.hydrateFromDatabase(accountId);
      expect(rehydrated.listCampaigns(accountId)).toContainEqual(
        expect.objectContaining({ id: campaign.id, status: 'sent' })
      );
      expect(rehydrated.listDeliveries(accountId, campaign.id)).toContainEqual(
        expect.objectContaining({ provider: 'integration-gateway', status: 'sent' })
      );
    });
  });
});
