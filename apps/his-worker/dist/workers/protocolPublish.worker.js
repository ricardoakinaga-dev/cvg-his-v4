import { ProtocolContentPublishSchema } from '@cvg-his/domain';
import { Worker } from 'bullmq';
import { z } from 'zod';
import { workerDb } from '../lib/db.js';
import { PROTOCOL_PUBLISH_LOCK_TTL_SECONDS, acquireRedisLock, protocolPublishLockKey, releaseRedisLock } from '../lib/idempotency.js';
import { sha256Hex } from '../lib/hash.js';
import { stableStringify } from '../lib/jsonStable.js';
import { PROTOCOL_PUBLISH_JOB_NAME, PROTOCOL_PUBLISH_QUEUE_NAME } from '../queues/protocolPublish.queue.js';
import { LOCK_BUSY_ERROR_CODE, throwRetryableLockNotAcquiredError } from './lockRetry.js';
class NonRetryablePublishError extends Error {
    constructor(message) {
        super(message);
        this.name = 'NonRetryablePublishError';
    }
}
const protocolPublishJobDataSchema = z.object({
    accountId: z.string().uuid(),
    protocolId: z.string().uuid(),
    versionId: z.string().uuid(),
    requestedByUserId: z.string().uuid(),
    requestId: z.string().trim().min(1)
});
function asRecord(value) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        return value;
    }
    return {};
}
function mapStatus(value) {
    const raw = String(value);
    if (raw === 'publishing') {
        return 'publishing';
    }
    if (raw === 'published') {
        return 'published';
    }
    if (raw === 'failed') {
        return 'failed';
    }
    return 'draft';
}
function mapValidationPath(path) {
    return path
        .map((segment) => (typeof segment === 'number' ? `[${segment}]` : segment))
        .join('.')
        .replace('.[', '[');
}
function normalizeBuildError(error) {
    const message = error instanceof Error ? error.message : String(error);
    return message.slice(0, 4000);
}
async function markVersionFailed(input) {
    await workerDb.$client.query(`
      update protocol_versions
      set
        status = 'failed',
        build_error = $4,
        updated_by_user_id = $3,
        updated_at = now()
      where id = $1
        and account_id = $2
        and status <> 'published'
    `, [input.versionId, input.accountId, input.requestedByUserId, input.buildError]);
}
async function publishVersion(input) {
    const client = await workerDb.$client.connect();
    try {
        await client.query('begin');
        const lockedVersionResult = await client.query(`
        select
          pv.id as version_id,
          pv.account_id,
          pv.protocol_id,
          pv.status as version_status,
          pv.content_json,
          snap.id as snapshot_id,
          snap.snapshot_hash
        from protocol_versions pv
        join protocols p
          on p.id = pv.protocol_id
         and p.account_id = pv.account_id
        left join lateral (
          select ps.id, ps.snapshot_hash
          from protocol_snapshots ps
          where ps.account_id = pv.account_id
            and ps.version_id = pv.id
          order by ps.created_at asc
          limit 1
        ) snap on true
        where pv.account_id = $1
          and pv.protocol_id = $2
          and pv.id = $3
        for update of pv, p
      `, [input.accountId, input.protocolId, input.versionId]);
        if (lockedVersionResult.rows.length === 0) {
            throw new NonRetryablePublishError('Protocol version not found for publish job payload');
        }
        const row = lockedVersionResult.rows[0];
        const versionStatus = mapStatus(row.version_status);
        const contentJson = asRecord(row.content_json);
        const existingSnapshotId = row.snapshot_id ? String(row.snapshot_id) : null;
        const existingSnapshotHash = row.snapshot_hash ? String(row.snapshot_hash) : null;
        if (versionStatus === 'published' && existingSnapshotId) {
            const updateVersionResult = await client.query(`
          update protocol_versions
          set
            status = 'published',
            published_at = coalesce(published_at, now()),
            published_by_user_id = coalesce(published_by_user_id, $3),
            build_error = null,
            updated_by_user_id = $3,
            updated_at = now()
          where id = $1
            and account_id = $2
          returning id
        `, [input.versionId, input.accountId, input.requestedByUserId]);
            if (updateVersionResult.rows.length === 0) {
                throw new Error('Protocol version not found while refreshing idempotent publish state');
            }
            const updateProtocolResult = await client.query(`
          update protocols
          set
            current_published_version_id = $3,
            status = 'published',
            updated_by_user_id = $4,
            updated_at = now()
          where id = $2
            and account_id = $1
          returning id
        `, [input.accountId, input.protocolId, input.versionId, input.requestedByUserId]);
            if (updateProtocolResult.rows.length === 0) {
                throw new Error('Protocol not found while refreshing idempotent publish pointers');
            }
            await client.query('commit');
            return {
                status: 'idempotent_published',
                protocolId: input.protocolId,
                versionId: input.versionId,
                snapshotId: existingSnapshotId,
                snapshotHash: existingSnapshotHash,
                buildError: null
            };
        }
        if (versionStatus !== 'publishing' && versionStatus !== 'published') {
            throw new NonRetryablePublishError(`Protocol version is not publishable in worker (status=${versionStatus})`);
        }
        const parsed = ProtocolContentPublishSchema.safeParse(contentJson);
        if (!parsed.success) {
            const details = parsed.error.issues
                .map((issue) => `${mapValidationPath(issue.path)}: ${issue.message}`)
                .join('; ');
            throw new NonRetryablePublishError(`Invalid protocol publish content_json: ${details}`);
        }
        if (parsed.data.protocolId !== input.protocolId) {
            throw new NonRetryablePublishError(`Invalid protocol publish content_json: protocolId (${parsed.data.protocolId}) does not match job protocolId (${input.protocolId})`);
        }
        const snapshotJson = contentJson;
        const snapshotHash = sha256Hex(stableStringify(snapshotJson));
        let snapshotId = existingSnapshotId;
        if (existingSnapshotId && existingSnapshotHash && existingSnapshotHash !== snapshotHash) {
            throw new NonRetryablePublishError('Snapshot hash mismatch for an existing immutable snapshot');
        }
        if (!snapshotId) {
            const insertResult = await client.query(`
          insert into protocol_snapshots (
            account_id,
            protocol_id,
            version_id,
            snapshot_json,
            snapshot_hash
          ) values ($1, $2, $3, $4, $5)
          returning id
        `, [input.accountId, input.protocolId, input.versionId, snapshotJson, snapshotHash]);
            const snapshotRow = insertResult.rows[0];
            snapshotId = String(snapshotRow.id);
        }
        const updateVersionResult = await client.query(`
        update protocol_versions
        set
          status = 'published',
          published_at = coalesce(published_at, now()),
          published_by_user_id = coalesce(published_by_user_id, $3),
          build_error = null,
          updated_by_user_id = $3,
          updated_at = now()
        where id = $1
          and account_id = $2
        returning id
      `, [input.versionId, input.accountId, input.requestedByUserId]);
        if (updateVersionResult.rows.length === 0) {
            throw new Error('Protocol version not found while marking publish as completed');
        }
        const updateProtocolResult = await client.query(`
        update protocols
        set
          current_published_version_id = $3,
          status = 'published',
          updated_by_user_id = $4,
          updated_at = now()
        where id = $2
          and account_id = $1
        returning id
      `, [input.accountId, input.protocolId, input.versionId, input.requestedByUserId]);
        if (updateProtocolResult.rows.length === 0) {
            throw new Error('Protocol not found while updating current_published_version_id');
        }
        await client.query('commit');
        return {
            status: 'published',
            protocolId: input.protocolId,
            versionId: input.versionId,
            snapshotId,
            snapshotHash,
            buildError: null
        };
    }
    catch (error) {
        await client.query('rollback');
        throw error;
    }
    finally {
        client.release();
    }
}
function logInfo(context, message, extra = {}) {
    console.info(JSON.stringify({
        level: 'info',
        message,
        ...context,
        ...extra
    }));
}
function logWarn(context, message, extra = {}) {
    console.warn(JSON.stringify({
        level: 'warn',
        message,
        ...context,
        ...extra
    }));
}
function logError(context, message, extra = {}) {
    console.error(JSON.stringify({
        level: 'error',
        message,
        ...context,
        ...extra
    }));
}
export function createProtocolPublishWorker(connection, prefix) {
    return new Worker(PROTOCOL_PUBLISH_QUEUE_NAME, async (job) => {
        if (job.name !== PROTOCOL_PUBLISH_JOB_NAME) {
            throw new Error(`Unsupported protocol publish job name: ${job.name}`);
        }
        const parsedPayload = protocolPublishJobDataSchema.safeParse(job.data);
        if (!parsedPayload.success) {
            const details = parsedPayload.error.issues
                .map((issue) => `${mapValidationPath(issue.path)}: ${issue.message}`)
                .join('; ');
            throw new NonRetryablePublishError(`Invalid protocol publish job payload: ${details}`);
        }
        const payload = parsedPayload.data;
        const context = {
            queue: PROTOCOL_PUBLISH_QUEUE_NAME,
            jobName: job.name,
            jobId: job.id?.toString() ?? 'unknown',
            requestId: payload.requestId,
            accountId: payload.accountId,
            protocolId: payload.protocolId,
            versionId: payload.versionId
        };
        const lock = await acquireRedisLock(connection, protocolPublishLockKey(payload.versionId), PROTOCOL_PUBLISH_LOCK_TTL_SECONDS);
        if (!lock) {
            const lockKey = protocolPublishLockKey(payload.versionId);
            const attempts = Number(job.opts.attempts ?? 1);
            const attempt = job.attemptsMade + 1;
            logWarn(context, 'protocol publish lock not acquired; scheduling retry', {
                entityId: payload.versionId,
                lockKey,
                attempt,
                attempts,
                errorCode: LOCK_BUSY_ERROR_CODE
            });
            throwRetryableLockNotAcquiredError({
                queue: PROTOCOL_PUBLISH_QUEUE_NAME,
                jobId: context.jobId,
                accountId: payload.accountId,
                entityType: 'protocol_version',
                entityId: payload.versionId,
                lockKey
            });
        }
        try {
            const result = await publishVersion(payload);
            logInfo(context, 'protocol publish processed', {
                status: result.status,
                snapshotId: result.snapshotId,
                snapshotHash: result.snapshotHash
            });
            return result;
        }
        catch (error) {
            const attempts = Number(job.opts.attempts ?? 1);
            const attempt = job.attemptsMade + 1;
            const isTerminalAttempt = attempt >= attempts;
            const isNonRetryable = error instanceof NonRetryablePublishError;
            const buildError = normalizeBuildError(error);
            if (isNonRetryable || isTerminalAttempt) {
                await markVersionFailed({
                    accountId: payload.accountId,
                    versionId: payload.versionId,
                    requestedByUserId: payload.requestedByUserId,
                    buildError
                });
                logError(context, 'protocol publish failed and version marked as failed', {
                    attempt,
                    attempts,
                    nonRetryable: isNonRetryable,
                    buildError
                });
                return {
                    status: 'failed',
                    protocolId: payload.protocolId,
                    versionId: payload.versionId,
                    snapshotId: null,
                    snapshotHash: null,
                    buildError
                };
            }
            logWarn(context, 'protocol publish attempt failed; retrying', {
                attempt,
                attempts,
                buildError
            });
            throw error;
        }
        finally {
            try {
                await releaseRedisLock(connection, lock);
            }
            catch (error) {
                logWarn(context, 'failed to release protocol publish idempotency lock', {
                    releaseError: normalizeBuildError(error)
                });
            }
        }
    }, {
        connection,
        prefix,
        concurrency: 1
    });
}
//# sourceMappingURL=protocolPublish.worker.js.map