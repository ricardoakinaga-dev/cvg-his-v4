import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { RequestContext } from '../../plugins/requestContext.js';
import type { ProtocolPublishRepo, ProtocolVersionPublishRecord } from './repo.js';
import { createProtocolPublishService } from './service.js';

const fakeDb = {} as typeof import('@cvg-his/db').db;

function makeVersion(overrides: Partial<ProtocolVersionPublishRecord> = {}): ProtocolVersionPublishRecord {
  return {
    id: 'fdd8c156-b52d-4117-a5e1-73dd61474ef1',
    accountId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef2',
    protocolId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef3',
    versionNumber: 1,
    status: 'draft',
    contentJson: {
      protocolId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef3',
      title: 'Protocolo Dor',
      severityLevels: [
        {
          level: 'moderate',
          entryCriteria: ['dor'],
          steps: [{ order: 1, title: 'avaliar', instructions: 'avaliar dor' }],
          contraindications: [],
          escalation: { ifWorse: 'chamar supervisor' }
        }
      ]
    },
    changeReason: null,
    publishedAt: null,
    publishedByUserId: null,
    buildError: null,
    createdByUserId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef4',
    updatedByUserId: null,
    createdAt: new Date('2026-02-19T10:00:00.000Z'),
    updatedAt: new Date('2026-02-19T10:00:00.000Z'),
    ...overrides
  };
}

function createRepoMock(): ProtocolPublishRepo {
  return {
    findVersionById: vi.fn(async () => null),
    markPublishing: vi.fn(async () => null),
    markFailed: vi.fn(async () => null)
  };
}

function createRequestContext(overrides: Partial<RequestContext> = {}): RequestContext {
  return {
    requestId: 'req-1',
    actor: {
      accountId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef2',
      userId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef5',
      role: 'admin',
      roles: ['admin'],
      permissions: []
    },
    ...overrides
  };
}

describe('protocol publish service', () => {
  let repo: ProtocolPublishRepo;
  let appendAudit: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    repo = createRepoMock();
    appendAudit = vi.fn(async () => undefined);
  });

  it('compensates to failed when enqueue fails after publishing state transition', async () => {
    const before = makeVersion({ status: 'draft' });
    const publishing = makeVersion({ status: 'publishing' });
    const failed = makeVersion({
      status: 'failed',
      buildError: 'enqueue_failed: redis unavailable'
    });

    vi.mocked(repo.findVersionById).mockResolvedValue(before);
    vi.mocked(repo.markPublishing).mockResolvedValue(publishing);
    vi.mocked(repo.markFailed).mockResolvedValue(failed);

    const enqueueProtocolPublish = vi.fn(async () => {
      throw new Error('redis unavailable');
    });

    const service = createProtocolPublishService(
      { db: fakeDb, requestContext: createRequestContext() },
      { repo, appendAudit, enqueueProtocolPublish }
    );

    await expect(service.requestPublish(before.id)).rejects.toMatchObject({
      code: 'QUEUE_UNAVAILABLE',
      statusCode: 503
    });

    expect(repo.markFailed).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: before.accountId,
        versionId: before.id
      })
    );
    expect(repo.markFailed).toHaveBeenCalledWith(
      expect.objectContaining({
        buildError: expect.stringContaining('enqueue_failed: redis unavailable')
      })
    );
    expect(appendAudit).not.toHaveBeenCalled();
  });

  it('retries publish successfully from failed state and re-queues job', async () => {
    const before = makeVersion({
      status: 'failed',
      buildError: 'enqueue_failed: redis unavailable'
    });
    const publishing = makeVersion({
      status: 'publishing',
      buildError: null
    });

    vi.mocked(repo.findVersionById).mockResolvedValue(before);
    vi.mocked(repo.markPublishing).mockResolvedValue(publishing);

    const enqueueProtocolPublish = vi.fn(async () => ({ jobId: 'job-retry-1' }));

    const service = createProtocolPublishService(
      { db: fakeDb, requestContext: createRequestContext() },
      { repo, appendAudit, enqueueProtocolPublish }
    );

    const result = await service.requestPublish(before.id);

    expect(result.kind).toBe('queued');
    if (result.kind === 'queued') {
      expect(result.version.status).toBe('publishing');
      expect(result.version.id).toBe(before.id);
      expect(result.jobId).toBe('job-retry-1');
    }

    expect(repo.markPublishing).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: before.accountId,
        versionId: before.id
      })
    );
    expect(enqueueProtocolPublish).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: before.accountId,
        versionId: before.id,
        protocolId: before.protocolId
      })
    );
    expect(appendAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'ProtocolPublishRequested',
        entityType: 'protocol_version',
        entityId: before.id
      })
    );
  });
});
