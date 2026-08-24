import { randomUUID } from 'node:crypto';

import { getTestPool } from '../../db/db-admin.js';
import { queryOne, queryMany } from '../../helpers/db-helpers.js';

// ============================================================================
// DB Migration Tests — validates that the Drizzle migration produces a
// structurally sound database. Based on docs/740.
// ============================================================================

describe('Migration — Clean Apply', () => {
  it('should have applied migration without errors (implicit — suite runs)', () => {
    // If globalSetup succeeded, migration applied cleanly.
    expect(true).toBe(true);
  });
});

describe('Migration — Table Existence', () => {
  const CRITICAL_TABLES = [
    'accounts',
    'units',
    'users',
    'sessions',
    'roles',
    'permissions',
    'role_permissions',
    'user_roles',
    'access_teams',
    'access_sectors',
    'access_team_memberships',
    'access_sector_memberships',
    'access_user_permissions',
    'access_team_permissions',
    'access_sector_permissions',
    'owners',
    'patients',
    'owner_patient_links',
    'appointments',
    'encounters',
    'products',
    'services',
    'stock_items',
    'stock_lots',
    'stock_movements',
    'inventory_items',
    'inventory_consumptions',
    'inventory_stock_movements',
    'wards',
    'beds',
    'inpatient_stays',
    'inpatient_progress',
    'surgery_cases',
    'encounter_billing_items',
    'encounter_financial_accounts',
    'exam_orders',
    'exam_results',
    'clinical_notes',
    'clinical_note_versions',
    'medication_orders',
    'medication_order_schedules',
    'medication_administrations',
    'alerts',
    'documents',
    'encounter_documents',
    'protocols',
    'protocol_versions',
    'protocol_snapshots',
    'protocol_references',
    'audit_events',
    'payments',
    'cash_registers',
    'cash_movements',
    'counter_sales',
    'counter_sale_receipts',
    'scheduling_queue_transfers',
    'staff',
    'notifications',
    'notification_jobs',
    'scheduling_queue_entries',
    'triage_records',
    'triage_record_versions',
    'professional_availability',
    'appointment_type_configs',
    'shift_handovers',
    'shift_handover_items',
    'webhooks',
    'webhook_deliveries'
  ];

  it.each(CRITICAL_TABLES)('should have table: %s', async (tableName) => {
    const result = await queryOne<{ count: number }>(
      `SELECT COUNT(*)::int FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
      [tableName]
    );
    expect(result?.count).toBe(1);
  });

  const REMOVED_TABLES = ['notification_templates', 'notification_settings'];

  it.each(REMOVED_TABLES)(
    'table %s should NOT exist in the operational notification model',
    async (tableName) => {
      const result = await queryOne<{ count: number }>(
        `SELECT COUNT(*)::int FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
        [tableName]
      );
      expect(result?.count).toBe(0);
    }
  );
});

describe('Migration — Catalog Constraints', () => {
  const OPERATIONAL_PERMISSION_KEYS = [
    'prescriptions.read',
    'prescriptions.write',
    'service.read',
    'service.write',
    'quote.read',
    'quote.write'
  ];

  it('seeds auxiliary page permissions and grants them to admin', async () => {
    const rows = await queryMany<{ key: string; granted: boolean }>(
      `SELECT permission.key,
              EXISTS (
                SELECT 1
                FROM role_permissions assignment
                JOIN roles role ON role.id = assignment.role_id
                WHERE assignment.permission_id = permission.id
                  AND role.name = 'admin'
              ) AS granted
       FROM permissions permission
       WHERE permission.key = ANY($1::text[])`,
      [OPERATIONAL_PERMISSION_KEYS]
    );

    expect(rows.map((row) => row.key).sort()).toEqual([...OPERATIONAL_PERMISSION_KEYS].sort());
    expect(rows.every((row) => row.granted)).toBe(true);
  });

  const ANIMAL_SPECIES_SYSTEM_CODES = [
    'not_defined',
    'avian',
    'bovine',
    'canine',
    'rabbit',
    'equine',
    'feline',
    'other',
    'primate',
    'rodent',
    'reptile'
  ];

  it('appointments should expose the canonical operational scheduling contract', async () => {
    const columns = await queryMany<{
      column_name: string;
      data_type: string;
      is_nullable: string;
    }>(
      `SELECT column_name, data_type, is_nullable
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'appointments'`
    );
    const byName = new Map(columns.map((column) => [column.column_name, column]));

    expect(byName.get('start_at')?.data_type).toBe('timestamp with time zone');
    expect(byName.get('end_at')?.data_type).toBe('timestamp with time zone');
    expect(byName.get('visit_type')?.data_type).toBe('character varying');
    expect(byName.get('reason')?.data_type).toBe('text');
    expect(byName.get('practitioner_staff_id')?.data_type).toBe('uuid');
    expect(byName.get('service_id')?.data_type).toBe('uuid');
    expect(byName.get('professional_user_id')?.is_nullable).toBe('YES');
    expect(byName.has('scheduled_at')).toBe(false);
    expect(byName.has('duration')).toBe(false);
  });

  it('preserves encounter owner history while allowing a later primary-owner transfer', async () => {
    const account = await queryOne<{ id: string }>('SELECT id FROM accounts ORDER BY id LIMIT 1');
    expect(account).toBeTruthy();
    const client = await getTestPool().connect();
    const userId = randomUUID();
    const firstOwnerId = randomUUID();
    const nextOwnerId = randomUUID();
    const patientId = randomUUID();

    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO users (id, account_id, username, email, password_hash, full_name)
         VALUES ($1, $2, $3, $4, 'hash', 'Encounter owner test')`,
        [userId, account!.id, `owner-history-${userId}`, `owner-history-${userId}@example.com`]
      );
      await client.query(
        `INSERT INTO owners (id, account_id, full_name)
         VALUES ($1, $3, 'First owner'), ($2, $3, 'Next owner')`,
        [firstOwnerId, nextOwnerId, account!.id]
      );
      await client.query(
        `INSERT INTO patients (id, account_id, owner_id, name, species)
         VALUES ($1, $2, $3, 'Owner history patient', 'canine')`,
        [patientId, account!.id, firstOwnerId]
      );
      await client.query(
        `INSERT INTO encounters (
           id, account_id, patient_id, owner_id, opened_by_user_id, reason
         ) VALUES ($1, $2, $3, $4, $5, 'Historical owner')`,
        [randomUUID(), account!.id, patientId, firstOwnerId, userId]
      );

      await expect(
        client.query('UPDATE patients SET owner_id = $1 WHERE id = $2', [nextOwnerId, patientId])
      ).resolves.toBeDefined();

      await client.query('SAVEPOINT wrong_owner');
      await expect(
        client.query(
          `INSERT INTO encounters (
             id, account_id, patient_id, owner_id, opened_by_user_id, reason
           ) VALUES ($1, $2, $3, $4, $5, 'Stale owner')`,
          [randomUUID(), account!.id, patientId, firstOwnerId, userId]
        )
      ).rejects.toThrow();
      await client.query('ROLLBACK TO SAVEPOINT wrong_owner');
    } finally {
      await client.query('ROLLBACK').catch(() => undefined);
      client.release();
    }
  });

  it('animal_species should accept every Vetus system code seeded by the API', async () => {
    const account = await queryOne<{ id: string }>('SELECT id FROM accounts ORDER BY id LIMIT 1');
    expect(account).toBeTruthy();

    const pool = getTestPool();
    const client = await pool.connect();
    const suffix = Date.now().toString(36);

    try {
      await client.query('BEGIN');

      for (const systemCode of ANIMAL_SPECIES_SYSTEM_CODES) {
        await client.query(
          `INSERT INTO animal_species (
             id,
             account_id,
             name,
             code,
             system_code,
             active
           )
           VALUES ($1, $2, $3, $4, $5, true)`,
          [
            `species_constraint_${systemCode}_${suffix}`,
            account!.id,
            `Constraint ${systemCode}`,
            `CONSTRAINT_${systemCode}_${suffix}`,
            systemCode
          ]
        );
      }
    } finally {
      await client.query('ROLLBACK').catch(() => undefined);
      client.release();
    }
  });
});

describe('Migration 0065 — Tenant Isolation Contract', () => {
  const ACCOUNT_SCOPED_TABLES = [
    'mfa_credentials',
    'webhooks',
    'webhook_deliveries',
    'encounter_timeline',
    'owner_patient_links',
    'counter_sales',
    'counter_sale_receipts',
    'scheduling_queue_transfers'
  ];

  const UUID_REFERENCE_COLUMNS = [
    { tableName: 'mfa_credentials', columnName: 'user_id', nullable: false },
    { tableName: 'encounter_timeline', columnName: 'encounter_id', nullable: false },
    { tableName: 'encounter_timeline', columnName: 'actor_user_id', nullable: true },
    { tableName: 'owner_patient_links', columnName: 'owner_id', nullable: false },
    { tableName: 'owner_patient_links', columnName: 'patient_id', nullable: false },
    { tableName: 'counter_sales', columnName: 'patient_id', nullable: true },
    { tableName: 'counter_sales', columnName: 'encounter_id', nullable: true },
    { tableName: 'scheduling_queue_transfers', columnName: 'encounter_id', nullable: true },
    { tableName: 'scheduling_queue_transfers', columnName: 'counter_sale_id', nullable: true }
  ];

  const COMPOSITE_TENANT_FOREIGN_KEYS = [
    {
      tableName: 'mfa_credentials',
      columns: ['account_id', 'user_id'],
      referencedTable: 'users',
      referencedColumns: ['account_id', 'id']
    },
    {
      tableName: 'webhook_deliveries',
      columns: ['account_id', 'webhook_id'],
      referencedTable: 'webhooks',
      referencedColumns: ['account_id', 'id']
    },
    {
      tableName: 'encounter_timeline',
      columns: ['account_id', 'encounter_id'],
      referencedTable: 'encounters',
      referencedColumns: ['account_id', 'id']
    },
    {
      tableName: 'encounter_timeline',
      columns: ['account_id', 'actor_user_id'],
      referencedTable: 'users',
      referencedColumns: ['account_id', 'id']
    },
    {
      tableName: 'owner_patient_links',
      columns: ['account_id', 'owner_id'],
      referencedTable: 'owners',
      referencedColumns: ['account_id', 'id']
    },
    {
      tableName: 'owner_patient_links',
      columns: ['account_id', 'patient_id'],
      referencedTable: 'patients',
      referencedColumns: ['account_id', 'id']
    },
    {
      tableName: 'counter_sales',
      columns: ['account_id', 'patient_id'],
      referencedTable: 'patients',
      referencedColumns: ['account_id', 'id']
    },
    {
      tableName: 'counter_sales',
      columns: ['account_id', 'encounter_id'],
      referencedTable: 'encounters',
      referencedColumns: ['account_id', 'id']
    },
    {
      tableName: 'counter_sales',
      columns: ['account_id', 'queue_entry_id'],
      referencedTable: 'scheduling_queue_entries',
      referencedColumns: ['account_id', 'id']
    },
    {
      tableName: 'counter_sales',
      columns: ['account_id', 'billing_record_id'],
      referencedTable: 'billing_records',
      referencedColumns: ['account_id', 'id']
    },
    {
      tableName: 'counter_sale_receipts',
      columns: ['account_id', 'counter_sale_id'],
      referencedTable: 'counter_sales',
      referencedColumns: ['account_id', 'id']
    },
    {
      tableName: 'counter_sale_receipts',
      columns: ['account_id', 'received_by_user_id'],
      referencedTable: 'users',
      referencedColumns: ['account_id', 'id']
    },
    {
      tableName: 'counter_sale_receipts',
      columns: ['account_id', 'cash_register_id'],
      referencedTable: 'cash_registers',
      referencedColumns: ['account_id', 'id']
    },
    {
      tableName: 'counter_sale_receipts',
      columns: ['account_id', 'cash_movement_id'],
      referencedTable: 'cash_movements',
      referencedColumns: ['account_id', 'id']
    },
    {
      tableName: 'counter_sale_receipts',
      columns: ['account_id', 'journal_entry_id'],
      referencedTable: 'financial_journal_entries',
      referencedColumns: ['account_id', 'id']
    },
    {
      tableName: 'scheduling_queue_transfers',
      columns: ['account_id', 'queue_entry_id'],
      referencedTable: 'scheduling_queue_entries',
      referencedColumns: ['account_id', 'id']
    },
    {
      tableName: 'scheduling_queue_transfers',
      columns: ['account_id', 'encounter_id'],
      referencedTable: 'encounters',
      referencedColumns: ['account_id', 'id']
    },
    {
      tableName: 'scheduling_queue_transfers',
      columns: ['account_id', 'billing_record_id'],
      referencedTable: 'billing_records',
      referencedColumns: ['account_id', 'id']
    },
    {
      tableName: 'scheduling_queue_transfers',
      columns: ['account_id', 'counter_sale_id'],
      referencedTable: 'counter_sales',
      referencedColumns: ['account_id', 'id']
    }
  ];

  it.each(ACCOUNT_SCOPED_TABLES)('%s should have a required UUID account_id', async (tableName) => {
    const column = await queryOne<{ data_type: string; is_nullable: string }>(
      `SELECT data_type, is_nullable
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = $1
         AND column_name = 'account_id'`,
      [tableName]
    );

    expect(column).toEqual({ data_type: 'uuid', is_nullable: 'NO' });
  });

  it.each(UUID_REFERENCE_COLUMNS)(
    '$tableName column $columnName should use the canonical UUID type',
    async ({ tableName, columnName, nullable }) => {
      const column = await queryOne<{ data_type: string; is_nullable: string }>(
        `SELECT data_type, is_nullable
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = $1
           AND column_name = $2`,
        [tableName, columnName]
      );

      expect(column).toEqual({
        data_type: 'uuid',
        is_nullable: nullable ? 'YES' : 'NO'
      });
    }
  );

  it.each(ACCOUNT_SCOPED_TABLES)(
    '%s should enforce RLS with a tenant policy',
    async (tableName) => {
      const table = await queryOne<{ row_security: boolean }>(
        `SELECT c.relrowsecurity AS row_security
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public'
         AND c.relname = $1`,
        [tableName]
      );
      const policy = await queryOne<{ count: number }>(
        `SELECT COUNT(*)::int
       FROM pg_policies
       WHERE schemaname = 'public'
         AND tablename = $1
         AND COALESCE(qual, '') ILIKE '%account_id%'
         AND COALESCE(with_check, '') ILIKE '%account_id%'
         AND (
           COALESCE(qual, '') ILIKE '%app.current_account_id%'
           OR COALESCE(with_check, '') ILIKE '%app.current_account_id%'
         )`,
        [tableName]
      );

      expect(table).toEqual({ row_security: true });
      expect(policy?.count).toBeGreaterThan(0);
    }
  );

  it.each(COMPOSITE_TENANT_FOREIGN_KEYS)(
    '$tableName should bind ($columns) to $referencedTable in the same tenant',
    async ({ tableName, columns, referencedTable, referencedColumns }) => {
      const foreignKey = await queryOne<{ count: number }>(
        `SELECT COUNT(*)::int
         FROM pg_constraint fk
         JOIN pg_class source_table ON source_table.oid = fk.conrelid
         JOIN pg_namespace source_schema ON source_schema.oid = source_table.relnamespace
         JOIN pg_class target_table ON target_table.oid = fk.confrelid
         WHERE fk.contype = 'f'
           AND source_schema.nspname = 'public'
           AND source_table.relname = $1
           AND target_table.relname = $2
           AND ARRAY(
             SELECT source_attribute.attname::text
             FROM unnest(fk.conkey) WITH ORDINALITY AS source_key(attnum, position)
             JOIN pg_attribute source_attribute
               ON source_attribute.attrelid = fk.conrelid
              AND source_attribute.attnum = source_key.attnum
             ORDER BY source_key.position
           ) = $3::text[]
           AND ARRAY(
             SELECT target_attribute.attname::text
             FROM unnest(fk.confkey) WITH ORDINALITY AS target_key(attnum, position)
             JOIN pg_attribute target_attribute
               ON target_attribute.attrelid = fk.confrelid
              AND target_attribute.attnum = target_key.attnum
             ORDER BY target_key.position
           ) = $4::text[]`,
        [tableName, referencedTable, columns, referencedColumns]
      );

      expect(foreignKey?.count).toBe(1);
    }
  );

  it('owner_patient_links should keep relationship and responsibility invariants', async () => {
    const columns = await queryMany<{
      column_name: string;
      data_type: string;
      is_nullable: string;
    }>(
      `SELECT column_name, data_type, is_nullable
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'owner_patient_links'
         AND column_name IN ('relationship', 'is_primary', 'financial_responsible')`
    );
    const byName = new Map(columns.map((column) => [column.column_name, column]));
    const indexes = await queryMany<{ indexdef: string }>(
      `SELECT indexdef
       FROM pg_indexes
       WHERE schemaname = 'public'
         AND tablename = 'owner_patient_links'`
    );
    const relationshipCheck = await queryOne<{ count: number }>(
      `SELECT COUNT(*)::int
       FROM pg_constraint constraint_definition
       JOIN pg_class constrained_table ON constrained_table.oid = constraint_definition.conrelid
       JOIN pg_namespace constrained_schema ON constrained_schema.oid = constrained_table.relnamespace
       WHERE constraint_definition.contype = 'c'
         AND constrained_schema.nspname = 'public'
         AND constrained_table.relname = 'owner_patient_links'
         AND pg_get_constraintdef(constraint_definition.oid) ILIKE '%relationship%'
         AND pg_get_constraintdef(constraint_definition.oid) ILIKE '%primary%'
         AND pg_get_constraintdef(constraint_definition.oid) ILIKE '%secondary%'
         AND pg_get_constraintdef(constraint_definition.oid) ILIKE '%financial%'`
    );
    const normalizedIndexes = indexes.map(({ indexdef }) => indexdef.toLowerCase());

    expect(byName.get('relationship')?.is_nullable).toBe('NO');
    expect(byName.get('is_primary')).toEqual({
      column_name: 'is_primary',
      data_type: 'boolean',
      is_nullable: 'NO'
    });
    expect(byName.get('financial_responsible')).toEqual({
      column_name: 'financial_responsible',
      data_type: 'boolean',
      is_nullable: 'NO'
    });
    expect(relationshipCheck?.count).toBeGreaterThan(0);
    expect(
      normalizedIndexes.some(
        (definition) =>
          definition.includes('unique') &&
          definition.includes('(account_id, owner_id, patient_id, relationship)')
      )
    ).toBe(true);
    expect(
      normalizedIndexes.some(
        (definition) =>
          definition.includes('unique') &&
          definition.includes('(account_id, patient_id)') &&
          definition.includes('where') &&
          definition.includes('is_primary')
      )
    ).toBe(true);
  });
});

describe('Migration — Enum Existence', () => {
  const EXPECTED_ENUMS = [
    'encounter_status',
    'appointment_status',
    'appointment_type',
    'clinical_note_type',
    'clinical_note_status',
    'inpatient_stay_status',
    'exam_order_status',
    'exam_order_priority',
    'exam_category',
    'exam_result_status',
    'medication_order_status',
    'medication_administration_status',
    'medication_order_schedule_type',
    'stock_movement_type',
    'stock_lot_status',
    'billing_item_type',
    'encounter_financial_status',
    'encounter_receivable_status',
    'payment_method',
    'payment_status',
    'cash_register_status',
    'cash_movement_type',
    'alert_type',
    'alert_severity',
    'alert_status',
    'shift_handover_status',
    'shift_period'
  ];

  it.each(EXPECTED_ENUMS)('should have enum: %s', async (enumName) => {
    const result = await queryOne<{ count: number }>(
      `SELECT COUNT(*)::int FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typname = $1 AND t.typtype = 'e'`,
      [enumName]
    );
    expect(result?.count).toBe(1);
  });

  const GAP_ENUMS = [
    'notification_channel',
    'notification_status',
    'notification_type',
    'notification_priority'
  ];

  it.each(GAP_ENUMS)(
    'enum %s should NOT exist in the operational notification model',
    async (enumName) => {
      const result = await queryOne<{ count: number }>(
        `SELECT COUNT(*)::int FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typname = $1 AND t.typtype = 'e'`,
        [enumName]
      );
      expect(result?.count).toBe(0);
    }
  );
});

describe('Migration — Enum Values', () => {
  interface EnumCheck {
    enumName: string;
    expectedValues: string[];
  }

  const ENUM_CHECKS: EnumCheck[] = [
    { enumName: 'encounter_status', expectedValues: ['open', 'closed'] },
    {
      enumName: 'appointment_status',
      expectedValues: [
        'scheduled',
        'confirmed',
        'in_progress',
        'completed',
        'cancelled',
        'no_show',
        'checked_in'
      ]
    },
    {
      enumName: 'appointment_type',
      expectedValues: ['consultation', 'vaccination', 'surgery', 'exam', 'return', 'other']
    },
    { enumName: 'inpatient_stay_status', expectedValues: ['active', 'discharged', 'transferred'] },
    { enumName: 'exam_category', expectedValues: ['laboratory', 'imaging', 'other'] },
    { enumName: 'medication_order_status', expectedValues: ['active', 'stopped'] },
    {
      enumName: 'medication_administration_status',
      expectedValues: ['administered', 'refused', 'delayed', 'held']
    },
    {
      enumName: 'payment_method',
      expectedValues: [
        'cash',
        'credit_card',
        'debit_card',
        'pix',
        'bank_transfer',
        'check',
        'insurance',
        'other'
      ]
    },
    {
      enumName: 'payment_status',
      expectedValues: ['pending', 'completed', 'refunded', 'cancelled']
    },
    { enumName: 'alert_severity', expectedValues: ['low', 'medium', 'high'] },
    { enumName: 'alert_status', expectedValues: ['active', 'acknowledged', 'resolved'] }
  ];

  it.each(ENUM_CHECKS)(
    'enum $enumName should have correct values',
    async ({ enumName, expectedValues }) => {
      const result = await queryOne<{ values: string }>(
        `SELECT enum_range(NULL::${enumName})::text as values`,
        []
      );
      expect(result).toBeTruthy();
      // enum_range returns '{val1,val2,...}'
      const actualValues = result!.values.replace(/[{}]/g, '').split(',');
      expect(actualValues).toEqual(expectedValues);
    }
  );
});
