export {
  LgpdDsrStateError,
  LgpdSubjectNotFoundError,
  LgpdService,
  getLgpdRetentionEvidence,
  type LgpdErasureEvidence,
  type LgpdErasureExecutor,
  type LgpdDataProvider,
  type LgpdDataProviderContext,
  type LgpdProviderEvidence,
  type LgpdRetentionEvidence,
  type LgpdServiceOptions,
  type LgpdSubjectResolver,
  type PersonalDataExport
} from './service.js';

export { DatabaseConsentRepository } from './repositories/database-consent.repository.js';
export { DatabaseDsrRepository } from './repositories/database-dsr.repository.js';

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
