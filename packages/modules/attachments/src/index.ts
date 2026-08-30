import { createHash } from 'node:crypto';
import { Socket } from 'node:net';
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
  S3CompatibleFileStorage,
  createMemoryFileStorage,
  type FileStorage,
  type FileStorageResult,
  type S3CompatibleFileStorageOptions
} from './file-storage.js';

export interface AttachmentsServiceOptions {
  readonly encounters: EncountersService;
  readonly medicalRecords: MedicalRecordsService;
  readonly diagnostics: DiagnosticsService;
  readonly repository?: AttachmentRepository;
  readonly fileStorage?: FileStorage;
  /** Maximum binary upload accepted by the clinical boundary. */
  readonly maxFileSizeBytes?: number;
  readonly scanner?: AttachmentSecurityScanner;
}

export interface AttachmentScanResult {
  readonly status: 'available' | 'rejected' | 'quarantined';
  readonly provider: string;
  readonly reason?: string;
}

export interface AttachmentSecurityScanner {
  /** True only for an externally backed production scanner. */
  readonly productionReady?: boolean;
  scan(input: {
    readonly fileName: string;
    readonly mimeType: string;
    readonly content: Buffer;
  }): Promise<AttachmentScanResult>;
}

/**
 * Deterministic local scanner used for development and tests. Production must
 * replace it with an antivirus adapter; the interface keeps the upload
 * boundary fail-closed when that adapter reports unavailable.
 */
export class LocalAttachmentSecurityScanner implements AttachmentSecurityScanner {
  public readonly productionReady = false;

  public async scan(input: {
    readonly fileName: string;
    readonly mimeType: string;
    readonly content: Buffer;
  }): Promise<AttachmentScanResult> {
    const text = input.content.toString('latin1');
    if (text.includes('EICAR-STANDARD-ANTIVIRUS-TEST-FILE')) {
      return {
        status: 'rejected',
        provider: 'local-heuristic',
        reason: 'malware-test-signature-detected'
      };
    }
    if (input.mimeType.startsWith('text/') && /<script\b|<iframe\b/i.test(text)) {
      return {
        status: 'rejected',
        provider: 'local-heuristic',
        reason: 'active-content-detected'
      };
    }
    return { status: 'available', provider: 'local-heuristic' };
  }
}

export interface ClamAvAttachmentSecurityScannerOptions {
  readonly host: string;
  readonly port?: number;
  readonly timeoutMs?: number;
}

/**
 * ClamAV INSTREAM adapter. An unavailable scanner rejects the operation by
 * throwing, so callers never publish a file as available without a verdict.
 */
export class ClamAvAttachmentSecurityScanner implements AttachmentSecurityScanner {
  public readonly productionReady = true;
  readonly #host: string;
  readonly #port: number;
  readonly #timeoutMs: number;

  public constructor(options: ClamAvAttachmentSecurityScannerOptions) {
    if (!options.host.trim()) throw new ValidationError('ClamAV host is required');
    this.#host = options.host.trim();
    this.#port = options.port ?? 3310;
    this.#timeoutMs = options.timeoutMs ?? 5_000;
  }

  public async scan(input: {
    readonly fileName: string;
    readonly mimeType: string;
    readonly content: Buffer;
  }): Promise<AttachmentScanResult> {
    const socket = new Socket();
    socket.setTimeout(this.#timeoutMs);
    const closeSocket = (): void => {
      if (!socket.destroyed) socket.destroy();
    };

    try {
      await new Promise<void>((resolve, reject) => {
        const onError = (error: Error) => reject(error);
        socket.once('error', onError);
        socket.once('timeout', () => reject(new Error('ClamAV scanner timed out')));
        socket.once('connect', () => {
          socket.removeListener('error', onError);
          resolve();
        });
        socket.connect(this.#port, this.#host);
      });

      const verdict = await new Promise<string>((resolve, reject) => {
        const chunks: Buffer[] = [];
        const onError = (error: Error) => reject(error);
        socket.once('error', onError);
        socket.on('data', (chunk: Buffer) => chunks.push(chunk));
        socket.once('close', () => {
          socket.removeListener('error', onError);
          resolve(Buffer.concat(chunks).toString('utf8').trim());
        });

        socket.write(Buffer.from('zINSTREAM\0', 'ascii'));
        const chunkSize = 1024 * 1024;
        for (let offset = 0; offset < input.content.length; offset += chunkSize) {
          const chunk = input.content.subarray(offset, offset + chunkSize);
          const size = Buffer.allocUnsafe(4);
          size.writeUInt32BE(chunk.length, 0);
          socket.write(size);
          socket.write(chunk);
        }
        socket.write(Buffer.alloc(4));
        socket.end();
      });
      return /FOUND/i.test(verdict)
        ? {
            status: 'rejected',
            provider: 'clamav',
            reason: verdict.slice(0, 500)
          }
        : /OK/i.test(verdict)
          ? { status: 'available', provider: 'clamav' }
          : (() => {
              throw new Error(`ClamAV scanner returned an invalid verdict for ${input.fileName}`);
            })();
    } finally {
      closeSocket();
    }
  }
}

const DEFAULT_MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const BLOCKED_MIME_TYPES = new Set([
  'text/html',
  'application/xhtml+xml',
  'application/javascript',
  'text/javascript',
  'application/x-shockwave-flash'
]);

function assertSafeFileMetadata(fileName: string, mimeType: string): void {
  if (
    !fileName ||
    fileName.length > 255 ||
    fileName.includes('\0') ||
    fileName.includes('/') ||
    fileName.includes('\\') ||
    fileName === '.' ||
    fileName === '..' ||
    fileName.includes('..')
  ) {
    throw new ValidationError('Attachment file name is invalid', { field: 'fileName' });
  }
  const normalizedMime = mimeType.trim().toLowerCase();
  if (!normalizedMime || normalizedMime.length > 127 || BLOCKED_MIME_TYPES.has(normalizedMime)) {
    throw new ValidationError('Attachment MIME type is not allowed', { field: 'mimeType' });
  }
}

function assertKnownMagicBytes(mimeType: string, content: Buffer): void {
  const normalizedMime = mimeType.trim().toLowerCase();
  const startsWith = (prefix: string) =>
    content.subarray(0, prefix.length).toString('ascii') === prefix;
  const isPng = content.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const isJpeg = content.subarray(0, 3).equals(Buffer.from([255, 216, 255]));
  const isGif = startsWith('GIF8');
  const isWebp = startsWith('RIFF') && content.subarray(8, 12).toString('ascii') === 'WEBP';

  if (normalizedMime === 'application/pdf' && !startsWith('%PDF-')) {
    throw new ValidationError('Attachment content does not match application/pdf', {
      field: 'mimeType'
    });
  }
  if (normalizedMime === 'image/png' && !isPng) {
    throw new ValidationError('Attachment content does not match image/png', { field: 'mimeType' });
  }
  if (normalizedMime === 'image/jpeg' && !isJpeg) {
    throw new ValidationError('Attachment content does not match image/jpeg', {
      field: 'mimeType'
    });
  }
  if (normalizedMime === 'image/gif' && !isGif) {
    throw new ValidationError('Attachment content does not match image/gif', { field: 'mimeType' });
  }
  if (normalizedMime === 'image/webp' && !isWebp) {
    throw new ValidationError('Attachment content does not match image/webp', {
      field: 'mimeType'
    });
  }
}

export class AttachmentsService {
  readonly #encounters: EncountersService;
  readonly #diagnostics: DiagnosticsService;
  readonly #medicalRecords: MedicalRecordsService;
  readonly #repository?: AttachmentRepository;
  readonly #fileStorage?: FileStorage;
  readonly #maxFileSizeBytes: number;
  readonly #scanner: AttachmentSecurityScanner;
  readonly #attachments: AttachmentSummary[] = [];

  public constructor(options: AttachmentsServiceOptions) {
    this.#encounters = options.encounters;
    this.#medicalRecords = options.medicalRecords;
    this.#diagnostics = options.diagnostics;
    this.#repository = options.repository;
    this.#fileStorage = options.fileStorage;
    this.#maxFileSizeBytes = options.maxFileSizeBytes ?? DEFAULT_MAX_FILE_SIZE_BYTES;
    this.#scanner = options.scanner ?? new LocalAttachmentSecurityScanner();
  }

  public async upload(
    actorUserId: UserId,
    accountId: AccountId,
    payload: CreateAttachmentRequest,
    fileContent?: Buffer
  ): Promise<AttachmentSummary> {
    const linkedEntityId = requireNonEmptyString(payload.linkedEntityId, 'linkedEntityId');
    const fileName = requireNonEmptyString(payload.fileName, 'fileName');
    const mimeType = requireNonEmptyString(payload.mimeType, 'mimeType').toLowerCase();
    assertSafeFileMetadata(fileName, mimeType);
    if (this.#maxFileSizeBytes <= 0 || !Number.isSafeInteger(this.#maxFileSizeBytes)) {
      throw new ValidationError('Attachment upload limit is invalid');
    }
    if (fileContent && fileContent.length > this.#maxFileSizeBytes) {
      throw new ValidationError('Attachment exceeds the maximum allowed size', {
        maxFileSizeBytes: this.#maxFileSizeBytes
      });
    }
    if (fileContent) {
      assertKnownMagicBytes(mimeType, fileContent);
    }

    const scan = fileContent
      ? await this.#scanner.scan({ fileName, mimeType, content: fileContent })
      : {
          status: 'quarantined' as const,
          provider: 'pending-upload',
          reason: 'binary-content-not-provided'
        };
    if (scan.status === 'rejected') {
      throw new ValidationError('Attachment rejected by security scanner', {
        provider: scan.provider,
        reason: scan.reason
      });
    }

    let targetAccountId: AccountId;
    if (payload.linkedEntityType === 'encounter') {
      targetAccountId = this.#encounters.getOrThrow(linkedEntityId as never).accountId as AccountId;
    } else if (payload.linkedEntityType === 'medical_record') {
      targetAccountId = (await this.#medicalRecords.getRecordOrThrowAsync(linkedEntityId as never))
        .accountId as AccountId;
    } else if (payload.linkedEntityType === 'diagnostic_order') {
      targetAccountId = this.#diagnostics.getOrThrow(accountId, linkedEntityId as never).accountId;
    } else {
      throw new NotFoundError('Invalid attachment link target', {
        linkedEntityType: payload.linkedEntityType
      });
    }

    if (targetAccountId !== accountId) {
      throw new NotFoundError('Attachment target not found', {
        linkedEntityType: payload.linkedEntityType,
        linkedEntityId
      });
    }

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
      const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 180) || 'unnamed';
      storageKey = `local/${accountId}/${linkedEntityId}/${safeName}`;
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
      const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 180) || 'unnamed';
      storageKey = `pending/${linkedEntityId}/${safeName}`;
      checksum = requireNonEmptyString(payload.checksum, 'checksum');
    }

    const attachment: AttachmentSummary = {
      id: createCorrelationId('att') as AttachmentId,
      accountId: accountId as AccountId,
      linkedEntityType: payload.linkedEntityType,
      linkedEntityId,
      category: payload.category,
      fileName,
      storageKey,
      mimeType,
      checksum,
      sizeBytes,
      source: 'upload',
      scanStatus: scan.status,
      scanProvider: scan.provider,
      scanReason: scan.reason,
      scannedAt: fileContent ? nowIso() : undefined,
      uploadedByUserId: actorUserId,
      createdAt: nowIso()
    };

    if (this.#repository) {
      try {
        await this.#repository.create(attachment);
      } catch (error) {
        if (fileContent && this.#fileStorage) {
          await this.#fileStorage.delete(storageKey).catch(() => undefined);
        }
        throw error;
      }
    }

    this.#attachments.unshift(attachment);

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
    linkedEntityId: string
  ): Promise<readonly AttachmentSummary[]> {
    if (this.#repository) {
      return this.#repository.findByLinkedEntity(linkedEntityType, linkedEntityId);
    }
    return this.#attachments.filter(
      (attachment) =>
        attachment.linkedEntityType === linkedEntityType &&
        attachment.linkedEntityId === linkedEntityId
    );
  }
}
