import assert from 'node:assert/strict';
import { test } from 'vitest';

import type { AccountId, UserId } from '@cvg-his-v2/shared-types';

import {
  MarketingService,
  type MarketingCampaignSummary,
  type MarketingDispatchGateway,
  type MarketingRepository,
  type MarketingCampaignDeliverySummary,
  type MarketingSegmentSummary,
  type MarketingTemplateSummary
} from './index.js';

const ACCOUNT = 'acc-marketing-test' as AccountId;
const OTHER_ACCOUNT = 'acc-marketing-other' as AccountId;
const USER = 'user-marketing-test' as UserId;

test('MarketingService creates segments, templates and schedules campaigns with audience totals', async () => {
  const service = new MarketingService();

  const segment = await service.createSegment(ACCOUNT, USER, {
    name: 'Tutores com consentimento',
    description: 'Clientes elegiveis para relacionamento',
    criteria: {
      ownerGroups: ['VIP'],
      consentPurpose: 'marketing',
      patientSpecies: ['Canina']
    }
  });

  const template = await service.createTemplate(ACCOUNT, USER, {
    name: 'Vacina anual',
    channel: 'sms',
    subject: 'Vacina anual',
    body: 'Ola {{ownerName}}, a vacina de {{patientName}} esta chegando.'
  });

  const campaign = await service.createCampaign(ACCOUNT, USER, {
    name: 'Campanha Vacina Maio',
    channel: 'sms',
    segmentId: segment.id,
    templateId: template.id,
    scheduledAt: '2026-05-30T12:00:00.000Z',
    audience: [
      {
        ownerId: 'owner-1',
        ownerName: 'Maria Silva',
        ownerGroup: 'VIP',
        consentPurposes: ['marketing'],
        patientId: 'patient-1',
        patientName: 'Thor',
        patientSpecies: 'Canina',
        contacts: [{ type: 'sms', value: '5511999999999' }]
      },
      {
        ownerId: 'owner-2',
        ownerName: 'Joao Souza',
        ownerGroup: 'Geral',
        consentPurposes: ['marketing'],
        patientId: 'patient-2',
        patientName: 'Mia',
        patientSpecies: 'Felina',
        contacts: [{ type: 'sms', value: '5511888888888' }]
      }
    ]
  });

  assert.equal(campaign.status, 'draft');
  assert.equal(campaign.estimatedAudience, 1);

  const scheduled = await service.scheduleCampaign(ACCOUNT, USER, campaign.id);
  assert.equal(scheduled.status, 'scheduled');
  assert.equal(scheduled.scheduledByUserId, USER);
  assert.equal(scheduled.estimatedAudience, 1);

  assert.equal(service.listCampaigns(ACCOUNT)[0]?.id, campaign.id);
  assert.equal(service.listCampaigns(OTHER_ACCOUNT).length, 0);
});

test('MarketingService persists and hydrates marketing planning entities through repository contract', async () => {
  const repository = new InMemoryMarketingRepository();
  const service = new MarketingService({ repository });

  const segment = await service.createSegment(ACCOUNT, USER, {
    name: 'Preventivo',
    criteria: { consentPurpose: 'preventive' }
  });
  const template = await service.createTemplate(ACCOUNT, USER, {
    name: 'Lembrete WhatsApp',
    channel: 'whatsapp',
    body: 'Ola {{ownerName}}, lembrete preventivo.'
  });
  const campaign = await service.createCampaign(ACCOUNT, USER, {
    name: 'Preventivo WhatsApp',
    channel: 'whatsapp',
    segmentId: segment.id,
    templateId: template.id,
    scheduledAt: '2026-06-01T09:00:00.000Z'
  });
  await service.scheduleCampaign(ACCOUNT, USER, campaign.id);

  const rehydrated = new MarketingService({ repository });
  await rehydrated.hydrateFromDatabase(ACCOUNT);

  assert.equal(rehydrated.listSegments(ACCOUNT)[0]?.name, 'Preventivo');
  assert.equal(rehydrated.listTemplates(ACCOUNT)[0]?.name, 'Lembrete WhatsApp');
  assert.equal(rehydrated.listCampaigns(ACCOUNT)[0]?.status, 'scheduled');
});

test('MarketingService dispatches scheduled campaigns and records delivery outcomes', async () => {
  const service = new MarketingService();
  const segment = await service.createSegment(ACCOUNT, USER, {
    name: 'Marketing com consentimento',
    criteria: { consentPurpose: 'marketing' }
  });
  const template = await service.createTemplate(ACCOUNT, USER, {
    name: 'Retorno SMS',
    channel: 'sms',
    body: 'Ola {{ownerName}}, retorno de {{patientName}}.'
  });
  const campaign = await service.createCampaign(ACCOUNT, USER, {
    name: 'Retorno',
    channel: 'sms',
    segmentId: segment.id,
    templateId: template.id,
    scheduledAt: '2026-06-01T09:00:00.000Z'
  });
  await service.scheduleCampaign(ACCOUNT, USER, campaign.id);

  const result = await service.dispatchCampaign(ACCOUNT, USER, campaign.id, {
    gateway: new FakeMarketingGateway(),
    audience: [
      {
        ownerId: 'owner-1',
        ownerName: 'Maria',
        consentPurposes: ['marketing'],
        patientId: 'patient-1',
        patientName: 'Thor',
        contacts: [{ type: 'sms', value: '5511999999999' }]
      },
      {
        ownerId: 'owner-2',
        ownerName: 'Joao',
        consentPurposes: ['marketing'],
        patientId: 'patient-2',
        patientName: 'Mia',
        contacts: [{ type: 'sms', value: '5511000000000' }]
      },
      {
        ownerId: 'owner-3',
        ownerName: 'Ana',
        consentPurposes: ['transactional'],
        contacts: [{ type: 'sms', value: '5511777777777' }]
      }
    ]
  });

  assert.equal(result.campaign.status, 'sent');
  assert.equal(result.summary.total, 2);
  assert.equal(result.summary.sent, 1);
  assert.equal(result.summary.failed, 1);
  assert.equal(result.summary.skipped, 1);
  assert.equal(result.deliveries[0]?.body, 'Ola Maria, retorno de Thor.');
  assert.equal(service.listDeliveries(ACCOUNT, campaign.id).length, 2);
});

class InMemoryMarketingRepository implements MarketingRepository {
  readonly #segments = new Map<string, MarketingSegmentSummary>();
  readonly #templates = new Map<string, MarketingTemplateSummary>();
  readonly #campaigns = new Map<string, MarketingCampaignSummary>();
  readonly #deliveries = new Map<string, MarketingCampaignDeliverySummary>();

  async saveSegment(segment: MarketingSegmentSummary): Promise<void> {
    this.#segments.set(segment.id, segment);
  }

  async saveTemplate(template: MarketingTemplateSummary): Promise<void> {
    this.#templates.set(template.id, template);
  }

  async saveCampaign(campaign: MarketingCampaignSummary): Promise<void> {
    this.#campaigns.set(campaign.id, campaign);
  }

  async saveDelivery(delivery: MarketingCampaignDeliverySummary): Promise<void> {
    this.#deliveries.set(delivery.id, delivery);
  }

  async findSegments(accountId: AccountId): Promise<readonly MarketingSegmentSummary[]> {
    return [...this.#segments.values()].filter((segment) => segment.accountId === accountId);
  }

  async findTemplates(accountId: AccountId): Promise<readonly MarketingTemplateSummary[]> {
    return [...this.#templates.values()].filter((template) => template.accountId === accountId);
  }

  async findCampaigns(accountId: AccountId): Promise<readonly MarketingCampaignSummary[]> {
    return [...this.#campaigns.values()].filter((campaign) => campaign.accountId === accountId);
  }

  async findDeliveries(
    accountId: AccountId,
    campaignId?: string
  ): Promise<readonly MarketingCampaignDeliverySummary[]> {
    return [...this.#deliveries.values()].filter(
      (delivery) => delivery.accountId === accountId && (!campaignId || delivery.campaignId === campaignId)
    );
  }
}

class FakeMarketingGateway implements MarketingDispatchGateway {
  async send(input: { readonly to: string }): Promise<{
    readonly status: 'sent' | 'failed';
    readonly provider: string;
    readonly providerMessageId?: string;
    readonly failureReason?: string;
    readonly sentAt: string;
  }> {
    const sentAt = new Date().toISOString();
    if (input.to.includes('0000')) {
      return {
        status: 'failed',
        provider: 'fake',
        failureReason: 'simulated failure',
        sentAt
      };
    }
    return {
      status: 'sent',
      provider: 'fake',
      providerMessageId: `fake-${input.to}`,
      sentAt
    };
  }
}
