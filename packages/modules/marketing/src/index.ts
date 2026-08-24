import { createHash } from 'node:crypto';

import { getPool } from '@cvg-his-v2/shared-database';
import { NotFoundError, ValidationError } from '@cvg-his-v2/shared-errors';
import type { AccountId, UserId } from '@cvg-his-v2/shared-types';
import { createCorrelationId } from '@cvg-his-v2/shared-utils';
import { requireEnum, requireNonEmptyString } from '@cvg-his-v2/shared-validation';
import { withTenantQuery } from '@cvg-his-v2/tenant-context';

export type MarketingChannel = 'sms' | 'whatsapp' | 'email';
export type MarketingCampaignStatus = 'draft' | 'scheduled' | 'running' | 'sent' | 'cancelled';
export type MarketingDeliveryStatus = 'queued' | 'sending' | 'sent' | 'failed' | 'skipped';
export type MarketingConsentPurpose = 'marketing' | 'transactional' | 'preventive';
export type MarketingSettingKey = 'sms_automations' | 'vaccine_email';
export type MarketingConsentStatus = 'granted' | 'revoked';
export type MarketingProviderMode = 'sandbox' | 'external';

export interface MarketingSegmentCriteria {
  readonly ownerGroups?: readonly string[];
  readonly patientSpecies?: readonly string[];
  readonly consentPurpose?: MarketingConsentPurpose;
  readonly tags?: readonly string[];
}

export interface MarketingAudienceContact {
  readonly type: MarketingChannel;
  readonly value: string;
}

export interface MarketingOwnerReference {
  readonly id: string;
  readonly fullName: string;
  readonly contacts: readonly MarketingAudienceContact[];
}

export interface MarketingPatientReference {
  readonly id: string;
  readonly ownerId: string;
  readonly name: string;
  readonly species: string;
}

export interface MarketingAudienceMember {
  readonly ownerId: string;
  readonly ownerName: string;
  readonly ownerGroup?: string;
  readonly consentPurposes?: readonly MarketingConsentPurpose[];
  readonly patientId?: string;
  readonly patientName?: string;
  readonly patientSpecies?: string;
  readonly tags?: readonly string[];
  readonly contacts: readonly MarketingAudienceContact[];
}

export interface MarketingSegmentSummary {
  readonly id: string;
  readonly accountId: AccountId;
  readonly name: string;
  readonly description?: string;
  readonly criteria: MarketingSegmentCriteria;
  readonly createdByUserId: UserId;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface MarketingTemplateSummary {
  readonly id: string;
  readonly accountId: AccountId;
  readonly name: string;
  readonly channel: MarketingChannel;
  readonly subject?: string;
  readonly body: string;
  readonly createdByUserId: UserId;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface MarketingCampaignSummary {
  readonly id: string;
  readonly accountId: AccountId;
  readonly name: string;
  readonly channel: MarketingChannel;
  readonly status: MarketingCampaignStatus;
  readonly segmentId: string;
  readonly templateId: string;
  readonly scheduledAt?: string;
  readonly scheduledByUserId?: UserId;
  readonly estimatedAudience: number;
  readonly createdByUserId: UserId;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface MarketingCampaignDeliverySummary {
  readonly id: string;
  readonly accountId: AccountId;
  readonly campaignId: string;
  /** Stable tenant-scoped key used to make repeated audience entries idempotent. */
  readonly deliveryKey: string;
  readonly ownerId: string;
  readonly ownerName?: string;
  readonly patientId?: string;
  readonly channel: MarketingChannel;
  readonly recipient: string;
  readonly subject?: string;
  readonly body: string;
  readonly status: MarketingDeliveryStatus;
  readonly provider?: string;
  readonly providerMessageId?: string;
  readonly failureReason?: string;
  readonly attemptCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly sentAt?: string;
  readonly failedAt?: string;
  readonly nextAttemptAt?: string;
  readonly lastAttemptAt?: string;
  readonly leaseOwner?: string;
  readonly leaseExpiresAt?: string;
}

export interface MarketingConsentSummary {
  readonly id: string;
  readonly accountId: AccountId;
  readonly ownerId: string;
  readonly purpose: 'marketing';
  readonly status: MarketingConsentStatus;
  readonly updatedByUserId: UserId;
  readonly updatedAt: string;
}

export interface MarketingSettingSummary {
  readonly accountId: AccountId;
  readonly key: MarketingSettingKey;
  readonly channel: 'sms' | 'email';
  readonly values: Readonly<Record<string, boolean | string>>;
  readonly updatedByUserId: UserId;
  readonly updatedAt: string;
}

export interface SaveMarketingSettingInput {
  readonly key: MarketingSettingKey;
  readonly channel: 'sms' | 'email';
  readonly values: Readonly<Record<string, boolean | string>>;
}

export interface CreateMarketingSegmentInput {
  readonly name: string;
  readonly description?: string;
  readonly criteria?: MarketingSegmentCriteria;
}

export interface CreateMarketingTemplateInput {
  readonly name: string;
  readonly channel: MarketingChannel;
  readonly subject?: string;
  readonly body: string;
}

export interface CreateMarketingCampaignInput {
  readonly name: string;
  readonly channel: MarketingChannel;
  readonly segmentId: string;
  readonly templateId: string;
  readonly scheduledAt?: string;
  readonly audience?: readonly MarketingAudienceMember[];
}

export interface MarketingDispatchGatewayInput {
  readonly accountId?: AccountId;
  readonly campaignId?: string;
  readonly ownerId?: string;
  readonly ownerName?: string;
  readonly patientId?: string;
  readonly channel: MarketingChannel;
  readonly to: string;
  readonly subject?: string;
  readonly body: string;
  /** Stable delivery identifier propagated to channel adapters. */
  readonly deliveryKey?: string;
  /** Stable key that an external provider may use for its own idempotency API. */
  readonly idempotencyKey?: string;
}

export interface MarketingDispatchGatewayResult {
  readonly status: 'sent' | 'failed';
  readonly provider: string;
  readonly providerMessageId?: string;
  readonly failureReason?: string;
  readonly sentAt: string;
}

export interface MarketingDispatchGateway {
  send(input: MarketingDispatchGatewayInput): Promise<MarketingDispatchGatewayResult>;
}

/**
 * Deterministic local provider used by tests and explicitly selected sandbox environments.
 * It never performs network I/O and makes failure/success reproducible from the recipient/body.
 */
export class DeterministicMarketingSandboxGateway implements MarketingDispatchGateway {
  readonly providerName = 'marketing-sandbox';
  readonly #clock: () => Date;

  public constructor(options?: { readonly clock?: () => Date }) {
    this.#clock = options?.clock ?? (() => new Date());
  }

  public async send(input: MarketingDispatchGatewayInput): Promise<MarketingDispatchGatewayResult> {
    const sentAt = this.#clock().toISOString();
    if (input.to.includes('0000') || input.body.toLowerCase().includes('sandbox failure')) {
      return {
        status: 'failed',
        provider: this.providerName,
        failureReason: 'Deterministic sandbox failure',
        sentAt
      };
    }

    const fingerprint = createHash('sha256')
      .update([
        input.idempotencyKey ?? '',
        input.channel,
        input.to,
        input.subject ?? '',
        input.body
      ].join('|'))
      .digest('hex')
      .slice(0, 32);
    return {
      status: 'sent',
      provider: this.providerName,
      providerMessageId: `sandbox_${input.channel}_${fingerprint}`,
      sentAt
    };
  }
}

export function resolveMarketingProviderMode(
  configured = process.env.MARKETING_PROVIDER_MODE,
  environment = process.env.NODE_ENV
): MarketingProviderMode {
  const normalized = configured?.trim().toLowerCase();
  if (!normalized) return environment === 'production' ? 'external' : 'sandbox';
  if (normalized === 'sandbox' || normalized === 'external') return normalized;
  throw new ValidationError('MARKETING_PROVIDER_MODE must be sandbox or external');
}

export interface MarketingConsentChecker {
  hasActiveConsent(
    accountId: AccountId,
    ownerId: string,
    purpose: MarketingConsentPurpose
  ): Promise<boolean>;
}

export interface DispatchMarketingCampaignInput {
  readonly audience: readonly MarketingAudienceMember[];
  readonly gateway: MarketingDispatchGateway;
}

export interface MarketingDeliveryClaim {
  readonly leaseOwner: string;
  readonly leaseExpiresAt: string;
  readonly now: string;
}

export interface MarketingSetConsentInput {
  readonly ownerId: string;
  readonly status: MarketingConsentStatus;
}

export interface MarketingCampaignDispatchResult {
  readonly campaign: MarketingCampaignSummary;
  readonly deliveries: readonly MarketingCampaignDeliverySummary[];
  readonly summary: {
    readonly total: number;
    readonly sent: number;
    readonly failed: number;
    readonly skipped: number;
  };
}

export interface MarketingRepository {
  saveSegment(segment: MarketingSegmentSummary): Promise<void>;
  saveTemplate(template: MarketingTemplateSummary): Promise<void>;
  saveCampaign(campaign: MarketingCampaignSummary): Promise<void>;
  saveDelivery(delivery: MarketingCampaignDeliverySummary): Promise<void>;
  findSegments(accountId: AccountId): Promise<readonly MarketingSegmentSummary[]>;
  findTemplates(accountId: AccountId): Promise<readonly MarketingTemplateSummary[]>;
  findCampaigns(accountId: AccountId): Promise<readonly MarketingCampaignSummary[]>;
  findDeliveries(accountId: AccountId, campaignId?: string): Promise<readonly MarketingCampaignDeliverySummary[]>;
  findOwner?(accountId: AccountId, ownerId: string): Promise<MarketingOwnerReference | null>;
  resolveAudience?(
    accountId: AccountId,
    channel: MarketingChannel,
    audience: readonly MarketingAudienceMember[]
  ): Promise<readonly MarketingAudienceMember[]>;
  findDeliveryByKey?(accountId: AccountId, deliveryKey: string): Promise<MarketingCampaignDeliverySummary | null>;
  claimDelivery?(
    delivery: MarketingCampaignDeliverySummary,
    claim?: MarketingDeliveryClaim
  ): Promise<MarketingCampaignDeliverySummary | null>;
  completeDelivery?(
    delivery: MarketingCampaignDeliverySummary,
    leaseOwner: string
  ): Promise<MarketingCampaignDeliverySummary | null>;
  claimRetryDelivery?(
    accountId: AccountId,
    deliveryId: string,
    claim?: MarketingDeliveryClaim
  ): Promise<MarketingCampaignDeliverySummary | null>;
  findConsent?(accountId: AccountId, ownerId: string): Promise<MarketingConsentSummary | null>;
  saveConsent?(consent: MarketingConsentSummary): Promise<MarketingConsentSummary>;
  findSetting?(accountId: AccountId, key: MarketingSettingKey): Promise<MarketingSettingSummary | null>;
  saveSetting?(setting: MarketingSettingSummary): Promise<void>;
}

export interface MarketingServiceOptions {
  readonly repository?: MarketingRepository;
  readonly consentChecker?: MarketingConsentChecker;
  /** Refuse outbound campaigns when the durable consent source is unavailable. */
  readonly requireConsentChecker?: boolean;
  /** Injectable clock for deterministic retry tests and controlled reprocessing. */
  readonly clock?: () => Date;
  /** First retry delay. Defaults to MARKETING_RETRY_BASE_MS or 30 seconds. */
  readonly retryBaseDelayMs?: number;
  /** Exponential retry cap. Defaults to MARKETING_RETRY_MAX_MS or 15 minutes. */
  readonly retryMaxDelayMs?: number;
  /** Maximum time a worker owns a sending delivery before it can be reclaimed. */
  readonly leaseDurationMs?: number;
}

export class MarketingService {
  readonly #repository?: MarketingRepository;
  readonly #consentChecker?: MarketingConsentChecker;
  readonly #requireConsentChecker: boolean;
  readonly #clock: () => Date;
  readonly #retryBaseDelayMs: number;
  readonly #retryMaxDelayMs: number;
  readonly #leaseDurationMs: number;
  readonly #leaseOwner = createCorrelationId('mkt_lease');
  readonly #segments = new Map<string, MarketingSegmentSummary>();
  readonly #templates = new Map<string, MarketingTemplateSummary>();
  readonly #campaigns = new Map<string, MarketingCampaignSummary>();
  readonly #deliveries = new Map<string, MarketingCampaignDeliverySummary>();
  readonly #consents = new Map<string, MarketingConsentSummary>();
  readonly #settings = new Map<string, MarketingSettingSummary>();

  public constructor(options?: MarketingServiceOptions) {
    this.#repository = options?.repository;
    this.#consentChecker = options?.consentChecker;
    this.#requireConsentChecker = options?.requireConsentChecker === true;
    this.#clock = options?.clock ?? (() => new Date());
    this.#retryBaseDelayMs = resolveDuration(
      options?.retryBaseDelayMs,
      'MARKETING_RETRY_BASE_MS',
      30_000
    );
    this.#retryMaxDelayMs = resolveDuration(
      options?.retryMaxDelayMs,
      'MARKETING_RETRY_MAX_MS',
      15 * 60_000
    );
    if (this.#retryMaxDelayMs < this.#retryBaseDelayMs) {
      throw new ValidationError('MARKETING_RETRY_MAX_MS must be greater than or equal to MARKETING_RETRY_BASE_MS');
    }
    this.#leaseDurationMs = resolveDuration(
      options?.leaseDurationMs,
      'MARKETING_LEASE_DURATION_MS',
      60_000
    );
  }

  public get persistenceMode(): 'database' | 'in-memory' {
    return this.#repository ? 'database' : 'in-memory';
  }

  public async hydrateFromDatabase(accountId: AccountId): Promise<void> {
    if (!this.#repository) return;
    const [segments, templates, campaigns, deliveries] = await Promise.all([
      this.#repository.findSegments(accountId),
      this.#repository.findTemplates(accountId),
      this.#repository.findCampaigns(accountId),
      this.#repository.findDeliveries(accountId)
    ]);
    for (const segment of segments) this.#segments.set(segment.id, segment);
    for (const template of templates) this.#templates.set(template.id, template);
    for (const campaign of campaigns) this.#campaigns.set(campaign.id, campaign);
    for (const delivery of deliveries) this.#deliveries.set(delivery.id, delivery);
  }

  public async getConsent(accountId: AccountId, ownerId: string): Promise<MarketingConsentSummary | null> {
    await this.#assertOwnerInTenant(accountId, ownerId);
    const cacheKey = consentCacheKey(accountId, ownerId);
    const cached = this.#consents.get(cacheKey);
    if (cached) return cached;

    const loaded = await this.#repository?.findConsent?.(accountId, ownerId);
    if (loaded) this.#consents.set(cacheKey, loaded);
    return loaded ?? null;
  }

  public async setConsent(
    accountId: AccountId,
    updatedByUserId: UserId,
    ownerId: string,
    status: MarketingConsentStatus
  ): Promise<MarketingConsentSummary> {
    const normalizedOwnerId = requireNonEmptyString(ownerId, 'ownerId');
    if (status !== 'granted' && status !== 'revoked') {
      throw new ValidationError('Marketing consent status must be granted or revoked');
    }
    await this.#assertOwnerInTenant(accountId, normalizedOwnerId);

    const consent: MarketingConsentSummary = {
      id: createCorrelationId('mkt_consent'),
      accountId,
      ownerId: normalizedOwnerId,
      purpose: 'marketing',
      status,
      updatedByUserId,
      updatedAt: this.#now()
    };
    const persisted = await this.#repository?.saveConsent?.(consent);
    const resolved = persisted ?? consent;
    this.#consents.set(consentCacheKey(accountId, normalizedOwnerId), resolved);
    return resolved;
  }

  public async createSegment(
    accountId: AccountId,
    createdByUserId: UserId,
    input: CreateMarketingSegmentInput
  ): Promise<MarketingSegmentSummary> {
    const timestamp = this.#now();
    const segment: MarketingSegmentSummary = {
      id: createCorrelationId('mkt_seg'),
      accountId,
      name: requireNonEmptyString(input.name, 'name'),
      description: normalizeOptionalString(input.description),
      criteria: normalizeCriteria(input.criteria ?? {}),
      createdByUserId,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    this.#segments.set(segment.id, segment);
    await this.#repository?.saveSegment(segment);
    return segment;
  }

  public listSegments(accountId: AccountId): readonly MarketingSegmentSummary[] {
    return [...this.#segments.values()]
      .filter((segment) => segment.accountId === accountId)
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  public async createTemplate(
    accountId: AccountId,
    createdByUserId: UserId,
    input: CreateMarketingTemplateInput
  ): Promise<MarketingTemplateSummary> {
    const channel = requireEnum(input.channel, 'channel', ['sms', 'whatsapp', 'email']);
    const body = requireNonEmptyString(input.body, 'body');
    if (channel === 'sms' && body.length > 160) {
      throw new ValidationError('SMS template body must have at most 160 characters');
    }
    const timestamp = this.#now();
    const template: MarketingTemplateSummary = {
      id: createCorrelationId('mkt_tpl'),
      accountId,
      name: requireNonEmptyString(input.name, 'name'),
      channel,
      subject: normalizeOptionalString(input.subject),
      body,
      createdByUserId,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    this.#templates.set(template.id, template);
    await this.#repository?.saveTemplate(template);
    return template;
  }

  public listTemplates(accountId: AccountId, channel?: MarketingChannel): readonly MarketingTemplateSummary[] {
    return [...this.#templates.values()]
      .filter((template) => template.accountId === accountId && (!channel || template.channel === channel))
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  public async createCampaign(
    accountId: AccountId,
    createdByUserId: UserId,
    input: CreateMarketingCampaignInput
  ): Promise<MarketingCampaignSummary> {
    const channel = requireEnum(input.channel, 'channel', ['sms', 'whatsapp', 'email']);
    const segment = this.getSegment(accountId, input.segmentId);
    const template = this.getTemplate(accountId, input.templateId);
    if (template.channel !== channel) {
      throw new ValidationError('Campaign channel must match template channel', {
        campaignChannel: channel,
        templateChannel: template.channel
      });
    }

    const timestamp = this.#now();
    const campaign: MarketingCampaignSummary = {
      id: createCorrelationId('mkt_cmp'),
      accountId,
      name: requireNonEmptyString(input.name, 'name'),
      channel,
      status: 'draft',
      segmentId: segment.id,
      templateId: template.id,
      scheduledAt: normalizeOptionalString(input.scheduledAt),
      estimatedAudience: (await this.previewAudienceForAccount(
        accountId,
        segment.criteria,
        channel,
        input.audience ?? []
      )).length,
      createdByUserId,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    this.#campaigns.set(campaign.id, campaign);
    await this.#repository?.saveCampaign(campaign);
    return campaign;
  }

  public listCampaigns(
    accountId: AccountId,
    status?: MarketingCampaignStatus
  ): readonly MarketingCampaignSummary[] {
    return [...this.#campaigns.values()]
      .filter((campaign) => campaign.accountId === accountId && (!status || campaign.status === status))
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  public async scheduleCampaign(
    accountId: AccountId,
    scheduledByUserId: UserId,
    campaignId: string
  ): Promise<MarketingCampaignSummary> {
    const campaign = this.getCampaign(accountId, campaignId);
    if (campaign.status !== 'draft') {
      throw new ValidationError('Only draft marketing campaigns can be scheduled', {
        campaignId,
        status: campaign.status
      });
    }
    if (!campaign.scheduledAt) {
      throw new ValidationError('Campaign scheduledAt is required before scheduling', { campaignId });
    }
    const updated: MarketingCampaignSummary = {
      ...campaign,
      status: 'scheduled',
      scheduledByUserId,
      updatedAt: this.#now()
    };
    this.#campaigns.set(updated.id, updated);
    await this.#repository?.saveCampaign(updated);
    return updated;
  }

  public listDeliveries(
    accountId: AccountId,
    campaignId?: string
  ): readonly MarketingCampaignDeliverySummary[] {
    return [...this.#deliveries.values()]
      .filter((delivery) => delivery.accountId === accountId && (!campaignId || delivery.campaignId === campaignId))
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  public async getSetting(
    accountId: AccountId,
    key: MarketingSettingKey
  ): Promise<MarketingSettingSummary | null> {
    const cacheKey = `${accountId}:${key}`;
    const cached = this.#settings.get(cacheKey);
    if (cached) return cached;

    const loaded = await this.#repository?.findSetting?.(accountId, key);
    if (loaded) this.#settings.set(cacheKey, loaded);
    return loaded ?? null;
  }

  public async saveSetting(
    accountId: AccountId,
    updatedByUserId: UserId,
    input: SaveMarketingSettingInput
  ): Promise<MarketingSettingSummary> {
    if (
      (input.key === 'sms_automations' && input.channel !== 'sms')
      || (input.key === 'vaccine_email' && input.channel !== 'email')
    ) {
      throw new ValidationError('Marketing setting channel does not match its key');
    }

    const values = normalizeSettingValues(input.values);
    const setting: MarketingSettingSummary = {
      accountId,
      key: input.key,
      channel: input.channel,
      values,
      updatedByUserId,
      updatedAt: this.#now()
    };
    this.#settings.set(`${accountId}:${input.key}`, setting);
    await this.#repository?.saveSetting?.(setting);
    return setting;
  }

  public async dispatchCampaign(
    accountId: AccountId,
    _processedByUserId: UserId,
    campaignId: string,
    input: DispatchMarketingCampaignInput
  ): Promise<MarketingCampaignDispatchResult> {
    if (this.#requireConsentChecker && !this.#consentChecker) {
      throw new ValidationError('Marketing dispatch requires a durable consent checker');
    }
    const campaign = this.getCampaign(accountId, campaignId);
    if (campaign.status !== 'scheduled') {
      throw new ValidationError('Only scheduled marketing campaigns can be dispatched', {
        campaignId,
        status: campaign.status
      });
    }

    const segment = this.getSegment(accountId, campaign.segmentId);
    const template = this.getTemplate(accountId, campaign.templateId);
    const audience = await this.previewAudienceForAccount(
      accountId,
      segment.criteria,
      campaign.channel,
      input.audience
    );
    const running = await this.updateCampaign(campaign, { status: 'running' });
    const deliveries: MarketingCampaignDeliverySummary[] = [];
    const deliveryKeys = new Set<string>();

    for (const member of audience) {
      if (!(await this.#hasActiveConsent(
        accountId,
        member.ownerId,
        segment.criteria.consentPurpose ?? 'marketing'
      ))) {
        continue;
      }
      const contact = member.contacts.find((item) => item.type === campaign.channel && item.value.trim().length > 0);
      if (!contact) continue;
      const queued = createDelivery(accountId, running, template, member, contact.value, this.#now());
      if (deliveryKeys.has(queued.deliveryKey)) continue;
      deliveryKeys.add(queued.deliveryKey);
      const claimResult = await this.#claimDelivery(queued);
      if (!claimResult) continue;
      if (!claimResult.claimed) {
        deliveries.push(claimResult.delivery);
        continue;
      }
      deliveries.push(await this.#sendDelivery(claimResult.delivery, running, input.gateway));
    }

    const sent = deliveries.filter((delivery) => delivery.status === 'sent').length;
    const failed = deliveries.filter((delivery) => delivery.status === 'failed').length;
    const skipped = Math.max(0, input.audience.length - deliveries.length);
    const finalCampaign = await this.updateCampaign(running, {
      status: 'sent',
      estimatedAudience: deliveries.length
    });

    return {
      campaign: finalCampaign,
      deliveries,
      summary: {
        total: deliveries.length,
        sent,
        failed,
        skipped
      }
    };
  }

  public async retryDelivery(
    accountId: AccountId,
    _processedByUserId: UserId,
    deliveryId: string,
    gateway: MarketingDispatchGateway
  ): Promise<MarketingCampaignDeliverySummary> {
    const delivery = this.#deliveries.get(deliveryId);
    if (!delivery || delivery.accountId !== accountId) {
      throw new NotFoundError('Marketing delivery not found', { deliveryId });
    }
    if (delivery.status !== 'failed') {
      throw new ValidationError('Only failed marketing deliveries can be retried', {
        deliveryId,
        status: delivery.status
      });
    }

    const now = this.#now();
    if (delivery.nextAttemptAt && new Date(delivery.nextAttemptAt).getTime() > new Date(now).getTime()) {
      throw new ValidationError('Marketing delivery retry available after the backoff window expires', {
        deliveryId,
        nextAttemptAt: delivery.nextAttemptAt
      });
    }

    const campaign = this.getCampaign(accountId, delivery.campaignId);
    if (this.#requireConsentChecker && !this.#consentChecker) {
      throw new ValidationError('Marketing retry requires a durable consent checker');
    }
    if (!(await this.#ownerExistsInTenant(accountId, delivery.ownerId))
      || !(await this.#hasActiveConsent(accountId, delivery.ownerId, 'marketing'))) {
      const skipped: MarketingCampaignDeliverySummary = {
        ...delivery,
        status: 'skipped',
        failureReason: 'marketing_consent_not_active',
        nextAttemptAt: undefined,
        updatedAt: now
      };
      this.#deliveries.set(skipped.id, skipped);
      await this.#repository?.saveDelivery(skipped);
      return skipped;
    }

    const claim = this.#createDeliveryClaim(now);
    const claimed = this.#repository?.claimRetryDelivery
      ? await this.#repository.claimRetryDelivery(accountId, delivery.id, claim)
      : {
          ...delivery,
          status: 'sending' as const,
          failureReason: undefined,
          failedAt: undefined,
          nextAttemptAt: undefined,
          lastAttemptAt: now,
          attemptCount: delivery.attemptCount + 1,
          leaseOwner: claim.leaseOwner,
          leaseExpiresAt: claim.leaseExpiresAt,
          updatedAt: now
        };
    if (!claimed) {
      throw new ValidationError('Marketing delivery is already being reprocessed', { deliveryId });
    }
    this.#deliveries.set(claimed.id, claimed);
    if (!this.#repository?.claimRetryDelivery) await this.#repository?.saveDelivery(claimed);
    return this.#sendDelivery(claimed, campaign, gateway);
  }

  public previewAudience(
    criteria: MarketingSegmentCriteria,
    channel: MarketingChannel,
    audience: readonly MarketingAudienceMember[]
  ): readonly MarketingAudienceMember[] {
    if (this.#repository) {
      throw new ValidationError('Tenant-scoped marketing preview requires an account context');
    }
    const consentPurpose = criteria.consentPurpose ?? 'marketing';
    return audience.filter(
      (member) =>
        matchesCriteria(member, criteria) &&
        (member.consentPurposes ?? []).includes(consentPurpose) &&
        hasChannel(member, channel)
    );
  }

  public async previewAudienceForAccount(
    accountId: AccountId,
    criteria: MarketingSegmentCriteria,
    channel: MarketingChannel,
    audience: readonly MarketingAudienceMember[]
  ): Promise<readonly MarketingAudienceMember[]> {
    const resolvedAudience = await this.#resolveAudience(accountId, channel, audience);
    const candidates = resolvedAudience.filter(
      (member) => matchesCriteria(member, criteria, Boolean(this.#repository)) && hasChannel(member, channel)
    );
    const purpose = criteria.consentPurpose ?? 'marketing';
    const eligible: MarketingAudienceMember[] = [];
    for (const member of candidates) {
      if (await this.#hasActiveConsent(accountId, member.ownerId, purpose)) {
        eligible.push(member);
      }
    }
    return eligible;
  }

  private getSegment(accountId: AccountId, segmentId: string): MarketingSegmentSummary {
    const segment = this.#segments.get(segmentId);
    if (!segment || segment.accountId !== accountId) {
      throw new NotFoundError('Marketing segment not found', { segmentId });
    }
    return segment;
  }

  private getTemplate(accountId: AccountId, templateId: string): MarketingTemplateSummary {
    const template = this.#templates.get(templateId);
    if (!template || template.accountId !== accountId) {
      throw new NotFoundError('Marketing template not found', { templateId });
    }
    return template;
  }

  private getCampaign(accountId: AccountId, campaignId: string): MarketingCampaignSummary {
    const campaign = this.#campaigns.get(campaignId);
    if (!campaign || campaign.accountId !== accountId) {
      throw new NotFoundError('Marketing campaign not found', { campaignId });
    }
    return campaign;
  }

  async #hasActiveConsent(
    accountId: AccountId,
    ownerId: string,
    purpose: MarketingConsentPurpose
  ): Promise<boolean> {
    const cached = this.#consents.get(consentCacheKey(accountId, ownerId));
    if (cached?.status === 'revoked') return false;
    if (cached?.status === 'granted' && purpose === 'marketing') return true;

    if (this.#consentChecker) {
      return this.#consentChecker.hasActiveConsent(accountId, ownerId, purpose);
    }

    if (purpose === 'marketing' && this.#repository?.findConsent) {
      const persisted = await this.#repository.findConsent(accountId, ownerId);
      if (persisted) {
        this.#consents.set(consentCacheKey(accountId, ownerId), persisted);
        return persisted.status === 'granted';
      }
      return false;
    }

    if (this.#repository) return false;
    return true;
  }

  async #assertOwnerInTenant(accountId: AccountId, ownerId: string): Promise<void> {
    if (!this.#repository) return;
    if (!this.#repository.findOwner) {
      throw new ValidationError('Marketing consent requires tenant-scoped owner validation');
    }
    const owner = await this.#repository.findOwner(accountId, ownerId);
    if (!owner) {
      throw new NotFoundError('Owner not found', { ownerId });
    }
  }

  async #ownerExistsInTenant(accountId: AccountId, ownerId: string): Promise<boolean> {
    if (!this.#repository?.findOwner) return true;
    return (await this.#repository.findOwner(accountId, ownerId)) !== null;
  }

  async #resolveAudience(
    accountId: AccountId,
    channel: MarketingChannel,
    audience: readonly MarketingAudienceMember[]
  ): Promise<readonly MarketingAudienceMember[]> {
    if (audience.length === 0 || !this.#repository) return audience;
    if (!this.#repository.resolveAudience) {
      throw new ValidationError('Marketing audience requires tenant-scoped owner, patient and contact validation');
    }
    return this.#repository.resolveAudience(accountId, channel, audience);
  }

  #createDeliveryClaim(now: string): MarketingDeliveryClaim {
    return {
      leaseOwner: this.#leaseOwner,
      now,
      leaseExpiresAt: addMilliseconds(new Date(now), this.#leaseDurationMs)
    };
  }

  async #claimDelivery(
    delivery: MarketingCampaignDeliverySummary
  ): Promise<{ readonly delivery: MarketingCampaignDeliverySummary; readonly claimed: boolean } | null> {
    const cached = this.#deliveries.get(delivery.id)
      ?? [...this.#deliveries.values()].find((item) => item.accountId === delivery.accountId && item.deliveryKey === delivery.deliveryKey);
    if (cached && (cached.status === 'sent' || cached.status === 'skipped')) {
      return { delivery: cached, claimed: false };
    }

    if (this.#repository?.claimDelivery) {
      const claim = this.#createDeliveryClaim(this.#now());
      const claimed = await this.#repository.claimDelivery(cached ?? delivery, claim);
      if (claimed) {
        this.#deliveries.set(claimed.id, claimed);
        return { delivery: claimed, claimed: true };
      }
      const existing = await this.#repository.findDeliveryByKey?.(delivery.accountId, delivery.deliveryKey);
      if (existing) this.#deliveries.set(existing.id, existing);
      return existing ? { delivery: existing, claimed: false } : null;
    }

    if (cached) {
      // The in-memory fallback has no database lease to reclaim. A delivery
      // already observed as active must not be sent a second time by a
      // repeated dispatch in the same process.
      return { delivery: cached, claimed: false };
    }

    const existing = await this.#repository?.findDeliveryByKey?.(delivery.accountId, delivery.deliveryKey);
    if (existing) {
      this.#deliveries.set(existing.id, existing);
      return { delivery: existing, claimed: false };
    }

    const claim = this.#createDeliveryClaim(this.#now());
    const claimed: MarketingCampaignDeliverySummary = {
      ...delivery,
      status: 'sending',
      attemptCount: delivery.attemptCount + 1,
      lastAttemptAt: claim.now,
      leaseOwner: claim.leaseOwner,
      leaseExpiresAt: claim.leaseExpiresAt,
      updatedAt: claim.now
    };
    this.#deliveries.set(claimed.id, claimed);
    await this.#repository?.saveDelivery(claimed);
    return { delivery: claimed, claimed: true };
  }

  async #sendDelivery(
    queued: MarketingCampaignDeliverySummary,
    campaign: MarketingCampaignSummary,
    gateway: MarketingDispatchGateway
  ): Promise<MarketingCampaignDeliverySummary> {
    if (queued.status !== 'sending') {
      throw new ValidationError('Marketing delivery must be claimed before sending', {
        deliveryId: queued.id,
        status: queued.status
      });
    }
    const attemptedAt = this.#now();
    const owner = this.#repository?.findOwner
      ? await this.#repository.findOwner(queued.accountId, queued.ownerId)
      : null;
    let result: MarketingDispatchGatewayResult;
    try {
      result = await gateway.send({
        accountId: queued.accountId,
        campaignId: campaign.id,
        ownerId: queued.ownerId,
        ownerName: owner?.fullName ?? queued.ownerName,
        patientId: queued.patientId,
        channel: queued.channel,
        to: queued.recipient,
        subject: queued.subject,
        body: queued.body,
        deliveryKey: queued.deliveryKey,
        idempotencyKey: queued.deliveryKey
      });
    } catch (error) {
      result = {
        status: 'failed',
        provider: 'marketing-gateway',
        failureReason: error instanceof Error ? error.message : 'Marketing gateway failed before response',
        sentAt: attemptedAt
      };
    }

    const attemptCount = queued.attemptCount;
    const updated: MarketingCampaignDeliverySummary = {
      ...queued,
      status: result.status,
      provider: result.provider,
      providerMessageId: result.providerMessageId,
      failureReason: result.failureReason,
      attemptCount,
      updatedAt: result.sentAt,
      sentAt: result.status === 'sent' ? result.sentAt : undefined,
      failedAt: result.status === 'failed' ? result.sentAt : undefined,
      nextAttemptAt: result.status === 'failed'
        ? addMilliseconds(new Date(attemptedAt), computeRetryDelay(attemptCount, this.#retryBaseDelayMs, this.#retryMaxDelayMs))
        : undefined,
      lastAttemptAt: attemptedAt,
      leaseOwner: undefined,
      leaseExpiresAt: undefined
    };
    const repository = this.#repository;
    const completeDelivery = repository?.completeDelivery;
    const canCompleteWithLease = Boolean(queued.leaseOwner && completeDelivery);
    const completed = canCompleteWithLease
      ? await completeDelivery!.call(repository, updated, queued.leaseOwner!)
      : undefined;
    if (canCompleteWithLease && !completed) {
      const current = await repository?.findDeliveryByKey?.(updated.accountId, updated.deliveryKey);
      if (current) {
        this.#deliveries.set(current.id, current);
        return current;
      }
    }
    const resolved = completed ?? updated;
    this.#deliveries.set(resolved.id, resolved);
    if (!completed && !canCompleteWithLease) {
      await this.#repository?.saveDelivery(resolved);
    }
    return resolved;
  }

  private async updateCampaign(
    campaign: MarketingCampaignSummary,
    patch: Partial<Pick<MarketingCampaignSummary, 'status' | 'estimatedAudience'>>
  ): Promise<MarketingCampaignSummary> {
    const updated: MarketingCampaignSummary = {
      ...campaign,
      ...patch,
      updatedAt: this.#now()
    };
    this.#campaigns.set(updated.id, updated);
    await this.#repository?.saveCampaign(updated);
    return updated;
  }

  #now(): string {
    return this.#clock().toISOString();
  }
}

/* v8 ignore start -- SQL repository adapter covered by integration tests. */
export class DatabaseMarketingRepository implements MarketingRepository {
  async saveSegment(segment: MarketingSegmentSummary): Promise<void> {
    await withTenantQuery(getPool(), async (client) => {
      await client.query(
        `INSERT INTO marketing_segments (
          id, account_id, name, description, criteria, created_by_user_id, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          criteria = EXCLUDED.criteria,
          updated_at = EXCLUDED.updated_at`,
        segmentParams(segment)
      );
    });
  }

  async saveTemplate(template: MarketingTemplateSummary): Promise<void> {
    await withTenantQuery(getPool(), async (client) => {
      await client.query(
        `INSERT INTO marketing_templates (
          id, account_id, name, channel, subject, body, created_by_user_id, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          channel = EXCLUDED.channel,
          subject = EXCLUDED.subject,
          body = EXCLUDED.body,
          updated_at = EXCLUDED.updated_at`,
        templateParams(template)
      );
    });
  }

  async saveCampaign(campaign: MarketingCampaignSummary): Promise<void> {
    await withTenantQuery(getPool(), async (client) => {
      await client.query(
        `INSERT INTO marketing_campaigns (
          id, account_id, name, channel, status, segment_id, template_id, scheduled_at,
          scheduled_by_user_id, estimated_audience, created_by_user_id, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          channel = EXCLUDED.channel,
          status = EXCLUDED.status,
          segment_id = EXCLUDED.segment_id,
          template_id = EXCLUDED.template_id,
          scheduled_at = EXCLUDED.scheduled_at,
          scheduled_by_user_id = EXCLUDED.scheduled_by_user_id,
          estimated_audience = EXCLUDED.estimated_audience,
          updated_at = EXCLUDED.updated_at`,
        campaignParams(campaign)
      );
    });
  }

  async saveDelivery(delivery: MarketingCampaignDeliverySummary): Promise<void> {
    await withTenantQuery(getPool(), async (client) => {
      await client.query(
        `INSERT INTO marketing_campaign_deliveries (
          id, account_id, campaign_id, owner_id, patient_id, channel, recipient, subject, body,
          status, provider, provider_message_id, failure_reason, attempt_count,
          created_at, updated_at, sent_at, failed_at, delivery_key, next_attempt_at, last_attempt_at,
          lease_owner, lease_expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          provider = EXCLUDED.provider,
          provider_message_id = EXCLUDED.provider_message_id,
          failure_reason = EXCLUDED.failure_reason,
          attempt_count = EXCLUDED.attempt_count,
          updated_at = EXCLUDED.updated_at,
          sent_at = EXCLUDED.sent_at,
          failed_at = EXCLUDED.failed_at,
          delivery_key = EXCLUDED.delivery_key,
          next_attempt_at = EXCLUDED.next_attempt_at,
          last_attempt_at = EXCLUDED.last_attempt_at,
          lease_owner = EXCLUDED.lease_owner,
          lease_expires_at = EXCLUDED.lease_expires_at`,
        deliveryParams(delivery)
      );
    });
  }

  async findOwner(accountId: AccountId, ownerId: string): Promise<MarketingOwnerReference | null> {
    if (!isUuid(ownerId)) return null;
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `SELECT id, full_name, email, phone_main, phone_alt
           FROM owners
          WHERE account_id = $1
            AND id = $2::uuid
          LIMIT 1`,
        [accountId, ownerId]
      );
      const row = result.rows[0] as Record<string, unknown> | undefined;
      return row ? mapOwnerReference(row) : null;
    });
  }

  async resolveAudience(
    accountId: AccountId,
    channel: MarketingChannel,
    audience: readonly MarketingAudienceMember[]
  ): Promise<readonly MarketingAudienceMember[]> {
    if (audience.length === 0) return [];
    return withTenantQuery(getPool(), async (client) => {
      const ownerIds = [...new Set(audience.map((member) => member.ownerId).filter(isUuid))];
      if (ownerIds.length === 0) return [];
      const ownerResult = await client.query(
        `SELECT id, full_name, email, phone_main, phone_alt
           FROM owners
          WHERE account_id = $1
            AND id = ANY($2::uuid[])`,
        [accountId, ownerIds]
      );
      const ownersById = new Map(
        ownerResult.rows.map((row) => {
          const reference = mapOwnerReference(row as Record<string, unknown>);
          return [reference.id.toLowerCase(), reference] as const;
        })
      );

      const patientIds = [...new Set(
        audience
          .map((member) => member.patientId)
          .filter((patientId): patientId is string => Boolean(patientId && isUuid(patientId)))
      )];
      const patientsById = new Map<string, MarketingPatientReference>();
      if (patientIds.length > 0) {
        const patientResult = await client.query(
          `SELECT id, owner_id, name, species
             FROM patients
            WHERE account_id = $1
              AND id = ANY($2::uuid[])`,
          [accountId, patientIds]
        );
        for (const row of patientResult.rows) {
          const patient = mapPatientReference(row as Record<string, unknown>);
          patientsById.set(patient.id.toLowerCase(), patient);
        }
      }

      return audience.flatMap((member) => {
        const owner = ownersById.get(member.ownerId.toLowerCase());
        if (!owner) return [];
        const patient = member.patientId ? patientsById.get(member.patientId.toLowerCase()) : undefined;
        if (member.patientId && (!patient || patient.ownerId.toLowerCase() !== owner.id.toLowerCase())) return [];
        const contacts = owner.contacts.filter((contact) => contact.type === channel);
        if (contacts.length === 0) return [];
        return [{
          ...member,
          ownerId: owner.id,
          ownerName: owner.fullName,
          patientId: patient?.id,
          patientName: patient?.name,
          patientSpecies: patient?.species,
          contacts
        }];
      });
    });
  }

  async claimDelivery(
    delivery: MarketingCampaignDeliverySummary,
    claim?: MarketingDeliveryClaim
  ): Promise<MarketingCampaignDeliverySummary | null> {
    return withTenantQuery(getPool(), async (client) => {
      await client.query(
        `INSERT INTO marketing_campaign_deliveries (
           id, account_id, campaign_id, owner_id, patient_id, channel, recipient, subject, body,
           status, provider, provider_message_id, failure_reason, attempt_count,
           created_at, updated_at, sent_at, failed_at, delivery_key, next_attempt_at, last_attempt_at,
           lease_owner, lease_expires_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
         ON CONFLICT (account_id, delivery_key) DO NOTHING`,
        deliveryParams(delivery)
      );
      const effectiveClaim = claim ?? {
        leaseOwner: `legacy-marketing-${delivery.id}`,
        now: new Date().toISOString(),
        leaseExpiresAt: addMilliseconds(new Date(), 60_000)
      };
      const result = await client.query(
        `UPDATE marketing_campaign_deliveries
            SET status = 'sending',
                failure_reason = NULL,
                failed_at = NULL,
                next_attempt_at = NULL,
                attempt_count = attempt_count + 1,
                last_attempt_at = $3,
                lease_owner = $4,
                lease_expires_at = $5,
                updated_at = $3
          WHERE account_id = $1
            AND delivery_key = $2
            AND (
              (status = 'queued' AND (next_attempt_at IS NULL OR next_attempt_at <= $3))
              OR (status = 'failed' AND (next_attempt_at IS NULL OR next_attempt_at <= $3))
              OR (status = 'sending' AND lease_expires_at IS NOT NULL AND lease_expires_at <= $3)
            )
          RETURNING *`,
        [delivery.accountId, delivery.deliveryKey, new Date(effectiveClaim.now), effectiveClaim.leaseOwner, new Date(effectiveClaim.leaseExpiresAt)]
      );
      return result.rows.length === 0
        ? null
        : mapDelivery(result.rows[0] as Record<string, unknown>);
    });
  }

  async completeDelivery(
    delivery: MarketingCampaignDeliverySummary,
    leaseOwner: string
  ): Promise<MarketingCampaignDeliverySummary | null> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `UPDATE marketing_campaign_deliveries
            SET status = $3,
                provider = $4,
                provider_message_id = $5,
                failure_reason = $6,
                attempt_count = $7,
                updated_at = $8,
                sent_at = $9,
                failed_at = $10,
                delivery_key = $11,
                next_attempt_at = $12,
                last_attempt_at = $13,
                lease_owner = NULL,
                lease_expires_at = NULL
          WHERE account_id = $1
            AND id = $2
            AND status = 'sending'
            AND lease_owner = $14
          RETURNING *`,
        [
          delivery.accountId,
          delivery.id,
          delivery.status,
          delivery.provider ?? null,
          delivery.providerMessageId ?? null,
          delivery.failureReason ?? null,
          delivery.attemptCount,
          new Date(delivery.updatedAt),
          delivery.sentAt ? new Date(delivery.sentAt) : null,
          delivery.failedAt ? new Date(delivery.failedAt) : null,
          delivery.deliveryKey,
          delivery.nextAttemptAt ? new Date(delivery.nextAttemptAt) : null,
          delivery.lastAttemptAt ? new Date(delivery.lastAttemptAt) : null,
          leaseOwner
        ]
      );
      return result.rows.length === 0
        ? null
        : mapDelivery(result.rows[0] as Record<string, unknown>);
    });
  }

  async findSegments(accountId: AccountId): Promise<readonly MarketingSegmentSummary[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        'SELECT * FROM marketing_segments WHERE account_id = $1 ORDER BY name ASC',
        [accountId]
      );
      return result.rows.map(mapSegment);
    });
  }

  async findTemplates(accountId: AccountId): Promise<readonly MarketingTemplateSummary[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        'SELECT * FROM marketing_templates WHERE account_id = $1 ORDER BY name ASC',
        [accountId]
      );
      return result.rows.map(mapTemplate);
    });
  }

  async findCampaigns(accountId: AccountId): Promise<readonly MarketingCampaignSummary[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        'SELECT * FROM marketing_campaigns WHERE account_id = $1 ORDER BY created_at DESC',
        [accountId]
      );
      return result.rows.map(mapCampaign);
    });
  }

  async findDeliveries(
    accountId: AccountId,
    campaignId?: string
  ): Promise<readonly MarketingCampaignDeliverySummary[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `SELECT * FROM marketing_campaign_deliveries
         WHERE account_id = $1 AND ($2::text IS NULL OR campaign_id = $2)
         ORDER BY created_at DESC`,
        [accountId, campaignId ?? null]
      );
      return result.rows.map(mapDelivery);
    });
  }

  async findDeliveryByKey(accountId: AccountId, deliveryKey: string): Promise<MarketingCampaignDeliverySummary | null> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `SELECT * FROM marketing_campaign_deliveries
         WHERE account_id = $1 AND delivery_key = $2
         LIMIT 1`,
        [accountId, deliveryKey]
      );
      return result.rows.length === 0
        ? null
        : mapDelivery(result.rows[0] as Record<string, unknown>);
    });
  }

  async findConsent(accountId: AccountId, ownerId: string): Promise<MarketingConsentSummary | null> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `SELECT id, account_id, subject_id, purpose, status,
                granted_by, granted_at, revoked_by, revoked_at,
                COALESCE(revoked_by, granted_by) AS updated_by_user_id,
                COALESCE(revoked_at, granted_at) AS updated_at
           FROM consent_records
          WHERE account_id = $1
            AND subject_id = $2::uuid
            AND subject_type = 'owner'
            AND purpose = 'marketing'
            AND status IN ('granted', 'revoked')
          ORDER BY created_at DESC, id DESC
          LIMIT 1`,
        [accountId, ownerId]
      );
      return result.rows.length === 0
        ? null
        : mapConsent(result.rows[0] as Record<string, unknown>);
    });
  }

  async saveConsent(consent: MarketingConsentSummary): Promise<MarketingConsentSummary> {
    return withTenantQuery(getPool(), async (client) => {
      if (!isUuid(consent.ownerId)) {
        throw new NotFoundError('Owner not found', { ownerId: consent.ownerId });
      }
      const ownerResult = await client.query(
        `SELECT 1
           FROM owners
          WHERE account_id = $1
            AND id = $2::uuid
          LIMIT 1`,
        [consent.accountId, consent.ownerId]
      );
      if (ownerResult.rows.length === 0) {
        throw new NotFoundError('Owner not found', { ownerId: consent.ownerId });
      }

      const selectLatest = async (): Promise<MarketingConsentSummary | null> => {
        const result = await client.query(
          `SELECT id, account_id, subject_id, purpose, status,
                  granted_by, granted_at, revoked_by, revoked_at,
                  COALESCE(revoked_by, granted_by) AS updated_by_user_id,
                  COALESCE(revoked_at, granted_at) AS updated_at
             FROM consent_records
            WHERE account_id = $1
              AND subject_id = $2::uuid
              AND subject_type = 'owner'
              AND purpose = 'marketing'
              AND status IN ('granted', 'revoked')
            ORDER BY created_at DESC, id DESC
            LIMIT 1`,
          [consent.accountId, consent.ownerId]
        );
        return result.rows.length === 0
          ? null
          : mapConsent(result.rows[0] as Record<string, unknown>);
      };

      const existing = await selectLatest();
      if (existing?.status === consent.status) return existing;

      const timestamp = new Date(consent.updatedAt);
      if (existing && consent.status === 'revoked') {
        await client.query(
          `UPDATE consent_records
              SET status = 'revoked', revoked_by = $2, revoked_at = $3
            WHERE id = $1
              AND account_id = $4
              AND subject_id = $5::uuid
              AND subject_type = 'owner'
              AND purpose = 'marketing'`,
          [existing.id, consent.updatedByUserId, timestamp, consent.accountId, consent.ownerId]
        );
      } else {
        await client.query(
          `INSERT INTO consent_records (
             account_id, subject_id, subject_type, purpose, status, origin,
             granted_by, granted_at, revoked_by, revoked_at, metadata
           ) VALUES ($1, $2::uuid, 'owner', 'marketing', $3, 'api', $4, $5, $6, $7, $8::jsonb)`,
          [
            consent.accountId,
            consent.ownerId,
            consent.status,
            consent.updatedByUserId,
            timestamp,
            consent.status === 'revoked' ? consent.updatedByUserId : null,
            consent.status === 'revoked' ? timestamp : null,
            JSON.stringify({ source: 'marketing_preference' })
          ]
        );
      }

      const saved = await selectLatest();
      if (!saved) throw new Error('Marketing consent was not persisted');
      return saved;
    });
  }

  async claimRetryDelivery(
    accountId: AccountId,
    deliveryId: string,
    claim?: MarketingDeliveryClaim
  ): Promise<MarketingCampaignDeliverySummary | null> {
    return withTenantQuery(getPool(), async (client) => {
      const effectiveClaim = claim ?? {
        leaseOwner: `legacy-marketing-${deliveryId}`,
        now: new Date().toISOString(),
        leaseExpiresAt: addMilliseconds(new Date(), 60_000)
      };
      const result = await client.query(
        `UPDATE marketing_campaign_deliveries
            SET status = 'sending',
                failure_reason = NULL,
                failed_at = NULL,
                next_attempt_at = NULL,
                attempt_count = attempt_count + 1,
                last_attempt_at = $3,
                lease_owner = $4,
                lease_expires_at = $5,
                updated_at = $3
          WHERE account_id = $1
            AND id = $2
            AND status = 'failed'
            AND (next_attempt_at IS NULL OR next_attempt_at <= $3)
          RETURNING *`,
        [
          accountId,
          deliveryId,
          new Date(effectiveClaim.now),
          effectiveClaim.leaseOwner,
          new Date(effectiveClaim.leaseExpiresAt)
        ]
      );
      return result.rows.length === 0
        ? null
        : mapDelivery(result.rows[0] as Record<string, unknown>);
    });
  }

  async findSetting(accountId: AccountId, key: MarketingSettingKey): Promise<MarketingSettingSummary | null> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        'SELECT * FROM marketing_settings WHERE account_id = $1 AND setting_key = $2 LIMIT 1',
        [accountId, key]
      );
      return result.rows.length === 0
        ? null
        : mapSetting(result.rows[0] as Record<string, unknown>);
    });
  }

  async saveSetting(setting: MarketingSettingSummary): Promise<void> {
    await withTenantQuery(getPool(), async (client) => {
      await client.query(
        `INSERT INTO marketing_settings (
          account_id, setting_key, channel, values_json, updated_by_user_id, updated_at
        ) VALUES ($1, $2, $3, $4::jsonb, $5, $6)
        ON CONFLICT (account_id, setting_key) DO UPDATE SET
          channel = EXCLUDED.channel,
          values_json = EXCLUDED.values_json,
          updated_by_user_id = EXCLUDED.updated_by_user_id,
          updated_at = EXCLUDED.updated_at`,
        [
          setting.accountId,
          setting.key,
          setting.channel,
          JSON.stringify(setting.values),
          setting.updatedByUserId,
          new Date(setting.updatedAt)
        ]
      );
    });
  }
}

function normalizeOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function normalizeStringList(values: readonly string[] | undefined): readonly string[] | undefined {
  const normalized = (values ?? []).map((value) => value.trim()).filter(Boolean);
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeCriteria(criteria: MarketingSegmentCriteria): MarketingSegmentCriteria {
  const normalized: MarketingSegmentCriteria = {
    ownerGroups: normalizeStringList(criteria.ownerGroups),
    patientSpecies: normalizeStringList(criteria.patientSpecies),
    consentPurpose: criteria.consentPurpose,
    tags: normalizeStringList(criteria.tags)
  };
  if (
    normalized.consentPurpose !== undefined &&
    !['marketing', 'transactional', 'preventive'].includes(normalized.consentPurpose)
  ) {
    throw new ValidationError('Invalid consent purpose', { consentPurpose: normalized.consentPurpose });
  }
  return normalized;
}

function normalizeSettingValues(
  values: Readonly<Record<string, boolean | string>>
): Readonly<Record<string, boolean | string>> {
  const entries = Object.entries(values).map(([key, value]) => {
    const normalizedKey = key.trim();
    if (!normalizedKey || normalizedKey.length > 80) {
      throw new ValidationError('Marketing setting keys must be non-empty and at most 80 characters');
    }
    if (typeof value !== 'boolean' && typeof value !== 'string') {
      throw new ValidationError('Marketing setting values must be booleans or strings');
    }
    const normalizedValue = typeof value === 'string' ? value.trim() : value;
    if (typeof normalizedValue === 'string' && normalizedValue.length > 5000) {
      throw new ValidationError('Marketing setting text values must be at most 5000 characters');
    }
    return [normalizedKey, normalizedValue] as const;
  });
  return Object.fromEntries(entries);
}

function matchesCriteria(
  member: MarketingAudienceMember,
  criteria: MarketingSegmentCriteria,
  ignoreConsentPurpose = false
): boolean {
  if (criteria.ownerGroups?.length && !criteria.ownerGroups.includes(member.ownerGroup ?? '')) return false;
  if (criteria.patientSpecies?.length && !criteria.patientSpecies.includes(member.patientSpecies ?? '')) return false;
  if (!ignoreConsentPurpose && criteria.consentPurpose && !(member.consentPurposes ?? []).includes(criteria.consentPurpose)) return false;
  if (criteria.tags?.length && !criteria.tags.some((tag) => (member.tags ?? []).includes(tag))) return false;
  return true;
}

function hasChannel(member: MarketingAudienceMember, channel: MarketingChannel): boolean {
  return member.contacts.some((contact) => contact.type === channel && contact.value.trim().length > 0);
}

function renderTemplate(value: string | undefined, member: MarketingAudienceMember): string | undefined {
  if (!value) return undefined;
  return value
    .replace(/\{\{ownerName\}\}/g, member.ownerName)
    .replace(/\{\{patientName\}\}/g, member.patientName ?? '')
    .replace(/\{\{ownerId\}\}/g, member.ownerId)
    .replace(/\{\{patientId\}\}/g, member.patientId ?? '');
}

function createDelivery(
  accountId: AccountId,
  campaign: MarketingCampaignSummary,
  template: MarketingTemplateSummary,
  member: MarketingAudienceMember,
  recipient: string,
  timestamp: string
): MarketingCampaignDeliverySummary {
  const normalizedRecipient = recipient.trim();
  const deliveryKey = createDeliveryKey(
    accountId,
    campaign.id,
    member.ownerId,
    member.patientId,
    campaign.channel,
    normalizedRecipient
  );
  return {
    id: deliveryKey,
    accountId,
    campaignId: campaign.id,
    deliveryKey,
    ownerId: member.ownerId,
    ownerName: member.ownerName,
    patientId: member.patientId,
    channel: campaign.channel,
    recipient: normalizedRecipient,
    subject: renderTemplate(template.subject, member),
    body: renderTemplate(template.body, member) ?? template.body,
    status: 'queued',
    attemptCount: 0,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

function createDeliveryKey(
  accountId: AccountId,
  campaignId: string,
  ownerId: string,
  patientId: string | undefined,
  channel: MarketingChannel,
  recipient: string
): string {
  const fingerprint = createHash('sha256')
    .update([accountId, campaignId, ownerId, patientId ?? '', channel, recipient].join('|'))
    .digest('hex');
  return `mkt_del_${fingerprint}`;
}

function segmentParams(segment: MarketingSegmentSummary): unknown[] {
  return [
    segment.id,
    segment.accountId,
    segment.name,
    segment.description ?? null,
    JSON.stringify(segment.criteria),
    segment.createdByUserId,
    new Date(segment.createdAt),
    new Date(segment.updatedAt)
  ];
}

function templateParams(template: MarketingTemplateSummary): unknown[] {
  return [
    template.id,
    template.accountId,
    template.name,
    template.channel,
    template.subject ?? null,
    template.body,
    template.createdByUserId,
    new Date(template.createdAt),
    new Date(template.updatedAt)
  ];
}

function campaignParams(campaign: MarketingCampaignSummary): unknown[] {
  return [
    campaign.id,
    campaign.accountId,
    campaign.name,
    campaign.channel,
    campaign.status,
    campaign.segmentId,
    campaign.templateId,
    campaign.scheduledAt ? new Date(campaign.scheduledAt) : null,
    campaign.scheduledByUserId ?? null,
    campaign.estimatedAudience,
    campaign.createdByUserId,
    new Date(campaign.createdAt),
    new Date(campaign.updatedAt)
  ];
}

function deliveryParams(delivery: MarketingCampaignDeliverySummary): unknown[] {
  return [
    delivery.id,
    delivery.accountId,
    delivery.campaignId,
    delivery.ownerId,
    delivery.patientId ?? null,
    delivery.channel,
    delivery.recipient,
    delivery.subject ?? null,
    delivery.body,
    delivery.status,
    delivery.provider ?? null,
    delivery.providerMessageId ?? null,
    delivery.failureReason ?? null,
    delivery.attemptCount,
    new Date(delivery.createdAt),
    new Date(delivery.updatedAt),
    delivery.sentAt ? new Date(delivery.sentAt) : null,
    delivery.failedAt ? new Date(delivery.failedAt) : null,
    delivery.deliveryKey,
    delivery.nextAttemptAt ? new Date(delivery.nextAttemptAt) : null,
    delivery.lastAttemptAt ? new Date(delivery.lastAttemptAt) : null,
    delivery.leaseOwner ?? null,
    delivery.leaseExpiresAt ? new Date(delivery.leaseExpiresAt) : null
  ];
}

function resolveDuration(value: number | undefined, environmentKey: string, fallback: number): number {
  const configured = value ?? process.env[environmentKey];
  if (configured === undefined || configured === '') return fallback;
  const parsed = typeof configured === 'number' ? configured : Number(configured);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new ValidationError(`${environmentKey} must be a finite positive number in milliseconds`);
  }
  return parsed;
}

function computeRetryDelay(attemptCount: number, baseDelayMs: number, maxDelayMs: number): number {
  if (baseDelayMs === 0) return 0;
  const exponent = Math.max(0, attemptCount - 1);
  const multiplier = 2 ** Math.min(exponent, 30);
  return Math.min(maxDelayMs, baseDelayMs * multiplier);
}

function addMilliseconds(timestamp: Date, milliseconds: number): string {
  return new Date(timestamp.getTime() + milliseconds).toISOString();
}

function consentCacheKey(accountId: AccountId, ownerId: string): string {
  return `${accountId}:${ownerId}`;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

function dateIso(value: unknown): string {
  return new Date(value as string).toISOString();
}

function jsonCriteria(value: unknown): MarketingSegmentCriteria {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const record = value as Record<string, unknown>;
  return {
    ownerGroups: jsonStringArray(record.ownerGroups),
    patientSpecies: jsonStringArray(record.patientSpecies),
    consentPurpose: record.consentPurpose as MarketingConsentPurpose | undefined,
    tags: jsonStringArray(record.tags)
  };
}

function jsonStringArray(value: unknown): readonly string[] | undefined {
  const normalized = Array.isArray(value) ? value.map(String).filter(Boolean) : [];
  return normalized.length > 0 ? normalized : undefined;
}

function mapSegment(row: Record<string, unknown>): MarketingSegmentSummary {
  return {
    id: row.id as string,
    accountId: row.account_id as AccountId,
    name: row.name as string,
    description: row.description as string | undefined,
    criteria: jsonCriteria(row.criteria),
    createdByUserId: row.created_by_user_id as UserId,
    createdAt: dateIso(row.created_at),
    updatedAt: dateIso(row.updated_at)
  };
}

function mapTemplate(row: Record<string, unknown>): MarketingTemplateSummary {
  return {
    id: row.id as string,
    accountId: row.account_id as AccountId,
    name: row.name as string,
    channel: row.channel as MarketingChannel,
    subject: row.subject as string | undefined,
    body: row.body as string,
    createdByUserId: row.created_by_user_id as UserId,
    createdAt: dateIso(row.created_at),
    updatedAt: dateIso(row.updated_at)
  };
}

function mapCampaign(row: Record<string, unknown>): MarketingCampaignSummary {
  return {
    id: row.id as string,
    accountId: row.account_id as AccountId,
    name: row.name as string,
    channel: row.channel as MarketingChannel,
    status: row.status as MarketingCampaignStatus,
    segmentId: row.segment_id as string,
    templateId: row.template_id as string,
    scheduledAt: row.scheduled_at ? dateIso(row.scheduled_at) : undefined,
    scheduledByUserId: row.scheduled_by_user_id as UserId | undefined,
    estimatedAudience: Number(row.estimated_audience),
    createdByUserId: row.created_by_user_id as UserId,
    createdAt: dateIso(row.created_at),
    updatedAt: dateIso(row.updated_at)
  };
}

function mapConsent(row: Record<string, unknown>): MarketingConsentSummary {
  return {
    id: row.id as string,
    accountId: row.account_id as AccountId,
    ownerId: row.subject_id as string,
    purpose: 'marketing',
    status: row.status as MarketingConsentStatus,
    updatedByUserId: (row.updated_by_user_id ?? row.revoked_by ?? row.granted_by) as UserId,
    updatedAt: dateIso(row.updated_at ?? row.revoked_at ?? row.granted_at)
  };
}

function mapOwnerReference(row: Record<string, unknown>): MarketingOwnerReference {
  const phoneValues = [row.phone_main, row.phone_alt]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .map((value) => value.trim());
  const email = typeof row.email === 'string' && row.email.trim().length > 0
    ? row.email.trim()
    : undefined;
  const contacts = [
    ...phoneValues.flatMap((value) => [
      { type: 'sms' as const, value },
      { type: 'whatsapp' as const, value }
    ]),
    ...(email ? [{ type: 'email' as const, value: email }] : [])
  ];
  return {
    id: String(row.id),
    fullName: String(row.full_name),
    contacts: contacts.filter((contact, index, all) =>
      all.findIndex((candidate) => candidate.type === contact.type && candidate.value === contact.value) === index
    )
  };
}

function mapPatientReference(row: Record<string, unknown>): MarketingPatientReference {
  return {
    id: String(row.id),
    ownerId: String(row.owner_id),
    name: String(row.name),
    species: String(row.species)
  };
}

function mapDelivery(row: Record<string, unknown>): MarketingCampaignDeliverySummary {
  return {
    id: row.id as string,
    accountId: row.account_id as AccountId,
    campaignId: row.campaign_id as string,
    deliveryKey: (row.delivery_key as string | undefined) ?? (row.id as string),
    ownerId: row.owner_id as string,
    patientId: row.patient_id as string | undefined,
    channel: row.channel as MarketingChannel,
    recipient: row.recipient as string,
    subject: row.subject as string | undefined,
    body: row.body as string,
    status: row.status as MarketingDeliveryStatus,
    provider: row.provider as string | undefined,
    providerMessageId: row.provider_message_id as string | undefined,
    failureReason: row.failure_reason as string | undefined,
    attemptCount: Number(row.attempt_count),
    createdAt: dateIso(row.created_at),
    updatedAt: dateIso(row.updated_at),
    sentAt: row.sent_at ? dateIso(row.sent_at) : undefined,
    failedAt: row.failed_at ? dateIso(row.failed_at) : undefined,
    nextAttemptAt: row.next_attempt_at ? dateIso(row.next_attempt_at) : undefined,
    lastAttemptAt: row.last_attempt_at ? dateIso(row.last_attempt_at) : undefined,
    leaseOwner: row.lease_owner as string | undefined,
    leaseExpiresAt: row.lease_expires_at ? dateIso(row.lease_expires_at) : undefined
  };
}

function mapSetting(row: Record<string, unknown>): MarketingSettingSummary {
  const values = typeof row.values_json === 'string'
    ? JSON.parse(row.values_json) as Readonly<Record<string, boolean | string>>
    : row.values_json as Readonly<Record<string, boolean | string>>;
  return {
    accountId: row.account_id as AccountId,
    key: row.setting_key as MarketingSettingKey,
    channel: row.channel as MarketingSettingSummary['channel'],
    values,
    updatedByUserId: row.updated_by_user_id as UserId,
    updatedAt: row.updated_at instanceof Date
      ? row.updated_at.toISOString()
      : new Date(String(row.updated_at)).toISOString()
  };
}
/* v8 ignore stop */
