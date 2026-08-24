import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { DatabaseEncounterRepository } from '../../../packages/modules/encounters/src/repositories/database-encounter.repository.js';
import { EncountersService } from '../../../packages/modules/encounters/src/index.js';
import { DatabaseOwnerRepository } from '../../../packages/modules/owners/src/repositories/database-owner.repository.js';
import { OwnersService } from '../../../packages/modules/owners/src/index.js';
import {
  DatabaseOwnerPatientLinkRepository,
  DatabasePatientMergeRepository,
  DatabasePatientRepository,
  PatientsService
} from '../../../packages/modules/patients/src/index.js';
import { ConflictError, NotFoundError } from '../../../packages/shared/errors/src/index.js';
import {
  createDatabaseClient,
  getDatabaseClient,
  getPool,
  runInTenantTransactionContext
} from '../../../packages/shared/database/src/index.js';
import type {
  AccountId,
  OwnerId,
  OwnerPatientLinkId,
  OwnerPatientLinkSummary,
  OwnerSummary,
  PatientId,
  PatientSummary,
  UserId
} from '../../../packages/shared/types/src/index.js';
import { getTestPool } from '../../db/db-admin.js';
import { TEST_DB_URL } from '../../setup/env.js';
import { runWithTenantContext } from '../../../packages/tenant-context/src/index.js';

const TENANT_ID = randomUUID();
const ACCOUNT_ID = randomUUID() as AccountId;
const FOREIGN_ACCOUNT_ID = randomUUID() as AccountId;
const USER_ID = randomUUID() as UserId;
const OWNER_A_ID = randomUUID() as OwnerId;
const OWNER_B_ID = randomUUID() as OwnerId;
const OWNER_C_ID = randomUUID() as OwnerId;
const SOURCE_PATIENT_ID = randomUUID() as PatientId;
const TARGET_PATIENT_ID = randomUUID() as PatientId;
const INACTIVE_PATIENT_ID = randomUUID() as PatientId;
const FOREIGN_OWNER_ID = randomUUID() as OwnerId;
const FOREIGN_PATIENT_ID = randomUUID() as PatientId;
const NOW = '2026-08-24T12:00:00.000Z';

function owner(id: OwnerId, fullName: string, accountId: AccountId = ACCOUNT_ID): OwnerSummary {
  return {
    id,
    accountId,
    fullName,
    contacts: [
      {
        label: 'Telefone',
        value: `+55 11 9${id.replaceAll('-', '').slice(0, 9)}`,
        type: 'phone',
        primary: true
      }
    ],
    financialResponsible: true,
    status: 'active',
    createdAt: NOW,
    updatedAt: NOW
  };
}

function patient(
  id: PatientId,
  name: string,
  primaryOwnerId: OwnerId,
  accountId: AccountId = ACCOUNT_ID
): PatientSummary {
  return {
    id,
    accountId,
    name,
    species: 'canine',
    sex: 'female',
    primaryOwnerId,
    status: 'active',
    createdAt: NOW,
    updatedAt: NOW
  };
}

function link(
  id: OwnerPatientLinkId,
  ownerId: OwnerId,
  patientId: PatientId,
  relationshipType: OwnerPatientLinkSummary['relationshipType'],
  accountId: AccountId = ACCOUNT_ID
): OwnerPatientLinkSummary {
  return {
    id,
    accountId,
    ownerId,
    patientId,
    relationshipType,
    financialResponsible: relationshipType === 'primary',
    createdAt: NOW
  };
}

describe('patient registration lifecycle on PostgreSQL', () => {
  const pool = getTestPool();
  let owners: OwnersService;
  let patients: PatientsService;
  let encounters: EncountersService;

  const source = patient(SOURCE_PATIENT_ID, 'Luna duplicada', OWNER_A_ID);
  const target = patient(TARGET_PATIENT_ID, 'Luna canonica', OWNER_A_ID);
  const inactivePatient = patient(
    INACTIVE_PATIENT_ID,
    'Paciente dependente',
    OWNER_A_ID
  );
  const ownerA = owner(OWNER_A_ID, 'Tutor A');
  const ownerB = owner(OWNER_B_ID, 'Tutor B');
  const ownerC = owner(OWNER_C_ID, 'Autorizado C');
  const targetAuthorizedLink = link(
    `target-authorized-${randomUUID()}` as OwnerPatientLinkId,
    OWNER_C_ID,
    TARGET_PATIENT_ID,
    'authorized'
  );

  async function command<T>(operation: () => Promise<T> | T): Promise<T> {
    const correlationId = `registration-${randomUUID()}`;
    return runWithTenantContext(
      { tenantId: TENANT_ID, accountId: ACCOUNT_ID, correlationId },
      () =>
        runInTenantTransactionContext(
          getPool(),
          {
            accountId: ACCOUNT_ID,
            actorUserId: USER_ID,
            correlationId
          },
          async () => operation()
        )
    );
  }

  beforeAll(async () => {
    createDatabaseClient(TEST_DB_URL);
    await pool.query(
      `INSERT INTO tenants (id, slug, name, status, activated_at)
       VALUES ($1, $2, 'Patient registration lifecycle tenant', 'active', now())`,
      [TENANT_ID, `patient-registration-${TENANT_ID}`]
    );
    await pool.query(
      `INSERT INTO accounts (id, tenant_id, slug, name, is_active)
       VALUES ($1, $2, $3, 'Patient registration lifecycle account', true),
              ($4, $2, $5, 'Foreign patient registration account', true)`,
      [
        ACCOUNT_ID,
        TENANT_ID,
        `patient-registration-${ACCOUNT_ID.toString().slice(0, 16)}`,
        FOREIGN_ACCOUNT_ID,
        `patient-registration-foreign-${FOREIGN_ACCOUNT_ID.toString().slice(0, 12)}`
      ]
    );
    await pool.query(
      `INSERT INTO users (id, account_id, username, email, password_hash, full_name)
       VALUES ($1, $2, $3, $4, 'test-hash', 'Registration operator')`,
      [USER_ID, ACCOUNT_ID, `registration-${USER_ID}`, `registration-${USER_ID}@example.test`]
    );

    for (const currentOwner of [ownerA, ownerB, ownerC]) {
      await pool.query(
        `INSERT INTO owners (id, account_id, full_name, address_json)
         VALUES ($1, $2, $3, $4::jsonb)`,
        [
          currentOwner.id,
          ACCOUNT_ID,
          currentOwner.fullName,
          JSON.stringify({ status: currentOwner.status, contacts: currentOwner.contacts })
        ]
      );
    }
    await pool.query(
      `INSERT INTO owners (id, account_id, full_name, address_json)
       VALUES ($1, $2, 'Foreign owner', '{"status":"active"}'::jsonb)`,
      [FOREIGN_OWNER_ID, FOREIGN_ACCOUNT_ID]
    );

    for (const currentPatient of [source, target, inactivePatient]) {
      await pool.query(
        `INSERT INTO patients (id, account_id, owner_id, name, species, alerts_json)
         VALUES ($1, $2, $3, $4, $5, '{"status":"active"}'::jsonb)`,
        [
          currentPatient.id,
          ACCOUNT_ID,
          currentPatient.primaryOwnerId,
          currentPatient.name,
          currentPatient.species
        ]
      );
    }
    await pool.query(
      `INSERT INTO patients (id, account_id, owner_id, name, species, alerts_json)
       VALUES ($1, $2, $3, 'Foreign patient', 'canine', '{"status":"active"}'::jsonb)`,
      [FOREIGN_PATIENT_ID, FOREIGN_ACCOUNT_ID, FOREIGN_OWNER_ID]
    );

    const initialLinks = [
      link(`source-primary-${randomUUID()}` as OwnerPatientLinkId, OWNER_A_ID, SOURCE_PATIENT_ID, 'primary'),
      link(`target-primary-${randomUUID()}` as OwnerPatientLinkId, OWNER_A_ID, TARGET_PATIENT_ID, 'primary'),
      link(`inactive-primary-${randomUUID()}` as OwnerPatientLinkId, OWNER_A_ID, INACTIVE_PATIENT_ID, 'primary'),
      targetAuthorizedLink,
      link(
        `foreign-primary-${randomUUID()}` as OwnerPatientLinkId,
        FOREIGN_OWNER_ID,
        FOREIGN_PATIENT_ID,
        'primary',
        FOREIGN_ACCOUNT_ID
      )
    ];
    for (const currentLink of initialLinks) {
      await pool.query(
        `INSERT INTO owner_patient_links (
           id, account_id, owner_id, patient_id, relationship, is_primary, financial_responsible
         ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          currentLink.id,
          currentLink.accountId,
          currentLink.ownerId,
          currentLink.patientId,
          currentLink.relationshipType,
          currentLink.relationshipType === 'primary',
          currentLink.financialResponsible
        ]
      );
    }

    const database = getDatabaseClient();
    owners = new OwnersService({
      ownerRepository: new DatabaseOwnerRepository(database),
      seedOwners: [ownerA, ownerB, ownerC]
    });
    patients = new PatientsService({
      owners,
      patientRepository: new DatabasePatientRepository(database),
      ownerPatientLinkRepository: new DatabaseOwnerPatientLinkRepository(database),
      patientMergeRepository: new DatabasePatientMergeRepository(database),
      seedPatients: [source, target, inactivePatient],
      seedLinks: initialLinks.filter((currentLink) => currentLink.accountId === ACCOUNT_ID)
    });
    encounters = new EncountersService({
      owners,
      patients,
      encounterRepository: new DatabaseEncounterRepository(database)
    });
  });

  afterAll(async () => {
    await pool.query('DELETE FROM accounts WHERE id IN ($1, $2)', [ACCOUNT_ID, FOREIGN_ACCOUNT_ID]);
  });

  it('persists transfer, authorized links, merge audit, inactivation guards, and tenant isolation', async () => {
    const transferred = await command(async () => {
      const updated = patients.update(SOURCE_PATIENT_ID, { primaryOwnerId: OWNER_B_ID });
      await patients.waitForPersistence();
      return updated;
    });
    expect(transferred.primaryOwnerId).toBe(OWNER_B_ID);

    const transferState = await pool.query(
      `SELECT p.owner_id, l.owner_id AS primary_link_owner
         FROM patients p
         JOIN owner_patient_links l
           ON l.account_id = p.account_id
          AND l.patient_id = p.id
          AND l.relationship = 'primary'
        WHERE p.id = $1`,
      [SOURCE_PATIENT_ID]
    );
    expect(transferState.rows).toEqual([
      { owner_id: OWNER_B_ID, primary_link_owner: OWNER_B_ID }
    ]);

    const authorized = await command(async () => {
      const created = patients.createLink(ACCOUNT_ID, {
        ownerId: OWNER_C_ID,
        patientId: SOURCE_PATIENT_ID,
        relationshipType: 'authorized',
        financialResponsible: false
      });
      await patients.waitForPersistence();
      return created;
    });
    expect(authorized.relationshipType).toBe('authorized');

    const authorizedState = await pool.query(
      `SELECT relationship, is_primary, financial_responsible
         FROM owner_patient_links
        WHERE id = $1 AND account_id = $2`,
      [authorized.id, ACCOUNT_ID]
    );
    expect(authorizedState.rows).toEqual([
      { relationship: 'authorized', is_primary: false, financial_responsible: false }
    ]);

    const merged = await command(async () => {
      const result = patients.merge(
        ACCOUNT_ID,
        SOURCE_PATIENT_ID,
        TARGET_PATIENT_ID,
        USER_ID,
        'Consolidacao de cadastro duplicado'
      );
      await patients.waitForPersistence();
      return result;
    });
    expect(merged.status).toBe('inactive');

    const mergeState = await pool.query(
      `SELECT p.alerts_json->>'status' AS patient_status,
              COUNT(l.id)::int AS source_links,
              COUNT(pm.id)::int AS merge_audits
         FROM patients p
         LEFT JOIN owner_patient_links l
           ON l.account_id = p.account_id AND l.patient_id = p.id
         LEFT JOIN patient_merges pm
           ON pm.account_id = p.account_id AND pm.source_patient_id = p.id
        WHERE p.id = $1
        GROUP BY p.id, p.alerts_json`,
      [SOURCE_PATIENT_ID]
    );
    expect(mergeState.rows).toEqual([
      { patient_status: 'inactive', source_links: 0, merge_audits: 1 }
    ]);

    const targetLinks = await pool.query(
      `SELECT owner_id, relationship
         FROM owner_patient_links
        WHERE account_id = $1 AND patient_id = $2
        ORDER BY relationship, owner_id`,
      [ACCOUNT_ID, TARGET_PATIENT_ID]
    );
    expect(targetLinks.rows).toEqual([
      { owner_id: OWNER_C_ID, relationship: 'authorized' },
      { owner_id: OWNER_A_ID, relationship: 'primary' }
    ]);

    const existingEncounter = await command(async () => {
      const opened = encounters.openEncounter(ACCOUNT_ID, USER_ID, {
        patientId: INACTIVE_PATIENT_ID,
        ownerId: OWNER_A_ID,
        visitType: 'walk_in',
        origin: 'reception',
        reason: 'Dependencia anterior a inativacao'
      });
      await encounters.waitForPersistence();
      return opened;
    });

    await command(async () => {
      patients.update(INACTIVE_PATIENT_ID, { status: 'inactive' });
      await patients.waitForPersistence();
    });
    await expect(
      command(async () =>
        patients.createLink(ACCOUNT_ID, {
          ownerId: OWNER_C_ID,
          patientId: INACTIVE_PATIENT_ID,
          relationshipType: 'authorized',
          financialResponsible: false
        })
      )
    ).rejects.toBeInstanceOf(ConflictError);
    await expect(
      command(async () =>
        encounters.openEncounter(ACCOUNT_ID, USER_ID, {
          patientId: INACTIVE_PATIENT_ID,
          ownerId: OWNER_A_ID,
          visitType: 'walk_in',
          origin: 'reception',
          reason: 'Nao deve abrir apos inativacao'
        })
      )
    ).rejects.toBeInstanceOf(ConflictError);

    const retainedEncounter = await pool.query(
      `SELECT id, patient_id
         FROM encounters
        WHERE id = $1 AND account_id = $2`,
      [existingEncounter.id, ACCOUNT_ID]
    );
    expect(retainedEncounter.rows).toEqual([
      { id: existingEncounter.id, patient_id: INACTIVE_PATIENT_ID }
    ]);

    await command(async () => {
      owners.update(OWNER_C_ID, { status: 'inactive' });
      await owners.waitForPersistence();
    });
    await expect(
      command(() => patients.update(TARGET_PATIENT_ID, { primaryOwnerId: OWNER_C_ID }))
    ).rejects.toBeInstanceOf(ConflictError);

    const foreignCorrelationId = `foreign-registration-${randomUUID()}`;
    await expect(
      runWithTenantContext(
        {
          tenantId: TENANT_ID,
          accountId: FOREIGN_ACCOUNT_ID,
          correlationId: foreignCorrelationId
        },
        () =>
          runInTenantTransactionContext(
            getPool(),
            {
              accountId: FOREIGN_ACCOUNT_ID,
              actorUserId: USER_ID,
              correlationId: foreignCorrelationId
            },
            async () => patients.getAuthoritativeOrThrow(FOREIGN_ACCOUNT_ID, SOURCE_PATIENT_ID)
          )
      )
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
