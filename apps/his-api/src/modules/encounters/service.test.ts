import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { RequestContext } from '../../plugins/requestContext.js';
import type { EncounterRecord, EncountersRepo } from './repo.js';
import { createEncountersService } from './service.js';

const mockAppendSensitiveReadAudit = vi.hoisted(() => vi.fn(async () => {}));
vi.mock('../iam/auditSensitiveAccess.js', () => ({
  appendSensitiveReadAudit: mockAppendSensitiveReadAudit
}));

// Test UUIDs for stable account/user references
const TEST_ACCOUNT_ID = '11111111-1111-1111-1111-111111111111';
const TEST_USER_ID = '22222222-2222-2222-2222-222222222222';

const fakeDb = {} as typeof import('@cvg-his/db').db;
fakeDb.$client = { query: vi.fn() } as any;

function makeEncounter(overrides: Partial<EncounterRecord> = {}): EncounterRecord {
  return {
    id: 'encounter-1',
    accountId: TEST_ACCOUNT_ID,
    patientId: uuidv4(),
    ownerId: uuidv4(),
    status: 'open',
    openedByUserId: TEST_USER_ID,
    closedByUserId: null,
    openedAt: new Date('2026-01-01T00:00:00.000Z'),
    closedAt: null,
    reason: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides
  };
}

// Simple UUID v4 generator for tests
function uuidv4(): string {
  return '00000000-0000-0000-0000-000000000001'.replace(/0/g, () => Math.floor(Math.random() * 10).toString());
}

function createRepoMock(): EncountersRepo {
  return {
    findPatientInAccount: vi.fn(async () => null),
    create: vi.fn(async () => makeEncounter()),
    findById: vi.fn(async () => null),
    closeById: vi.fn(async () => null),
    list: vi.fn(async () => ({
      data: [],
      page: 1,
      pageSize: 20,
      total: 0
    })),
    getTimeline: vi.fn(async () => null)
  };
}

function createRequestContext(overrides: Partial<RequestContext> = {}): RequestContext {
  return {
    requestId: 'req-1',
    actor: {
      accountId: TEST_ACCOUNT_ID,
      userId: TEST_USER_ID,
      role: 'vet',
      roles: ['vet'],
      permissions: []
    },
    ...overrides
  };
}

describe('encounters service', () => {
  let repo: EncountersRepo;
  let appendAudit: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    repo = createRepoMock();
    appendAudit = vi.fn(async () => undefined);

    // Mock db query para retornar conta e usuário válidos quando consultados
    (fakeDb.$client.query as ReturnType<typeof vi.fn>)
      .mockImplementation(async (sql: string, params: any[]) => {
        if (sql.includes('FROM accounts WHERE id') || sql.includes('FROM accounts')) {
          return {
            rows: [{
              id: TEST_ACCOUNT_ID,
              slug: 'test-account',
              name: 'Test Account',
              is_active: true
            }]
          };
        }
        if (sql.includes('FROM users WHERE id') || sql.includes('FROM users')) {
          return {
            rows: [{
              id: TEST_USER_ID,
              email: 'test@example.com',
              full_name: 'Test User',
              is_active: true
            }]
          };
        }
        return { rows: [] };
      });

    // Clear all mocks
    vi.clearAllMocks();
  });

  it('abre encounter e registra auditoria', async () => {
    vi.mocked(repo.findPatientInAccount).mockResolvedValue({
      patientId: 'patient-1',
      ownerId: 'owner-1'
    });
    vi.mocked(repo.create).mockResolvedValue(makeEncounter());

    const service = createEncountersService(
      {
        db: fakeDb,
        requestContext: createRequestContext()
      },
      {
        repo,
        appendAudit
      }
    );

    const result = await service.create({
      patientId: 'patient-1',
      reason: 'Consulta inicial'
    });

    expect(result.kind).toBe('created');
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: expect.any(String),
        patientId: expect.any(String),
        ownerId: expect.any(String),
        openedByUserId: expect.any(String),
        reason: 'Consulta inicial'
      })
    );
    expect(appendAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'encounter.create',
        entityType: 'encounter',
        entityId: 'encounter-1'
      })
    );
  });

  it('não abre encounter para paciente de outro tenant', async () => {
    vi.mocked(repo.findPatientInAccount).mockResolvedValue(null);

    const service = createEncountersService(
      {
        db: fakeDb,
        requestContext: createRequestContext()
      },
      {
        repo,
        appendAudit
      }
    );

    const result = await service.create({
      patientId: 'patient-1'
    });

    expect(result).toEqual({ kind: 'patient_not_found' });
    expect(repo.create).not.toHaveBeenCalled();
    expect(appendAudit).not.toHaveBeenCalled();
  });

  it('fecha encounter aberto e registra auditoria', async () => {
    const before = makeEncounter({
      id: 'encounter-2',
      status: 'open',
      reason: null
    });
    const after = makeEncounter({
      id: 'encounter-2',
      status: 'closed',
      closedByUserId: TEST_USER_ID,
      closedAt: new Date('2026-01-01T01:00:00.000Z'),
      reason: 'Alta'
    });

    vi.mocked(repo.findById).mockResolvedValue(before);
    vi.mocked(repo.closeById).mockResolvedValue(after);

    const service = createEncountersService(
      {
        db: fakeDb,
        requestContext: createRequestContext()
      },
      {
        repo,
        appendAudit
      }
    );

    const result = await service.close('encounter-2', { reason: 'Alta' });

    expect(result.kind).toBe('closed');
    expect(repo.closeById).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: expect.any(String),
        encounterId: 'encounter-2',
        closedByUserId: expect.any(String),
        reason: 'Alta'
      })
    );
    expect(appendAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'encounter.close',
        entityType: 'encounter',
        entityId: 'encounter-2',
        reason: 'Alta',
        beforeJson: before,
        afterJson: after
      })
    );
  });

  it('retorna conflito ao fechar encounter já fechado', async () => {
    vi.mocked(repo.findById).mockResolvedValue(
      makeEncounter({
        id: 'encounter-3',
        status: 'closed',
        closedByUserId: 'user-9',
        closedAt: new Date('2026-01-02T00:00:00.000Z')
      })
    );

    const service = createEncountersService(
      {
        db: fakeDb,
        requestContext: createRequestContext()
      },
      {
        repo,
        appendAudit
      }
    );

    const result = await service.close('encounter-3', {});

    expect(result.kind).toBe('already_closed');
    expect(repo.closeById).not.toHaveBeenCalled();
    expect(appendAudit).not.toHaveBeenCalled();
  });

  it('lista encounters sempre filtrando por account do ator', async () => {
    vi.mocked(repo.list).mockResolvedValue({
      data: [makeEncounter()],
      page: 1,
      pageSize: 20,
      total: 1
    });

    const service = createEncountersService(
      {
        db: fakeDb,
        requestContext: createRequestContext()
      },
      {
        repo,
        appendAudit
      }
    );

    const result = await service.list({
      patientId: 'patient-1',
      page: 1,
      pageSize: 20
    });

    expect(repo.list).toHaveBeenCalledWith({
      accountId: expect.any(String),
      patientId: expect.any(String),
      page: 1,
      pageSize: 20
    });
    expect(result.total).toBe(1);
  });

  it('falha com 401 quando falta x-user-id para abrir encounter', async () => {
    const service = createEncountersService(
      {
        db: fakeDb,
        requestContext: createRequestContext({
          actor: {
            accountId: TEST_ACCOUNT_ID,
            roles: ['vet'],
            permissions: []
          }
        })
      },
      {
        repo,
        appendAudit
      }
    );

    await expect(service.create({ patientId: 'patient-1' })).rejects.toMatchObject({
      statusCode: 401,
      code: 'UNAUTHORIZED'
    });
  });

  it('retorna timeline filtrada por account do ator', async () => {
    vi.mocked(repo.getTimeline).mockResolvedValue({
      encounter: makeEncounter({
        id: 'encounter-9'
      }),
      notes: [],
      versions: [],
      documents: [],
      timeline: []
    });

    const service = createEncountersService(
      {
        db: fakeDb,
        requestContext: createRequestContext()
      },
      {
        repo,
        appendAudit
      }
    );

    const result = await service.getTimeline('encounter-9');

    expect(repo.getTimeline).toHaveBeenCalledWith(TEST_ACCOUNT_ID, 'encounter-9');
    expect(result?.encounter.id).toBe('encounter-9');
  });
});
