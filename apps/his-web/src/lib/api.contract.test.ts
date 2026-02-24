import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createEncounter,
  createOwner,
  createPatient,
  getEncounter,
  getOwner,
  getPatient,
  listEncounters,
  listOwners,
  listPatients,
  updateOwner,
  updatePatient
} from './api';

const uuidA = '11111111-1111-4111-8111-111111111111';
const uuidB = '22222222-2222-4222-8222-222222222222';
const uuidC = '33333333-3333-4333-8333-333333333333';
const uuidD = '44444444-4444-4444-8444-444444444444';
const nowIso = '2026-02-21T00:00:00.000Z';

describe('API Contract Smoke', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_HIS_API_BASE_URL', '/api/proxy');
    vi.restoreAllMocks();
  });

  it('owners: list/get/create/update', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: [
            {
              id: uuidA,
              accountId: uuidB,
              unitId: null,
              fullName: 'Maria Silva',
              document: '123',
              email: 'maria@example.com',
              phoneMain: '11999999999',
              phoneAlt: null,
              addressJson: null,
              createdAt: nowIso,
              updatedAt: nowIso
            }
          ],
          page: 1,
          pageSize: 10,
          total: 1
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    );

    const listResult = await listOwners({ page: 1, pageSize: 10 });
    expect(listResult.total).toBe(1);
    expect(listResult.data[0]?.fullName).toBe('Maria Silva');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: uuidA,
          accountId: uuidB,
          unitId: null,
          fullName: 'Maria Silva',
          document: null,
          email: null,
          phoneMain: null,
          phoneAlt: null,
          addressJson: null,
          createdAt: nowIso,
          updatedAt: nowIso
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    );
    const owner = await getOwner(uuidA);
    expect(owner.id).toBe(uuidA);

    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: uuidC,
          accountId: uuidB,
          unitId: null,
          fullName: 'Novo Tutor',
          document: null,
          email: null,
          phoneMain: null,
          phoneAlt: null,
          addressJson: null,
          createdAt: nowIso,
          updatedAt: nowIso
        }),
        { status: 201, headers: { 'content-type': 'application/json' } }
      )
    );
    const created = await createOwner({ fullName: 'Novo Tutor' });
    expect(created.id).toBe(uuidC);

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } })
    );
    await expect(updateOwner(uuidA, { phoneMain: '11888888888' })).resolves.toEqual({ ok: true });
  });

  it('patients: list/get/create/update', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: [
            {
              id: uuidA,
              accountId: uuidB,
              unitId: null,
              ownerId: uuidC,
              name: 'Rex',
              species: 'Canina',
              breed: null,
              sex: null,
              birthDate: null,
              weightKg: null,
              microchip: null,
              alerts: {},
              createdAt: nowIso,
              updatedAt: nowIso
            }
          ],
          page: 1,
          pageSize: 10,
          total: 1
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    );

    const listResult = await listPatients({ page: 1, pageSize: 10 });
    expect(listResult.total).toBe(1);
    expect(listResult.data[0]?.name).toBe('Rex');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: uuidA,
          accountId: uuidB,
          unitId: null,
          ownerId: uuidC,
          name: 'Rex',
          species: 'Canina',
          breed: null,
          sex: null,
          birthDate: null,
          weightKg: null,
          microchip: null,
          alerts: {},
          createdAt: nowIso,
          updatedAt: nowIso
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    );
    const patient = await getPatient(uuidA);
    expect(patient.id).toBe(uuidA);

    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: uuidD,
          accountId: uuidB,
          unitId: null,
          ownerId: uuidC,
          name: 'Luna',
          species: 'Felina',
          breed: null,
          sex: null,
          birthDate: null,
          weightKg: null,
          microchip: null,
          alerts: {},
          createdAt: nowIso,
          updatedAt: nowIso
        }),
        { status: 201, headers: { 'content-type': 'application/json' } }
      )
    );
    const created = await createPatient({
      ownerId: uuidC,
      name: 'Luna',
      species: 'Felina'
    });
    expect(created.id).toBe(uuidD);

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } })
    );
    await expect(updatePatient(uuidA, { microchip: 'ABC123' })).resolves.toEqual({ ok: true });
  });

  it('encounters: list/get/create', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: [
            {
              id: uuidA,
              accountId: uuidB,
              patientId: uuidC,
              ownerId: uuidD,
              status: 'open',
              openedByUserId: uuidB,
              closedByUserId: null,
              openedAt: nowIso,
              closedAt: null,
              reason: 'Consulta',
              createdAt: nowIso,
              updatedAt: nowIso
            }
          ],
          page: 1,
          pageSize: 10,
          total: 1
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    );

    const listResult = await listEncounters({ page: 1, pageSize: 10, q: 'Consulta' });
    expect(listResult.total).toBe(1);
    expect(listResult.data[0]?.id).toBe(uuidA);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: uuidA,
          accountId: uuidB,
          patientId: uuidC,
          ownerId: uuidD,
          status: 'open',
          openedByUserId: uuidB,
          closedByUserId: null,
          openedAt: nowIso,
          closedAt: null,
          reason: 'Consulta',
          createdAt: nowIso,
          updatedAt: nowIso
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    );
    const encounter = await getEncounter(uuidA);
    expect(encounter.id).toBe(uuidA);

    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: uuidD,
          accountId: uuidB,
          patientId: uuidC,
          ownerId: uuidD,
          status: 'open',
          openedByUserId: uuidB,
          closedByUserId: null,
          openedAt: nowIso,
          closedAt: null,
          reason: 'Internacao',
          createdAt: nowIso,
          updatedAt: nowIso
        }),
        { status: 201, headers: { 'content-type': 'application/json' } }
      )
    );
    const created = await createEncounter({ patientId: uuidC, reason: 'Internacao' });
    expect(created.id).toBe(uuidD);
  });
});
