import type { MfaRecord, MfaRepository } from './mfa-repository.interface.js';

export class InMemoryMfaRepository implements MfaRepository {
  readonly #records = new Map<string, MfaRecord>();

  async findByUserId(accountId: string, userId: string): Promise<MfaRecord | undefined> {
    const record = this.#records.get(this.#recordKey(accountId, userId));
    return record ? this.#copyRecord(record) : undefined;
  }

  async beginSetup(record: MfaRecord): Promise<boolean> {
    const key = this.#recordKey(record.accountId, record.userId);
    if (this.#records.get(key)?.isActive) return false;
    this.#records.set(key, this.#copyRecord(record));
    return true;
  }

  async activateSetup(
    accountId: string,
    userId: string,
    credentialId: string,
    matchedTotpCounter: number,
    activatedAt: string
  ): Promise<MfaRecord | undefined> {
    const key = this.#recordKey(accountId, userId);
    const existing = this.#records.get(key);
    if (
      !existing ||
      existing.credentialId !== credentialId ||
      existing.isActive ||
      !existing.setupExpiresAt ||
      new Date(existing.setupExpiresAt).getTime() <= new Date(activatedAt).getTime()
    ) {
      return undefined;
    }
    const activated: MfaRecord = {
      ...existing,
      isActive: true,
      activatedAt,
      lastTotpCounter: matchedTotpCounter,
      setupExpiresAt: undefined
    };
    this.#records.set(key, this.#copyRecord(activated));
    return this.#copyRecord(activated);
  }

  async create(record: MfaRecord): Promise<void> {
    this.#records.set(this.#recordKey(record.accountId, record.userId), this.#copyRecord(record));
  }

  async update(record: MfaRecord): Promise<boolean> {
    const key = this.#recordKey(record.accountId, record.userId);
    const existing = this.#records.get(key);
    if (!existing || existing.credentialId !== record.credentialId) {
      return false;
    }
    this.#records.set(
      key,
      this.#copyRecord({
        ...record,
        lastUsedAt: existing.lastUsedAt,
        lastTotpCounter: existing.lastTotpCounter
      })
    );
    return true;
  }

  async consumeTotpCounter(
    accountId: string,
    userId: string,
    credentialId: string,
    counter: number,
    usedAt: string
  ): Promise<boolean> {
    const key = this.#recordKey(accountId, userId);
    const existing = this.#records.get(key);
    if (
      !existing?.isActive ||
      existing.credentialId !== credentialId ||
      (existing.lastTotpCounter !== undefined && existing.lastTotpCounter >= counter)
    ) {
      return false;
    }
    this.#records.set(
      key,
      this.#copyRecord({ ...existing, lastTotpCounter: counter, lastUsedAt: usedAt })
    );
    return true;
  }

  async consumeRecoveryCode(
    accountId: string,
    userId: string,
    credentialId: string,
    recoveryCodeHash: string,
    usedAt: string
  ): Promise<boolean> {
    const key = this.#recordKey(accountId, userId);
    const existing = this.#records.get(key);
    if (
      !existing?.isActive ||
      existing.credentialId !== credentialId ||
      !existing.recoveryCodes.includes(recoveryCodeHash)
    ) {
      return false;
    }
    this.#records.set(
      key,
      this.#copyRecord({
        ...existing,
        recoveryCodes: existing.recoveryCodes.filter((code) => code !== recoveryCodeHash),
        lastUsedAt: usedAt
      })
    );
    return true;
  }

  async delete(accountId: string, userId: string, credentialId: string): Promise<boolean> {
    const key = this.#recordKey(accountId, userId);
    const existing = this.#records.get(key);
    if (!existing || existing.credentialId !== credentialId) return false;
    return this.#records.delete(key);
  }

  #recordKey(accountId: string, userId: string): string {
    return `${accountId}:${userId}`;
  }

  #copyRecord(record: MfaRecord): MfaRecord {
    return { ...record, recoveryCodes: [...record.recoveryCodes] };
  }
}
