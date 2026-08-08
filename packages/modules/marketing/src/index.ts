import { getPool } from '@cvg-his-v2/shared-database';
import { NotFoundError, ValidationError } from '@cvg-his-v2/shared-errors';
import type { AccountId, UserId } from '@cvg-his-v2/shared-types';
import { createCorrelationId, nowIso } from '@cvg-his-v2/shared-utils';
import { requireEnum, requireNonEmptyString } from '@cvg-his-v2/shared-validation';
import { withTenantQuery } from '@cvg-his-v2/tenant-context';

export type MarketingChannel = 'sms' | 'whatsapp' | 'email';
export type MarketingCampaignStatus = 'draft' | 'scheduled' | 'running' | 'sent' | 'cancelled';
export type MarketingDeliveryStatus = 'queued' | 'sent' | 'failed' | 'skipped';
export type MarketingConsentPurpose = 'marketing' | 'transactional' | 'preventive';
export type MarketingSettingKey = 'sms_automations' | 'vaccine_email';

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
  readonly ownerId: string;
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
  findSetting?(accountId: AccountId, key: MarketingSettingKey): Promise<MarketingSettingSummary | null>;
  saveSetting?(setting: MarketingSettingSummary): Promise<void>;
}

export interface MarketingServiceOptions {
  readonly repository?: MarketingRepository;
  readonly consentChecker?: MarketingConsentChecker;
  /** Refuse outbound campaigns when the durable consent source is unavailable. */
  readonly requireConsentChecker?: boolean;
}

export class MarketingService {
  readonly #repository?: MarketingRepository;
  readonly #consentChecker?: MarketingConsentChecker;
  readonly #requireConsentChecker: boolean;
  readonly #segments = new Map<string, MarketingSegmentSummary>();
  readonly #templates = new Map<string, MarketingTemplateSummary>();
  readonly #campaigns = new Map<string, MarketingCampaignSummary>();
  readonly #deliveries = new Map<string, MarketingCampaignDeliverySummary>();
  readonly #settings = new Map<string, MarketingSettingSummary>();

  public constructor(options?: MarketingServiceOptions) {
    this.#repository = options?.repository;
    this.#consentChecker = options?.consentChecker;
    this.#requireConsentChecker = options?.requireConsentChecker === true;
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

  public async createSegment(
    accountId: AccountId,
    createdByUserId: UserId,
    input: CreateMarketingSegmentInput
  ): Promise<MarketingSegmentSummary> {
    const timestamp = nowIso();
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
    const timestamp = nowIso();
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

    const timestamp = nowIso();
    const campaign: MarketingCampaignSummary = {
      id: createCorrelationId('mkt_cmp'),
      accountId,
      name: requireNonEmptyString(input.name, 'name'),
      channel,
      status: 'draft',
      segmentId: segment.id,
      templateId: template.id,
      scheduledAt: normalizeOptionalString(input.scheduledAt),
      estimatedAudience: this.previewAudience(segment.criteria, channel, input.audience ?? []).length,
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
      updatedAt: nowIso()
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
      updatedAt: nowIso()
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
    const audience = this.previewAudience(segment.criteria, campaign.channel, input.audience);
    const running = await this.updateCampaign(campaign, { status: 'running' });
    const deliveries: MarketingCampaignDeliverySummary[] = [];

    for (const member of audience) {
      if (
        this.#consentChecker &&
        !(await this.#consentChecker.hasActiveConsent(
          accountId,
          member.ownerId,
          segment.criteria.consentPurpose ?? 'marketing'
        ))
      ) {
        continue;
      }
      const contact = member.contacts.find((item) => item.type === campaign.channel && item.value.trim().length > 0);
      if (!contact) continue;
      const queued = createDelivery(accountId, running, template, member, contact.value);
      this.#deliveries.set(queued.id, queued);
      await this.#repository?.saveDelivery(queued);

      const result = await input.gateway.send({
        accountId,
        campaignId: running.id,
        ownerId: member.ownerId,
        ownerName: member.ownerName,
        patientId: member.patientId,
        channel: campaign.channel,
        to: queued.recipient,
        subject: queued.subject,
        body: queued.body
      });
      const updated: MarketingCampaignDeliverySummary = {
        ...queued,
        status: result.status,
        provider: result.provider,
        providerMessageId: result.providerMessageId,
        failureReason: result.failureReason,
        attemptCount: queued.attemptCount + 1,
        updatedAt: result.sentAt,
        sentAt: result.status === 'sent' ? result.sentAt : undefined,
        failedAt: result.status === 'failed' ? result.sentAt : undefined
      };
      this.#deliveries.set(updated.id, updated);
      await this.#repository?.saveDelivery(updated);
      deliveries.push(updated);
    }

    const sent = deliveries.filter((delivery) => delivery.status === 'sent').length;
    const failed = deliveries.filter((delivery) => delivery.status === 'failed').length;
    const skipped = Math.max(0, input.audience.length - audience.length);
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

    const campaign = this.getCampaign(accountId, delivery.campaignId);
    if (this.#requireConsentChecker && !this.#consentChecker) {
      throw new ValidationError('Marketing retry requires a durable consent checker');
    }
    if (
      this.#consentChecker &&
      !(await this.#consentChecker.hasActiveConsent(accountId, delivery.ownerId, 'marketing'))
    ) {
      const skipped: MarketingCampaignDeliverySummary = {
        ...delivery,
        status: 'skipped',
        failureReason: 'marketing_consent_not_active',
        attemptCount: delivery.attemptCount + 1,
        updatedAt: nowIso()
      };
      this.#deliveries.set(skipped.id, skipped);
      await this.#repository?.saveDelivery(skipped);
      return skipped;
    }

    const queued: MarketingCampaignDeliverySummary = {
      ...delivery,
      status: 'queued',
      failureReason: undefined,
      failedAt: undefined,
      updatedAt: nowIso()
    };
    this.#deliveries.set(queued.id, queued);
    await this.#repository?.saveDelivery(queued);

    const result = await gateway.send({
      accountId,
      campaignId: campaign.id,
      ownerId: queued.ownerId,
      patientId: queued.patientId,
      channel: queued.channel,
      to: queued.recipient,
      subject: queued.subject,
      body: queued.body
    });
    const updated: MarketingCampaignDeliverySummary = {
      ...queued,
      status: result.status,
      provider: result.provider,
      providerMessageId: result.providerMessageId,
      failureReason: result.failureReason,
      attemptCount: queued.attemptCount + 1,
      updatedAt: result.sentAt,
      sentAt: result.status === 'sent' ? result.sentAt : undefined,
      failedAt: result.status === 'failed' ? result.sentAt : undefined
    };
    this.#deliveries.set(updated.id, updated);
    await this.#repository?.saveDelivery(updated);
    return updated;
  }

  public previewAudience(
    criteria: MarketingSegmentCriteria,
    channel: MarketingChannel,
    audience: readonly MarketingAudienceMember[]
  ): readonly MarketingAudienceMember[] {
    const consentPurpose = criteria.consentPurpose ?? 'marketing';
    return audience.filter(
      (member) =>
        matchesCriteria(member, criteria) &&
        (member.consentPurposes ?? []).includes(consentPurpose) &&
        hasChannel(member, channel)
    );
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

  private async updateCampaign(
    campaign: MarketingCampaignSummary,
    patch: Partial<Pick<MarketingCampaignSummary, 'status' | 'estimatedAudience'>>
  ): Promise<MarketingCampaignSummary> {
    const updated: MarketingCampaignSummary = {
      ...campaign,
      ...patch,
      updatedAt: nowIso()
    };
    this.#campaigns.set(updated.id, updated);
    await this.#repository?.saveCampaign(updated);
    return updated;
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
          created_at, updated_at, sent_at, failed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          provider = EXCLUDED.provider,
          provider_message_id = EXCLUDED.provider_message_id,
          failure_reason = EXCLUDED.failure_reason,
          attempt_count = EXCLUDED.attempt_count,
          updated_at = EXCLUDED.updated_at,
          sent_at = EXCLUDED.sent_at,
          failed_at = EXCLUDED.failed_at`,
        deliveryParams(delivery)
      );
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

function matchesCriteria(member: MarketingAudienceMember, criteria: MarketingSegmentCriteria): boolean {
  if (criteria.ownerGroups?.length && !criteria.ownerGroups.includes(member.ownerGroup ?? '')) return false;
  if (criteria.patientSpecies?.length && !criteria.patientSpecies.includes(member.patientSpecies ?? '')) return false;
  if (criteria.consentPurpose && !(member.consentPurposes ?? []).includes(criteria.consentPurpose)) return false;
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
  recipient: string
): MarketingCampaignDeliverySummary {
  const timestamp = nowIso();
  return {
    id: createCorrelationId('mkt_del'),
    accountId,
    campaignId: campaign.id,
    ownerId: member.ownerId,
    patientId: member.patientId,
    channel: campaign.channel,
    recipient,
    subject: renderTemplate(template.subject, member),
    body: renderTemplate(template.body, member) ?? template.body,
    status: 'queued',
    attemptCount: 0,
    createdAt: timestamp,
    updatedAt: timestamp
  };
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
    delivery.failedAt ? new Date(delivery.failedAt) : null
  ];
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

function mapDelivery(row: Record<string, unknown>): MarketingCampaignDeliverySummary {
  return {
    id: row.id as string,
    accountId: row.account_id as AccountId,
    campaignId: row.campaign_id as string,
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
    failedAt: row.failed_at ? dateIso(row.failed_at) : undefined
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
