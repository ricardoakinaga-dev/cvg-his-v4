import type {
  ConsentRecord,
  ConsentRepository,
  ConsentGrantRequest,
  ConsentRevokeRequest,
  ConsentPurpose,
  ConsentOrigin,
  SubjectType
} from './repositories/consent-repository.interface.js';
import type {
  DataSubjectRequest,
  DsrRepository,
  DsrCreateRequest,
  DsrStatus,
  DsrType
} from './repositories/dsr-repository.interface.js';

export type {
  ConsentRecord,
  ConsentRepository,
  ConsentGrantRequest,
  ConsentRevokeRequest,
  ConsentPurpose,
  ConsentOrigin,
  SubjectType
} from './repositories/consent-repository.interface.js';

export type {
  DataSubjectRequest,
  DsrRepository,
  DsrCreateRequest,
  DsrStatus,
  DsrType
} from './repositories/dsr-repository.interface.js';

export { DatabaseConsentRepository } from './repositories/database-consent.repository.js';
export { DatabaseDsrRepository } from './repositories/database-dsr.repository.js';

const VALID_PURPOSES: ReadonlySet<ConsentPurpose> = new Set([
  'marketing',
  'analytics',
  'clinical',
  'financial',
  'operational',
  'notifications'
]);

const VALID_SUBJECT_TYPES: ReadonlySet<SubjectType> = new Set(['owner', 'patient', 'user']);

const VALID_DSR_TYPES: ReadonlySet<DsrType> = new Set([
  'data_export',
  'data_deletion',
  'data_anonymization',
  'data_rectification',
  'data_access',
  'data_portability',
  'consent_revocation'
]);

export interface LgpdServiceOptions {
  readonly consentRepository?: ConsentRepository;
  readonly dsrRepository?: DsrRepository;
}

export interface PersonalDataExport {
  readonly subjectId: string;
  readonly subjectType: SubjectType;
  readonly exportedAt: string;
  readonly data: Record<string, unknown>;
}

export class LgpdService {
  readonly #consentRepo?: ConsentRepository;
  readonly #dsrRepo?: DsrRepository;

  constructor(options?: LgpdServiceOptions) {
    this.#consentRepo = options?.consentRepository;
    this.#dsrRepo = options?.dsrRepository;
  }

  async grantConsent(request: ConsentGrantRequest): Promise<ConsentRecord> {
    if (!this.#consentRepo) {
      throw new Error('Consent repository not configured');
    }

    if (!VALID_PURPOSES.has(request.purpose)) {
      throw new Error(`Invalid consent purpose: ${request.purpose}`);
    }

    if (!VALID_SUBJECT_TYPES.has(request.subjectType)) {
      throw new Error(`Invalid subject type: ${request.subjectType}`);
    }

    const existing = await this.#consentRepo.findBySubjectAndPurpose(
      request.accountId,
      request.subjectId,
      request.subjectType,
      request.purpose
    );

    if (existing && existing.status === 'granted') {
      return existing;
    }

    const now = new Date().toISOString();

    return this.#consentRepo.create({
      accountId: request.accountId,
      subjectId: request.subjectId,
      subjectType: request.subjectType,
      purpose: request.purpose,
      status: 'granted',
      origin: request.origin ?? 'api',
      grantedBy: request.grantedBy,
      grantedAt: now,
      expiresAt: request.expiresAt,
      metadata: request.metadata
    });
  }

  async revokeConsent(request: ConsentRevokeRequest): Promise<ConsentRecord> {
    if (!this.#consentRepo) {
      throw new Error('Consent repository not configured');
    }

    const existing = await this.#consentRepo.findBySubjectAndPurpose(
      request.accountId,
      request.subjectId,
      request.subjectType,
      request.purpose
    );

    if (!existing) {
      throw new Error(
        `No active consent found for subject ${request.subjectId} with purpose ${request.purpose}`
      );
    }

    if (existing.status === 'revoked') {
      return existing;
    }

    return this.#consentRepo.revoke(existing.id, request.revokedBy, new Date().toISOString());
  }

  async getConsents(
    accountId: string,
    subjectId: string,
    subjectType: SubjectType
  ): Promise<readonly ConsentRecord[]> {
    if (!this.#consentRepo) {
      throw new Error('Consent repository not configured');
    }

    return this.#consentRepo.findBySubject(accountId, subjectId, subjectType);
  }

  async getActiveCons(
    accountId: string,
    subjectId: string,
    subjectType: SubjectType
  ): Promise<readonly ConsentRecord[]> {
    if (!this.#consentRepo) {
      throw new Error('Consent repository not configured');
    }

    return this.#consentRepo.findActiveBySubject(accountId, subjectId, subjectType);
  }

  async isConsentActive(
    accountId: string,
    subjectId: string,
    subjectType: SubjectType,
    purpose: ConsentPurpose
  ): Promise<boolean> {
    if (!this.#consentRepo) {
      return false;
    }

    const record = await this.#consentRepo.findBySubjectAndPurpose(
      accountId,
      subjectId,
      subjectType,
      purpose
    );

    return record?.status === 'granted';
  }

  async createDsrRequest(request: DsrCreateRequest): Promise<DataSubjectRequest> {
    if (!this.#dsrRepo) {
      throw new Error('DSR repository not configured');
    }

    if (!VALID_DSR_TYPES.has(request.requestType)) {
      throw new Error(`Invalid DSR type: ${request.requestType}`);
    }

    if (!VALID_SUBJECT_TYPES.has(request.subjectType)) {
      throw new Error(`Invalid subject type: ${request.subjectType}`);
    }

    return this.#dsrRepo.create({
      accountId: request.accountId,
      subjectId: request.subjectId,
      subjectType: request.subjectType,
      requestType: request.requestType,
      status: 'pending',
      requestedBy: request.requestedBy,
      notes: request.notes
    });
  }

  async getDsrRequest(
    accountId: string,
    requestId: string
  ): Promise<DataSubjectRequest | undefined> {
    if (!this.#dsrRepo) {
      throw new Error('DSR repository not configured');
    }

    return this.#dsrRepo.findById(accountId, requestId);
  }

  async getDsrRequestsBySubject(
    accountId: string,
    subjectId: string,
    subjectType: SubjectType
  ): Promise<readonly DataSubjectRequest[]> {
    if (!this.#dsrRepo) {
      throw new Error('DSR repository not configured');
    }

    return this.#dsrRepo.findBySubject(accountId, subjectId, subjectType);
  }

  async getDsrRequestsByStatus(
    accountId: string,
    status: DsrStatus
  ): Promise<readonly DataSubjectRequest[]> {
    if (!this.#dsrRepo) {
      throw new Error('DSR repository not configured');
    }

    return this.#dsrRepo.findByStatus(accountId, status);
  }

  async completeDsrRequest(
    requestId: string,
    completedBy: string,
    resultJson?: Record<string, unknown>
  ): Promise<DataSubjectRequest> {
    if (!this.#dsrRepo) {
      throw new Error('DSR repository not configured');
    }

    return this.#dsrRepo.updateStatus(requestId, 'completed', {
      completedBy,
      completedAt: new Date().toISOString(),
      resultJson
    });
  }

  async rejectDsrRequest(
    requestId: string,
    rejectedBy: string,
    reason: string
  ): Promise<DataSubjectRequest> {
    if (!this.#dsrRepo) {
      throw new Error('DSR repository not configured');
    }

    return this.#dsrRepo.updateStatus(requestId, 'rejected', {
      completedBy: rejectedBy,
      completedAt: new Date().toISOString(),
      rejectionReason: reason
    });
  }

  async buildPersonalDataExport(
    _accountId: string,
    subjectId: string,
    subjectType: SubjectType,
    _dataProviders: Record<string, (subjectId: string) => Promise<Record<string, unknown>>>
  ): Promise<PersonalDataExport> {
    const data: Record<string, unknown> = {};

    for (const [providerName, providerFn] of Object.entries(_dataProviders)) {
      try {
        data[providerName] = await providerFn(subjectId);
      } catch {
        data[providerName] = { error: 'Failed to collect data from this source' };
      }
    }

    return {
      subjectId,
      subjectType,
      exportedAt: new Date().toISOString(),
      data
    };
  }
}
