/**
 * PrescriptionRepository — Interface
 *
 * Defines the contract for prescription persistence.
 * Implementations: InMemory (testing), PostgreSQL (production).
 */

import type {
  PrescriptionId,
  PrescriptionSummary,
} from '../index.js';

import type { EncounterId, PatientId, AccountId } from '@cvg-his-v2/shared-types';

export interface PrescriptionRepository {
  create(prescription: PrescriptionSummary): Promise<void>;
  update(prescription: PrescriptionSummary): Promise<void>;
  findById(id: PrescriptionId): Promise<PrescriptionSummary | null>;
  findByEncounterId(encounterId: EncounterId): Promise<readonly PrescriptionSummary[]>;
  findByPatientId(patientId: PatientId): Promise<readonly PrescriptionSummary[]>;
  findByAccountId(accountId: AccountId): Promise<readonly PrescriptionSummary[]>;
  findByAccountIdPaginated(
    accountId: AccountId,
    options: { offset: number; limit: number }
  ): Promise<{ items: readonly PrescriptionSummary[]; total: number }>;
}
