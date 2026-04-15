import { describe, it, expect } from 'vitest';
import type {
  AccountId,
  UserId,
  PatientId,
  EncounterId,
  SessionId,
  ApiKeySummary,
  HealthStatus,
  UserSummary,
  SchedulingAppointmentSummary,
  QueueEntrySummary,
  EncounterSummary,
  TriageSummary,
  ClinicalEntrySummary,
  BillingRecordSummary,
  InventoryItemSummary,
  NotificationSummary,
  WebhookSummary,
} from './index.js';

// Test brand type utility
type Brand<T, TBrand extends string> = T & { readonly __brand: TBrand };
type TestBrandId = Brand<string, 'TestBrandId'>;

function createTestId(value: string): TestBrandId {
  return value as TestBrandId;
}

describe('types module', () => {
  describe('branded types', () => {
    it('creates branded id type', () => {
      const id = createTestId('usr-123');
      expect(typeof id).toBe('string');
      expect(id).toBe('usr-123');
    });

    it(' branded id is assignable to base type', () => {
      const id = createTestId('usr-456');
      const base: string = id;
      expect(base).toBe('usr-456');
    });
  });

  describe('ApiKeySummary', () => {
    it('creates valid ApiKeySummary', () => {
      const key: ApiKeySummary = {
        id: 'key-1' as import('./index.js').ApiKeyId,
        accountId: 'acc-1' as AccountId,
        name: 'My API Key',
        keyPrefix: 'cvg_abc',
        keyHash: 'hash123',
        permissions: ['read:patients', 'write:encounters'],
        rateLimit: 100,
        rateLimitWindow: 60000,
        expiresAt: '2026-12-31T00:00:00.000Z',
        lastUsedAt: null,
        isActive: true,
        createdBy: 'user-1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      };
      expect(key.name).toBe('My API Key');
      expect(key.permissions).toHaveLength(2);
      expect(key.isActive).toBe(true);
    });
  });

  describe('HealthStatus', () => {
    it('creates valid HealthStatus', () => {
      const health: HealthStatus = {
        ok: true,
        service: 'cvg-his-v2-api',
        version: '1.0.0',
        environment: 'development',
        timestamp: '2026-04-13T20:00:00.000Z',
        correlationId: 'corr-123',
      };
      expect(health.ok).toBe(true);
      expect(health.service).toBe('cvg-his-v2-api');
    });

    it('supports degraded health state', () => {
      const health: HealthStatus = {
        ok: false,
        service: 'cvg-his-v2-api',
        version: '1.0.0',
        environment: 'production',
        timestamp: '2026-04-13T20:00:00.000Z',
        correlationId: 'corr-456',
      };
      expect(health.ok).toBe(false);
    });
  });

  describe('UserSummary', () => {
    it('creates valid UserSummary', () => {
      const user: UserSummary = {
        id: 'usr-1' as UserId,
        accountId: 'acc-1' as AccountId,
        username: 'drsmith',
        email: 'drsmith@vet.com',
        displayName: 'Dr. Smith',
        status: 'active',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      };
      expect(user.status).toBe('active');
      expect(user.username).toBe('drsmith');
    });

    it('allows optional staffId', () => {
      const user: UserSummary = {
        id: 'usr-1' as UserId,
        accountId: 'acc-1' as AccountId,
        username: 'drsmith',
        email: 'drsmith@vet.com',
        displayName: 'Dr. Smith',
        status: 'active',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        staffId: 'staff-1' as import('./index.js').StaffId,
      };
      expect(user.staffId).toBe('staff-1');
    });
  });

  describe('SchedulingAppointmentSummary', () => {
    it('creates valid appointment', () => {
      const apt: SchedulingAppointmentSummary = {
        id: 'apt-1' as import('./index.js').AppointmentId,
        accountId: 'acc-1' as AccountId,
        patientId: 'pat-1' as PatientId,
        ownerId: 'own-1' as import('./index.js').OwnerId,
        scheduledAt: '2026-04-15T09:00:00.000Z',
        durationMinutes: 30,
        visitType: 'scheduled',
        reason: 'Annual checkup',
        practitionerStaffId: 'staff-1' as import('./index.js').StaffId,
        status: 'scheduled',
        createdAt: '2026-04-13T00:00:00.000Z',
        updatedAt: '2026-04-13T00:00:00.000Z',
      };
      expect(apt.visitType).toBe('scheduled');
      expect(apt.status).toBe('scheduled');
    });

    it('supports walk-in appointment', () => {
      const apt: SchedulingAppointmentSummary = {
        id: 'apt-2' as import('./index.js').AppointmentId,
        accountId: 'acc-1' as AccountId,
        patientId: 'pat-1' as PatientId,
        ownerId: 'own-1' as import('./index.js').OwnerId,
        scheduledAt: '2026-04-13T10:00:00.000Z',
        visitType: 'walk_in',
        reason: 'Urgent care',
        status: 'checked_in',
        createdAt: '2026-04-13T00:00:00.000Z',
        updatedAt: '2026-04-13T00:00:00.000Z',
      };
      expect(apt.visitType).toBe('walk_in');
    });
  });

  describe('QueueEntrySummary', () => {
    it('creates valid queue entry', () => {
      const entry: QueueEntrySummary = {
        id: 'q-1' as import('./index.js').QueueEntryId,
        accountId: 'acc-1' as AccountId,
        patientId: 'pat-1' as PatientId,
        ownerId: 'own-1' as import('./index.js').OwnerId,
        reason: 'Annual vaccination',
        priority: 'medium',
        status: 'waiting',
        checkedInAt: '2026-04-13T08:00:00.000Z',
        createdAt: '2026-04-13T08:00:00.000Z',
        updatedAt: '2026-04-13T08:00:00.000Z',
      };
      expect(entry.priority).toBe('medium');
      expect(entry.status).toBe('waiting');
    });

    it('supports all priority levels', () => {
      const priorities: QueueEntrySummary['priority'][] = ['low', 'medium', 'high', 'critical'];
      priorities.forEach((p) => {
        const entry: QueueEntrySummary = {
          id: 'q-1' as import('./index.js').QueueEntryId,
          accountId: 'acc-1' as AccountId,
          patientId: 'pat-1' as PatientId,
          ownerId: 'own-1' as import('./index.js').OwnerId,
          reason: 'Test',
          priority: p,
          status: 'waiting',
          checkedInAt: '2026-04-13T08:00:00.000Z',
          createdAt: '2026-04-13T08:00:00.000Z',
          updatedAt: '2026-04-13T08:00:00.000Z',
        };
        expect(entry.priority).toBe(p);
      });
    });
  });

  describe('EncounterSummary', () => {
    it('creates valid encounter', () => {
      const enc: EncounterSummary = {
        id: 'enc-1' as EncounterId,
        accountId: 'acc-1' as AccountId,
        patientId: 'pat-1' as PatientId,
        ownerId: 'own-1' as import('./index.js').OwnerId,
        visitType: 'scheduled',
        status: 'in_triage',
        origin: 'schedule',
        reason: 'Skin allergy',
        openedAt: '2026-04-13T09:00:00.000Z',
        createdByUserId: 'usr-1' as UserId,
        updatedAt: '2026-04-13T09:00:00.000Z',
      };
      expect(enc.status).toBe('in_triage');
    });

    it('can be closed', () => {
      const enc: EncounterSummary = {
        id: 'enc-1' as EncounterId,
        accountId: 'acc-1' as AccountId,
        patientId: 'pat-1' as PatientId,
        ownerId: 'own-1' as import('./index.js').OwnerId,
        visitType: 'scheduled',
        status: 'closed',
        origin: 'schedule',
        reason: 'Follow-up',
        openedAt: '2026-04-13T09:00:00.000Z',
        closedAt: '2026-04-13T10:30:00.000Z',
        closeReason: 'Consulta concluída',
        createdByUserId: 'usr-1' as UserId,
        updatedAt: '2026-04-13T10:30:00.000Z',
      };
      expect(enc.status).toBe('closed');
      expect(enc.closeReason).toBe('Consulta concluída');
    });
  });

  describe('TriageSummary', () => {
    it('creates valid triage', () => {
      const tri: TriageSummary = {
        id: 'tri-1' as import('./index.js').TriageRecordId,
        accountId: 'acc-1' as AccountId,
        encounterId: 'enc-1' as EncounterId,
        patientId: 'pat-1' as PatientId,
        priority: 'high',
        chiefComplaint: 'Vomiting blood',
        initialNotes: 'Patient presented with hematemesis',
        alerts: ['Risk of dehydration', 'Monitor vitals'],
        destination: 'in_care',
        triagedByUserId: 'usr-1' as UserId,
        createdAt: '2026-04-13T09:00:00.000Z',
        updatedAt: '2026-04-13T09:00:00.000Z',
      };
      expect(tri.priority).toBe('high');
      expect(tri.alerts).toHaveLength(2);
      expect(tri.destination).toBe('in_care');
    });
  });

  describe('ClinicalEntrySummary', () => {
    it('creates prescription entry', () => {
      const entry: ClinicalEntrySummary = {
        id: 'ce-1' as import('./index.js').ClinicalEntryId,
        accountId: 'acc-1' as AccountId,
        medicalRecordId: 'mr-1' as import('./index.js').MedicalRecordId,
        encounterId: 'enc-1' as EncounterId,
        patientId: 'pat-1' as PatientId,
        entryType: 'prescription',
        title: 'Metronidazole 500mg',
        content: 'Posologia: 1 comprimido\nVia: Oral\nFrequência: 8h',
        authoredByUserId: 'usr-1' as UserId,
        version: 1,
        createdAt: '2026-04-13T09:00:00.000Z',
        updatedAt: '2026-04-13T09:00:00.000Z',
      };
      expect(entry.entryType).toBe('prescription');
      expect(entry.version).toBe(1);
    });

    it('supports soft delete', () => {
      const entry: ClinicalEntrySummary = {
        id: 'ce-1' as import('./index.js').ClinicalEntryId,
        accountId: 'acc-1' as AccountId,
        medicalRecordId: 'mr-1' as import('./index.js').MedicalRecordId,
        encounterId: 'enc-1' as EncounterId,
        patientId: 'pat-1' as PatientId,
        entryType: 'progress_note',
        title: 'Daily check',
        content: 'Patient stable',
        authoredByUserId: 'usr-1' as UserId,
        version: 2,
        deletedAt: '2026-04-13T12:00:00.000Z',
        deletedByUserId: 'usr-2' as UserId,
        deleteReason: 'Wrong patient',
        createdAt: '2026-04-13T09:00:00.000Z',
        updatedAt: '2026-04-13T12:00:00.000Z',
      };
      expect(entry.deletedAt).toBeDefined();
      expect(entry.version).toBe(2);
    });

    it('covers all entry types', () => {
      const types: ClinicalEntrySummary['entryType'][] = [
        'anamnesis',
        'physical_exam',
        'progress_note',
        'assessment',
        'plan',
        'prescription',
        'conduct',
      ];
      types.forEach((type) => {
        const entry: ClinicalEntrySummary = {
          id: 'ce-1' as import('./index.js').ClinicalEntryId,
          accountId: 'acc-1' as AccountId,
          medicalRecordId: 'mr-1' as import('./index.js').MedicalRecordId,
          encounterId: 'enc-1' as EncounterId,
          patientId: 'pat-1' as PatientId,
          entryType: type,
          title: 'Test',
          content: 'Test',
          authoredByUserId: 'usr-1' as UserId,
          version: 1,
          createdAt: '2026-04-13T09:00:00.000Z',
          updatedAt: '2026-04-13T09:00:00.000Z',
        };
        expect(entry.entryType).toBe(type);
      });
    });
  });

  describe('BillingRecordSummary', () => {
    it('creates draft billing record', () => {
      const bill: BillingRecordSummary = {
        id: 'bill-1' as import('./index.js').BillingRecordId,
        accountId: 'acc-1' as AccountId,
        encounterId: 'enc-1' as EncounterId,
        patientId: 'pat-1' as PatientId,
        ownerId: 'own-1' as import('./index.js').OwnerId,
        status: 'draft',
        subtotalAmount: 150.50,
        currency: 'BRL',
        createdAt: '2026-04-13T10:00:00.000Z',
        updatedAt: '2026-04-13T10:00:00.000Z',
      };
      expect(bill.status).toBe('draft');
      expect(bill.currency).toBe('BRL');
    });

    it('supports all billing statuses', () => {
      const statuses: BillingRecordSummary['status'][] = ['draft', 'estimated', 'open', 'settled'];
      statuses.forEach((s) => {
        const bill: BillingRecordSummary = {
          id: 'bill-1' as import('./index.js').BillingRecordId,
          accountId: 'acc-1' as AccountId,
          encounterId: 'enc-1' as EncounterId,
          patientId: 'pat-1' as PatientId,
          ownerId: 'own-1' as import('./index.js').OwnerId,
          status: s,
          subtotalAmount: 100,
          currency: 'BRL',
          createdAt: '2026-04-13T10:00:00.000Z',
          updatedAt: '2026-04-13T10:00:00.000Z',
        };
        expect(bill.status).toBe(s);
      });
    });
  });

  describe('InventoryItemSummary', () => {
    it('creates valid inventory item', () => {
      const item: InventoryItemSummary = {
        id: 'inv-1' as import('./index.js').InventoryItemId,
        accountId: 'acc-1' as AccountId,
        sku: 'MED-001',
        name: 'Amoxicillin 500mg',
        unit: 'tablet',
        onHandQuantity: 1000,
        reorderLevel: 200,
        unitCostAmount: 0.50,
        createdAt: '2026-04-01T00:00:00.000Z',
        updatedAt: '2026-04-01T00:00:00.000Z',
      };
      expect(item.sku).toBe('MED-001');
      expect(item.onHandQuantity).toBe(1000);
    });
  });

  describe('NotificationSummary', () => {
    it('creates internal notification', () => {
      const notif: NotificationSummary = {
        id: 'notif-1' as import('./index.js').NotificationId,
        accountId: 'acc-1' as AccountId,
        channel: 'internal',
        category: 'billing',
        title: 'Fatura aprovada',
        message: 'A fatura #123 foi aprovada',
        severity: 'medium',
        status: 'queued',
        createdByUserId: 'usr-1' as UserId,
        createdAt: '2026-04-13T10:00:00.000Z',
      };
      expect(notif.channel).toBe('internal');
      expect(notif.severity).toBe('medium');
    });
  });

  describe('WebhookSummary', () => {
    it('creates webhook config', () => {
      const wh: WebhookSummary = {
        id: 'wh-1' as import('./index.js').WebhookId,
        accountId: 'acc-1' as AccountId,
        url: 'https://example.com/webhook',
        events: ['encounter.created', 'billing.settled'],
        isActive: true,
        createdAt: '2026-04-01T00:00:00.000Z',
        updatedAt: '2026-04-01T00:00:00.000Z',
      };
      expect(wh.events).toHaveLength(2);
      expect(wh.isActive).toBe(true);
    });
  });
});
