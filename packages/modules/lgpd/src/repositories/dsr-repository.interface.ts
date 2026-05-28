export type DsrType =
  | 'data_export'
  | 'data_deletion'
  | 'data_anonymization'
  | 'data_rectification'
  | 'data_access'
  | 'data_portability'
  | 'consent_revocation';

export type DsrStatus = 'pending' | 'in_progress' | 'completed' | 'rejected' | 'cancelled';

export type SubjectType = 'owner' | 'patient' | 'user';

export interface DataSubjectRequest {
  readonly id: string;
  readonly accountId: string;
  readonly subjectId: string;
  readonly subjectType: SubjectType;
  readonly requestType: DsrType;
  readonly status: DsrStatus;
  readonly requestedBy: string;
  readonly requestedAt: string;
  readonly completedAt?: string;
  readonly completedBy?: string;
  readonly notes?: string;
  readonly rejectionReason?: string;
  readonly resultJson?: Record<string, unknown>;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface DsrCreateRequest {
  readonly accountId: string;
  readonly subjectId: string;
  readonly subjectType: SubjectType;
  readonly requestType: DsrType;
  readonly requestedBy: string;
  readonly notes?: string;
}

export interface DsrRepository {
  findById(accountId: string, id: string): Promise<DataSubjectRequest | undefined>;

  findBySubject(
    accountId: string,
    subjectId: string,
    subjectType: SubjectType
  ): Promise<readonly DataSubjectRequest[]>;

  findByStatus(accountId: string, status: DsrStatus): Promise<readonly DataSubjectRequest[]>;

  findByAccount(accountId: string): Promise<readonly DataSubjectRequest[]>;

  create(
    request: Omit<DataSubjectRequest, 'id' | 'requestedAt' | 'createdAt' | 'updatedAt'>
  ): Promise<DataSubjectRequest>;

  updateStatus(
    accountId: string,
    id: string,
    status: DsrStatus,
    options?: {
      completedBy?: string;
      completedAt?: string;
      rejectionReason?: string;
      resultJson?: Record<string, unknown>;
    }
  ): Promise<DataSubjectRequest>;
}
