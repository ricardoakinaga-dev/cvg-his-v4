import { beforeEach, describe, expect, it } from 'vitest';
import type {
  ConsentGrantRequest,
  ConsentPurpose,
  ConsentRecord,
  ConsentRepository,
  ConsentRevokeRequest,
  SubjectType
} from './repositories/consent-repository.interface.js';
import type { DataSubjectRequest, DsrRepository } from './repositories/dsr-repository.interface.js';
import { LgpdService } from './service.js';

class InMemoryConsentRepository implements ConsentRepository {
  readonly records: ConsentRecord[] = [];

  async findBySubject(
    accountId: string,
    subjectId: string,
    subjectType: SubjectType
  ): Promise<readonly ConsentRecord[]> {
    return this.records.filter(
      (r) => r.accountId === accountId && r.subjectId === subjectId && r.subjectType === subjectType
    );
  }

  async findBySubjectAndPurpose(
    accountId: string,
    subjectId: string,
    subjectType: SubjectType,
    purpose: ConsentPurpose
  ): Promise<ConsentRecord | undefined> {
    return this.records.find(
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
    subjectType: SubjectType
  ): Promise<readonly ConsentRecord[]> {
    return this.records.filter(
      (r) =>
        r.accountId === accountId &&
        r.subjectId === subjectId &&
        r.subjectType === subjectType &&
        r.status === 'granted'
    );
  }

  async create(record: Omit<ConsentRecord, 'id' | 'createdAt'>): Promise<ConsentRecord> {
    const created: ConsentRecord = {
      ...record,
      id: `consent_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      createdAt: new Date().toISOString()
    };
    this.records.push(created);
    return created;
  }

  async revoke(id: string, revokedBy: string, revokedAt: string): Promise<ConsentRecord> {
    const record = this.records.find((r) => r.id === id);
    if (!record) throw new Error(`Consent record not found: ${id}`);
    const updated: ConsentRecord = { ...record, status: 'revoked', revokedBy, revokedAt };
    const idx = this.records.indexOf(record);
    this.records[idx] = updated;
    return updated;
  }
}

class InMemoryDsrRepository implements DsrRepository {
  readonly requests: DataSubjectRequest[] = [];

  async findById(accountId: string, id: string): Promise<DataSubjectRequest | undefined> {
    return this.requests.find((r) => r.accountId === accountId && r.id === id);
  }

  async findBySubject(
    accountId: string,
    subjectId: string,
    subjectType: SubjectType
  ): Promise<readonly DataSubjectRequest[]> {
    return this.requests.filter(
      (r) => r.accountId === accountId && r.subjectId === subjectId && r.subjectType === subjectType
    );
  }

  async findByStatus(accountId: string, status: string): Promise<readonly DataSubjectRequest[]> {
    return this.requests.filter((r) => r.accountId === accountId && r.status === status);
  }

  async create(
    request: Omit<DataSubjectRequest, 'id' | 'requestedAt' | 'createdAt' | 'updatedAt'>
  ): Promise<DataSubjectRequest> {
    const now = new Date().toISOString();
    const created: DataSubjectRequest = {
      ...request,
      id: `dsr_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      requestedAt: now,
      createdAt: now,
      updatedAt: now
    };
    this.requests.push(created);
    return created;
  }

  async updateStatus(
    id: string,
    status: string,
    options?: {
      completedBy?: string;
      completedAt?: string;
      rejectionReason?: string;
      resultJson?: Record<string, unknown>;
    }
  ): Promise<DataSubjectRequest> {
    const request = this.requests.find((r) => r.id === id);
    if (!request) throw new Error(`DSR request not found: ${id}`);
    const updated: DataSubjectRequest = {
      ...request,
      status: status as DataSubjectRequest['status'],
      completedBy: options?.completedBy,
      completedAt: options?.completedAt,
      rejectionReason: options?.rejectionReason,
      resultJson: options?.resultJson,
      updatedAt: new Date().toISOString()
    };
    const idx = this.requests.indexOf(request);
    this.requests[idx] = updated;
    return updated;
  }
}

describe('LgpdService', () => {
  let consentRepo: InMemoryConsentRepository;
  let dsrRepo: InMemoryDsrRepository;
  let service: LgpdService;

  beforeEach(() => {
    consentRepo = new InMemoryConsentRepository();
    dsrRepo = new InMemoryDsrRepository();
    service = new LgpdService({ consentRepository: consentRepo, dsrRepository: dsrRepo });
  });

  describe('grantConsent', () => {
    it('grants consent and returns record', async () => {
      const request: ConsentGrantRequest = {
        accountId: 'acc_cvg_demo',
        subjectId: 'patient_luna',
        subjectType: 'patient',
        purpose: 'clinical',
        grantedBy: 'dr_silva'
      };

      const record = await service.grantConsent(request);

      expect(record.status).toBe('granted');
      expect(record.subjectId).toBe('patient_luna');
      expect(record.purpose).toBe('clinical');
      expect(record.grantedBy).toBe('dr_silva');
    });

    it('returns existing granted consent without creating duplicate', async () => {
      const request: ConsentGrantRequest = {
        accountId: 'acc_cvg_demo',
        subjectId: 'patient_luna',
        subjectType: 'patient',
        purpose: 'clinical',
        grantedBy: 'dr_silva'
      };

      const first = await service.grantConsent(request);
      const second = await service.grantConsent(request);

      expect(first.id).toBe(second.id);
      expect(consentRepo.records).toHaveLength(1);
    });

    it('throws for invalid purpose', async () => {
      const request: ConsentGrantRequest = {
        accountId: 'acc_cvg_demo',
        subjectId: 'patient_luna',
        subjectType: 'patient',
        purpose: 'invalid_purpose' as ConsentPurpose,
        grantedBy: 'dr_silva'
      };

      await expect(service.grantConsent(request)).rejects.toThrow('Invalid consent purpose');
    });

    it('throws for invalid subject type', async () => {
      const request = {
        accountId: 'acc_cvg_demo',
        subjectId: 'patient_luna',
        subjectType: 'invalid_type' as SubjectType,
        purpose: 'clinical' as ConsentPurpose,
        grantedBy: 'dr_silva'
      };

      await expect(service.grantConsent(request)).rejects.toThrow('Invalid subject type');
    });

    it('throws when consent repository is not configured', async () => {
      const unconfigured = new LgpdService({ dsrRepository: dsrRepo });
      const request: ConsentGrantRequest = {
        accountId: 'acc_cvg_demo',
        subjectId: 'patient_luna',
        subjectType: 'patient',
        purpose: 'clinical',
        grantedBy: 'dr_silva'
      };

      await expect(unconfigured.grantConsent(request)).rejects.toThrow(
        'Consent repository not configured'
      );
    });
  });

  describe('revokeConsent', () => {
    it('revokes an existing granted consent', async () => {
      const grantReq: ConsentGrantRequest = {
        accountId: 'acc_cvg_demo',
        subjectId: 'patient_luna',
        subjectType: 'patient',
        purpose: 'clinical',
        grantedBy: 'dr_silva'
      };
      await service.grantConsent(grantReq);

      const revokeReq: ConsentRevokeRequest = {
        accountId: 'acc_cvg_demo',
        subjectId: 'patient_luna',
        subjectType: 'patient',
        purpose: 'clinical',
        revokedBy: 'patient_luna'
      };

      const revoked = await service.revokeConsent(revokeReq);

      expect(revoked.status).toBe('revoked');
      expect(revoked.revokedBy).toBe('patient_luna');
    });

    it('returns already revoked consent without error', async () => {
      const grantReq: ConsentGrantRequest = {
        accountId: 'acc_cvg_demo',
        subjectId: 'patient_luna',
        subjectType: 'patient',
        purpose: 'clinical',
        grantedBy: 'dr_silva'
      };
      const granted = await service.grantConsent(grantReq);

      const revokeReq: ConsentRevokeRequest = {
        accountId: 'acc_cvg_demo',
        subjectId: 'patient_luna',
        subjectType: 'patient',
        purpose: 'clinical',
        revokedBy: 'patient_luna'
      };

      await service.revokeConsent(revokeReq);
      const secondRevoke = await service.revokeConsent(revokeReq);

      expect(secondRevoke.id).toBe(granted.id);
      expect(secondRevoke.status).toBe('revoked');
    });

    it('throws when no active consent found', async () => {
      const revokeReq: ConsentRevokeRequest = {
        accountId: 'acc_cvg_demo',
        subjectId: 'patient_luna',
        subjectType: 'patient',
        purpose: 'clinical',
        revokedBy: 'patient_luna'
      };

      await expect(service.revokeConsent(revokeReq)).rejects.toThrow('No active consent found');
    });

    it('throws when consent repository is not configured', async () => {
      const unconfigured = new LgpdService({ dsrRepository: dsrRepo });
      const revokeReq: ConsentRevokeRequest = {
        accountId: 'acc_cvg_demo',
        subjectId: 'patient_luna',
        subjectType: 'patient',
        purpose: 'clinical',
        revokedBy: 'patient_luna'
      };

      await expect(unconfigured.revokeConsent(revokeReq)).rejects.toThrow(
        'Consent repository not configured'
      );
    });
  });

  describe('getConsents', () => {
    it('returns all consents for a subject', async () => {
      await service.grantConsent({
        accountId: 'acc_cvg_demo',
        subjectId: 'patient_luna',
        subjectType: 'patient',
        purpose: 'clinical',
        grantedBy: 'dr_silva'
      });
      await service.grantConsent({
        accountId: 'acc_cvg_demo',
        subjectId: 'patient_luna',
        subjectType: 'patient',
        purpose: 'marketing',
        grantedBy: 'dr_silva'
      });

      const consents = await service.getConsents('acc_cvg_demo', 'patient_luna', 'patient');

      expect(consents).toHaveLength(2);
    });

    it('throws when consent repository is not configured', async () => {
      const unconfigured = new LgpdService({ dsrRepository: dsrRepo });

      await expect(
        unconfigured.getConsents('acc_cvg_demo', 'patient_luna', 'patient')
      ).rejects.toThrow('Consent repository not configured');
    });
  });

  describe('getActiveCons', () => {
    it('returns only active consents', async () => {
      await service.grantConsent({
        accountId: 'acc_cvg_demo',
        subjectId: 'patient_luna',
        subjectType: 'patient',
        purpose: 'clinical',
        grantedBy: 'dr_silva'
      });
      const marketing = await service.grantConsent({
        accountId: 'acc_cvg_demo',
        subjectId: 'patient_luna',
        subjectType: 'patient',
        purpose: 'marketing',
        grantedBy: 'dr_silva'
      });

      await service.revokeConsent({
        accountId: 'acc_cvg_demo',
        subjectId: 'patient_luna',
        subjectType: 'patient',
        purpose: 'marketing',
        revokedBy: 'patient_luna'
      });

      const active = await service.getActiveCons('acc_cvg_demo', 'patient_luna', 'patient');

      expect(active).toHaveLength(1);
      expect(active[0].purpose).toBe('clinical');
    });
  });

  describe('isConsentActive', () => {
    it('returns true when active consent exists', async () => {
      await service.grantConsent({
        accountId: 'acc_cvg_demo',
        subjectId: 'patient_luna',
        subjectType: 'patient',
        purpose: 'clinical',
        grantedBy: 'dr_silva'
      });

      const active = await service.isConsentActive(
        'acc_cvg_demo',
        'patient_luna',
        'patient',
        'clinical'
      );

      expect(active).toBe(true);
    });

    it('returns false when no consent exists', async () => {
      const result = await service.isConsentActive(
        'acc_cvg_demo',
        'patient_luna',
        'patient',
        'clinical'
      );

      expect(result).toBe(false);
    });

    it('returns false when consent is revoked', async () => {
      await service.grantConsent({
        accountId: 'acc_cvg_demo',
        subjectId: 'patient_luna',
        subjectType: 'patient',
        purpose: 'clinical',
        grantedBy: 'dr_silva'
      });
      await service.revokeConsent({
        accountId: 'acc_cvg_demo',
        subjectId: 'patient_luna',
        subjectType: 'patient',
        purpose: 'clinical',
        revokedBy: 'patient_luna'
      });

      const result = await service.isConsentActive(
        'acc_cvg_demo',
        'patient_luna',
        'patient',
        'clinical'
      );

      expect(result).toBe(false);
    });

    it('returns false when repository is not configured', async () => {
      const unconfigured = new LgpdService({ dsrRepository: dsrRepo });

      const result = await unconfigured.isConsentActive(
        'acc_cvg_demo',
        'patient_luna',
        'patient',
        'clinical'
      );

      expect(result).toBe(false);
    });
  });

  describe('DSR requests', () => {
    it('creates a DSR request', async () => {
      const dsr = await service.createDsrRequest({
        accountId: 'acc_cvg_demo',
        subjectId: 'patient_luna',
        subjectType: 'patient',
        requestType: 'data_export',
        requestedBy: 'patient_luna'
      });

      expect(dsr.status).toBe('pending');
      expect(dsr.requestType).toBe('data_export');
    });

    it('throws for invalid DSR type', async () => {
      await expect(
        service.createDsrRequest({
          accountId: 'acc_cvg_demo',
          subjectId: 'patient_luna',
          subjectType: 'patient',
          requestType: 'invalid_type' as DataSubjectRequest['requestType'],
          requestedBy: 'patient_luna'
        })
      ).rejects.toThrow('Invalid DSR type');
    });

    it('throws for invalid subject type in DSR', async () => {
      await expect(
        service.createDsrRequest({
          accountId: 'acc_cvg_demo',
          subjectId: 'patient_luna',
          subjectType: 'invalid_type' as SubjectType,
          requestType: 'data_export',
          requestedBy: 'patient_luna'
        })
      ).rejects.toThrow('Invalid subject type');
    });

    it('retrieves a DSR request by id', async () => {
      const created = await service.createDsrRequest({
        accountId: 'acc_cvg_demo',
        subjectId: 'patient_luna',
        subjectType: 'patient',
        requestType: 'data_export',
        requestedBy: 'patient_luna'
      });

      const found = await service.getDsrRequest('acc_cvg_demo', created.id);

      expect(found?.id).toBe(created.id);
    });

    it('completes a DSR request', async () => {
      const created = await service.createDsrRequest({
        accountId: 'acc_cvg_demo',
        subjectId: 'patient_luna',
        subjectType: 'patient',
        requestType: 'data_export',
        requestedBy: 'patient_luna'
      });

      const completed = await service.completeDsrRequest(created.id, 'dr_silva', {
        exported: true
      });

      expect(completed.status).toBe('completed');
      expect(completed.completedBy).toBe('dr_silva');
    });

    it('rejects a DSR request', async () => {
      const created = await service.createDsrRequest({
        accountId: 'acc_cvg_demo',
        subjectId: 'patient_luna',
        subjectType: 'patient',
        requestType: 'data_deletion',
        requestedBy: 'patient_luna'
      });

      const rejected = await service.rejectDsrRequest(created.id, 'dr_silva', 'Not authorized');

      expect(rejected.status).toBe('rejected');
      expect(rejected.rejectionReason).toBe('Not authorized');
    });

    it('throws when DSR repository is not configured', async () => {
      const unconfigured = new LgpdService({ consentRepository: consentRepo });

      await expect(
        unconfigured.createDsrRequest({
          accountId: 'acc_cvg_demo',
          subjectId: 'patient_luna',
          subjectType: 'patient',
          requestType: 'data_export',
          requestedBy: 'patient_luna'
        })
      ).rejects.toThrow('DSR repository not configured');
    });
  });

  describe('buildPersonalDataExport', () => {
    it('builds export by calling all data providers', async () => {
      const providers = {
        clinical: async (_id: string) => ({ appointments: ['appt_1', 'appt_2'] }),
        billing: async (_id: string) => ({ invoices: ['inv_1'] })
      };

      const export_ = await service.buildPersonalDataExport(
        'acc_cvg_demo',
        'patient_luna',
        'patient',
        providers
      );

      expect(export_.subjectId).toBe('patient_luna');
      expect(export_.subjectType).toBe('patient');
      expect((export_.data.clinical as Record<string, unknown>).appointments).toEqual([
        'appt_1',
        'appt_2'
      ]);
      expect((export_.data.billing as Record<string, unknown>).invoices).toEqual(['inv_1']);
    });

    it('captures provider errors gracefully', async () => {
      const providers = {
        clinical: async (_id: string) => {
          throw new Error('Provider failed');
        }
      };

      const export_ = await service.buildPersonalDataExport(
        'acc_cvg_demo',
        'patient_luna',
        'patient',
        providers
      );

      expect((export_.data.clinical as Record<string, unknown>).error).toBe(
        'Failed to collect data from this source'
      );
    });
  });
});
