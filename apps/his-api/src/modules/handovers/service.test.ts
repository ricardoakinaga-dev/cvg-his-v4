import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { RequestContext } from '../../plugins/requestContext.js';
import type { HandoverItemRecord, HandoverRecord, HandoversRepo, HandoverWithItems } from './repo.js';
import { createHandoversService } from './service.js';

const fakeDb = {} as typeof import('@cvg-his/db').db;

function makeHandoverRecord(overrides: Partial<HandoverRecord> = {}): HandoverRecord {
  return {
    id: 'fdd8c156-b52d-4117-a5e1-73dd61474ef1',
    accountId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef2',
    wardId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef3',
    status: 'published',
    shiftDate: '2026-02-19',
    shiftPeriod: 'day',
    publishedAt: new Date('2026-02-19T10:00:00.000Z'),
    publishedByUserId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef5',
    buildStatus: 'failed',
    buildError: 'enqueue_failed: redis unavailable',
    documentId: null,
    createdAt: new Date('2026-02-19T09:00:00.000Z'),
    updatedAt: new Date('2026-02-19T10:00:00.000Z'),
    ...overrides
  };
}

function makeHandoverWithItems(overrides: Partial<HandoverRecord> = {}): HandoverWithItems {
  return {
    handover: makeHandoverRecord(overrides),
    items: []
  };
}

function makeValidHandoverItem(overrides: Partial<HandoverItemRecord> = {}): HandoverItemRecord {
  return {
    id: '9f7324ab-60b0-4c54-9c56-f590001f7301',
    accountId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef2',
    handoverId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef1',
    stayId: '9f7324ab-60b0-4c54-9c56-f590001f7302',
    patientSnapshotJson: {
      patientId: '9f7324ab-60b0-4c54-9c56-f590001f7303',
      patientName: 'Rex',
      species: 'canine'
    },
    problemsJson: ['dor'],
    planJson: ['analgesia'],
    criticalMedsJson: [],
    alertsJson: {},
    pendingJson: [],
    escalationJson: { ifWorse: 'acionar intensivista' },
    notes: null,
    createdAt: new Date('2026-02-19T09:00:00.000Z'),
    updatedAt: new Date('2026-02-19T09:00:00.000Z'),
    ...overrides
  };
}

function createRepoMock(): HandoversRepo {
  return {
    wardExistsInAccount: vi.fn(async () => false),
    findStaysByIds: vi.fn(async () => []),
    createDraft: vi.fn(async () => makeHandoverWithItems({ status: 'draft' })),
    findById: vi.fn(async () => null),
    publish: vi.fn(async () => null),
    markBuildPendingForRetry: vi.fn(async () => null),
    markBuildFailed: vi.fn(async () => null),
    findLatestPublished: vi.fn(async () => null),
    findDocumentByHandoverId: vi.fn(async () => null)
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

describe('handovers service', () => {
  let repo: HandoversRepo;
  let appendAudit: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    repo = createRepoMock();
    appendAudit = vi.fn(async () => undefined);
  });

  it('compensates build_status to failed when enqueue fails after publish transition', async () => {
    const before = {
      handover: makeHandoverRecord({
        status: 'draft',
        publishedAt: null,
        publishedByUserId: null,
        buildStatus: 'pending',
        buildError: null
      }),
      items: [makeValidHandoverItem()]
    } satisfies HandoverWithItems;
    const after = makeHandoverWithItems({
      status: 'published',
      buildStatus: 'pending',
      buildError: null
    });
    const failed = makeHandoverWithItems({
      status: 'published',
      buildStatus: 'failed',
      buildError: 'enqueue_failed: redis unavailable'
    });

    vi.mocked(repo.findById).mockResolvedValueOnce(before).mockResolvedValueOnce(after);
    vi.mocked(repo.publish).mockResolvedValue(after.handover);
    vi.mocked(repo.markBuildFailed).mockResolvedValue(failed.handover);

    const enqueueHandoverBuild = vi.fn(async () => {
      throw new Error('redis unavailable');
    });

    const service = createHandoversService(
      { db: fakeDb, requestContext: createRequestContext() },
      { repo, appendAudit, enqueueHandoverBuild }
    );

    await expect(service.publish(before.handover.id)).rejects.toMatchObject({
      code: 'QUEUE_UNAVAILABLE',
      statusCode: 503
    });

    expect(repo.markBuildFailed).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: before.handover.accountId,
        handoverId: before.handover.id
      })
    );
    expect(repo.markBuildFailed).toHaveBeenCalledWith(
      expect.objectContaining({
        buildError: expect.stringContaining('enqueue_failed: redis unavailable')
      })
    );
    expect(appendAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'HandoverPublished',
        entityType: 'shift_handover',
        entityId: before.handover.id
      })
    );
  });

  it('retries enqueue successfully from published+failed build state', async () => {
    const before = makeHandoverWithItems({
      status: 'published',
      buildStatus: 'failed',
      buildError: 'enqueue_failed: redis unavailable'
    });
    const after = makeHandoverWithItems({
      status: 'published',
      buildStatus: 'pending',
      buildError: null
    });

    vi.mocked(repo.findById).mockResolvedValueOnce(before).mockResolvedValueOnce(after);
    vi.mocked(repo.markBuildPendingForRetry).mockResolvedValue(after.handover);

    const enqueueHandoverBuild = vi.fn(async () => ({ jobId: 'job-1' }));

    const service = createHandoversService(
      { db: fakeDb, requestContext: createRequestContext() },
      { repo, appendAudit, enqueueHandoverBuild }
    );

    const result = await service.publish(before.handover.id);

    expect(result.kind).toBe('published');
    if (result.kind !== 'published') {
      throw new Error('Expected published result');
    }
    expect(result.job.jobId).toBe('job-1');
    expect(repo.publish).not.toHaveBeenCalled();
    expect(repo.markBuildPendingForRetry).toHaveBeenCalledWith({
      accountId: before.handover.accountId,
      handoverId: before.handover.id
    });
    expect(appendAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'HandoverPublishRetryQueued',
        entityType: 'shift_handover',
        entityId: before.handover.id
      })
    );
  });
});
