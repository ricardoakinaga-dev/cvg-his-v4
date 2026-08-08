import { expect, test } from './fixtures/spa-fixture';

const API_URL = process.env.API_URL || 'http://localhost:3101';
const SECOND_ADMIN_USERNAME = process.env.E2E_SECOND_ADMIN_USERNAME || 'admin_b';
const SECOND_ADMIN_PASSWORD = process.env.E2E_SECOND_ADMIN_PASSWORD || 'seed_admin_b';

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

async function parseResult(response: Response): Promise<ApiResult> {
  const raw = await response.text();
  let body: Record<string, unknown> = {};
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        body = parsed as Record<string, unknown>;
      }
    } catch {
      body = { raw };
    }
  }
  return { response, body };
}

async function requestAs(
  token: string,
  path: string,
  init: RequestInit = {}
): Promise<ApiResult> {
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return parseResult(
    await fetch(`${API_URL}${path}`, {
      ...init,
      headers
    })
  );
}

async function login(username: string, password: string): Promise<Session> {
  const result = await requestAs('', '/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
  expect(result.response.status, JSON.stringify(result.body)).toBe(200);
  return result.body as unknown as Session;
}

async function deleteBestEffort(token: string, path: string): Promise<void> {
  await requestAs(token, path, { method: 'DELETE' });
}

test.describe('Isolamento tenant no runtime PostgreSQL', () => {
  test('não permite leitura ou vínculo cruzado entre dois accounts', async ({ authSession }) => {
    const accountAToken = authSession.accessToken;
    const accountAId = authSession.principal?.user?.accountId;
    const accountBSession = await login(SECOND_ADMIN_USERNAME, SECOND_ADMIN_PASSWORD);
    const accountBId = accountBSession.principal?.user?.accountId;

    expect(accountAId).toBeTruthy();
    expect(accountBId).toBeTruthy();
    expect(accountBId).not.toBe(accountAId);

    let ownerAId: string | undefined;
    let ownerBId: string | undefined;
    let patientAId: string | undefined;
    let encounterAId: string | undefined;

    try {
      const ownerA = await requestAs(accountAToken, '/owners', {
        method: 'POST',
        body: JSON.stringify({
          fullName: `Tenant A owner ${Date.now()}`,
          documentId: `TENANT-A-${Date.now()}`,
          contacts: [{ label: 'Celular', type: 'phone', value: '11999990001', primary: true }],
          financialResponsible: false,
          status: 'active'
        })
      });
      expect(ownerA.response.status, JSON.stringify(ownerA.body)).toBe(201);
      ownerAId = String(ownerA.body.id);

      const ownerB = await requestAs(accountBSession.accessToken, '/owners', {
        method: 'POST',
        body: JSON.stringify({
          fullName: `Tenant B owner ${Date.now()}`,
          documentId: `TENANT-B-${Date.now()}`,
          contacts: [{ label: 'Celular', type: 'phone', value: '11999990002', primary: true }],
          financialResponsible: false,
          status: 'active'
        })
      });
      expect(ownerB.response.status, JSON.stringify(ownerB.body)).toBe(201);
      ownerBId = String(ownerB.body.id);

      const ownersA = await requestAs(accountAToken, '/owners');
      const ownersB = await requestAs(accountBSession.accessToken, '/owners');
      expect(ownersA.response.status).toBe(200);
      expect(ownersB.response.status).toBe(200);
      expect((ownersA.body.items as Array<{ id: string }>).some((item) => item.id === ownerAId)).toBe(true);
      expect((ownersA.body.items as Array<{ id: string }>).some((item) => item.id === ownerBId)).toBe(false);
      expect((ownersB.body.items as Array<{ id: string }>).some((item) => item.id === ownerBId)).toBe(true);
      expect((ownersB.body.items as Array<{ id: string }>).some((item) => item.id === ownerAId)).toBe(false);

      const foreignOwner = await requestAs(accountBSession.accessToken, `/owners/${ownerAId}`);
      expect(foreignOwner.response.status).toBe(404);

      const patientA = await requestAs(accountAToken, '/patients', {
        method: 'POST',
        body: JSON.stringify({
          name: `Tenant A patient ${Date.now()}`,
          species: 'canine',
          sex: 'male',
          primaryOwnerId: ownerAId,
          status: 'active'
        })
      });
      expect(patientA.response.status, JSON.stringify(patientA.body)).toBe(201);
      patientAId = String(patientA.body.id);

      const encounterA = await requestAs(accountAToken, '/encounters', {
        method: 'POST',
        body: JSON.stringify({
          patientId: patientAId,
          ownerId: ownerAId,
          visitType: 'walk_in',
          origin: 'reception',
          reason: 'Tenant isolation acceptance test'
        })
      });
      expect(encounterA.response.status, JSON.stringify(encounterA.body)).toBe(201);
      encounterAId = String(encounterA.body.id);

      const attachmentA = await requestAs(accountAToken, '/attachments', {
        method: 'POST',
        body: JSON.stringify({
          linkedEntityType: 'encounter',
          linkedEntityId: encounterAId,
          category: 'document',
          fileName: 'tenant-a.txt',
          mimeType: 'text/plain',
          checksum: `sha256:${Date.now()}`
        })
      });
      expect(attachmentA.response.status, JSON.stringify(attachmentA.body)).toBe(201);

      const foreignEncounter = await requestAs(
        accountBSession.accessToken,
        `/encounters/${encounterAId}`
      );
      expect(foreignEncounter.response.status).toBe(404);

      const foreignAttachments = await requestAs(
        accountBSession.accessToken,
        `/attachments?linkedEntityType=encounter&linkedEntityId=${encodeURIComponent(encounterAId)}`
      );
      expect(foreignAttachments.response.status).toBe(404);

      const pendingA = await requestAs(accountAToken, '/internal/events/pending');
      const pendingB = await requestAs(accountBSession.accessToken, '/internal/events/pending');
      expect(pendingA.response.status).toBe(200);
      expect(pendingB.response.status).toBe(200);
      const pendingAIds = new Set(
        (pendingA.body.items as Array<{ id: string }>).map((event) => event.id)
      );
      const pendingBIds = (pendingB.body.items as Array<{ id: string }>).map((event) => event.id);
      expect(pendingAIds.size).toBeGreaterThan(0);
      expect(pendingBIds.some((eventId) => pendingAIds.has(eventId))).toBe(false);
    } finally {
      if (encounterAId) await deleteBestEffort(accountAToken, `/encounters/${encounterAId}`);
      if (patientAId) await deleteBestEffort(accountAToken, `/patients/${patientAId}`);
      if (ownerAId) await deleteBestEffort(accountAToken, `/owners/${ownerAId}`);
      if (ownerBId) await deleteBestEffort(accountBSession.accessToken, `/owners/${ownerBId}`);
    }
  });
});
