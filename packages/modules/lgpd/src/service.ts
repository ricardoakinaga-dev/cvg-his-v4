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
  readonly dataProviders?: Record<string, LgpdDataProvider>;
}

export interface LgpdDataProviderContext {
  readonly accountId: string;
  readonly subjectId: string;
  readonly subjectType: SubjectType;
}

export type LgpdDataProvider = (
  subjectId: string,
  context: LgpdDataProviderContext
) => Promise<Record<string, unknown>>;

export interface LgpdRetentionEvidence {
  readonly dataType: string;
  readonly retentionWindow: string;
  readonly legalBasis: string;
  readonly disposition: 'retain' | 'anonymize_after_window' | 'purge_after_window';
}

export interface LgpdProviderEvidence {
  readonly providerName: string;
  readonly dataType: string;
  readonly status: 'collected' | 'failed';
}

export interface PersonalDataExport {
  readonly subjectId: string;
  readonly subjectType: SubjectType;
  readonly exportedAt: string;
  readonly accountId: string;
  readonly evidence: {
    readonly consentCount: number;
    readonly dsrCount: number;
    readonly providerCount: number;
    readonly collectedProviderCount: number;
    readonly failedProviderCount: number;
  };
  readonly providerEvidence: readonly LgpdProviderEvidence[];
  readonly retentionEvidence: readonly LgpdRetentionEvidence[];
  readonly data: Record<string, unknown>;
}

const DATA_PROVIDER_RETENTION: Readonly<Record<string, LgpdRetentionEvidence>> = {
  owners: {
    dataType: 'owner_profile',
    retentionWindow: '5 anos apos encerramento do relacionamento',
    legalBasis: 'LGPD art. 7, V e VI; obrigacoes civis e consumeristas',
    disposition: 'anonymize_after_window'
  },
  patients: {
    dataType: 'patient_profile',
    retentionWindow: '20 anos para prontuario clinico veterinario',
    legalBasis: 'Obrigacao legal/regulatoria e exercicio regular de direitos',
    disposition: 'anonymize_after_window'
  },
  encounters: {
    dataType: 'clinical_encounters',
    retentionWindow: '20 anos para eventos e prontuario clinico',
    legalBasis: 'Obrigacao legal/regulatoria e exercicio regular de direitos',
    disposition: 'anonymize_after_window'
  },
  financial: {
    dataType: 'financial_records',
    retentionWindow: '5 anos fiscais/contabeis apos liquidacao',
    legalBasis: 'Obrigacao legal/fiscal e exercicio regular de direitos',
    disposition: 'purge_after_window'
  },
  laboratory: {
    dataType: 'laboratory_results',
    retentionWindow: '20 anos quando vinculados ao prontuario clinico',
    legalBasis: 'Obrigacao legal/regulatoria e tutela da saude animal',
    disposition: 'anonymize_after_window'
  },
  attachments: {
    dataType: 'clinical_attachments',
    retentionWindow: '20 anos quando compoem prontuario; 5 anos para anexos administrativos',
    legalBasis: 'Obrigacao legal/regulatoria, contrato e exercicio regular de direitos',
    disposition: 'purge_after_window'
  }
};

export function getLgpdRetentionEvidence(): readonly LgpdRetentionEvidence[] {
  return Object.values(DATA_PROVIDER_RETENTION);
}

export class LgpdService {
  readonly #consentRepo?: ConsentRepository;
  readonly #dsrRepo?: DsrRepository;
  readonly #dataProviders: Record<string, LgpdDataProvider>;

  constructor(options?: LgpdServiceOptions) {
    this.#consentRepo = options?.consentRepository;
    this.#dsrRepo = options?.dsrRepository;
    this.#dataProviders = { ...(options?.dataProviders ?? {}) };
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

  async getDsrRequests(accountId: string): Promise<readonly DataSubjectRequest[]> {
    if (!this.#dsrRepo) {
      throw new Error('DSR repository not configured');
    }

    return this.#dsrRepo.findByAccount(accountId);
  }

  async completeDsrRequest(
    accountId: string,
    requestId: string,
    completedBy: string,
    resultJson?: Record<string, unknown>
  ): Promise<DataSubjectRequest> {
    if (!this.#dsrRepo) {
      throw new Error('DSR repository not configured');
    }

    const request = await this.#dsrRepo.findById(accountId, requestId);
    if (!request) {
      throw new Error(`DSR request not found: ${requestId}`);
    }

    const result = resultJson ?? (await this.buildDsrResult(accountId, request));

    return this.#dsrRepo.updateStatus(accountId, requestId, 'completed', {
      completedBy,
      completedAt: new Date().toISOString(),
      resultJson: result
    });
  }

  async rejectDsrRequest(
    accountId: string,
    requestId: string,
    rejectedBy: string,
    reason: string
  ): Promise<DataSubjectRequest> {
    if (!this.#dsrRepo) {
      throw new Error('DSR repository not configured');
    }

    return this.#dsrRepo.updateStatus(accountId, requestId, 'rejected', {
      completedBy: rejectedBy,
      completedAt: new Date().toISOString(),
      rejectionReason: reason
    });
  }

  async buildPersonalDataExport(
    accountId: string,
    subjectId: string,
    subjectType: SubjectType,
    dataProviders: Record<string, LgpdDataProvider> = {}
  ): Promise<PersonalDataExport> {
    const providers = { ...this.#dataProviders, ...dataProviders };
    const consents = this.#consentRepo
      ? await this.#consentRepo.findBySubject(accountId, subjectId, subjectType)
      : [];
    const dsrRequests = this.#dsrRepo
      ? await this.#dsrRepo.findBySubject(accountId, subjectId, subjectType)
      : [];
    const data: Record<string, unknown> = {
      consents,
      dataSubjectRequests: dsrRequests
    };
    const providerEvidence: LgpdProviderEvidence[] = [];
    const context = { accountId, subjectId, subjectType };

    for (const [providerName, providerFn] of Object.entries(providers)) {
      try {
        data[providerName] = await providerFn(subjectId, context);
        providerEvidence.push({
          providerName,
          dataType: DATA_PROVIDER_RETENTION[providerName]?.dataType ?? providerName,
          status: 'collected'
        });
      } catch {
        data[providerName] = { error: 'Failed to collect data from this source' };
        providerEvidence.push({
          providerName,
          dataType: DATA_PROVIDER_RETENTION[providerName]?.dataType ?? providerName,
          status: 'failed'
        });
      }
    }

    const collectedProviderCount = providerEvidence.filter((item) => item.status === 'collected').length;
    const failedProviderCount = providerEvidence.filter((item) => item.status === 'failed').length;

    return {
      accountId,
      subjectId,
      subjectType,
      exportedAt: new Date().toISOString(),
      evidence: {
        consentCount: consents.length,
        dsrCount: dsrRequests.length,
        providerCount: Object.keys(providers).length,
        collectedProviderCount,
        failedProviderCount
      },
      providerEvidence,
      retentionEvidence: getLgpdRetentionEvidence(),
      data
    };
  }

  buildRetentionEvidence(_subjectType?: SubjectType): readonly LgpdRetentionEvidence[] {
    return getLgpdRetentionEvidence();
  }

  buildErasureDisposition(subjectId: string, subjectType: SubjectType): Record<string, unknown> {
    const retentionEvidence = this.buildRetentionEvidence(subjectType);
    return {
      action: 'retention_aware_erasure',
      subjectId,
      subjectType,
      completedAt: new Date().toISOString(),
      disposition: 'retention_window_enforced',
      retentionEvidence,
      operationalPlan: retentionEvidence.map((item) => ({
        dataType: item.dataType,
        disposition: item.disposition,
        retentionWindow: item.retentionWindow
      })),
      physicalPurgeEligible: retentionEvidence.every((item) => item.disposition === 'purge_after_window'),
      anonymizationRequired: retentionEvidence.some(
        (item) => item.disposition === 'anonymize_after_window'
      ),
      message:
        'Solicitacao concluida com politica de retencao aplicada; anonimizacao ou expurgo fisico fica condicionado ao fim da janela legal por tipo de dado.'
    };
  }

  private async buildDsrResult(
    accountId: string,
    request: DataSubjectRequest
  ): Promise<Record<string, unknown>> {
    if (request.requestType === 'data_export' || request.requestType === 'data_portability' || request.requestType === 'data_access') {
      return {
        export: await this.buildPersonalDataExport(accountId, request.subjectId, request.subjectType)
      };
    }

    if (request.requestType === 'data_deletion' || request.requestType === 'data_anonymization') {
      return this.buildErasureDisposition(request.subjectId, request.subjectType);
    }

    if (request.requestType === 'consent_revocation') {
      const consents = this.#consentRepo
        ? await this.#consentRepo.findActiveBySubject(accountId, request.subjectId, request.subjectType)
        : [];
      return {
        action: 'consent_revocation',
        revokedConsentCandidates: consents.map((consent) => consent.id),
        message: 'Revogacao deve ser aplicada por finalidade para preservar trilha juridica.'
      };
    }

    return {
      action: request.requestType,
      completedAt: new Date().toISOString(),
      message: 'Solicitacao concluida com registro operacional.'
    };
  }
}
