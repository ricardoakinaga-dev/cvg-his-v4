import { expect, test } from './fixtures/spa-fixture';

const API_URL = process.env.API_URL || 'http://127.0.0.1:3111';
const SECOND_ADMIN_USERNAME = process.env.E2E_SECOND_ADMIN_USERNAME || 'admin_b';
const SECOND_ADMIN_PASSWORD = process.env.E2E_SECOND_ADMIN_PASSWORD || 'seed_admin_b';

type RoleCode =
  | 'admin'
  | 'reception'
  | 'nurse'
  | 'veterinarian'
  | 'finance'
  | 'inventory'
  | 'auditor';

type Session = {
  accessToken: string;
  principal?: {
    user?: {
      id?: string;
      accountId?: string;
    };
  };
};

type ApiResult = {
  response: Response;
  body: Record<string, unknown>;
};

const ROLE_CODES: readonly RoleCode[] = [
  'admin',
  'reception',
  'nurse',
  'veterinarian',
  'finance',
  'inventory',
  'auditor'
];

const ENDPOINT_MATRIX: readonly {
  readonly path: string;
  readonly allowed: readonly RoleCode[];
}[] = [
  { path: '/auth/session', allowed: ROLE_CODES },
  { path: '/mfa/status', allowed: ROLE_CODES },
  { path: '/access-control', allowed: ['admin', 'auditor'] },
  { path: '/users', allowed: ['admin', 'reception'] },
  { path: '/staff', allowed: ['admin', 'reception'] },
  { path: '/audit/events', allowed: ['admin', 'auditor'] },
  { path: '/owners', allowed: ['admin', 'reception', 'nurse', 'veterinarian', 'finance', 'auditor'] },
  { path: '/patients', allowed: ROLE_CODES },
  { path: '/encounters', allowed: ROLE_CODES },
  { path: '/medical-records', allowed: ['admin', 'reception', 'nurse', 'veterinarian', 'auditor'] },
  { path: '/prescriptions', allowed: ['admin', 'nurse', 'veterinarian'] },
  { path: '/prescription-executions', allowed: ['admin', 'nurse', 'veterinarian'] },
  { path: '/discharges', allowed: ['admin', 'nurse', 'veterinarian'] },
  { path: '/diagnostics/orders', allowed: ['admin', 'veterinarian', 'auditor'] },
  { path: '/inpatient', allowed: ['admin', 'nurse', 'veterinarian', 'auditor'] },
  { path: '/surgeries', allowed: ['admin', 'veterinarian', 'auditor'] },
  { path: '/billing', allowed: ['admin', 'reception', 'finance', 'auditor'] },
  { path: '/inventory', allowed: ['admin', 'reception', 'nurse', 'veterinarian', 'inventory', 'auditor'] },
  { path: '/fiscal/summary', allowed: ['admin', 'finance', 'inventory', 'auditor'] },
  { path: '/flags', allowed: ['admin'] },
  { path: '/appointments', allowed: ['admin', 'reception', 'nurse', 'auditor'] },
  { path: '/notifications', allowed: ROLE_CODES },
  { path: '/lgpd/requests', allowed: ['admin', 'auditor'] }
];

async function parseResult(response: Response): Promise<ApiResult> {
  const raw = await response.text();
  if (!raw) return { response, body: {} };

  try {
    const parsed: unknown = JSON.parse(raw);
    return {
      response,
      body:
        parsed && typeof parsed === 'object' && !Array.isArray(parsed)
          ? (parsed as Record<string, unknown>)
          : { value: parsed }
    };
  } catch {
    return { response, body: { raw } };
  }
}

async function requestAs(
  token: string,
  path: string,
  init: RequestInit = {}
): Promise<ApiResult> {
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return parseResult(await fetch(`${API_URL}${path}`, { ...init, headers }));
}

async function login(username: string, password: string): Promise<Session> {
  const result = await requestAs('', '/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
  expect(result.response.status, JSON.stringify(result.body)).toBe(200);
  return result.body as unknown as Session;
}

async function createRoleUser(
  adminToken: string,
  role: Exclude<RoleCode, 'admin'>,
  runId: string
): Promise<{ readonly id: string; readonly session: Session }> {
  const username = `matrix_${role}_${runId}`;
  const password = `Matrix-${role}-${runId}-secret`;
  const created = await requestAs(adminToken, '/users', {
    method: 'POST',
    body: JSON.stringify({
      username,
      email: `${username}@cvg.local`,
      password,
      displayName: `Matrix ${role}`,
      roleCode: role
    })
  });
  expect(created.response.status, `${role}: ${JSON.stringify(created.body)}`).toBe(201);
  const userId = String(created.body.id ?? '');
  expect(userId).not.toBe('');

  const session = await login(username, password);
  return { id: userId, session };
}

function itemsOf(body: Record<string, unknown>): readonly Record<string, unknown>[] {
  return Array.isArray(body.items) ? (body.items as Record<string, unknown>[]) : [];
}

test.describe('matriz RBAC dos sete perfis no PostgreSQL', () => {
  test('prova allow/deny por perfil, MFA, governança e isolamento entre tenants', async ({
    authSession
  }) => {
    const adminToken = authSession.accessToken;
    const accountAId = authSession.principal?.user?.accountId;
    const runId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const sessions = new Map<RoleCode, Session>([['admin', authSession]]);
    const userIds = new Map<RoleCode, string>();

    for (const role of ROLE_CODES.filter((candidate): candidate is Exclude<RoleCode, 'admin'> => candidate !== 'admin')) {
      const created = await createRoleUser(adminToken, role, runId);
      sessions.set(role, created.session);
      userIds.set(role, created.id);
      expect(created.session.principal?.user?.accountId).toBe(accountAId);
    }

    for (const endpoint of ENDPOINT_MATRIX) {
      for (const role of ROLE_CODES) {
        const session = sessions.get(role);
        expect(session).toBeTruthy();
        const result = await requestAs(session!.accessToken, endpoint.path);
        const expectedStatus = endpoint.allowed.includes(role) ? 200 : 403;
        expect(
          result.response.status,
          `${role} ${endpoint.path}: ${JSON.stringify(result.body)}`
        ).toBe(expectedStatus);
      }
    }

    const invalidRoleUser = await requestAs(sessions.get('reception')!.accessToken, '/users', {
      method: 'POST',
      body: JSON.stringify({
        username: `should_not_create_${runId}`,
        email: `should_not_create_${runId}@cvg.local`,
        password: 'Should-not-be-created-123'
      })
    });
    expect(invalidRoleUser.response.status).toBe(403);

    const flagKey = `e2e_matrix_${runId}`;
    const createdFlag = await requestAs(adminToken, '/flags', {
      method: 'POST',
      body: JSON.stringify({
        key: flagKey,
        owner: 'access-matrix',
        description: 'Temporary access matrix flag',
        defaultValue: false
      })
    });
    expect(createdFlag.response.status, JSON.stringify(createdFlag.body)).toBe(201);

    const deniedFlagMutation = await requestAs(sessions.get('auditor')!.accessToken, '/flags', {
      method: 'POST',
      body: JSON.stringify({
        key: `denied_${runId}`,
        owner: 'access-matrix',
        description: 'Must not be created',
        defaultValue: false
      })
    });
    expect(deniedFlagMutation.response.status).toBe(403);

    const deletedFlag = await requestAs(adminToken, `/flags/${encodeURIComponent(flagKey)}`, {
      method: 'DELETE'
    });
    expect(deletedFlag.response.status, JSON.stringify(deletedFlag.body)).toBe(204);

    const owner = await requestAs(adminToken, '/owners', {
      method: 'POST',
      body: JSON.stringify({
        fullName: `RBAC matrix owner ${runId}`,
        documentId: `RBAC-MATRIX-${runId}`,
        contacts: [{ label: 'Celular', type: 'phone', value: '11999990009', primary: true }],
        financialResponsible: false,
        status: 'active'
      })
    });
    expect(owner.response.status, JSON.stringify(owner.body)).toBe(201);
    const ownerId = String(owner.body.id);

    const dsr = await requestAs(adminToken, '/lgpd/requests', {
      method: 'POST',
      body: JSON.stringify({
        subjectId: ownerId,
        subjectType: 'owner',
        requestType: 'data_export',
        notes: 'RBAC matrix boundary'
      })
    });
    expect(dsr.response.status, JSON.stringify(dsr.body)).toBe(201);

    const auditorDsrMutation = await requestAs(
      sessions.get('auditor')!.accessToken,
      '/lgpd/requests',
      {
        method: 'POST',
        body: JSON.stringify({
          subjectId: ownerId,
          subjectType: 'owner',
          requestType: 'data_export'
        })
      }
    );
    expect(auditorDsrMutation.response.status).toBe(403);

    const accountBSession = await login(SECOND_ADMIN_USERNAME, SECOND_ADMIN_PASSWORD);
    const accountBUsers = await requestAs(accountBSession.accessToken, '/users');
    expect(accountBUsers.response.status).toBe(200);
    const accountBUserIds = new Set(itemsOf(accountBUsers.body).map((item) => String(item.id)));
    for (const userId of userIds.values()) {
      expect(accountBUserIds.has(userId)).toBe(false);
    }

    const foreignUser = await requestAs(
      accountBSession.accessToken,
      `/users/${encodeURIComponent(userIds.get('auditor')!)}`
    );
    // A tenant-scoped lookup intentionally returns not-found to avoid
    // disclosing whether the foreign account owns that user id.
    expect(foreignUser.response.status).toBe(404);

    const team = await requestAs(adminToken, '/access-control/teams', {
      method: 'POST',
      body: JSON.stringify({
        code: `matrix_${runId}`,
        name: 'RBAC Matrix Team',
        description: 'Temporary tenant-scoped access team'
      })
    });
    expect(team.response.status, JSON.stringify(team.body)).toBe(201);
    const teamId = String(team.body.id);

    const accountBTeams = await requestAs(accountBSession.accessToken, '/access-control/teams');
    expect(accountBTeams.response.status).toBe(200);
    expect(itemsOf(accountBTeams.body).some((item) => item.id === teamId)).toBe(false);

    const crossTenantTeamPatch = await requestAs(
      accountBSession.accessToken,
      `/access-control/teams/${encodeURIComponent(teamId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ name: 'must-not-cross-tenant' })
      }
    );
    expect(crossTenantTeamPatch.response.status).toBe(401);

    const deactivatedTeam = await requestAs(
      adminToken,
      `/access-control/teams/${encodeURIComponent(teamId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ isActive: false })
      }
    );
    expect(deactivatedTeam.response.status, JSON.stringify(deactivatedTeam.body)).toBe(200);

    await requestAs(adminToken, `/owners/${encodeURIComponent(ownerId)}`, { method: 'DELETE' });
  });
});
