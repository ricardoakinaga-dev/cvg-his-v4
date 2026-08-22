export interface MfaRecord {
  readonly credentialId: string;
  readonly accountId: string;
  readonly userId: string;
  readonly secret: string;
  readonly isActive: boolean;
  readonly recoveryCodes: readonly string[];
  readonly createdAt: string;
  readonly activatedAt?: string;
  readonly lastUsedAt?: string;
  readonly lastTotpCounter?: number;
  readonly setupExpiresAt?: string;
  readonly secretKeyVersion?: string;
  readonly lastRecoveryCodesRegeneratedAt?: string;
}

export interface BeginMfaSetupOptions {
  readonly ttlMs: number;
}

export interface MfaRepository {
  findByUserId(accountId: string, userId: string): Promise<MfaRecord | undefined>;
  beginSetup(record: MfaRecord, options?: BeginMfaSetupOptions): Promise<boolean>;
  activateSetup(
    accountId: string,
    userId: string,
    credentialId: string,
    matchedTotpCounter: number,
    activatedAt: string
  ): Promise<MfaRecord | undefined>;
  create(record: MfaRecord): Promise<void>;
  update(record: MfaRecord): Promise<boolean>;
  consumeTotpCounter(
    accountId: string,
    userId: string,
    credentialId: string,
    counter: number,
    usedAt: string
  ): Promise<boolean>;
  consumeRecoveryCode(
    accountId: string,
    userId: string,
    credentialId: string,
    recoveryCodeHash: string,
    usedAt: string
  ): Promise<boolean>;
  delete(accountId: string, userId: string, credentialId: string): Promise<boolean>;
}
