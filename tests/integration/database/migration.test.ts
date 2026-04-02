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
    'shift_handover_items'
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
      expectedValues: ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show']
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
