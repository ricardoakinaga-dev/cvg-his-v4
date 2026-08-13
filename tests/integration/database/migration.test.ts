import { getTestPool } from '../../db/db-admin.js';
import { queryOne, queryMany } from '../../helpers/db-helpers.js';
import {
  permissionCatalog,
  roleCatalog
} from '@cvg-his-v2/module-access-control';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

function collectDeclaredTableNames(directory: string): readonly string[] {
  const tableNames = new Set<string>();
  const visit = (currentDirectory: string): void => {
    for (const entry of readdirSync(currentDirectory, { withFileTypes: true })) {
      const path = join(currentDirectory, entry.name);
      if (entry.isDirectory()) {
        visit(path);
      } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
        const source = readFileSync(path, 'utf8');
        for (const match of source.matchAll(/pgTable\(\s*['"]([^'"]+)['"]/g)) {
          if (match[1]) tableNames.add(match[1]);
        }
      }
    }
  };

  visit(directory);
  return [...tableNames].sort();
}

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
  it('materializes every table declared by the canonical and runtime schemas', async () => {
    const declaredTables = [...new Set([
      ...collectDeclaredTableNames('packages/db/src/schema'),
      ...collectDeclaredTableNames('packages/shared/database/src/schemas')
    ])].sort();
    const existingTables = await queryMany<{ table_name: string }>(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
       ORDER BY table_name`
    );
    const existingNames = new Set(existingTables.map((table) => table.table_name));
    const missingTables = declaredTables.filter((table) => !existingNames.has(table));

    expect(missingTables).toEqual([]);
  });

  const CRITICAL_TABLES = [
    'accounts',
    'sessions',
    'units',
    'users',
    'roles',
    'permissions',
    'role_permissions',
    'user_roles',
    'owners',
    'patients',
    'appointments',
    'encounters',
    'products',
    'services',
    'stock_items',
    'stock_lots',
    'stock_movements',
    'wards',
    'beds',
    'inpatient_stays',
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

describe('Migration — RBAC catalog parity', () => {
  it('persists every permission enforced by the runtime catalog', async () => {
    const persisted = await queryMany<{ key: string }>(
      `SELECT key FROM permissions ORDER BY key`
    );

    expect(persisted.map(({ key }) => key)).toEqual(
      permissionCatalog.map(({ code }) => code).sort()
    );
  });

  it.each(roleCatalog)('keeps role $code assignments equal to runtime', async (role) => {
    const persisted = await queryMany<{ key: string }>(
      `SELECT permissions.key
       FROM roles
       JOIN role_permissions ON role_permissions.role_id = roles.id
       JOIN permissions ON permissions.id = role_permissions.permission_id
       WHERE roles.name = $1
       ORDER BY permissions.key`,
      [role.code]
    );

    expect(persisted.map(({ key }) => key)).toEqual([...role.permissionCodes].sort());
  });
});

describe('Migration — Cross-tenant reference constraints', () => {
  const EXPECTED_TENANT_FOREIGN_KEYS = [
    'counter_sales_owner_account_fk',
    'counter_sales_opened_by_account_fk',
    'counter_sales_closed_by_account_fk',
    'counter_sale_items_sale_account_fk',
    'counter_sale_payments_sale_account_fk',
    'quotes_owner_account_fk',
    'quotes_created_by_account_fk',
    'quotes_converted_sale_account_fk',
    'quote_items_quote_account_fk',
    'finance_expenses_created_by_account_fk',
    'inventory_consumptions_item_account_fk',
    'inventory_consumptions_encounter_account_fk',
    'inventory_consumptions_patient_account_fk',
    'inventory_consumptions_user_account_fk',
    'inpatient_progress_stay_account_fk',
    'inpatient_progress_encounter_account_fk',
    'inpatient_progress_author_account_fk',
    'surgery_cases_encounter_account_fk',
    'surgery_cases_patient_account_fk',
    'surgery_cases_surgeon_account_fk',
    'owner_patient_links_owner_account_fk',
    'owner_patient_links_patient_account_fk'
  ];

  it('binds child references to the same account as their parent rows', async () => {
    const constraints = await queryMany<{ constraint_name: string }>(
      `SELECT constraint_name
       FROM information_schema.table_constraints
       WHERE constraint_schema = 'public'
         AND constraint_type = 'FOREIGN KEY'
         AND constraint_name = ANY($1::text[])
       ORDER BY constraint_name`,
      [EXPECTED_TENANT_FOREIGN_KEYS]
    );

    expect(constraints.map((constraint) => constraint.constraint_name)).toEqual(
      [...EXPECTED_TENANT_FOREIGN_KEYS].sort()
    );
  });

  it('has no single-column foreign key that can cross tenant-owned tables', async () => {
    const gaps = await queryMany<{
      child_table: string;
      parent_table: string;
      child_column: string;
    }>(`
      SELECT DISTINCT
        child.relname AS child_table,
        parent.relname AS parent_table,
        child_column.attname AS child_column
      FROM pg_constraint base_fk
      JOIN pg_class child ON child.oid = base_fk.conrelid
      JOIN pg_class parent ON parent.oid = base_fk.confrelid
      JOIN pg_namespace namespace ON namespace.oid = child.relnamespace
      JOIN pg_namespace parent_namespace ON parent_namespace.oid = parent.relnamespace
      JOIN pg_attribute child_column
        ON child_column.attrelid = child.oid
       AND child_column.attnum = base_fk.conkey[1]
      JOIN pg_attribute parent_column
        ON parent_column.attrelid = parent.oid
       AND parent_column.attnum = base_fk.confkey[1]
      JOIN pg_attribute child_account
        ON child_account.attrelid = child.oid
       AND child_account.attname = 'account_id'
       AND NOT child_account.attisdropped
      JOIN pg_attribute parent_account
        ON parent_account.attrelid = parent.oid
       AND parent_account.attname = 'account_id'
       AND NOT parent_account.attisdropped
      WHERE namespace.nspname = 'public'
        AND base_fk.contype = 'f'
        AND cardinality(base_fk.conkey) = 1
        AND cardinality(base_fk.confkey) = 1
        AND parent_column.attname = 'id'
        AND child_column.attname <> 'account_id'
        AND NOT EXISTS (
          SELECT 1
          FROM pg_constraint tenant_fk
          WHERE tenant_fk.contype = 'f'
            AND tenant_fk.conrelid = child.oid
            AND tenant_fk.confrelid = parent.oid
            AND child_account.attnum = ANY(tenant_fk.conkey)
            AND parent_account.attnum = ANY(tenant_fk.confkey)
        )
        AND NOT EXISTS (
          SELECT 1
          FROM pg_trigger tenant_trigger
          WHERE tenant_trigger.tgrelid = child.oid
            AND NOT tenant_trigger.tgisinternal
            AND tenant_trigger.tgname = format(
              'tenant_ref_%s_%s_%s',
              left(child.relname, 25),
              left(child_column.attname, 15),
              left(
                md5(
                  namespace.nspname || '.' || child.relname || '.' || child_column.attname ||
                  '->' || parent_namespace.nspname || '.' || parent.relname
                ),
                8
              )
            )
        )
      ORDER BY child.relname, parent.relname, child_column.attname
    `);

    expect(gaps).toEqual([]);
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
    {
      enumName: 'inpatient_stay_status',
      expectedValues: ['active', 'discharged', 'transferred', 'admitted', 'stable']
    },
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
