export { LgpdService, type LgpdServiceOptions, type PersonalDataExport } from './service.js';

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
