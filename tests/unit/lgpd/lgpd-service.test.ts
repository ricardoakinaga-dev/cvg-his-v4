import { describe, it, expect, beforeEach } from 'vitest';
import {
  LgpdService,
  type ConsentRecord,
  type ConsentRepository,
  type ConsentGrantRequest,
  type ConsentRevokeRequest,
  type DataSubjectRequest,
  type DsrRepository,
  type DsrCreateRequest
} from '@cvg-his-v2/module-lgpd';

// ============================================================================
// In-memory test repositories
// ============================================================================

class InMemoryConsentRepository implements ConsentRepository {
  readonly #records: ConsentRecord[] = [];

  async findBySubject(
    accountId: string,
    subjectId: string,
    subjectType: ConsentRecord['subjectType']
  ): Promise<readonly ConsentRecord[]> {
    return this.#records.filter(
      (r) => r.accountId === accountId && r.subjectId === subjectId && r.subjectType === subjectType
    );
  }

  async findBySubjectAndPurpose(
    accountId: string,
    subjectId: string,
    subjectType: ConsentRecord['subjectType'],
    purpose: ConsentRecord['purpose']
  ): Promise<ConsentRecord | undefined> {
    return this.#records.find(
      (r) =>
        r.accountId === accountId &&
        r.subjectId === subjectId &&
        r.subjectType === subjectType &&
        r.purpose === purpose
    );
  }

  async findActiveBySubject(
    accountId: string,
    subjectId: string,
    subjectType: ConsentRecord['subjectType']
  ): Promise<readonly ConsentRecord[]> {
    return this.#records.filter(
      (r) =>
        r.accountId === accountId &&
        r.subjectId === subjectId &&
        r.subjectType === subjectType &&
        r.status === 'granted'
    );
  }

  async create(data: Omit<ConsentRecord, 'id' | 'createdAt'>): Promise<ConsentRecord> {
    const record: ConsentRecord = {
      id: `cr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      accountId: data.accountId,
      subjectId: data.subjectId,
      subjectType: data.subjectType,
      purpose: data.purpose,
      status: data.status,
      origin: data.origin,
      grantedBy: data.grantedBy,
      grantedAt: data.grantedAt,
      revokedBy: data.revokedBy,
      revokedAt: data.revokedAt,
      expiresAt: data.expiresAt,
      metadata: data.metadata,
      createdAt: new Date().toISOString()
    };
    this.#records.push(record);
    return record;
  }

  async revoke(id: string, revokedBy: string, revokedAt: string): Promise<ConsentRecord> {
    const idx = this.#records.findIndex((r) => r.id === id);
    if (idx === -1) {
      throw new Error(`Consent record not found: ${id}`);
    }
    const existing = this.#records[idx];
    const revoked: ConsentRecord = {
      ...existing,
      status: 'revoked',
      revokedBy,
      revokedAt
    };
    this.#records[idx] = revoked;
    return revoked;
  }

  clear(): void {
    this.#records.length = 0;
  }
}

class InMemoryDsrRepository implements DsrRepository {
  readonly #requests: DataSubjectRequest[] = [];

  async findById(accountId: string, id: string): Promise<DataSubjectRequest | undefined> {
    return this.#requests.find((r) => r.accountId === accountId && r.id === id);
  }

  async findBySubject(
    accountId: string,
    subjectId: string,
    subjectType: DataSubjectRequest['subjectType']
  ): Promise<readonly DataSubjectRequest[]> {
    return this.#requests.filter(
      (r) => r.accountId === accountId && r.subjectId === subjectId && r.subjectType === subjectType
    );
  }

  async findByStatus(
    accountId: string,
    status: DataSubjectRequest['status']
  ): Promise<readonly DataSubjectRequest[]> {
    return this.#requests.filter((r) => r.accountId === accountId && r.status === status);
  }

  async create(
    data: Omit<DataSubjectRequest, 'id' | 'requestedAt' | 'createdAt' | 'updatedAt'>
  ): Promise<DataSubjectRequest> {
    const now = new Date().toISOString();
    const request: DataSubjectRequest = {
      id: `dsr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      accountId: data.accountId,
      subjectId: data.subjectId,
      subjectType: data.subjectType,
      requestType: data.requestType,
      status: data.status,
      requestedBy: data.requestedBy,
      requestedAt: now,
      completedAt: data.completedAt,
      completedBy: data.completedBy,
      notes: data.notes,
      rejectionReason: data.rejectionReason,
      resultJson: data.resultJson,
      createdAt: now,
      updatedAt: now
    };
    this.#requests.push(request);
    return request;
  }

  async updateStatus(
    id: string,
    status: DataSubjectRequest['status'],
    options?: {
      completedBy?: string;
      completedAt?: string;
      rejectionReason?: string;
      resultJson?: Record<string, unknown>;
    }
  ): Promise<DataSubjectRequest> {
    const idx = this.#requests.findIndex((r) => r.id === id);
    if (idx === -1) {
      throw new Error(`Data subject request not found: ${id}`);
    }
    const existing = this.#requests[idx];
    const updated: DataSubjectRequest = {
      ...existing,
      status,
      completedAt: options?.completedAt ?? existing.completedAt,
      completedBy: options?.completedBy ?? existing.completedBy,
      rejectionReason: options?.rejectionReason ?? existing.rejectionReason,
      resultJson: options?.resultJson ?? existing.resultJson,
      updatedAt: new Date().toISOString()
    };
    this.#requests[idx] = updated;
    return updated;
  }

  clear(): void {
    this.#requests.length = 0;
  }
}

// ============================================================================
// Tests
// ============================================================================

const TEST_ACCOUNT_ID = 'acc_test_001';
const TEST_USER_ID = 'user_admin_001';
const TEST_SUBJECT_ID = 'owner_001';

let consentRepo: InMemoryConsentRepository;
let dsrRepo: InMemoryDsrRepository;
let service: LgpdService;

beforeEach(() => {
  consentRepo = new InMemoryConsentRepository();
  dsrRepo = new InMemoryDsrRepository();
  service = new LgpdService({
    consentRepository: consentRepo,
    dsrRepository: dsrRepo
  });
});

// ============================================================================
// LGPD-001: Grant consent
// ============================================================================
describe('LGPD-001 — Grant Consent', () => {
  it('grants consent for a subject with a specific purpose', async () => {
    const record = await service.grantConsent({
      accountId: TEST_ACCOUNT_ID,
      subjectId: TEST_SUBJECT_ID,
      subjectType: 'owner',
      purpose: 'marketing',
      grantedBy: TEST_USER_ID
    });

    expect(record.id).toBeDefined();
    expect(record.accountId).toBe(TEST_ACCOUNT_ID);
    expect(record.subjectId).toBe(TEST_SUBJECT_ID);
    expect(record.subjectType).toBe('owner');
    expect(record.purpose).toBe('marketing');
    expect(record.status).toBe('granted');
    expect(record.origin).toBe('api');
    expect(record.grantedBy).toBe(TEST_USER_ID);
    expect(record.grantedAt).toBeDefined();
  });

  it('grants consent with custom origin and metadata', async () => {
    const record = await service.grantConsent({
      accountId: TEST_ACCOUNT_ID,
      subjectId: TEST_SUBJECT_ID,
      subjectType: 'patient',
      purpose: 'clinical',
      origin: 'web_portal',
      grantedBy: TEST_USER_ID,
      metadata: { ipAddress: '127.0.0.1', userAgent: 'test' }
    });

    expect(record.origin).toBe('web_portal');
    expect(record.metadata).toEqual({ ipAddress: '127.0.0.1', userAgent: 'test' });
  });

  it('returns existing granted consent if already active', async () => {
    const first = await service.grantConsent({
      accountId: TEST_ACCOUNT_ID,
      subjectId: TEST_SUBJECT_ID,
      subjectType: 'owner',
      purpose: 'marketing',
      grantedBy: TEST_USER_ID
    });

    const second = await service.grantConsent({
      accountId: TEST_ACCOUNT_ID,
      subjectId: TEST_SUBJECT_ID,
      subjectType: 'owner',
      purpose: 'marketing',
      grantedBy: TEST_USER_ID
    });

    expect(second.id).toBe(first.id);
  });

  it('throws on invalid purpose', async () => {
    await expect(
      service.grantConsent({
        accountId: TEST_ACCOUNT_ID,
        subjectId: TEST_SUBJECT_ID,
        subjectType: 'owner',
        purpose: 'invalid_purpose' as never,
        grantedBy: TEST_USER_ID
      })
    ).rejects.toThrow('Invalid consent purpose');
  });

  it('throws on invalid subject type', async () => {
    await expect(
      service.grantConsent({
        accountId: TEST_ACCOUNT_ID,
        subjectId: TEST_SUBJECT_ID,
        subjectType: 'invalid_type' as never,
        purpose: 'marketing',
        grantedBy: TEST_USER_ID
      })
    ).rejects.toThrow('Invalid subject type');
  });
});

// ============================================================================
// LGPD-002: Revoke consent
// ============================================================================
describe('LGPD-002 — Revoke Consent', () => {
  it('revokes an active consent', async () => {
    await service.grantConsent({
      accountId: TEST_ACCOUNT_ID,
      subjectId: TEST_SUBJECT_ID,
      subjectType: 'owner',
      purpose: 'marketing',
      grantedBy: TEST_USER_ID
    });

    const revoked = await service.revokeConsent({
      accountId: TEST_ACCOUNT_ID,
      subjectId: TEST_SUBJECT_ID,
      subjectType: 'owner',
      purpose: 'marketing',
      revokedBy: TEST_USER_ID
    });

    expect(revoked.status).toBe('revoked');
    expect(revoked.revokedBy).toBe(TEST_USER_ID);
    expect(revoked.revokedAt).toBeDefined();
  });

  it('returns existing revoked consent if already revoked', async () => {
    await service.grantConsent({
      accountId: TEST_ACCOUNT_ID,
      subjectId: TEST_SUBJECT_ID,
      subjectType: 'owner',
      purpose: 'marketing',
      grantedBy: TEST_USER_ID
    });

    await service.revokeConsent({
      accountId: TEST_ACCOUNT_ID,
      subjectId: TEST_SUBJECT_ID,
      subjectType: 'owner',
      purpose: 'marketing',
      revokedBy: TEST_USER_ID
    });

    const second = await service.revokeConsent({
      accountId: TEST_ACCOUNT_ID,
      subjectId: TEST_SUBJECT_ID,
      subjectType: 'owner',
      purpose: 'marketing',
      revokedBy: TEST_USER_ID
    });

    expect(second.status).toBe('revoked');
  });

  it('throws when no consent exists for the purpose', async () => {
    await expect(
      service.revokeConsent({
        accountId: TEST_ACCOUNT_ID,
        subjectId: TEST_SUBJECT_ID,
        subjectType: 'owner',
        purpose: 'marketing',
        revokedBy: TEST_USER_ID
      })
    ).rejects.toThrow('No active consent found');
  });
});

// ============================================================================
// LGPD-003: Query consents
// ============================================================================
describe('LGPD-003 — Query Consents', () => {
  it('returns all consents for a subject', async () => {
    await service.grantConsent({
      accountId: TEST_ACCOUNT_ID,
      subjectId: TEST_SUBJECT_ID,
      subjectType: 'owner',
      purpose: 'marketing',
      grantedBy: TEST_USER_ID
    });
    await service.grantConsent({
      accountId: TEST_ACCOUNT_ID,
      subjectId: TEST_SUBJECT_ID,
      subjectType: 'owner',
      purpose: 'analytics',
      grantedBy: TEST_USER_ID
    });

    const consents = await service.getConsents(TEST_ACCOUNT_ID, TEST_SUBJECT_ID, 'owner');
    expect(consents).toHaveLength(2);
  });

  it('returns only active consents', async () => {
    await service.grantConsent({
      accountId: TEST_ACCOUNT_ID,
      subjectId: TEST_SUBJECT_ID,
      subjectType: 'owner',
      purpose: 'marketing',
      grantedBy: TEST_USER_ID
    });
    await service.grantConsent({
      accountId: TEST_ACCOUNT_ID,
      subjectId: TEST_SUBJECT_ID,
      subjectType: 'owner',
      purpose: 'analytics',
      grantedBy: TEST_USER_ID
    });

    await service.revokeConsent({
      accountId: TEST_ACCOUNT_ID,
      subjectId: TEST_SUBJECT_ID,
      subjectType: 'owner',
      purpose: 'marketing',
      revokedBy: TEST_USER_ID
    });

    const active = await service.getActiveCons(TEST_ACCOUNT_ID, TEST_SUBJECT_ID, 'owner');
    expect(active).toHaveLength(1);
    expect(active[0].purpose).toBe('analytics');
  });

  it('checks if consent is active for a specific purpose', async () => {
    await service.grantConsent({
      accountId: TEST_ACCOUNT_ID,
      subjectId: TEST_SUBJECT_ID,
      subjectType: 'owner',
      purpose: 'clinical',
      grantedBy: TEST_USER_ID
    });

    expect(
      await service.isConsentActive(TEST_ACCOUNT_ID, TEST_SUBJECT_ID, 'owner', 'clinical')
    ).toBe(true);

    expect(
      await service.isConsentActive(TEST_ACCOUNT_ID, TEST_SUBJECT_ID, 'owner', 'marketing')
    ).toBe(false);
  });
});

// ============================================================================
// LGPD-004: Create DSR requests
// ============================================================================
describe('LGPD-004 — Create DSR Requests', () => {
  it('creates a data export request', async () => {
    const request = await service.createDsrRequest({
      accountId: TEST_ACCOUNT_ID,
      subjectId: TEST_SUBJECT_ID,
      subjectType: 'owner',
      requestType: 'data_export',
      requestedBy: TEST_USER_ID,
      notes: 'Export all my data'
    });

    expect(request.id).toBeDefined();
    expect(request.requestType).toBe('data_export');
    expect(request.status).toBe('pending');
    expect(request.notes).toBe('Export all my data');
  });

  it('creates a data deletion request', async () => {
    const request = await service.createDsrRequest({
      accountId: TEST_ACCOUNT_ID,
      subjectId: TEST_SUBJECT_ID,
      subjectType: 'patient',
      requestType: 'data_deletion',
      requestedBy: TEST_USER_ID
    });

    expect(request.requestType).toBe('data_deletion');
    expect(request.status).toBe('pending');
  });

  it('throws on invalid DSR type', async () => {
    await expect(
      service.createDsrRequest({
        accountId: TEST_ACCOUNT_ID,
        subjectId: TEST_SUBJECT_ID,
        subjectType: 'owner',
        requestType: 'invalid_type' as never,
        requestedBy: TEST_USER_ID
      })
    ).rejects.toThrow('Invalid DSR type');
  });
});

// ============================================================================
// LGPD-005: Query DSR requests
// ============================================================================
describe('LGPD-005 — Query DSR Requests', () => {
  it('returns requests by subject', async () => {
    await service.createDsrRequest({
      accountId: TEST_ACCOUNT_ID,
      subjectId: TEST_SUBJECT_ID,
      subjectType: 'owner',
      requestType: 'data_export',
      requestedBy: TEST_USER_ID
    });
    await service.createDsrRequest({
      accountId: TEST_ACCOUNT_ID,
      subjectId: TEST_SUBJECT_ID,
      subjectType: 'owner',
      requestType: 'data_deletion',
      requestedBy: TEST_USER_ID
    });

    const requests = await service.getDsrRequestsBySubject(
      TEST_ACCOUNT_ID,
      TEST_SUBJECT_ID,
      'owner'
    );
    expect(requests).toHaveLength(2);
  });

  it('returns requests by status', async () => {
    await service.createDsrRequest({
      accountId: TEST_ACCOUNT_ID,
      subjectId: TEST_SUBJECT_ID,
      subjectType: 'owner',
      requestType: 'data_export',
      requestedBy: TEST_USER_ID
    });

    const pending = await service.getDsrRequestsByStatus(TEST_ACCOUNT_ID, 'pending');
    expect(pending).toHaveLength(1);
  });

  it('returns a single request by ID', async () => {
    const created = await service.createDsrRequest({
      accountId: TEST_ACCOUNT_ID,
      subjectId: TEST_SUBJECT_ID,
      subjectType: 'owner',
      requestType: 'data_export',
      requestedBy: TEST_USER_ID
    });

    const found = await service.getDsrRequest(TEST_ACCOUNT_ID, created.id);
    expect(found).toBeDefined();
    expect(found!.id).toBe(created.id);
  });
});

// ============================================================================
// LGPD-006: Complete and reject DSR requests
// ============================================================================
describe('LGPD-006 — Complete and Reject DSR Requests', () => {
  it('completes a DSR request with result', async () => {
    const created = await service.createDsrRequest({
      accountId: TEST_ACCOUNT_ID,
      subjectId: TEST_SUBJECT_ID,
      subjectType: 'owner',
      requestType: 'data_export',
      requestedBy: TEST_USER_ID
    });

    const completed = await service.completeDsrRequest(created.id, TEST_USER_ID, {
      recordCount: 42,
      exportUrl: 'https://example.com/export/123'
    });

    expect(completed.status).toBe('completed');
    expect(completed.completedBy).toBe(TEST_USER_ID);
    expect(completed.completedAt).toBeDefined();
    expect(completed.resultJson).toEqual({
      recordCount: 42,
      exportUrl: 'https://example.com/export/123'
    });
  });

  it('rejects a DSR request with reason', async () => {
    const created = await service.createDsrRequest({
      accountId: TEST_ACCOUNT_ID,
      subjectId: TEST_SUBJECT_ID,
      subjectType: 'owner',
      requestType: 'data_deletion',
      requestedBy: TEST_USER_ID
    });

    const rejected = await service.rejectDsrRequest(
      created.id,
      TEST_USER_ID,
      'Legal hold prevents deletion'
    );

    expect(rejected.status).toBe('rejected');
    expect(rejected.rejectionReason).toBe('Legal hold prevents deletion');
  });
});

// ============================================================================
// LGPD-007: Personal data export builder
// ============================================================================
describe('LGPD-007 — Personal Data Export Builder', () => {
  it('builds export with data from multiple providers', async () => {
    const dataProviders = {
      owners: async (id: string) => ({ id, name: 'Test Owner', email: 'test@example.com' }),
      patients: async (id: string) => ({ ownerId: id, patients: [{ name: 'Rex' }] })
    };

    const exportData = await service.buildPersonalDataExport(
      TEST_ACCOUNT_ID,
      TEST_SUBJECT_ID,
      'owner',
      dataProviders
    );

    expect(exportData.subjectId).toBe(TEST_SUBJECT_ID);
    expect(exportData.subjectType).toBe('owner');
    expect(exportData.exportedAt).toBeDefined();
    expect(exportData.data.owners).toEqual({
      id: TEST_SUBJECT_ID,
      name: 'Test Owner',
      email: 'test@example.com'
    });
    expect(exportData.data.patients).toEqual({
      ownerId: TEST_SUBJECT_ID,
      patients: [{ name: 'Rex' }]
    });
  });

  it('handles provider failures gracefully', async () => {
    const dataProviders = {
      good: async () => ({ ok: true }),
      bad: async () => {
        throw new Error('Provider failed');
      }
    };

    const exportData = await service.buildPersonalDataExport(
      TEST_ACCOUNT_ID,
      TEST_SUBJECT_ID,
      'owner',
      dataProviders
    );

    expect(exportData.data.good).toEqual({ ok: true });
    expect(exportData.data.bad).toEqual({ error: 'Failed to collect data from this source' });
  });
});

// ============================================================================
// LGPD-008: All consent purposes are valid
// ============================================================================
describe('LGPD-008 — All Consent Purposes', () => {
  const purposes: readonly string[] = [
    'marketing',
    'analytics',
    'clinical',
    'financial',
    'operational',
    'notifications'
  ];

  it.each(purposes)('grants consent for purpose: %s', async (purpose) => {
    const record = await service.grantConsent({
      accountId: TEST_ACCOUNT_ID,
      subjectId: TEST_SUBJECT_ID,
      subjectType: 'owner',
      purpose: purpose as never,
      grantedBy: TEST_USER_ID
    });

    expect(record.purpose).toBe(purpose);
    expect(record.status).toBe('granted');
  });
});

// ============================================================================
// LGPD-009: All subject types are valid
// ============================================================================
describe('LGPD-009 — All Subject Types', () => {
  const subjectTypes: readonly string[] = ['owner', 'patient', 'user'];

  it.each(subjectTypes)('grants consent for subject type: %s', async (subjectType) => {
    const record = await service.grantConsent({
      accountId: TEST_ACCOUNT_ID,
      subjectId: TEST_SUBJECT_ID,
      subjectType: subjectType as never,
      purpose: 'clinical',
      grantedBy: TEST_USER_ID
    });

    expect(record.subjectType).toBe(subjectType);
  });
});
