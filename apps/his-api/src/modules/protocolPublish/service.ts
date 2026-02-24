import { append, type AppendAuditInput } from '@cvg-his/audit';
import {
  ProtocolContentPublishSchema,
  type ProtocolContentPublishDto
} from '@cvg-his/domain';

import type {
  ProtocolPublishEnqueueResult,
  ProtocolPublishJobData
} from '../../lib/queues.js';
import type { RequestContext } from '../../plugins/requestContext.js';
import {
  createProtocolPublishRepo,
  type ProtocolPublishRepo,
  type ProtocolVersionPublishRecord
} from './repo.js';

type DbClient = typeof import('@cvg-his/db').db;

type ServiceContext = {
  db: DbClient;
  requestContext: RequestContext;
};

type ServiceDependencies = {
  repo?: ProtocolPublishRepo;
  appendAudit?: (input: AppendAuditInput) => Promise<unknown>;
  enqueueProtocolPublish?: (
    payload: ProtocolPublishJobData
  ) => Promise<ProtocolPublishEnqueueResult>;
};

type AccountActor = NonNullable<RequestContext['actor']> & {
  accountId: string;
};

type WriteActor = AccountActor & {
  userId: string;
};

type PublishValidationIssue = {
  path: string;
  message: string;
};

export type RequestProtocolPublishResult =
  | { kind: 'version_not_found' }
  | { kind: 'version_not_publishable'; version: ProtocolVersionPublishRecord }
  | { kind: 'invalid_content'; issues: PublishValidationIssue[] }
  | {
      kind: 'queued';
      version: ProtocolVersionPublishRecord;
      jobId: string | null;
    };

function unauthorizedError(message: string): Error & { statusCode: 401; code: 'UNAUTHORIZED' } {
  const error = new Error(message) as Error & {
    statusCode: 401;
    code: 'UNAUTHORIZED';
  };

  error.statusCode = 401;
  error.code = 'UNAUTHORIZED';
  return error;
}

function queueUnavailableError(message: string): Error & { statusCode: 503; code: 'QUEUE_UNAVAILABLE' } {
  const error = new Error(message) as Error & {
    statusCode: 503;
    code: 'QUEUE_UNAVAILABLE';
  };

  error.statusCode = 503;
  error.code = 'QUEUE_UNAVAILABLE';
  return error;
}

function normalizeBuildError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.slice(0, 4000);
}

function ensureAccountActor(requestContext: RequestContext): AccountActor {
  const actor = requestContext.actor;

  if (!actor?.accountId) {
    throw unauthorizedError('Missing actor context. Provide a valid Bearer token.');
  }

  return actor as AccountActor;
}

function ensureWriteActor(requestContext: RequestContext): WriteActor {
  const actor = ensureAccountActor(requestContext);

  if (!actor.userId) {
    throw unauthorizedError('Missing actor user context in token.');
  }

  return actor as WriteActor;
}

function mapValidationIssues(issues: Array<{ path: Array<string | number>; message: string }>): PublishValidationIssue[] {
  return issues.map((issue) => ({
    path: issue.path
      .map((segment) => (typeof segment === 'number' ? `[${segment}]` : segment))
      .join('.')
      .replace('.[', '['),
    message: issue.message
  }));
}

function validateProtocolContent(contentJson: Record<string, unknown>): {
  ok: true;
  value: ProtocolContentPublishDto;
} | {
  ok: false;
  issues: PublishValidationIssue[];
} {
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

export function createProtocolPublishService(
  context: ServiceContext,
  dependencies: ServiceDependencies = {}
) {
  const repo = dependencies.repo ?? createProtocolPublishRepo(context.db);
  const appendAudit = dependencies.appendAudit ?? append;

  return {
    async requestPublish(versionId: string): Promise<RequestProtocolPublishResult> {
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

      let enqueueResult: ProtocolPublishEnqueueResult;
      try {
        enqueueResult = await enqueueProtocolPublish({
          accountId: actor.accountId,
          protocolId: publishingVersion.protocolId,
          versionId: publishingVersion.id,
          requestedByUserId: actor.userId,
          requestId: context.requestContext.requestId
        });
      } catch (error) {
        const failedVersion = await repo.markFailed({
          accountId: actor.accountId,
          versionId: publishingVersion.id,
          updatedByUserId: actor.userId,
          buildError: `enqueue_failed: ${normalizeBuildError(error)}`
        });

        if (!failedVersion) {
          throw queueUnavailableError(
            'Failed to enqueue protocol publish job and failed to persist status=failed'
          );
        }

        throw queueUnavailableError(
          `Failed to enqueue protocol publish job: ${error instanceof Error ? error.message : 'unknown error'}`
        );
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
