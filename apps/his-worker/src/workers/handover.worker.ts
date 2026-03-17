import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { db } from '@cvg-his/db';
import { Worker } from 'bullmq';
import type { Redis } from 'ioredis';

import { acquireRedisLock, releaseRedisLock } from '../lib/idempotency.js';
import { renderHandoverHtml } from '../render/handoverHtml.js';
import { renderHandoverPdf } from '../render/handoverPdf.js';
import {
  HANDOVER_BUILD_JOB_NAME,
  HANDOVER_BUILD_QUEUE_NAME,
  type HandoverBuildJobData,
  type HandoverBuildJobName,
  type HandoverBuildJobResult
} from '../queues/handover.queue.js';
import {
  LOCK_BUSY_ERROR_CODE,
  throwRetryableLockNotAcquiredError
} from './lockRetry.js';

const HANDOVER_LOCK_TTL_SECONDS = 10 * 60;

type HandoverBuildSummary = {
  handoverId: string;
  accountId: string;
  wardId: string;
  wardName: string;
  status: string;
  shiftDate: string;
  shiftPeriod: string;
  buildStatus: string;
  documentId: string | null;
};

type HandoverBuildItem = {
  stayId: string;
  patientSnapshot: Record<string, unknown>;
  problems: unknown[];
  plan: unknown[];
  criticalMeds: unknown[];
  alerts: Record<string, unknown>;
  pending: unknown[];
  escalation: Record<string, unknown>;
  notes: string | null;
};

type HandoverWorkerOptions = {
  storageDir: string;
};

type BuildLogContext = {
  queue: string;
  jobName: string;
  jobId: string;
  handoverId: string;
  accountId: string;
  wardId: string;
  requestId: string;
};

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function mapShiftDate(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return String(value);
}

function normalizeBuildError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.slice(0, 4000);
}

async function loadHandoverSummary(
  accountId: string,
  handoverId: string
): Promise<HandoverBuildSummary | null> {
  const result = await db.$client.query(
    `
      select
        h.id as handover_id,
        h.account_id,
        h.ward_id,
        w.name as ward_name,
        h.status,
        h.shift_date,
        h.shift_period,
        h.build_status,
        h.document_id
      from shift_handovers h
      join wards w
        on w.id = h.ward_id
      where h.id = $1 and h.account_id = $2
      limit 1
    `,
    [handoverId, accountId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0] as Record<string, unknown>;

  return {
    handoverId: String(row.handover_id),
    accountId: String(row.account_id),
    wardId: String(row.ward_id),
    wardName: String(row.ward_name),
    status: String(row.status),
    shiftDate: mapShiftDate(row.shift_date),
    shiftPeriod: String(row.shift_period),
    buildStatus: String(row.build_status),
    documentId: row.document_id ? String(row.document_id) : null
  };
}

async function loadHandoverItems(accountId: string, handoverId: string): Promise<HandoverBuildItem[]> {
  const result = await db.$client.query(
    `
      select
        stay_id,
        patient_snapshot_json,
        problems_json,
        plan_json,
        critical_meds_json,
        alerts_json,
        pending_json,
        escalation_json,
        notes
      from shift_handover_items
      where handover_id = $1
        and account_id = $2
      order by created_at asc
    `,
    [handoverId, accountId]
  );

  return result.rows.map((row) => {
    const mapped = row as Record<string, unknown>;

    return {
      stayId: String(mapped.stay_id),
      patientSnapshot: asRecord(mapped.patient_snapshot_json),
      problems: asArray(mapped.problems_json),
      plan: asArray(mapped.plan_json),
      criticalMeds: asArray(mapped.critical_meds_json),
      alerts: asRecord(mapped.alerts_json),
      pending: asArray(mapped.pending_json),
      escalation: asRecord(mapped.escalation_json),
      notes: mapped.notes ? String(mapped.notes) : null
    };
  });
}

async function markBuilding(accountId: string, handoverId: string): Promise<void> {
  await db.$client.query(
    `
      update shift_handovers
      set
        build_status = 'building',
        build_error = null,
        updated_at = now()
      where id = $1 and account_id = $2
    `,
    [handoverId, accountId]
  );
}

async function markFailed(accountId: string, handoverId: string, buildError: string): Promise<void> {
  await db.$client.query(
    `
      update shift_handovers
      set
        build_status = 'failed',
        build_error = $1,
        updated_at = now()
      where id = $2 and account_id = $3
    `,
    [buildError, handoverId, accountId]
  );
}

async function writeStorageFile(
  storageDir: string,
  storageKey: string,
  content: string | Buffer
): Promise<number> {
  const fullPath = join(storageDir, storageKey);
  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, content);

  if (typeof content === 'string') {
    return Buffer.byteLength(content, 'utf8');
  }

  return content.byteLength;
}

async function persistDocumentAndMarkReady(input: {
  accountId: string;
  handoverId: string;
  createdByUserId: string;
  storageKey: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}): Promise<{ documentId: string }> {
  const client = await db.$client.connect();

  try {
    await client.query('begin');

    const documentResult = await client.query(
      `
        insert into documents (
          account_id,
          storage_key,
          filename,
          mime_type,
          size_bytes,
          created_by_user_id
        ) values ($1, $2, $3, $4, $5, $6)
        on conflict (storage_key)
        do update set
          filename = excluded.filename,
          mime_type = excluded.mime_type,
          size_bytes = excluded.size_bytes
        returning id, account_id
      `,
      [
        input.accountId,
        input.storageKey,
        input.filename,
        input.mimeType,
        input.sizeBytes,
        input.createdByUserId
      ]
    );

    const documentRow = documentResult.rows[0] as Record<string, unknown>;
    const documentId = String(documentRow.id);
    const documentAccountId = String(documentRow.account_id);

    if (documentAccountId !== input.accountId) {
      throw new Error('Document storage key already belongs to another account');
    }

    const updateResult = await client.query(
      `
        update shift_handovers
        set
          document_id = $1,
          build_status = 'ready',
          build_error = null,
          updated_at = now()
        where id = $2 and account_id = $3
        returning id
      `,
      [documentId, input.handoverId, input.accountId]
    );

    if (updateResult.rows.length === 0) {
      throw new Error('Handover not found when updating build output');
    }

    await client.query('commit');
    return { documentId };
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

function logInfo(context: BuildLogContext, message: string, extra: Record<string, unknown> = {}): void {
  console.info(
    JSON.stringify({
      level: 'info',
      message,
      ...context,
      ...extra
    })
  );
}

function logWarn(context: BuildLogContext, message: string, extra: Record<string, unknown> = {}): void {
  console.warn(
    JSON.stringify({
      level: 'warn',
      message,
      ...context,
      ...extra
    })
  );
}

function logError(context: BuildLogContext, message: string, extra: Record<string, unknown> = {}): void {
  console.error(
    JSON.stringify({
      level: 'error',
      message,
      ...context,
      ...extra
    })
  );
}

export function createHandoverWorker(
  connection: Redis,
  prefix: string,
  options: HandoverWorkerOptions
): Worker<HandoverBuildJobData, HandoverBuildJobResult, HandoverBuildJobName> {
  return new Worker<HandoverBuildJobData, HandoverBuildJobResult, HandoverBuildJobName>(
    HANDOVER_BUILD_QUEUE_NAME,
    async (job) => {
      if (job.name !== HANDOVER_BUILD_JOB_NAME) {
        throw new Error(`Unsupported handover job name: ${job.name}`);
      }

      const data = job.data;
      const context: BuildLogContext = {
        queue: HANDOVER_BUILD_QUEUE_NAME,
        jobName: job.name,
        jobId: job.id?.toString() ?? 'unknown',
        handoverId: data.handoverId,
        accountId: data.accountId,
        wardId: data.wardId,
        requestId: data.requestId
      };

      const lockKey = `handover:build:${data.handoverId}:v1`;
      const lock = await acquireRedisLock(connection, lockKey, HANDOVER_LOCK_TTL_SECONDS);

      if (!lock) {
        const attempts = Number(job.opts.attempts ?? 1);
        const attempt = job.attemptsMade + 1;
        logWarn(context, 'handover build lock not acquired; scheduling retry', {
          entityId: data.handoverId,
          lockKey,
          attempt,
          attempts,
          errorCode: LOCK_BUSY_ERROR_CODE
        });
        throwRetryableLockNotAcquiredError({
          queue: HANDOVER_BUILD_QUEUE_NAME,
          jobId: context.jobId,
          accountId: data.accountId,
          entityType: 'handover',
          entityId: data.handoverId,
          lockKey
        });
      }

      try {
        const summary = await loadHandoverSummary(data.accountId, data.handoverId);

        if (!summary) {
          throw new Error('Handover not found');
        }

        if (summary.buildStatus === 'ready' && summary.documentId) {
          logInfo(context, 'handover build skipped: already ready', {
            documentId: summary.documentId
          });
          return {
            status: 'idempotent_ready',
            handoverId: data.handoverId,
            documentId: summary.documentId,
            storageKey: `handovers/${data.handoverId}.html`
          };
        }

        if (summary.status !== 'published') {
          throw new Error(`Handover status must be published for build. Current status: ${summary.status}`);
        }

        await markBuilding(data.accountId, data.handoverId);
        logInfo(context, 'handover build started');

        const items = await loadHandoverItems(data.accountId, data.handoverId);
        const generatedAt = new Date().toISOString();
        const html = renderHandoverHtml({
          handoverId: summary.handoverId,
          wardName: summary.wardName,
          shiftDate: summary.shiftDate,
          shiftPeriod: summary.shiftPeriod,
          generatedAt,
          items
        });

        const htmlStorageKey = `handovers/${summary.handoverId}.html`;
        const htmlSizeBytes = await writeStorageFile(options.storageDir, htmlStorageKey, html);

        const pdf = await renderHandoverPdf({ html });
        if (pdf) {
          const pdfStorageKey = `handovers/${summary.handoverId}.pdf`;
          await writeStorageFile(options.storageDir, pdfStorageKey, pdf.content);
        }

        const persisted = await persistDocumentAndMarkReady({
          accountId: data.accountId,
          handoverId: data.handoverId,
          createdByUserId: data.requestedByUserId,
          storageKey: htmlStorageKey,
          filename: `handover-${summary.handoverId}.html`,
          mimeType: 'text/html',
          sizeBytes: htmlSizeBytes
        });

        logInfo(context, 'handover build completed', {
          documentId: persisted.documentId,
          storageKey: htmlStorageKey,
          htmlSizeBytes
        });

        return {
          status: 'ready',
          handoverId: data.handoverId,
          documentId: persisted.documentId,
          storageKey: htmlStorageKey
        };
      } catch (error) {
        const buildError = normalizeBuildError(error);

        try {
          await markFailed(data.accountId, data.handoverId, buildError);
        } catch (statusError) {
          logError(context, 'failed to persist handover build failure status', {
            statusError: statusError instanceof Error ? statusError.message : String(statusError)
          });
        }

        logError(context, 'handover build failed', {
          error: error instanceof Error ? { message: error.message, stack: error.stack } : { error }
        });
        throw error;
      } finally {
        try {
          await releaseRedisLock(connection, lock);
        } catch (error) {
          logWarn(context, 'failed to release handover build lock', {
            lockKey,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
    },
    {
      connection,
      prefix,
      concurrency: 2
    }
  );
}
