import { describe, expect, it } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';

import type { DatabaseClient } from '@cvg-his-v2/shared-database';
import {
  clinicalEntries,
  entryRevisions,
  prescriptionSignatures
} from '@cvg-his-v2/shared-database';
import { NotFoundError } from '@cvg-his-v2/shared-errors';
import type {
  PrescriptionRevisionSummary,
  PrescriptionSignatureSummary,
  PrescriptionSummary
} from '@cvg-his-v2/module-prescriptions';
import type { AccountId, UserId } from '@cvg-his-v2/shared-types';
import { runWithTenantContext } from '@cvg-his-v2/tenant-context';

import { DatabasePrescriptionRepository } from '../../../apps/api/src/repositories/database-prescription.repository.js';

type ClinicalEntryRow = typeof clinicalEntries.$inferSelect;
type EntryRevisionRow = typeof entryRevisions.$inferSelect;
type PrescriptionSignatureRow = typeof prescriptionSignatures.$inferSelect;
type AnyRow = ClinicalEntryRow | EntryRevisionRow | PrescriptionSignatureRow;
type RowRecord = Record<string, unknown>;

const ACCOUNT_A = '00000000-0000-4000-8000-000000000001' as AccountId;
const ACCOUNT_B = '00000000-0000-4000-8000-000000000002' as AccountId;
const USER_A = '00000000-0000-4000-8000-000000000011' as UserId;
const USER_B = '00000000-0000-4000-8000-000000000012' as UserId;
const PRESCRIPTION_A = 'rx-prescription-a';
const PRESCRIPTION_B = 'rx-prescription-b';
const SHARED_ENCOUNTER = '00000000-0000-4000-8000-000000000021';
const SHARED_PATIENT = '00000000-0000-4000-8000-000000000031';
const CREATED_AT = new Date('2026-08-31T10:00:00.000Z');

function rowForPrescription(
  accountId: AccountId,
  id: string,
  authorUserId: UserId,
  title: string
): ClinicalEntryRow {
  return {
    id,
    accountId,
    medicalRecordId: `mr-${accountId}`,
    encounterId: SHARED_ENCOUNTER,
    patientId: SHARED_PATIENT,
    authorUserId,
    entryType: 'prescription',
    title,
    content: `Posologia: ${title}`,
    version: 1,
    deletedAt: null,
    deletedByUserId: null,
    deleteReason: null,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT
  };
}

function revisionForPrescription(
  prescriptionId: string,
  authorUserId: UserId,
  id: string
): EntryRevisionRow {
  return {
    id,
    entryId: prescriptionId,
    version: 1,
    title: 'Prednisona',
    content: 'Posologia: Prednisona',
    authorUserId,
    reason: 'Prescription created',
    createdAt: CREATED_AT
  };
}

function signatureForPrescription(
  accountId: AccountId,
  prescriptionId: string,
  id: string,
  signedByUserId: UserId
): PrescriptionSignatureRow {
  return {
    id,
    accountId,
    prescriptionId,
    version: 1,
    signedByUserId,
    signatureHash: 'a'.repeat(64),
    signedAt: CREATED_AT
  };
}

function tableRows(table: unknown, state: FakeDatabase): AnyRow[] {
  if (table === clinicalEntries) return state.entries;
  if (table === entryRevisions) return state.revisions;
  if (table === prescriptionSignatures) return state.signatures;
  throw new Error('Unexpected table in fake database');
}

function camelCase(column: string): string {
  return column.replace(/_([a-z])/g, (_match, letter: string) => letter.toUpperCase());
}

function matches(row: AnyRow, condition: unknown): boolean {
  if (!condition) return true;

  const compiled = new PgDialect().sqlToQuery(condition as never);
  const predicates = /"[^"]+"\."([^"]+)" = \$(\d+)/g;
  let predicate = predicates.exec(compiled.sql);
  while (predicate) {
    const column = camelCase(predicate[1]!);
    const parameter = compiled.params[Number(predicate[2]) - 1];
    if ((row as RowRecord)[column] !== parameter) return false;
    predicate = predicates.exec(compiled.sql);
  }
  return true;
}

class FakeSelect {
  #table: unknown;
  #condition: unknown;

  public constructor(private readonly state: FakeDatabase) {}

  public from(table: unknown): this {
    this.#table = table;
    return this;
  }

  public where(condition: unknown): this {
    this.#condition = condition;
    return this;
  }

  public limit(limit: number): Promise<AnyRow[]> {
    return Promise.resolve(this.execute().slice(0, limit));
  }

  public then<TResult1 = AnyRow[], TResult2 = never>(
    onfulfilled?: ((value: AnyRow[]) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected);
  }

  private execute(): AnyRow[] {
    return tableRows(this.#table, this.state).filter((row) => matches(row, this.#condition));
  }
}

class FakeDatabase {
  public entries: ClinicalEntryRow[] = [
    rowForPrescription(ACCOUNT_A, PRESCRIPTION_A, USER_A, 'Amoxicilina'),
    rowForPrescription(ACCOUNT_B, PRESCRIPTION_B, USER_B, 'Prednisona')
  ];
  public revisions: EntryRevisionRow[] = [
    revisionForPrescription(PRESCRIPTION_B, USER_B, 'revision-b')
  ];
  public signatures: PrescriptionSignatureRow[] = [
    signatureForPrescription(
      ACCOUNT_A,
      PRESCRIPTION_B,
      '00000000-0000-4000-8000-000000000041',
      USER_A
    )
  ];

  public select(): FakeSelect {
    return new FakeSelect(this);
  }

  public insert(table: unknown): {
    values: (values: RowRecord) => Promise<void>;
  } {
    return {
      values: async (values) => {
        if (table === clinicalEntries) this.entries = [...this.entries, values as ClinicalEntryRow];
        if (table === entryRevisions)
          this.revisions = [...this.revisions, values as EntryRevisionRow];
        if (table === prescriptionSignatures) {
          this.signatures = [...this.signatures, values as PrescriptionSignatureRow];
        }
      }
    };
  }

  public update(table: unknown): {
    set: (values: RowRecord) => { where: (condition: unknown) => Promise<void> };
  } {
    return {
      set: (values) => ({
        where: async (condition) => {
          const rows = tableRows(table, this);
          for (const row of rows) {
            if (matches(row, condition)) Object.assign(row, values);
          }
        }
      })
    };
  }
}

function repositoryFixture(): {
  readonly database: FakeDatabase;
  readonly repository: DatabasePrescriptionRepository;
} {
  const database = new FakeDatabase();
  return {
    database,
    repository: new DatabasePrescriptionRepository(database as unknown as DatabaseClient)
  };
}

function tenant<T>(accountId: AccountId, operation: () => Promise<T>): Promise<T> {
  return runWithTenantContext(
    {
      tenantId: '00000000-0000-4000-8000-000000000099',
      accountId,
      correlationId: `prescription-repository-${accountId}`
    },
    operation
  );
}

describe('DatabasePrescriptionRepository tenant boundary', () => {
  it('requires an explicit account scope for every critical command and reader', async () => {
    const { database, repository } = repositoryFixture();
    const prescription = {
      id: PRESCRIPTION_A as never,
      accountId: ACCOUNT_A,
      medicalRecordId: 'mr-a' as never,
      encounterId: SHARED_ENCOUNTER as never,
      patientId: SHARED_PATIENT as never,
      entryType: 'prescription' as const,
      title: 'Amoxicilina',
      content: 'Posologia: Amoxicilina',
      authoredByUserId: USER_A,
      version: 1,
      createdAt: CREATED_AT.toISOString(),
      updatedAt: CREATED_AT.toISOString(),
      medicationName: 'Amoxicilina'
    } as PrescriptionSummary;
    const revision: PrescriptionRevisionSummary = {
      id: 'revision-missing-account',
      prescriptionId: PRESCRIPTION_A as never,
      version: 1,
      title: 'Amoxicilina',
      content: 'Posologia: Amoxicilina',
      authorUserId: USER_A,
      reason: 'missing account scope',
      createdAt: CREATED_AT.toISOString()
    };
    const missingAccount = undefined as never;

    await tenant(ACCOUNT_A, async () => {
      await expect(
        (repository.create as unknown as (value: PrescriptionSummary, accountId: unknown) => Promise<void>)(
          prescription,
          missingAccount
        )
      ).rejects.toThrow(/explicit account/i);
      await expect(
        (repository.update as unknown as (value: PrescriptionSummary, accountId: unknown) => Promise<void>)(
          prescription,
          missingAccount
        )
      ).rejects.toThrow(/explicit account/i);
      await expect(
        (repository.createRevision as unknown as (value: PrescriptionRevisionSummary, accountId: unknown) => Promise<void>)(
          revision,
          missingAccount
        )
      ).rejects.toThrow(/explicit account/i);
      await expect(
        (repository.findRevisions as unknown as (id: never, accountId: unknown) => Promise<unknown>)(
          PRESCRIPTION_A as never,
          missingAccount
        )
      ).rejects.toThrow(/explicit account/i);
      await expect(
        (repository.findById as unknown as (id: never, accountId: unknown) => Promise<unknown>)(
          PRESCRIPTION_A as never,
          missingAccount
        )
      ).rejects.toThrow(/explicit account/i);
      await expect(
        (repository.findByEncounterId as unknown as (
          id: never,
          accountId: unknown
        ) => Promise<unknown>)(SHARED_ENCOUNTER as never, missingAccount)
      ).rejects.toThrow(/explicit account/i);
      await expect(
        (repository.findByPatientId as unknown as (id: never, accountId: unknown) => Promise<unknown>)(
          SHARED_PATIENT as never,
          missingAccount
        )
      ).rejects.toThrow(/explicit account/i);
    });

    expect(database.entries).toHaveLength(2);
    expect(database.revisions).toHaveLength(1);
  });

  it('does not disclose or mutate a foreign prescription across detail, list, revision, update, or sign operations', async () => {
    const { database, repository } = repositoryFixture();

    await tenant(ACCOUNT_A, async () => {
      await expect(repository.findById(PRESCRIPTION_B as never, ACCOUNT_A)).resolves.toBeNull();
      await expect(
        repository.findByEncounterId(SHARED_ENCOUNTER as never, ACCOUNT_A)
      ).resolves.toEqual([expect.objectContaining({ id: PRESCRIPTION_A, accountId: ACCOUNT_A })]);
      await expect(repository.findByPatientId(SHARED_PATIENT as never, ACCOUNT_A)).resolves.toEqual(
        [expect.objectContaining({ id: PRESCRIPTION_A, accountId: ACCOUNT_A })]
      );
      await expect(repository.findRevisions(PRESCRIPTION_B as never, ACCOUNT_A)).resolves.toEqual(
        []
      );
      await expect(
        repository.findSignature(ACCOUNT_A, PRESCRIPTION_B as never, 1)
      ).resolves.toBeNull();

      const foreign = {
        id: PRESCRIPTION_B,
        accountId: ACCOUNT_A,
        medicalRecordId: 'mr-forged',
        encounterId: SHARED_ENCOUNTER,
        patientId: SHARED_PATIENT,
        entryType: 'prescription' as const,
        title: 'Alteracao cruzada',
        content: 'conteudo cruzado',
        authoredByUserId: USER_A,
        version: 2,
        createdAt: CREATED_AT.toISOString(),
        updatedAt: CREATED_AT.toISOString()
      } as PrescriptionSummary;
      await expect(repository.update(foreign, ACCOUNT_A)).rejects.toBeInstanceOf(NotFoundError);

      const revision: PrescriptionRevisionSummary = {
        id: 'revision-cross-account',
        prescriptionId: PRESCRIPTION_B as never,
        version: 1,
        title: 'Prednisona',
        content: 'Posologia: Prednisona',
        authorUserId: USER_A,
        reason: 'cross-account attempt',
        createdAt: CREATED_AT.toISOString()
      };
      await expect(repository.createRevision(revision, ACCOUNT_A)).rejects.toBeInstanceOf(
        NotFoundError
      );

      const signature: PrescriptionSignatureSummary & { readonly accountId: AccountId } = {
        accountId: ACCOUNT_A,
        prescriptionId: PRESCRIPTION_B as never,
        version: 1,
        signedByUserId: USER_A,
        signatureHash: 'b'.repeat(64),
        signedAt: CREATED_AT.toISOString()
      };
      await expect(repository.sign(signature)).rejects.toBeInstanceOf(NotFoundError);
    });

    expect(database.entries.find((row) => row.id === PRESCRIPTION_B)?.title).toBe('Prednisona');
    expect(database.revisions).toHaveLength(1);
    expect(database.signatures).toHaveLength(1);
  });

  it('fails closed when the authenticated tenant context is missing', async () => {
    const { repository } = repositoryFixture();

    await expect(repository.findById(PRESCRIPTION_A as never, ACCOUNT_A)).rejects.toThrow(
      /tenant context|Account ID/i
    );
  });
});
