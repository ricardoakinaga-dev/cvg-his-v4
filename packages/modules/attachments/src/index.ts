import { createHash } from 'node:crypto';
import { EncountersService } from '@cvg-his-v2/module-encounters';
import { DiagnosticsService } from '@cvg-his-v2/module-diagnostics';
import { MedicalRecordsService } from '@cvg-his-v2/module-medical-records';
import type { CreateAttachmentRequest } from '@cvg-his-v2/shared-contracts';
import { NotFoundError, ValidationError } from '@cvg-his-v2/shared-errors';
import type { AccountId, AttachmentId, AttachmentSummary, UserId } from '@cvg-his-v2/shared-types';
import { createCorrelationId, nowIso } from '@cvg-his-v2/shared-utils';
import { requireNonEmptyString } from '@cvg-his-v2/shared-validation';
import type { AttachmentRepository } from './attachment-repository.js';
import type { FileStorage } from './file-storage.js';

export {
  DatabaseAttachmentRepository,
  type AttachmentRepository
} from './attachment-repository.js';
export {
  LocalFileStorage,
  createMemoryFileStorage,
  type FileStorage,
  type FileStorageResult
} from './file-storage.js';

export interface AttachmentsServiceOptions {
  readonly encounters: EncountersService;
  readonly medicalRecords: MedicalRecordsService;
  readonly diagnostics: DiagnosticsService;
  readonly repository?: AttachmentRepository;
  readonly fileStorage?: FileStorage;
}

export class AttachmentsService {
  readonly #encounters: EncountersService;
  readonly #diagnostics: DiagnosticsService;
  readonly #medicalRecords: MedicalRecordsService;
  readonly #repository?: AttachmentRepository;
  readonly #fileStorage?: FileStorage;
  readonly #attachments: AttachmentSummary[] = [];

  public constructor(options: AttachmentsServiceOptions) {
    this.#encounters = options.encounters;
    this.#medicalRecords = options.medicalRecords;
    this.#diagnostics = options.diagnostics;
    this.#repository = options.repository;
    this.#fileStorage = options.fileStorage;
  }

  public async upload(
    actorUserId: UserId,
    payload: CreateAttachmentRequest,
    fileContent?: Buffer,
    expectedAccountId?: AccountId
  ): Promise<AttachmentSummary> {
    const linkedEntityId = requireNonEmptyString(payload.linkedEntityId, 'linkedEntityId');
    const accountId = await this.#resolveLinkedEntityAccount(
      payload.linkedEntityType,
      linkedEntityId,
      expectedAccountId
    );

    let storageKey: string;
    let checksum: string;
    let sizeBytes: number | undefined;

    if (fileContent && this.#fileStorage) {
      const result = await this.#fileStorage.store(
        accountId,
        linkedEntityId,
        payload.fileName,
        fileContent
      );
      storageKey = result.storageKey;
      checksum = result.checksum;
      sizeBytes = result.sizeBytes;

      const declaredChecksum = requireNonEmptyString(payload.checksum, 'checksum');
      if (declaredChecksum !== checksum) {
        await this.#fileStorage.delete(storageKey);
        throw new ValidationError('Checksum mismatch: file integrity verification failed', {
          expected: declaredChecksum,
          actual: checksum
        });
      }
    } else if (fileContent) {
      storageKey = `local/${accountId}/${linkedEntityId}/${payload.fileName}`;
      checksum = createHash('sha256').update(fileContent).digest('hex');
      sizeBytes = fileContent.length;

      const declaredChecksum = requireNonEmptyString(payload.checksum, 'checksum');
      if (declaredChecksum !== checksum) {
        throw new ValidationError('Checksum mismatch: file integrity verification failed', {
          expected: declaredChecksum,
          actual: checksum
        });
      }
    } else {
      storageKey = `pending/${linkedEntityId}/${payload.fileName}`;
      checksum = requireNonEmptyString(payload.checksum, 'checksum');
    }

    const attachment: AttachmentSummary = {
      id: createCorrelationId('att') as AttachmentId,
      accountId: accountId as AccountId,
      linkedEntityType: payload.linkedEntityType,
      linkedEntityId,
      category: payload.category,
      fileName: requireNonEmptyString(payload.fileName, 'fileName'),
      storageKey,
      mimeType: requireNonEmptyString(payload.mimeType, 'mimeType'),
      checksum,
      sizeBytes,
      source: 'upload',
      uploadedByUserId: actorUserId,
      createdAt: nowIso()
    };

    this.#attachments.unshift(attachment);

    if (this.#repository) {
      await this.#repository.create(attachment);
    }

    return attachment;
  }

  public async getById(id: string): Promise<AttachmentSummary | null> {
    if (this.#repository) {
      return this.#repository.findById(id as AttachmentId);
    }
    return this.#attachments.find((a) => a.id === id) ?? null;
  }

  public async getFileContent(storageKey: string): Promise<Buffer | null> {
    if (this.#fileStorage) {
      return this.#fileStorage.retrieve(storageKey);
    }
    return null;
  }

  public async listByLinkedEntity(
    linkedEntityType: 'encounter' | 'medical_record' | 'diagnostic_order',
    linkedEntityId: string,
    expectedAccountId?: AccountId
  ): Promise<readonly AttachmentSummary[]> {
    const accountId = await this.#resolveLinkedEntityAccount(
      linkedEntityType,
      linkedEntityId,
      expectedAccountId
    );
    if (this.#repository) {
      const attachments = await this.#repository.findByLinkedEntity(
        linkedEntityType,
        linkedEntityId
      );
      return attachments.filter((attachment) => attachment.accountId === accountId);
    }
    return this.#attachments.filter(
      (attachment) =>
        attachment.accountId === accountId &&
        attachment.linkedEntityType === linkedEntityType &&
        attachment.linkedEntityId === linkedEntityId
    );
  }

  async #resolveLinkedEntityAccount(
    linkedEntityType: CreateAttachmentRequest['linkedEntityType'],
    linkedEntityId: string,
    expectedAccountId?: AccountId
  ): Promise<AccountId> {
    let accountId: AccountId;
    if (linkedEntityType === 'encounter') {
      accountId = this.#encounters.getOrThrow(linkedEntityId as never).accountId;
    } else if (linkedEntityType === 'medical_record') {
      accountId = (await this.#medicalRecords.getRecordOrThrowAsync(linkedEntityId as never))
        .accountId;
    } else if (linkedEntityType === 'diagnostic_order') {
      accountId = this.#diagnostics.getOrThrow(linkedEntityId as never).accountId;
    } else {
      throw new NotFoundError('Invalid attachment link target', { linkedEntityType });
    }

    if (expectedAccountId && accountId !== expectedAccountId) {
      throw new NotFoundError('Attachment link target not found', {
        linkedEntityType,
        linkedEntityId
      });
    }
    return accountId;
  }
}
