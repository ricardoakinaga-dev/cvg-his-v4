/**
 * PrescriptionRepository — Interface
 *
 * Defines the contract for prescription persistence.
 * Implementations: InMemory (testing), PostgreSQL (production).
 */

import type { PrescriptionId, PrescriptionRevisionSummary, PrescriptionSummary } from '../index.js';

import type { EncounterId, PatientId, AccountId } from '@cvg-his-v2/shared-types';

export interface PrescriptionRepository {
  create(prescription: PrescriptionSummary, accountId: AccountId): Promise<void>;
  createWithRevision(
    prescription: PrescriptionSummary,
    revision: PrescriptionRevisionSummary,
    accountId: AccountId
  ): Promise<void>;
  update(prescription: PrescriptionSummary, accountId: AccountId): Promise<void>;
  updateWithRevision(
    prescription: PrescriptionSummary,
    revision: PrescriptionRevisionSummary,
    accountId: AccountId
  ): Promise<void>;
  findById(id: PrescriptionId, accountId: AccountId): Promise<PrescriptionSummary | null>;
  findByEncounterId(
    encounterId: EncounterId,
    accountId: AccountId
  ): Promise<readonly PrescriptionSummary[]>;
  findByPatientId(
    patientId: PatientId,
    accountId: AccountId
  ): Promise<readonly PrescriptionSummary[]>;
  findByAccountId(accountId: AccountId): Promise<readonly PrescriptionSummary[]>;
  findByAccountIdPaginated(
    accountId: AccountId,
    options: { offset: number; limit: number }
  ): Promise<{ items: readonly PrescriptionSummary[]; total: number }>;
}
