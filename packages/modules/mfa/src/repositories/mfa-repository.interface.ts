export interface MfaRecord {
  readonly accountId: string;
  readonly userId: string;
  readonly secret: string;
  readonly isActive: boolean;
  readonly recoveryCodes: readonly string[];
  readonly createdAt: string;
  readonly activatedAt?: string;
  readonly lastUsedAt?: string;
  readonly lastRecoveryCodesRegeneratedAt?: string;
}

export interface MfaRepository {
  findByUserId(accountId: string, userId: string): Promise<MfaRecord | undefined>;
  create(record: MfaRecord): Promise<void>;
  update(record: MfaRecord): Promise<void>;
  delete(accountId: string, userId: string): Promise<void>;
}
