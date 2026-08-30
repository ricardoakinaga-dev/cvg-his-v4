import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import {
  DatabaseFiscalRepository,
  FiscalService
} from '../../../packages/modules/fiscal/src/index.js';
import {
  createDatabaseClient,
  getPool,
  runInTenantTransactionContext
} from '../../../packages/shared/database/src/index.js';
import type { AccountId, UserId } from '../../../packages/shared/types/src/index.js';
import { runWithTenantContext } from '../../../packages/tenant-context/src/index.js';
import { getTestPool } from '../../db/db-admin.js';
import { activateRlsRole, setAccountContext } from '../../helpers/rls-helpers.js';
import { TEST_DB_URL } from '../../setup/env.js';

const TENANT_ID = randomUUID();
const ACCOUNT_ID = randomUUID() as AccountId;
const FOREIGN_ACCOUNT_ID = randomUUID() as AccountId;
const USER_ID = randomUUID() as UserId;
const FOREIGN_USER_ID = randomUUID() as UserId;

describe('NFS-e provider boundary on PostgreSQL', () => {
  const pool = getTestPool();
  const repository = new DatabaseFiscalRepository();

  async function command<T>(
    accountId: AccountId,
    userId: UserId,
    operation: () => Promise<T> | T
  ): Promise<T> {
    const correlationId = `fiscal-nfse-${randomUUID()}`;
    return runWithTenantContext({ tenantId: TENANT_ID, accountId, correlationId }, () =>
      runInTenantTransactionContext(
        getPool(),
        { accountId, actorUserId: userId, correlationId },
        operation
      )
    );
  }

  function createService(): FiscalService {
    return new FiscalService(repository, ACCOUNT_ID, {
      allowNfseSimulation: false,
      nfse: {
        provider: 'abrasf',
        apiUrl: 'https://municipal.example.test/nfse',
        municipalityCode: '3550308',
        apiKey: 'test-only-token'
      }
    });
  }

  function documentPayload(
    numero: number,
    description = 'Consulta <especial>'
  ): Parameters<FiscalService['createNfseDocument']>[0] {
    return {
      numero,
      provider: 'abrasf',
      customer: {
        type: 'cpf',
        document: '12345678909',
        name: 'Cliente NFS-e'
      },
      services: [
        {
          description,
          codigoServico: '0407',
          cnae: '7500-1/00',
          quantity: 1,
          unitValue: 100,
          totalValue: 100,
          issRate: 0.05,
          issValue: 5,
          pisValue: 0,
          cofinsValue: 0,
          csllValue: 0
        }
      ]
    };
  }

  beforeAll(async () => {
    createDatabaseClient(TEST_DB_URL);
    await pool.query(
      `INSERT INTO tenants (id, slug, name, status, activated_at)
       VALUES ($1, $2, 'Fiscal NFS-e tenant', 'active', now())`,
      [TENANT_ID, `fiscal-nfse-${TENANT_ID.slice(0, 12)}`]
    );
    await pool.query(
      `INSERT INTO accounts (id, tenant_id, slug, name, is_active)
       VALUES ($1, $2, $3, 'Fiscal NFS-e account', true),
              ($4, $2, $5, 'Foreign fiscal NFS-e account', true)`,
      [
        ACCOUNT_ID,
        TENANT_ID,
        `fiscal-nfse-${ACCOUNT_ID.slice(0, 12)}`,
        FOREIGN_ACCOUNT_ID,
        `fiscal-nfse-f-${FOREIGN_ACCOUNT_ID.slice(0, 10)}`
      ]
    );
    await pool.query(
      `INSERT INTO users (id, account_id, username, email, password_hash, full_name)
       VALUES ($1, $2, $3, $4, 'test-hash', 'Fiscal NFS-e operator'),
              ($5, $6, $7, $8, 'test-hash', 'Foreign fiscal NFS-e operator')`,
      [
        USER_ID,
        ACCOUNT_ID,
        `fiscal-nfse-${USER_ID}`,
        `fiscal-nfse-${USER_ID}@example.test`,
        FOREIGN_USER_ID,
        FOREIGN_ACCOUNT_ID,
        `fiscal-nfse-${FOREIGN_USER_ID}`,
        `fiscal-nfse-${FOREIGN_USER_ID}@example.test`
      ]
    );
  });

  afterAll(async () => {
    await pool.query('DELETE FROM accounts WHERE id IN ($1, $2)', [ACCOUNT_ID, FOREIGN_ACCOUNT_ID]);
    await pool.query('DELETE FROM tenants WHERE id = $1', [TENANT_ID]);
    vi.unstubAllGlobals();
  });

  it('persists authorized issue/cancel and provider rejection without leaking secrets', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ authorizationCode: 'AUTH-ISSUE-POSTGRES' }),
        headers: new Headers()
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ authorizationCode: 'AUTH-CANCEL-POSTGRES' }),
        headers: new Headers()
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'municipal-private-secret',
        headers: new Headers()
      });
    vi.stubGlobal('fetch', fetchMock);

    const service = createService();
    const created = await command(ACCOUNT_ID, USER_ID, () =>
      service.createNfseDocument(documentPayload(7001))
    );
    expect(created.status).toBe('draft');

    const issued = await command(ACCOUNT_ID, USER_ID, () => service.issueNfseDocument(created.id));
    expect(issued?.status).toBe('issued');
    expect(issued?.authorizationCode).toBe('AUTH-ISSUE-POSTGRES');
    const repeatedIssue = await command(ACCOUNT_ID, USER_ID, () =>
      service.issueNfseDocument(created.id)
    );
    expect(repeatedIssue?.status).toBe('issued');

    const cancelled = await command(ACCOUNT_ID, USER_ID, () =>
      service.cancelNfseDocument(created.id, { reason: 'Cliente solicitou' })
    );
    expect(cancelled?.status).toBe('cancelled');
    expect(cancelled?.authorizationCode).toBe('AUTH-CANCEL-POSTGRES');

    const rejected = await command(ACCOUNT_ID, USER_ID, async () => {
      const draft = await service.createNfseDocument(documentPayload(7002, 'Consulta rejeitada'));
      return service.issueNfseDocument(draft.id);
    });
    expect(rejected?.status).toBe('error');
    expect(rejected?.observations).toContain('HTTP 401');
    expect(rejected?.observations).not.toContain('municipal-private-secret');

    const persisted = await pool.query(
      `SELECT status, authorization_code, observations
         FROM fiscal_nfse_documents
        WHERE account_id = $1 AND numero = $2`,
      [ACCOUNT_ID, 7002]
    );
    expect(persisted.rows).toEqual([
      {
        status: 'error',
        authorization_code: null,
        observations: '[NFS-e provider error: NFS-e provider rejected document (HTTP 401)]'
      }
    ]);

    const foreignDocuments = await command(FOREIGN_ACCOUNT_ID, FOREIGN_USER_ID, () =>
      repository.listNfseDocuments({ accountId: FOREIGN_ACCOUNT_ID })
    );
    expect(foreignDocuments).toEqual([]);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    const issueRequest = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(String(issueRequest.body)).toContain('Consulta &lt;especial&gt;');
    expect(issueRequest.headers).toMatchObject({ 'Idempotency-Key': `nfse:${created.id}:issue` });
    expect(JSON.stringify(fetchMock.mock.calls)).not.toContain('municipal-private-secret');
  });

  it('bounds and isolates persisted NFS-e report reads by competence and tenant', async () => {
    const service = createService();
    const first = await command(ACCOUNT_ID, USER_ID, () =>
      service.createNfseDocument({
        ...documentPayload(7010, 'Consulta mais recente'),
        competencia: '2026-05-20'
      })
    );
    await command(ACCOUNT_ID, USER_ID, () =>
      service.createNfseDocument({
        ...documentPayload(7011, 'Consulta mais antiga'),
        competencia: '2026-05-10'
      })
    );
    await command(FOREIGN_ACCOUNT_ID, FOREIGN_USER_ID, () =>
      new FiscalService(repository, FOREIGN_ACCOUNT_ID).createNfseDocument({
        ...documentPayload(8010, 'Consulta de outra conta'),
        competencia: '2026-05-20'
      })
    );

    const rows = await command(ACCOUNT_ID, USER_ID, () =>
      repository.listNfseDocuments({
        accountId: ACCOUNT_ID,
        search: 'Consulta',
        competenciaFrom: '2026-05-15',
        competenciaTo: '2026-05-20',
        limit: 1
      })
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe(first.id);
    expect(rows[0]?.competencia).toBe('2026-05-20');
    expect(rows[0]?.customer.name).toBe('Cliente NFS-e');

    const wildcardRows = await command(ACCOUNT_ID, USER_ID, () =>
      repository.listNfseDocuments({ accountId: ACCOUNT_ID, search: '%' })
    );
    expect(wildcardRows).toEqual([]);

    const restrictedUrl = new URL(TEST_DB_URL);
    restrictedUrl.searchParams.set('options', '-c role=cvg_test_rls');
    const restrictedPool = new Pool({ connectionString: restrictedUrl.toString() });
    const restrictedClient = await restrictedPool.connect();
    try {
      await restrictedClient.query('BEGIN');
      await activateRlsRole(restrictedClient);
      await setAccountContext(restrictedClient, ACCOUNT_ID);

      const crossTenantRows = await restrictedClient.query(
        'SELECT id FROM fiscal_nfse_documents WHERE account_id = $1',
        [FOREIGN_ACCOUNT_ID]
      );
      const ownTenantRows = await restrictedClient.query(
        'SELECT id FROM fiscal_nfse_documents WHERE account_id = $1',
        [ACCOUNT_ID]
      );

      expect(crossTenantRows.rows).toEqual([]);
      expect(ownTenantRows.rows.length).toBeGreaterThan(0);
      await restrictedClient.query('ROLLBACK');
    } finally {
      restrictedClient.release();
      await restrictedPool.end();
    }
  });
});
