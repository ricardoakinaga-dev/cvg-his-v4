export type ConsentPurpose =
  | 'marketing'
  | 'analytics'
  | 'clinical'
  | 'financial'
  | 'operational'
  | 'notifications';

export type ConsentStatus = 'granted' | 'revoked' | 'expired';

export type ConsentOrigin =
  | 'web_portal'
  | 'api'
  | 'mobile_app'
  | 'in_person'
  | 'phone'
  | 'email'
  | 'system_default';

export type SubjectType = 'owner' | 'patient' | 'user';

export interface ConsentRecord {
  readonly id: string;
  readonly accountId: string;
  readonly subjectId: string;
  readonly subjectType: SubjectType;
  readonly purpose: ConsentPurpose;
  readonly status: ConsentStatus;
  readonly origin: ConsentOrigin;
  readonly grantedBy: string;
  readonly grantedAt: string;
  readonly revokedBy?: string;
  readonly revokedAt?: string;
  readonly expiresAt?: string;
  readonly metadata?: Record<string, unknown>;
  readonly createdAt: string;
}

export interface ConsentGrantRequest {
  readonly accountId: string;
  readonly subjectId: string;
  readonly subjectType: SubjectType;
  readonly purpose: ConsentPurpose;
  readonly origin?: ConsentOrigin;
  readonly grantedBy: string;
  readonly expiresAt?: string;
  readonly metadata?: Record<string, unknown>;
}

export interface ConsentRevokeRequest {
  readonly accountId: string;
  readonly subjectId: string;
  readonly subjectType: SubjectType;
  readonly purpose: ConsentPurpose;
  readonly revokedBy: string;
  readonly reason?: string;
}

export interface ConsentRepository {
  findBySubject(
    accountId: string,
    subjectId: string,
    subjectType: SubjectType
  ): Promise<readonly ConsentRecord[]>;

  findBySubjectAndPurpose(
    accountId: string,
    subjectId: string,
    subjectType: SubjectType,
    purpose: ConsentPurpose
  ): Promise<ConsentRecord | undefined>;

  findActiveBySubject(
    accountId: string,
    subjectId: string,
    subjectType: SubjectType
  ): Promise<readonly ConsentRecord[]>;

  create(record: Omit<ConsentRecord, 'id' | 'createdAt'>): Promise<ConsentRecord>;

  revoke(id: string, revokedBy: string, revokedAt: string): Promise<ConsentRecord>;
}
