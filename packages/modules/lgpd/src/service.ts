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
  /**
   * Executes deletion/anonymization against the systems of record. Without it,
   * erasure requests cannot be completed: a completion must reflect an effect.
   */
  readonly erasureExecutor?: LgpdErasureExecutor;
}

export interface LgpdErasureEvidence {
  readonly executedAt: string;
  /** Data types whose personal data was anonymized or purged by the executor. */
  readonly erasedDataTypes: readonly string[];
  /** Data types retained under a legal retention window, with the reason. */
  readonly retainedDataTypes: readonly { readonly dataType: string; readonly reason: string }[];
}

export type LgpdErasureExecutor = (
  context: LgpdDataProviderContext & {
    readonly requestId: string;
    readonly requestType: 'data_deletion' | 'data_anonymization';
    readonly retentionEvidence: readonly LgpdRetentionEvidence[];
  }
) => Promise<LgpdErasureEvidence>;

/** Raised when a DSR transition is not allowed; API layers map it to HTTP 409. */
export class LgpdDsrStateError extends Error {
  readonly code: 'DSR_NOT_OPEN' | 'DSR_ERASURE_EXECUTOR_UNAVAILABLE' | 'DSR_ERASURE_NOT_EXECUTED';

  constructor(code: LgpdDsrStateError['code'], message: string) {
    super(message);
    this.name = 'LgpdDsrStateError';
    this.code = code;
  }
}

const OPEN_DSR_STATUSES: ReadonlySet<DataSubjectRequest['status']> = new Set([
  'pending',
  'in_progress'
]);

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
  /**
   * What the system actually does when the window ends. Product decision of
   * 2026-09-26 (R2-LGPD-02): records are retained while a relationship or a
   * legal obligation exists; there is no automatic anonymization or purge.
   * Erasure happens only on a data-subject request (LGPD art. 18, VI), keeping
   * what other legal duties require (art. 16).
   */
  readonly disposition: 'retain' | 'anonymize_after_window' | 'purge_after_window';
}

/**
 * Statement delivered to the data subject inside the export package. It must
 * describe the real behaviour of the system, never a promise it does not keep.
 */
export const LGPD_RETENTION_POLICY_STATEMENT =
  'Os dados sao mantidos enquanto houver relacionamento com a clinica ou obrigacao legal de guarda. ' +
  'O sistema nao anonimiza nem elimina dados automaticamente ao fim de um prazo. ' +
  'A eliminacao ocorre mediante pedido do titular (LGPD art. 18, VI), preservando o que outra obrigacao legal ' +
  'exige guardar (art. 16): documentos fiscais, prontuario clinico e trilha de auditoria.';

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
  /** Human-readable retention policy that matches the dispositions above. */
  readonly retentionPolicy: string;
  readonly data: Record<string, unknown>;
}

const DATA_PROVIDER_RETENTION: Readonly<Record<string, LgpdRetentionEvidence>> = {
  owners: {
    dataType: 'owner_profile',
    retentionWindow:
      'Enquanto houver relacionamento com a clinica ou obrigacao legal; eliminacao mediante pedido do titular (LGPD art. 18, VI)',
    legalBasis: 'LGPD art. 7, V e VI; obrigacoes civis e consumeristas',
    disposition: 'retain'
  },
  patients: {
    dataType: 'patient_profile',
    retentionWindow:
      'Prontuario clinico veterinario: 20 anos (prazo pendente de validacao juridica, R2-LGPD-03); sem eliminacao automatica',
    legalBasis: 'Obrigacao legal/regulatoria e exercicio regular de direitos',
    disposition: 'retain'
  },
  encounters: {
    dataType: 'clinical_encounters',
    retentionWindow:
      'Eventos e prontuario clinico: 20 anos (prazo pendente de validacao juridica, R2-LGPD-03); sem eliminacao automatica',
    legalBasis: 'Obrigacao legal/regulatoria e exercicio regular de direitos',
    disposition: 'retain'
  },
  financial: {
    dataType: 'financial_records',
    retentionWindow:
      'Documentos fiscais e contabeis: no minimo 5 anos apos a liquidacao; mantidos mesmo apos pedido de eliminacao (LGPD art. 16, I)',
    legalBasis: 'Obrigacao legal/fiscal e exercicio regular de direitos',
    disposition: 'retain'
  },
  laboratory: {
    dataType: 'laboratory_results',
    retentionWindow:
      'Vinculados ao prontuario clinico: mesmo prazo do prontuario (pendente de validacao juridica, R2-LGPD-03); sem eliminacao automatica',
    legalBasis: 'Obrigacao legal/regulatoria e tutela da saude animal',
    disposition: 'retain'
  },
  attachments: {
    dataType: 'clinical_attachments',
    retentionWindow:
      'Anexos do prontuario: mesmo prazo do prontuario; anexos administrativos: enquanto houver relacionamento ou obrigacao legal; sem eliminacao automatica',
    legalBasis: 'Obrigacao legal/regulatoria, contrato e exercicio regular de direitos',
    disposition: 'retain'
  }
};

export function getLgpdRetentionEvidence(): readonly LgpdRetentionEvidence[] {
  return Object.values(DATA_PROVIDER_RETENTION);
}

export class LgpdService {
  readonly #consentRepo?: ConsentRepository;
  readonly #dsrRepo?: DsrRepository;
  readonly #dataProviders: Record<string, LgpdDataProvider>;
  readonly #erasureExecutor?: LgpdErasureExecutor;

  constructor(options?: LgpdServiceOptions) {
    this.#consentRepo = options?.consentRepository;
    this.#dsrRepo = options?.dsrRepository;
    this.#dataProviders = { ...(options?.dataProviders ?? {}) };
    this.#erasureExecutor = options?.erasureExecutor;
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
    this.#assertOpen(request);

    // Effects (erasure, consent revocation) are always computed by the service;
    // a caller-supplied result can never stand in for them.
    const result =
      request.requestType === 'data_deletion' ||
      request.requestType === 'data_anonymization' ||
      request.requestType === 'consent_revocation'
        ? await this.buildDsrResult(accountId, request, completedBy)
        : (resultJson ?? (await this.buildDsrResult(accountId, request, completedBy)));

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

    const request = await this.#dsrRepo.findById(accountId, requestId);
    if (!request) {
      throw new Error(`DSR request not found: ${requestId}`);
    }
    this.#assertOpen(request);

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
      retentionPolicy: LGPD_RETENTION_POLICY_STATEMENT,
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

  #assertOpen(request: DataSubjectRequest): void {
    if (!OPEN_DSR_STATUSES.has(request.status)) {
      throw new LgpdDsrStateError(
        'DSR_NOT_OPEN',
        `DSR request is already ${request.status} and cannot change state`
      );
    }
  }

  async #executeErasure(
    accountId: string,
    request: DataSubjectRequest & { requestType: 'data_deletion' | 'data_anonymization' }
  ): Promise<Record<string, unknown>> {
    if (!this.#erasureExecutor) {
      throw new LgpdDsrStateError(
        'DSR_ERASURE_EXECUTOR_UNAVAILABLE',
        'Erasure requests cannot be completed until an erasure executor is configured'
      );
    }
    const disposition = this.buildErasureDisposition(request.subjectId, request.subjectType);
    const evidence = await this.#erasureExecutor({
      accountId,
      subjectId: request.subjectId,
      subjectType: request.subjectType,
      requestId: request.id,
      requestType: request.requestType,
      retentionEvidence: this.buildRetentionEvidence(request.subjectType)
    });
    if (
      !Number.isFinite(new Date(evidence.executedAt).getTime()) ||
      evidence.erasedDataTypes.length + evidence.retainedDataTypes.length === 0
    ) {
      throw new LgpdDsrStateError(
        'DSR_ERASURE_NOT_EXECUTED',
        'Erasure executor did not report any executed or retained data type'
      );
    }
    return {
      ...disposition,
      completedAt: evidence.executedAt,
      erasureExecuted: true,
      erasedDataTypes: evidence.erasedDataTypes,
      retainedDataTypes: evidence.retainedDataTypes,
      message:
        'Solicitacao concluida: dados pessoais eliminados ou anonimizados conforme evidencia do executor; dados sob obrigacao legal retidos com justificativa.'
    };
  }

  private async buildDsrResult(
    accountId: string,
    request: DataSubjectRequest,
    actorId = 'system'
  ): Promise<Record<string, unknown>> {
    if (request.requestType === 'data_export' || request.requestType === 'data_portability' || request.requestType === 'data_access') {
      return {
        export: await this.buildPersonalDataExport(accountId, request.subjectId, request.subjectType)
      };
    }

    if (request.requestType === 'data_deletion' || request.requestType === 'data_anonymization') {
      return this.#executeErasure(
        accountId,
        request as DataSubjectRequest & { requestType: 'data_deletion' | 'data_anonymization' }
      );
    }

    if (request.requestType === 'consent_revocation') {
      if (!this.#consentRepo) {
        throw new Error('Consent repository not configured');
      }
      const consents = await this.#consentRepo.findActiveBySubject(
        accountId,
        request.subjectId,
        request.subjectType
      );
      const revokedAt = new Date().toISOString();
      const revoked = [];
      for (const consent of consents) {
        revoked.push(await this.#consentRepo.revoke(consent.id, actorId, revokedAt));
      }
      return {
        action: 'consent_revocation',
        revokedAt,
        revokedConsentIds: revoked.map((consent) => consent.id),
        revokedPurposes: revoked.map((consent) => consent.purpose),
        message: 'Consentimentos ativos do titular revogados; historico preservado para trilha juridica.'
      };
    }

    return {
      action: request.requestType,
      completedAt: new Date().toISOString(),
      message: 'Solicitacao concluida com registro operacional.'
    };
  }
}
