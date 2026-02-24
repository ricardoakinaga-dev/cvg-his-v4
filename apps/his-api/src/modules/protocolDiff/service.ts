import type { RequestContext } from '../../plugins/requestContext.js';
import { buildJsonDiff } from './diff.js';

type DbClient = typeof import('@cvg-his/db').db;

type ServiceContext = {
  db: DbClient;
  requestContext: RequestContext;
};

type AccountActor = NonNullable<RequestContext['actor']> & {
  accountId: string;
};

type VersionRef = {
  id: string;
  accountId: string;
  protocolId: string;
  versionNumber: number;
  status: string;
  contentJson: Record<string, unknown>;
};

export type ProtocolVersionDiffResult =
  | { kind: 'from_not_found' }
  | { kind: 'to_not_found' }
  | { kind: 'different_protocols' }
  | {
      kind: 'ok';
      diff: {
        fromVersion: {
          id: string;
          protocolId: string;
          versionNumber: number;
          status: string;
        };
        toVersion: {
          id: string;
          protocolId: string;
          versionNumber: number;
          status: string;
        };
        changes: ReturnType<typeof buildJsonDiff>;
      };
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

function ensureAccountActor(requestContext: RequestContext): AccountActor {
  const actor = requestContext.actor;

  if (!actor?.accountId) {
    throw unauthorizedError('Missing actor context. Provide a valid Bearer token.');
  }

  return actor as AccountActor;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function mapVersionRow(row: Record<string, unknown>): VersionRef {
  return {
    id: String(row.id),
    accountId: String(row.account_id),
    protocolId: String(row.protocol_id),
    versionNumber: Number(row.version_number),
    status: String(row.status),
    contentJson: asRecord(row.content_json)
  };
}

async function loadVersion(
  db: DbClient,
  accountId: string,
  versionId: string
): Promise<VersionRef | null> {
  const result = await db.$client.query(
    `
      select
        id,
        account_id,
        protocol_id,
        version_number,
        status,
        content_json
      from protocol_versions
      where id = $1
        and account_id = $2
      limit 1
    `,
    [versionId, accountId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return mapVersionRow(result.rows[0] as Record<string, unknown>);
}

export function createProtocolDiffService(context: ServiceContext) {
  return {
    async getVersionDiff(fromVersionId: string, toVersionId: string): Promise<ProtocolVersionDiffResult> {
      const actor = ensureAccountActor(context.requestContext);
      const fromVersion = await loadVersion(context.db, actor.accountId, fromVersionId);

      if (!fromVersion) {
        return { kind: 'from_not_found' };
      }

      const toVersion = await loadVersion(context.db, actor.accountId, toVersionId);
      if (!toVersion) {
        return { kind: 'to_not_found' };
      }

      if (fromVersion.protocolId !== toVersion.protocolId) {
        return { kind: 'different_protocols' };
      }

      return {
        kind: 'ok',
        diff: {
          fromVersion: {
            id: fromVersion.id,
            protocolId: fromVersion.protocolId,
            versionNumber: fromVersion.versionNumber,
            status: fromVersion.status
          },
          toVersion: {
            id: toVersion.id,
            protocolId: toVersion.protocolId,
            versionNumber: toVersion.versionNumber,
            status: toVersion.status
          },
          changes: buildJsonDiff(fromVersion.contentJson, toVersion.contentJson)
        }
      };
    }
  };
}
