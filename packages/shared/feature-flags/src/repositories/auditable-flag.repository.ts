import type { DatabaseClient } from '@cvg-his-v2/shared-database';
import type { AuditService } from '@cvg-his-v2/module-audit';
import {
  DatabaseFeatureFlagRepository,
  type FeatureFlagInput,
  type FeatureFlagOverrideInput,
  type FeatureFlagOverrideUpdate,
  type FeatureFlagRepository,
  type FeatureFlagRow,
  type FeatureFlagOverrideRow,
  type FeatureFlagUpdate
} from './database-flag.repository.js';

/**
 * Wraps DatabaseFeatureFlagRepository with audit trail for every write operation.
 *
 * PR-FF-11: every create, update, delete of a flag or override generates an
 * audit event via AuditService with risk level 'high' (flags control runtime behavior).
 */
export class AuditableFeatureFlagRepository implements FeatureFlagRepository {
  readonly #inner: FeatureFlagRepository;
  readonly #audit: AuditService;
  readonly #actorId: string;
  readonly #accountId: string;

  public constructor(
    db: DatabaseClient,
    audit: AuditService,
    actorId: string,
    accountId: string
  ) {
    this.#inner = new DatabaseFeatureFlagRepository(db);
    this.#audit = audit;
    this.#actorId = actorId;
    this.#accountId = accountId;
  }

  public async findFlagByKey(key: string, accountId: string): Promise<FeatureFlagRow | null> {
    return this.#inner.findFlagByKey(key, accountId);
  }

  public async listFlags(accountId: string): Promise<readonly FeatureFlagRow[]> {
    return this.#inner.listFlags(accountId);
  }

  public async createFlag(input: FeatureFlagInput): Promise<FeatureFlagRow> {
    const flag = await this.#inner.createFlag(input);
    this.#audit.write({
      actorId: this.#actorId,
      accountId: this.#accountId,
      module: 'feature-flags',
      action: 'flag.create',
      entityType: 'feature_flag',
      entityId: flag.id,
      correlationId: `flags.${flag.key}`,
      payloadSummary: `Feature flag created: ${flag.key} (default=${flag.defaultValue}, owner=${flag.owner})`,
      riskLevel: 'high'
    });
    return flag;
  }

  public async updateFlag(id: string, input: FeatureFlagUpdate): Promise<FeatureFlagRow> {
    const before = await this.#inner.findFlagByKey(id, this.#accountId).catch(() => null);
    const flag = await this.#inner.updateFlag(id, input);
    this.#audit.write({
      actorId: this.#actorId,
      accountId: this.#accountId,
      module: 'feature-flags',
      action: 'flag.update',
      entityType: 'feature_flag',
      entityId: flag.id,
      correlationId: `flags.${flag.key}`,
      payloadSummary: `Feature flag updated: ${flag.key}. Changes: ${diffFlags(before, flag)}`,
      riskLevel: 'high'
    });
    return flag;
  }

  public async deleteFlag(id: string): Promise<void> {
    const before = await this.#inner.findFlagByKey(id, this.#accountId).catch(() => null);
    await this.#inner.deleteFlag(id);
    this.#audit.write({
      actorId: this.#actorId,
      accountId: this.#accountId,
      module: 'feature-flags',
      action: 'flag.delete',
      entityType: 'feature_flag',
      entityId: id,
      correlationId: `flags.${id}`,
      payloadSummary: `Feature flag disabled (soft delete): ${before?.key ?? id}`,
      riskLevel: 'high'
    });
  }

  public async findOverride(
    flagId: string,
    environment: string,
    accountId?: string
  ): Promise<FeatureFlagOverrideRow | null> {
    return this.#inner.findOverride(flagId, environment, accountId);
  }

  public async listOverrides(flagId: string): Promise<readonly FeatureFlagOverrideRow[]> {
    return this.#inner.listOverrides(flagId);
  }

  public async createOverride(input: FeatureFlagOverrideInput): Promise<FeatureFlagOverrideRow> {
    const override = await this.#inner.createOverride(input);
    this.#audit.write({
      actorId: this.#actorId,
      accountId: this.#accountId,
      module: 'feature-flags',
      action: 'flag.override.create',
      entityType: 'feature_flag_override',
      entityId: override.id,
      correlationId: `flags.${override.flagId}`,
      payloadSummary: `Flag override created for flag=${override.flagId} env=${override.environment ?? 'global'} percentage=${override.percentage ?? 'none'}`,
      riskLevel: 'high'
    });
    return override;
  }

  public async updateOverride(id: string, input: FeatureFlagOverrideUpdate): Promise<FeatureFlagOverrideRow> {
    const override = await this.#inner.updateOverride(id, input);
    this.#audit.write({
      actorId: this.#actorId,
      accountId: this.#accountId,
      module: 'feature-flags',
      action: 'flag.override.update',
      entityType: 'feature_flag_override',
      entityId: override.id,
      correlationId: `flags.${override.flagId}`,
      payloadSummary: `Flag override updated: ${override.flagId} env=${override.environment ?? 'global'} enabled=${override.enabled} percentage=${override.percentage ?? 'none'}`,
      riskLevel: 'high'
    });
    return override;
  }

  public async deleteOverride(id: string): Promise<void> {
    await this.#inner.deleteOverride(id);
    this.#audit.write({
      actorId: this.#actorId,
      accountId: this.#accountId,
      module: 'feature-flags',
      action: 'flag.override.delete',
      entityType: 'feature_flag_override',
      entityId: id,
      payloadSummary: `Flag override disabled (soft delete): ${id}`,
      riskLevel: 'high'
    });
  }
}

function diffFlags(before: FeatureFlagRow | null, after: FeatureFlagRow): string {
  if (!before) return 'entire record';
  const changes: string[] = [];
  if (before.enabled !== after.enabled) changes.push(`enabled: ${before.enabled}→${after.enabled}`);
  if (before.defaultValue !== after.defaultValue) changes.push(`defaultValue: ${before.defaultValue}→${after.defaultValue}`);
  if (before.owner !== after.owner) changes.push(`owner: ${before.owner}→${after.owner}`);
  if (before.enabled === false) changes.push('kill_switch_applied');
  return changes.join(', ') || 'no field changes';
}
