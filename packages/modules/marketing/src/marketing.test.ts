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
  type MarketingTemplateSummary,
  type MarketingSettingSummary
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

test('MarketingService persists tenant-scoped automation settings without mutating prior values', async () => {
  const service = new MarketingService();
  const accountId = ACCOUNT;
  const userId = USER;

  const saved = await service.saveSetting(accountId, userId, {
    key: 'sms_automations',
    channel: 'sms',
    values: {
      agenda: true,
      animalBirthday: false,
      clientBirthday: true
    }
  });

  assert.deepEqual(saved.values, { agenda: true, animalBirthday: false, clientBirthday: true });
  const reloaded = await service.getSetting(accountId, 'sms_automations');
  assert.deepEqual(reloaded, saved);

  const updated = await service.saveSetting(accountId, userId, {
    key: 'sms_automations',
    channel: 'sms',
    values: { ...saved.values, agenda: false }
  });
  assert.equal(updated.values.agenda, false);
  assert.equal(saved.values.agenda, true);
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

test('MarketingService retries a failed delivery and preserves attempt history', async () => {
  const service = new MarketingService();
  const segment = await service.createSegment(ACCOUNT, USER, {
    name: 'Retry consentido',
    criteria: { consentPurpose: 'marketing' }
  });
  const template = await service.createTemplate(ACCOUNT, USER, {
    name: 'Retry SMS',
    channel: 'sms',
    body: 'Mensagem para {{ownerName}}'
  });
  const campaign = await service.createCampaign(ACCOUNT, USER, {
    name: 'Retry campaign',
    channel: 'sms',
    segmentId: segment.id,
    templateId: template.id,
    scheduledAt: '2026-06-01T09:00:00.000Z'
  });
  await service.scheduleCampaign(ACCOUNT, USER, campaign.id);
  const failed = await service.dispatchCampaign(ACCOUNT, USER, campaign.id, {
    audience: [{
      ownerId: 'owner-retry',
      ownerName: 'Maria',
      consentPurposes: ['marketing'],
      contacts: [{ type: 'sms', value: '5511000000000' }]
    }],
    gateway: new FakeMarketingGateway()
  });
  const failedDelivery = failed.deliveries[0];
  assert.ok(failedDelivery);
  assert.equal(failedDelivery.status, 'failed');
  assert.equal(failedDelivery.attemptCount, 1);

  const retried = await service.retryDelivery(ACCOUNT, USER, failedDelivery.id, {
    async send(input) {
      return {
        status: 'sent',
        provider: 'retry-provider',
        providerMessageId: `retry-${input.to}`,
        sentAt: '2026-06-01T09:05:00.000Z'
      };
    }
  });
  assert.equal(retried.status, 'sent');
  assert.equal(retried.attemptCount, 2);
  assert.equal(retried.provider, 'retry-provider');
});

test('MarketingService covers validation, durable consent and retry outcomes', async () => {
  const emptyService = new MarketingService();
  await emptyService.hydrateFromDatabase(ACCOUNT);
  assert.equal(emptyService.persistenceMode, 'in-memory');

  await assert.rejects(
    () => emptyService.createTemplate(ACCOUNT, USER, {
      name: 'SMS invalido',
      channel: 'sms',
      body: 'x'.repeat(161)
    }),
    /at most 160/
  );

  const repository = new InMemoryMarketingRepository();
  const consent = new Map<string, boolean>([
    ['owner-denied', true],
    ['owner-allowed', true]
  ]);
  const service = new MarketingService({
    repository,
    requireConsentChecker: true,
    consentChecker: {
      async hasActiveConsent(_accountId, ownerId) {
        return consent.get(ownerId) ?? false;
      }
    }
  });

  await assert.rejects(
    () => service.saveSetting(ACCOUNT, USER, {
      key: 'vaccine_email',
      channel: 'sms',
      values: {}
    }),
    /channel does not match/
  );
  await assert.rejects(
    () => service.saveSetting(ACCOUNT, USER, {
      key: 'sms_automations',
      channel: 'sms',
      values: { '   ': true }
    }),
    /keys must be non-empty/
  );
  await assert.rejects(
    () => service.saveSetting(ACCOUNT, USER, {
      key: 'sms_automations',
      channel: 'sms',
      values: { invalid: 1 as never }
    }),
    /values must be booleans or strings/
  );
  await assert.rejects(
    () => service.saveSetting(ACCOUNT, USER, {
      key: 'sms_automations',
      channel: 'sms',
      values: { invalid: 'x'.repeat(5001) }
    }),
    /text values must be at most 5000/
  );

  const setting = await service.saveSetting(ACCOUNT, USER, {
    key: 'vaccine_email',
    channel: 'email',
    values: { enabled: true, subject: '  Vacina  ' }
  });
  assert.equal(setting.values.subject, 'Vacina');
  assert.equal(await service.getSetting(ACCOUNT, 'vaccine_email'), setting);

  const hydrated = new MarketingService({ repository });
  assert.equal((await hydrated.getSetting(ACCOUNT, 'vaccine_email'))?.values.enabled, true);
  assert.equal(await hydrated.getSetting(ACCOUNT, 'sms_automations'), null);

  const segment = await service.createSegment(ACCOUNT, USER, {
    name: 'Consentimento',
    criteria: { consentPurpose: 'marketing' }
  });
  const smsTemplate = await service.createTemplate(ACCOUNT, USER, {
    name: 'SMS',
    channel: 'sms',
    body: 'Ola {{ownerName}}'
  });
  await assert.rejects(
    () => service.createCampaign(ACCOUNT, USER, {
      name: 'Canal divergente',
      channel: 'email',
      segmentId: segment.id,
      templateId: smsTemplate.id
    }),
    /must match template/
  );
  const campaignWithoutDate = await service.createCampaign(ACCOUNT, USER, {
    name: 'Sem data',
    channel: 'sms',
    segmentId: segment.id,
    templateId: smsTemplate.id
  });
  await assert.rejects(
    () => service.scheduleCampaign(ACCOUNT, USER, campaignWithoutDate.id),
    /scheduledAt is required/
  );

  const campaign = await service.createCampaign(ACCOUNT, USER, {
    name: 'Consentimento retry',
    channel: 'sms',
    segmentId: segment.id,
    templateId: smsTemplate.id,
    scheduledAt: '2026-08-07T12:00:00.000Z'
  });
  const scheduled = await service.scheduleCampaign(ACCOUNT, USER, campaign.id);
  await assert.rejects(
    () => service.scheduleCampaign(ACCOUNT, USER, scheduled.id),
    /Only draft/
  );

  const gateway: MarketingDispatchGateway = {
    async send(input) {
      return {
        status: 'failed',
        provider: 'test-provider',
        failureReason: `failed-${input.ownerId}`,
        sentAt: '2026-08-07T12:01:00.000Z'
      };
    }
  };
  const dispatched = await service.dispatchCampaign(ACCOUNT, USER, campaign.id, {
    gateway,
    audience: [
      {
        ownerId: 'owner-denied',
        ownerName: 'Negado',
        consentPurposes: ['marketing'],
        contacts: [{ type: 'sms', value: '5511999990001' }]
      },
      {
        ownerId: 'owner-allowed',
        ownerName: 'Permitido',
        consentPurposes: ['marketing'],
        contacts: [{ type: 'sms', value: '5511999990002' }]
      }
    ]
  });
  assert.equal(dispatched.summary.failed, 2);
  consent.set('owner-denied', false);
  const skipped = await service.retryDelivery(ACCOUNT, USER, dispatched.deliveries[0]!.id, gateway);
  assert.equal(skipped.status, 'skipped');

  consent.set('owner-allowed', true);
  const retried = await service.retryDelivery(ACCOUNT, USER, dispatched.deliveries[1]!.id, {
    async send() {
      return {
        status: 'sent',
        provider: 'retry-provider',
        providerMessageId: 'retry-message-1',
        sentAt: '2026-08-07T12:02:00.000Z'
      };
    }
  });
  assert.equal(retried.status, 'sent');
  await assert.rejects(
    () => service.retryDelivery(ACCOUNT, USER, retried.id, gateway),
    /Only failed/
  );
  await assert.rejects(
    () => service.retryDelivery(OTHER_ACCOUNT, USER, retried.id, gateway),
    /not found/
  );
  assert.equal(service.listDeliveries(ACCOUNT, campaign.id).length, 2);
});

test('MarketingService fails closed when durable consent is unavailable', async () => {
  const service = new MarketingService({ requireConsentChecker: true });
  await assert.rejects(
    () => service.dispatchCampaign(ACCOUNT, USER, 'campaign-missing', {
      audience: [],
      gateway: new FakeMarketingGateway()
    }),
    /durable consent checker/
  );
});

class InMemoryMarketingRepository implements MarketingRepository {
  readonly #segments = new Map<string, MarketingSegmentSummary>();
  readonly #templates = new Map<string, MarketingTemplateSummary>();
  readonly #campaigns = new Map<string, MarketingCampaignSummary>();
  readonly #deliveries = new Map<string, MarketingCampaignDeliverySummary>();
  readonly #settings = new Map<string, MarketingSettingSummary>();

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

  async findSetting(accountId: AccountId, key: MarketingSettingSummary['key']): Promise<MarketingSettingSummary | null> {
    return this.#settings.get(`${accountId}:${key}`) ?? null;
  }

  async saveSetting(setting: MarketingSettingSummary): Promise<void> {
    this.#settings.set(`${setting.accountId}:${setting.key}`, setting);
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
