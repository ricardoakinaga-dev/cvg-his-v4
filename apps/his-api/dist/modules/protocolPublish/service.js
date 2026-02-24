import { append } from '@cvg-his/audit';
import { ProtocolContentPublishSchema } from '@cvg-his/domain';
import { createProtocolPublishRepo } from './repo.js';
function unauthorizedError(message) {
    const error = new Error(message);
    error.statusCode = 401;
    error.code = 'UNAUTHORIZED';
    return error;
}
function queueUnavailableError(message) {
    const error = new Error(message);
    error.statusCode = 503;
    error.code = 'QUEUE_UNAVAILABLE';
    return error;
}
function normalizeBuildError(error) {
    const message = error instanceof Error ? error.message : String(error);
    return message.slice(0, 4000);
}
function ensureAccountActor(requestContext) {
    const actor = requestContext.actor;
    if (!actor?.accountId) {
        throw unauthorizedError('Missing actor context. Provide a valid Bearer token.');
    }
    return actor;
}
function ensureWriteActor(requestContext) {
    const actor = ensureAccountActor(requestContext);
    if (!actor.userId) {
        throw unauthorizedError('Missing actor user context in token.');
    }
    return actor;
}
function mapValidationIssues(issues) {
    return issues.map((issue) => ({
        path: issue.path
            .map((segment) => (typeof segment === 'number' ? `[${segment}]` : segment))
            .join('.')
            .replace('.[', '['),
        message: issue.message
    }));
}
function validateProtocolContent(contentJson) {
    const parsed = ProtocolContentPublishSchema.safeParse(contentJson);
    if (!parsed.success) {
        return {
            ok: false,
            issues: mapValidationIssues(parsed.error.issues)
        };
    }
    return {
        ok: true,
        value: parsed.data
    };
}
export function createProtocolPublishService(context, dependencies = {}) {
    const repo = dependencies.repo ?? createProtocolPublishRepo(context.db);
    const appendAudit = dependencies.appendAudit ?? append;
    return {
        async requestPublish(versionId) {
            const actor = ensureWriteActor(context.requestContext);
            const enqueueProtocolPublish = dependencies.enqueueProtocolPublish;
            if (!enqueueProtocolPublish) {
                throw queueUnavailableError('Queue publisher is not configured for protocol publish.');
            }
            const before = await repo.findVersionById(actor.accountId, versionId);
            if (!before) {
                return { kind: 'version_not_found' };
            }
            if (before.status !== 'draft' && before.status !== 'failed') {
                return {
                    kind: 'version_not_publishable',
                    version: before
                };
            }
            const validation = validateProtocolContent(before.contentJson);
            if (!validation.ok) {
                return {
                    kind: 'invalid_content',
                    issues: validation.issues
                };
            }
            const publishingVersion = await repo.markPublishing({
                accountId: actor.accountId,
                versionId,
                updatedByUserId: actor.userId
            });
            if (!publishingVersion) {
                const current = await repo.findVersionById(actor.accountId, versionId);
                if (!current) {
                    return { kind: 'version_not_found' };
                }
                return {
                    kind: 'version_not_publishable',
                    version: current
                };
            }
            let enqueueResult;
            try {
                enqueueResult = await enqueueProtocolPublish({
                    accountId: actor.accountId,
                    protocolId: publishingVersion.protocolId,
                    versionId: publishingVersion.id,
                    requestedByUserId: actor.userId,
                    requestId: context.requestContext.requestId
                });
            }
            catch (error) {
                const failedVersion = await repo.markFailed({
                    accountId: actor.accountId,
                    versionId: publishingVersion.id,
                    updatedByUserId: actor.userId,
                    buildError: `enqueue_failed: ${normalizeBuildError(error)}`
                });
                if (!failedVersion) {
                    throw queueUnavailableError('Failed to enqueue protocol publish job and failed to persist status=failed');
                }
                throw queueUnavailableError(`Failed to enqueue protocol publish job: ${error instanceof Error ? error.message : 'unknown error'}`);
            }
            await appendAudit({
                accountId: actor.accountId,
                actorUserId: actor.userId,
                roles: actor.roles,
                action: 'ProtocolPublishRequested',
                entityType: 'protocol_version',
                entityId: publishingVersion.id,
                beforeJson: before,
                afterJson: publishingVersion,
                requestId: context.requestContext.requestId
            });
            return {
                kind: 'queued',
                version: publishingVersion,
                jobId: enqueueResult.jobId
            };
        }
    };
}
//# sourceMappingURL=service.js.map