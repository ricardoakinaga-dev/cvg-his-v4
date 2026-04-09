import type { MfaRecord, MfaRepository } from './mfa-repository.interface.js';

export class InMemoryMfaRepository implements MfaRepository {
  readonly #records = new Map<string, MfaRecord>();

  async findByUserId(userId: string): Promise<MfaRecord | undefined> {
    return this.#records.get(userId);
  }

  async create(record: MfaRecord): Promise<void> {
    this.#records.set(record.userId, { ...record });
  }

  async update(record: MfaRecord): Promise<void> {
    if (!this.#records.has(record.userId)) {
      throw new Error(`MFA record for user ${record.userId} not found`);
    }
    this.#records.set(record.userId, { ...record });
  }

  async delete(userId: string): Promise<void> {
    this.#records.delete(userId);
  }
}
