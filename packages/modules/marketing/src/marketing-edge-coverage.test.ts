import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';

import type { AccountId, UserId } from '@cvg-his-v2/shared-types';

import {
  MarketingService,
  type MarketingAudienceMember,
  type MarketingCampaignDeliverySummary,
  type MarketingCampaignSummary,
  type MarketingConsentSummary,
  type MarketingDispatchGateway,
  type MarketingOwnerReference,
  type MarketingRepository,
  type MarketingSegmentSummary,
  type MarketingTemplateSummary,
  resolveMarketingProviderMode
} from './index.js';

const ACCOUNT = 'marketing-edge-account' as AccountId;
const OTHER_ACCOUNT = 'marketing-edge-other' as AccountId;
const USER = 'marketing-edge-user' as UserId;
const NOW = '2026-09-16T12:00:00.000Z';

function audienceMember(overrides: Partial<MarketingAudienceMember> = {}): MarketingAudienceMember {
  return {
    ownerId: 'owner-edge',
    ownerName: 'Tutor Edge',
    consentPurposes: ['marketing'],
    contacts: [{ type: 'sms', value: '5511999999999' }],
    ...overrides
  };
}

function successfulGateway(): MarketingDispatchGateway {
  return {
    async send(input) {
      return {
        status: 'sent',
        provider: 'edge-provider',
        providerMessageId: `message-${input.ownerId}`,
        sentAt: NOW
      };
    }
  };
}

class EdgeMarketingRepository implements MarketingRepository {
  readonly segments = new Map<string, MarketingSegmentSummary>();
  readonly templates = new Map<string, MarketingTemplateSummary>();
  readonly campaigns = new Map<string, MarketingCampaignSummary>();
  readonly deliveries = new Map<string, MarketingCampaignDeliverySummary>();
  readonly consents = new Map<string, MarketingConsentSummary>();
  readonly owners = new Map<string, MarketingOwnerReference>();
  findOwnerImpl: ((accountId: AccountId, ownerId: string) => MarketingOwnerReference | null) | undefined;
  resolveAudienceImpl: ((accountId: AccountId, channel: MarketingAudienceMember['contacts'][number]['type'], audience: readonly MarketingAudienceMember[]) => readonly MarketingAudienceMember[]) | undefined;
  claimDeliveryImpl: ((delivery: MarketingCampaignDeliverySummary, claim: { readonly leaseOwner: string; readonly leaseExpiresAt: string; readonly now: string }) => MarketingCampaignDeliverySummary | null) | undefined;
  completeDeliveryImpl: ((delivery: MarketingCampaignDeliverySummary, leaseOwner: string) => MarketingCampaignDeliverySummary | null) | undefined;
  claimRetryDeliveryImpl: ((accountId: AccountId, deliveryId: string, claim: { readonly leaseOwner: string; readonly leaseExpiresAt: string; readonly now: string }) => MarketingCampaignDeliverySummary | null) | undefined;
  findDeliveryByKeyImpl: ((accountId: AccountId, deliveryKey: string) => MarketingCampaignDeliverySummary | null) | undefined;
  findConsentImpl: ((accountId: AccountId, ownerId: string) => MarketingConsentSummary | null) | undefined;
  findSettingImpl: MarketingRepository['findSetting'];

  async saveSegment(segment: MarketingSegmentSummary): Promise<void> { this.segments.set(segment.id, segment); }
  async saveTemplate(template: MarketingTemplateSummary): Promise<void> { this.templates.set(template.id, template); }
  async saveCampaign(campaign: MarketingCampaignSummary): Promise<void> { this.campaigns.set(campaign.id, campaign); }
  async saveDelivery(delivery: MarketingCampaignDeliverySummary): Promise<void> { this.deliveries.set(delivery.id, delivery); }
  async findSegments(accountId: AccountId): Promise<readonly MarketingSegmentSummary[]> {
    return [...this.segments.values()].filter((segment) => segment.accountId === accountId);
  }
  async findTemplates(accountId: AccountId): Promise<readonly MarketingTemplateSummary[]> {
    return [...this.templates.values()].filter((template) => template.accountId === accountId);
  }
  async findCampaigns(accountId: AccountId): Promise<readonly MarketingCampaignSummary[]> {
    return [...this.campaigns.values()].filter((campaign) => campaign.accountId === accountId);
  }
  async findDeliveries(accountId: AccountId, campaignId?: string): Promise<readonly MarketingCampaignDeliverySummary[]> {
    return [...this.deliveries.values()].filter((delivery) =>
      delivery.accountId === accountId && (!campaignId || delivery.campaignId === campaignId));
  }
  async findOwner(accountId: AccountId, ownerId: string): Promise<MarketingOwnerReference | null> {
    return this.findOwnerImpl?.(accountId, ownerId) ?? this.owners.get(`${accountId}:${ownerId}`) ?? null;
  }
  async resolveAudience(
    accountId: AccountId,
    channel: MarketingAudienceMember['contacts'][number]['type'],
    audience: readonly MarketingAudienceMember[]
  ): Promise<readonly MarketingAudienceMember[]> {
    return this.resolveAudienceImpl?.(accountId, channel, audience) ?? audience;
  }
  async findDeliveryByKey(accountId: AccountId, deliveryKey: string): Promise<MarketingCampaignDeliverySummary | null> {
    return this.findDeliveryByKeyImpl?.(accountId, deliveryKey)
      ?? [...this.deliveries.values()].find((delivery) =>
        delivery.accountId === accountId && delivery.deliveryKey === deliveryKey)
      ?? null;
  }
  async claimDelivery(
    delivery: MarketingCampaignDeliverySummary,
    claim: { readonly leaseOwner: string; readonly leaseExpiresAt: string; readonly now: string }
  ): Promise<MarketingCampaignDeliverySummary | null> {
    return this.claimDeliveryImpl?.(delivery, claim) ?? null;
  }
  async completeDelivery(
    delivery: MarketingCampaignDeliverySummary,
    leaseOwner: string
  ): Promise<MarketingCampaignDeliverySummary | null> {
    return this.completeDeliveryImpl?.(delivery, leaseOwner) ?? null;
  }
  async claimRetryDelivery(
    accountId: AccountId,
    deliveryId: string,
    claim: { readonly leaseOwner: string; readonly leaseExpiresAt: string; readonly now: string }
  ): Promise<MarketingCampaignDeliverySummary | null> {
    return this.claimRetryDeliveryImpl?.(accountId, deliveryId, claim) ?? null;
  }
  async findConsent(accountId: AccountId, ownerId: string): Promise<MarketingConsentSummary | null> {
    return this.findConsentImpl?.(accountId, ownerId) ?? this.consents.get(`${accountId}:${ownerId}`) ?? null;
  }
  async saveConsent(consent: MarketingConsentSummary): Promise<MarketingConsentSummary> {
    this.consents.set(`${consent.accountId}:${consent.ownerId}`, consent);
    return consent;
  }
  async findSetting(_accountId: AccountId, _key: 'sms_automations' | 'vaccine_email') {
    return null;
  }
  async saveSetting(): Promise<void> {}
}

function createCampaignFixture(
  service: MarketingService,
  options: { readonly accountId?: AccountId; readonly channel?: 'sms' | 'email'; readonly scheduledAt?: string } = {}
): Promise<{ segment: MarketingSegmentSummary; template: MarketingTemplateSummary; campaign: MarketingCampaignSummary }> {
  const accountId = options.accountId ?? ACCOUNT;
  const channel = options.channel ?? 'sms';
  return (async () => {
    const segment = await service.createSegment(accountId, USER, { name: `Segment ${channel}`, criteria: {} });
    const template = await service.createTemplate(accountId, USER, {
      name: `Template ${channel}`,
      channel,
      body: 'Ola {{ownerName}} {{patientName}} {{ownerId}} {{patientId}}'
    });
    const campaign = await service.createCampaign(accountId, USER, {
      name: `Campaign ${channel}`,
      channel,
      segmentId: segment.id,
      templateId: template.id,
      scheduledAt: options.scheduledAt ?? NOW
    });
    return { segment, template, campaign };
  })();
}

function failedDelivery(campaignId: string, overrides: Partial<MarketingCampaignDeliverySummary> = {}): MarketingCampaignDeliverySummary {
  return {
    id: 'delivery-edge',
    accountId: ACCOUNT,
    campaignId,
    deliveryKey: 'delivery-key-edge',
    ownerId: 'owner-edge',
    ownerName: 'Tutor Edge',
    channel: 'sms',
    recipient: '5511999999999',
    body: 'Mensagem',
    status: 'failed',
    attemptCount: 1,
    failureReason: 'temporary',
    failedAt: NOW,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides
  };
}

describe('marketing service edge contracts', () => {
  it('resolves provider modes and rejects invalid retry configuration', () => {
    expect(resolveMarketingProviderMode(undefined, 'production')).toBe('external');
    expect(resolveMarketingProviderMode(undefined, 'test')).toBe('sandbox');
    expect(resolveMarketingProviderMode(' SANDBOX ', 'production')).toBe('sandbox');
    expect(resolveMarketingProviderMode('external', 'test')).toBe('external');
    expect(() => resolveMarketingProviderMode('unknown', 'test')).toThrow(/MARKETING_PROVIDER_MODE/);
    expect(() => new MarketingService({ retryBaseDelayMs: 2, retryMaxDelayMs: 1 })).toThrow(/greater than or equal/);
  });

  it('covers in-memory filters, validation defaults, and missing entities', async () => {
    const service = new MarketingService({ clock: () => new Date(NOW) });
    expect(service.persistenceMode).toBe('in-memory');
    const defaultGateway = new (await import('./index.js')).DeterministicMarketingSandboxGateway();
    await expect(defaultGateway.send({ channel: 'sms', to: '5511999999999', body: 'default' })).resolves.toEqual(
      expect.objectContaining({ status: 'sent' })
    );

    const segment = await service.createSegment(ACCOUNT, USER, { name: '  Default criteria  ' });
    const sms = await service.createTemplate(ACCOUNT, USER, {
      name: 'SMS', channel: 'sms', subject: '  ', body: 'SMS'
    });
    const email = await service.createTemplate(ACCOUNT, USER, {
      name: 'Email', channel: 'email', body: 'Email'
    });
    const campaign = await service.createCampaign(ACCOUNT, USER, {
      name: 'Campaign', channel: 'sms', segmentId: segment.id, templateId: sms.id, scheduledAt: NOW
    });
    const scheduled = await service.scheduleCampaign(ACCOUNT, USER, campaign.id);

    expect(segment.criteria).toEqual({});
    expect(sms.subject).toBeUndefined();
    expect(service.listTemplates(ACCOUNT, 'email')).toEqual([email]);
    expect(service.listTemplates(ACCOUNT)).toHaveLength(2);
    expect(service.listCampaigns(ACCOUNT, 'scheduled')).toEqual([scheduled]);
    expect(service.listCampaigns(ACCOUNT, 'draft')).toEqual([]);
    expect(service.listDeliveries(ACCOUNT, 'other-campaign')).toEqual([]);

    const campaignWithoutDate = await service.createCampaign(ACCOUNT, USER, {
      name: 'Campaign without date', channel: 'sms', segmentId: segment.id, templateId: sms.id
    });
    await assert.rejects(() => service.scheduleCampaign(ACCOUNT, USER, campaignWithoutDate.id), /scheduledAt is required/);

    await assert.rejects(() => service.createCampaign(OTHER_ACCOUNT, USER, {
      name: 'Missing segment', channel: 'sms', segmentId: segment.id, templateId: sms.id
    }), /segment not found/);
    await assert.rejects(() => service.createCampaign(ACCOUNT, USER, {
      name: 'Missing template', channel: 'sms', segmentId: segment.id, templateId: 'missing'
    }), /template not found/);
    await assert.rejects(() => service.scheduleCampaign(OTHER_ACCOUNT, USER, campaign.id), /campaign not found/);
    await assert.rejects(() => service.dispatchCampaign(ACCOUNT, USER, campaignWithoutDate.id, {
      audience: [], gateway: successfulGateway()
    }), /Only scheduled/);
  });

  it('covers consent cache/database fallbacks and owner validation guards', async () => {
    const repository = new EdgeMarketingRepository();
    const owner: MarketingOwnerReference = {
      id: 'owner-edge', fullName: 'Tutor Edge', contacts: []
    };
    repository.findOwnerImpl = () => owner;
    const persisted: MarketingConsentSummary = {
      id: 'consent-edge', accountId: ACCOUNT, ownerId: 'owner-edge', purpose: 'marketing',
      status: 'granted', updatedByUserId: USER, updatedAt: NOW
    };
    repository.findConsentImpl = (_accountId, ownerId) => ownerId === 'owner-edge' ? persisted : null;
    const service = new MarketingService({ repository });

    await expect(service.getConsent(ACCOUNT, 'owner-edge')).resolves.toEqual(persisted);
    await expect(service.getConsent(ACCOUNT, 'owner-edge')).resolves.toEqual(persisted);
    await expect(service.getConsent(ACCOUNT, 'owner-empty')).resolves.toBeNull();
    await expect(service.setConsent(ACCOUNT, USER, 'owner-edge', 'granted')).resolves.toEqual(
      expect.objectContaining({ accountId: ACCOUNT, ownerId: 'owner-edge', status: 'granted' })
    );
    await assert.rejects(() => service.setConsent(ACCOUNT, USER, 'owner-edge', 'invalid' as never), /status/);

    const noOwnerRepository = {
      saveSegment: async () => {},
      saveTemplate: async () => {},
      saveCampaign: async () => {},
      saveDelivery: async () => {},
      findSegments: async () => [],
      findTemplates: async () => [],
      findCampaigns: async () => [],
      findDeliveries: async () => []
    } as MarketingRepository;
    const noOwnerService = new MarketingService({ repository: noOwnerRepository });
    await assert.rejects(() => noOwnerService.getConsent(ACCOUNT, 'owner-edge'), /tenant-scoped owner validation/);

    const missingOwnerRepository = new EdgeMarketingRepository();
    missingOwnerRepository.findOwnerImpl = () => null;
    const missingOwnerService = new MarketingService({ repository: missingOwnerRepository });
    await assert.rejects(() => missingOwnerService.setConsent(ACCOUNT, USER, 'owner-edge', 'granted'), /Owner not found/);

    const noConsentRepository = new EdgeMarketingRepository();
    noConsentRepository.findOwnerImpl = () => owner;
    const noConsentService = new MarketingService({ repository: noConsentRepository });
    const preview = await noConsentService.previewAudienceForAccount(
      ACCOUNT, {}, 'sms', [audienceMember()]
    );
    expect(preview).toEqual([]);

    const persistedService = new MarketingService({ repository });
    await expect(persistedService.previewAudienceForAccount(
      ACCOUNT, {}, 'sms', [audienceMember({ ownerId: 'owner-edge' })]
    )).resolves.toHaveLength(1);
    await expect(persistedService.previewAudienceForAccount(
      ACCOUNT, {}, 'sms', [audienceMember({ ownerId: 'owner-edge' })]
    )).resolves.toHaveLength(1);

    const inMemory = new MarketingService();
    expect(await inMemory.previewAudienceForAccount(ACCOUNT, {}, 'sms', [audienceMember()])).toHaveLength(1);
    const revoked = await inMemory.setConsent(ACCOUNT, USER, 'owner-revoked', 'revoked');
    expect(revoked.status).toBe('revoked');
    expect(await inMemory.previewAudienceForAccount(ACCOUNT, {}, 'sms', [audienceMember({ ownerId: 'owner-revoked' })])).toEqual([]);
    await inMemory.setConsent(ACCOUNT, USER, 'owner-granted', 'granted');
    expect(await inMemory.previewAudienceForAccount(ACCOUNT, {}, 'sms', [audienceMember({ ownerId: 'owner-granted', consentPurposes: [] })])).toHaveLength(1);

    const previewMembers = [
      audienceMember({ ownerId: 'preview-good' }),
      audienceMember({ ownerId: 'preview-no-consent', consentPurposes: [] }),
      audienceMember({ ownerId: 'preview-no-channel', contacts: [{ type: 'email', value: 'x@example.test' }] })
    ];
    expect(inMemory.previewAudience({}, 'sms', previewMembers)).toEqual([previewMembers[0]]);
    expect(() => new MarketingService({ repository }).previewAudience({}, 'sms', [])).toThrow(/account context/);
  });

  it('requires tenant audience resolution only when it has candidates', async () => {
    const repository = new EdgeMarketingRepository();
    repository.findOwnerImpl = () => ({ id: 'owner-edge', fullName: 'Tutor Edge', contacts: [] });
    const service = new MarketingService({ repository, consentChecker: { async hasActiveConsent() { return true; } } });
    await expect(service.previewAudienceForAccount(ACCOUNT, {}, 'sms', [])).resolves.toEqual([]);

    const withoutResolver = {
      saveSegment: async () => {},
      saveTemplate: async () => {},
      saveCampaign: async () => {},
      saveDelivery: async () => {},
      findSegments: async () => [],
      findTemplates: async () => [],
      findCampaigns: async () => [],
      findDeliveries: async () => []
    } as MarketingRepository;
    const noResolverService = new MarketingService({
      repository: withoutResolver,
      consentChecker: { async hasActiveConsent() { return true; } }
    });
    await expect(noResolverService.previewAudienceForAccount(ACCOUNT, {}, 'sms', [audienceMember()]))
      .rejects.toThrow(/tenant-scoped owner/);

    const noConsentLookupRepository = {
      saveSegment: async () => {},
      saveTemplate: async () => {},
      saveCampaign: async () => {},
      saveDelivery: async () => {},
      findSegments: async () => [],
      findTemplates: async () => [],
      findCampaigns: async () => [],
      findDeliveries: async () => [],
      resolveAudience: async (_accountId: AccountId, _channel: MarketingAudienceMember['contacts'][number]['type'], audience: readonly MarketingAudienceMember[]) => audience
    } as MarketingRepository;
    await expect(new MarketingService({ repository: noConsentLookupRepository }).previewAudienceForAccount(
      ACCOUNT, {}, 'sms', [audienceMember()]
    )).resolves.toEqual([]);
  });

  it('covers dispatch skip, claim races, and a lease completion race', async () => {
    let consentCalls = 0;
    const service = new MarketingService({
      consentChecker: {
        async hasActiveConsent() {
          consentCalls += 1;
          return consentCalls === 1;
        }
      }
    });
    const { campaign } = await createCampaignFixture(service);
    await service.scheduleCampaign(ACCOUNT, USER, campaign.id);
    const skipped = await service.dispatchCampaign(ACCOUNT, USER, campaign.id, {
      audience: [audienceMember()], gateway: successfulGateway()
    });
    expect(skipped.deliveries).toEqual([]);
    expect(skipped.summary.skipped).toBe(1);

    const raceRepository = new EdgeMarketingRepository();
    raceRepository.findOwnerImpl = () => ({ id: 'owner-edge', fullName: 'Canonical', contacts: [] });
    raceRepository.claimDeliveryImpl = () => null;
    const existing = failedDelivery('unused', { status: 'sent', provider: 'existing' });
    raceRepository.findDeliveryByKeyImpl = () => existing;
    const raceService = new MarketingService({ repository: raceRepository, consentChecker: { async hasActiveConsent() { return true; } } });
    const raceFixture = await createCampaignFixture(raceService);
    await raceService.scheduleCampaign(ACCOUNT, USER, raceFixture.campaign.id);
    const raced = await raceService.dispatchCampaign(ACCOUNT, USER, raceFixture.campaign.id, {
      audience: [audienceMember()], gateway: successfulGateway()
    });
    expect(raced.deliveries[0]).toEqual(existing);

    const noExistingRepository = new EdgeMarketingRepository();
    noExistingRepository.findOwnerImpl = () => ({ id: 'owner-edge', fullName: 'Canonical', contacts: [] });
    noExistingRepository.claimDeliveryImpl = () => null;
    const noExistingService = new MarketingService({ repository: noExistingRepository, consentChecker: { async hasActiveConsent() { return true; } } });
    const noExistingFixture = await createCampaignFixture(noExistingService);
    await noExistingService.scheduleCampaign(ACCOUNT, USER, noExistingFixture.campaign.id);
    const noClaim = await noExistingService.dispatchCampaign(ACCOUNT, USER, noExistingFixture.campaign.id, {
      audience: [audienceMember()], gateway: successfulGateway()
    });
    expect(noClaim.deliveries).toEqual([]);

    const completionRepository = new EdgeMarketingRepository();
    completionRepository.claimDeliveryImpl = (delivery, claim) => ({
      ...delivery, status: 'sending', attemptCount: 1, leaseOwner: claim.leaseOwner,
      leaseExpiresAt: claim.leaseExpiresAt, lastAttemptAt: claim.now, updatedAt: claim.now
    });
    let completed = false;
    const current = failedDelivery('unused', { status: 'sent', provider: 'authoritative' });
    completionRepository.completeDeliveryImpl = () => { completed = true; return null; };
    completionRepository.findDeliveryByKeyImpl = () => completed ? current : null;
    const completionService = new MarketingService({
      repository: completionRepository,
      consentChecker: { async hasActiveConsent() { return true; } }
    });
    const completionFixture = await createCampaignFixture(completionService);
    await completionService.scheduleCampaign(ACCOUNT, USER, completionFixture.campaign.id);
    const completedRace = await completionService.dispatchCampaign(ACCOUNT, USER, completionFixture.campaign.id, {
      audience: [audienceMember()], gateway: successfulGateway()
    });
    expect(completedRace.deliveries[0]).toEqual(current);

    let contactReads = 0;
    const shiftingMember: MarketingAudienceMember = {
      ...audienceMember({ ownerId: 'owner-contact-shift' }),
      get contacts() {
        contactReads += 1;
        return contactReads === 1 ? [{ type: 'sms' as const, value: '5511999999999' }] : [];
      }
    };
    const shiftingService = new MarketingService({ consentChecker: { async hasActiveConsent() { return true; } } });
    const shiftingFixture = await createCampaignFixture(shiftingService);
    await shiftingService.scheduleCampaign(ACCOUNT, USER, shiftingFixture.campaign.id);
    const shiftingResult = await shiftingService.dispatchCampaign(ACCOUNT, USER, shiftingFixture.campaign.id, {
      audience: [shiftingMember], gateway: successfulGateway()
    });
    expect(shiftingResult.deliveries).toEqual([]);
  });

  it('covers retry guards, durable claim outcomes, and gateway errors', async () => {
    const repository = new EdgeMarketingRepository();
    const fixtureService = new MarketingService();
    const fixture = await createCampaignFixture(fixtureService);
    const delivery = failedDelivery(fixture.campaign.id);
    repository.segments.set(fixture.segment.id, fixture.segment);
    repository.templates.set(fixture.template.id, fixture.template);
    repository.campaigns.set(fixture.campaign.id, fixture.campaign);
    repository.deliveries.set(delivery.id, delivery);
    const hydrated = new MarketingService({ repository, requireConsentChecker: true, clock: () => new Date(NOW) });
    await hydrated.hydrateFromDatabase(ACCOUNT);

    await expect(hydrated.retryDelivery(ACCOUNT, USER, delivery.id, successfulGateway()))
      .rejects.toThrow(/durable consent checker/);
    await expect(hydrated.retryDelivery(OTHER_ACCOUNT, USER, delivery.id, successfulGateway()))
      .rejects.toThrow(/not found/);

    const claimedRepository = new EdgeMarketingRepository();
    claimedRepository.segments.set(fixture.segment.id, fixture.segment);
    claimedRepository.templates.set(fixture.template.id, fixture.template);
    claimedRepository.campaigns.set(fixture.campaign.id, fixture.campaign);
    claimedRepository.deliveries.set(delivery.id, delivery);
    claimedRepository.findOwnerImpl = () => ({ id: delivery.ownerId, fullName: 'Canonical owner', contacts: [] });
    claimedRepository.claimRetryDeliveryImpl = (_accountId, _deliveryId, claim) => ({
      ...delivery, status: 'sending', attemptCount: 2, leaseOwner: undefined,
      leaseExpiresAt: undefined, lastAttemptAt: claim.now, updatedAt: claim.now,
      failureReason: undefined, failedAt: undefined, nextAttemptAt: undefined
    });
    const claimedService = new MarketingService({
      repository: claimedRepository,
      consentChecker: { async hasActiveConsent() { return true; } },
      clock: () => new Date(NOW)
    });
    await claimedService.hydrateFromDatabase(ACCOUNT);
    const claimed = await claimedService.retryDelivery(ACCOUNT, USER, delivery.id, {
      async send() { throw new Error('provider offline'); }
    });
    expect(claimed.status).toBe('failed');
    expect(claimed.failureReason).toBe('provider offline');

    const nonError = new EdgeMarketingRepository();
    nonError.segments.set(fixture.segment.id, fixture.segment);
    nonError.templates.set(fixture.template.id, fixture.template);
    nonError.campaigns.set(fixture.campaign.id, fixture.campaign);
    nonError.deliveries.set(delivery.id, delivery);
    nonError.findOwnerImpl = () => ({ id: delivery.ownerId, fullName: 'Canonical owner', contacts: [] });
    const nonErrorService = new MarketingService({
      repository: nonError,
      consentChecker: { async hasActiveConsent() { return true; } },
      clock: () => new Date(NOW)
    });
    await nonErrorService.hydrateFromDatabase(ACCOUNT);
    nonError.claimRetryDeliveryImpl = (_accountId, _deliveryId, claim) => ({
      ...delivery, status: 'sending', attemptCount: 2, leaseOwner: undefined,
      leaseExpiresAt: undefined, lastAttemptAt: claim.now, updatedAt: claim.now,
      failureReason: undefined, failedAt: undefined, nextAttemptAt: undefined
    });
    const nonErrorResult = await nonErrorService.retryDelivery(ACCOUNT, USER, delivery.id, {
      async send() { throw 'provider failed without Error'; }
    });
    expect(nonErrorResult.failureReason).toBe('Marketing gateway failed before response');

    const nullClaimRepository = new EdgeMarketingRepository();
    nullClaimRepository.segments.set(fixture.segment.id, fixture.segment);
    nullClaimRepository.templates.set(fixture.template.id, fixture.template);
    nullClaimRepository.campaigns.set(fixture.campaign.id, fixture.campaign);
    nullClaimRepository.deliveries.set(delivery.id, delivery);
    nullClaimRepository.findOwnerImpl = () => ({ id: delivery.ownerId, fullName: 'Canonical owner', contacts: [] });
    nullClaimRepository.claimRetryDeliveryImpl = () => null;
    const nullClaimService = new MarketingService({
      repository: nullClaimRepository,
      consentChecker: { async hasActiveConsent() { return true; } },
      clock: () => new Date(NOW)
    });
    await nullClaimService.hydrateFromDatabase(ACCOUNT);
    await expect(nullClaimService.retryDelivery(ACCOUNT, USER, delivery.id, successfulGateway()))
      .rejects.toThrow(/already being reprocessed/);
  });

  it('fails closed on tenant retry consent and persists a skipped delivery', async () => {
    const fixtureService = new MarketingService();
    const fixture = await createCampaignFixture(fixtureService);
    const delivery = failedDelivery(fixture.campaign.id);
    const repository = new EdgeMarketingRepository();
    repository.segments.set(fixture.segment.id, fixture.segment);
    repository.templates.set(fixture.template.id, fixture.template);
    repository.campaigns.set(fixture.campaign.id, fixture.campaign);
    repository.deliveries.set(delivery.id, delivery);
    repository.findOwnerImpl = () => null;
    const service = new MarketingService({ repository, consentChecker: { async hasActiveConsent() { return false; } } });
    await service.hydrateFromDatabase(ACCOUNT);
    const skipped = await service.retryDelivery(ACCOUNT, USER, delivery.id, successfulGateway());
    expect(skipped.status).toBe('skipped');
    expect(repository.deliveries.get(delivery.id)?.status).toBe('skipped');
  });

  it('protects sending state and resolves no-lease fallback deliveries', async () => {
    const repository = new EdgeMarketingRepository();
    repository.findOwnerImpl = () => ({ id: 'owner-edge', fullName: 'Owner', contacts: [] });
    repository.claimDeliveryImpl = (delivery, claim) => ({
      ...delivery, status: 'queued', leaseOwner: claim.leaseOwner,
      leaseExpiresAt: claim.leaseExpiresAt, updatedAt: claim.now
    });
    const service = new MarketingService({ repository, consentChecker: { async hasActiveConsent() { return true; } } });
    const fixture = await createCampaignFixture(service);
    await service.scheduleCampaign(ACCOUNT, USER, fixture.campaign.id);
    await expect(service.dispatchCampaign(ACCOUNT, USER, fixture.campaign.id, {
      audience: [audienceMember()], gateway: successfulGateway()
    })).rejects.toThrow(/must be claimed before sending/);

    const fallbackRepository = {
      saveSegment: async () => {},
      saveTemplate: async () => {},
      saveCampaign: async () => {},
      saveDelivery: async () => {},
      findSegments: async () => [],
      findTemplates: async () => [],
      findCampaigns: async () => [],
      findDeliveries: async () => [],
      resolveAudience: async (_accountId: AccountId, _channel: MarketingAudienceMember['contacts'][number]['type'], audience: readonly MarketingAudienceMember[]) => audience
    } as MarketingRepository;
    const existing = failedDelivery('unused', { status: 'sent', provider: 'database' });
    fallbackRepository.findDeliveryByKey = async () => existing;
    const fallbackService = new MarketingService({
      repository: fallbackRepository,
      consentChecker: { async hasActiveConsent() { return true; } }
    });
    const fallbackFixture = await createCampaignFixture(fallbackService);
    await fallbackService.scheduleCampaign(ACCOUNT, USER, fallbackFixture.campaign.id);
    const result = await fallbackService.dispatchCampaign(ACCOUNT, USER, fallbackFixture.campaign.id, {
      audience: [audienceMember()], gateway: successfulGateway()
    });
    expect(result.deliveries[0]).toEqual(existing);

  });

  it('does not resend hydrated sent, skipped, or currently sending deliveries', async () => {
    const makeStaticCampaign = (campaignId: string, ownerId: string, status: MarketingCampaignDeliverySummary['status']) => {
      const segment: MarketingSegmentSummary = {
        id: `segment-${campaignId}`, accountId: ACCOUNT, name: 'Static segment', criteria: {},
        createdByUserId: USER, createdAt: NOW, updatedAt: NOW
      };
      const template: MarketingTemplateSummary = {
        id: `template-${campaignId}`, accountId: ACCOUNT, name: 'Static template', channel: 'sms',
        body: 'Mensagem', createdByUserId: USER, createdAt: NOW, updatedAt: NOW
      };
      const campaign: MarketingCampaignSummary = {
        id: campaignId, accountId: ACCOUNT, name: 'Static campaign', channel: 'sms', status: 'scheduled',
        segmentId: segment.id, templateId: template.id, scheduledAt: NOW, estimatedAudience: 1,
        createdByUserId: USER, createdAt: NOW, updatedAt: NOW
      };
      const recipient = '5511999999999';
      const fingerprint = createHash('sha256')
        .update([ACCOUNT, campaignId, ownerId, '', 'sms', recipient].join('|'))
        .digest('hex');
      const deliveryKey = `mkt_del_${fingerprint}`;
      const delivery: MarketingCampaignDeliverySummary = {
        id: deliveryKey, accountId: ACCOUNT, campaignId, deliveryKey, ownerId, ownerName: 'Owner',
        channel: 'sms', recipient, body: 'Mensagem', status, attemptCount: 1,
        createdAt: NOW, updatedAt: NOW
      };
      return { segment, template, campaign, delivery };
    };

    const sent = makeStaticCampaign('campaign-static-sent', 'owner-static-sent', 'sent');
    const skipped = makeStaticCampaign('campaign-static-skipped', 'owner-static-skipped', 'skipped');
    const repository = new EdgeMarketingRepository();
    for (const fixture of [sent, skipped]) {
      repository.segments.set(fixture.segment.id, fixture.segment);
      repository.templates.set(fixture.template.id, fixture.template);
      repository.campaigns.set(fixture.campaign.id, fixture.campaign);
      repository.deliveries.set(fixture.delivery.id, fixture.delivery);
    }
    const service = new MarketingService({ repository, consentChecker: { async hasActiveConsent() { return true; } } });
    await service.hydrateFromDatabase(ACCOUNT);
    const gateway = { async send() { throw new Error('must not send'); } };
    const sentResult = await service.dispatchCampaign(ACCOUNT, USER, sent.campaign.id, {
      audience: [audienceMember({ ownerId: sent.delivery.ownerId })], gateway
    });
    const skippedResult = await service.dispatchCampaign(ACCOUNT, USER, skipped.campaign.id, {
      audience: [audienceMember({ ownerId: skipped.delivery.ownerId })], gateway
    });
    expect(sentResult.deliveries[0]).toEqual(sent.delivery);
    expect(skippedResult.deliveries[0]).toEqual(skipped.delivery);

    const active = makeStaticCampaign('campaign-static-active', 'owner-static-active', 'sending');
    const activeRepository = {
      saveSegment: async () => {}, saveTemplate: async () => {}, saveCampaign: async () => {}, saveDelivery: async () => {},
      findSegments: async () => [active.segment], findTemplates: async () => [active.template],
      findCampaigns: async () => [active.campaign], findDeliveries: async () => [active.delivery],
      resolveAudience: async (_accountId: AccountId, _channel: MarketingAudienceMember['contacts'][number]['type'], audience: readonly MarketingAudienceMember[]) => audience
    } as MarketingRepository;
    const activeService = new MarketingService({ repository: activeRepository, consentChecker: { async hasActiveConsent() { return true; } } });
    await activeService.hydrateFromDatabase(ACCOUNT);
    const activeResult = await activeService.dispatchCampaign(ACCOUNT, USER, active.campaign.id, {
      audience: [audienceMember({ ownerId: active.delivery.ownerId })], gateway
    });
    expect(activeResult.deliveries[0]).toEqual(active.delivery);
  });
});
