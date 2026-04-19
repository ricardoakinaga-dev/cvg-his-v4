import { describe, expect, it } from 'vitest';

import { NotFoundError } from '@cvg-his-v2/shared-errors';

import { StaffService } from '../../../packages/modules/staff/src/index.js';

describe('StaffService coverage guard', () => {
  it('creates records in memory and filters by account and linked user', async () => {
    const service = new StaffService(undefined, []);

    const first = await service.create('acc_staff_a' as never, {
      employeeCode: 'TRI-001',
      fullName: 'Enfermeira Fluxo',
      userId: 'user_triage' as never,
      department: 'Triagem',
      jobTitle: 'Enfermeira'
    });
    await service.create('acc_staff_b' as never, {
      employeeCode: 'REC-001',
      fullName: 'Recepcao Norte'
    });

    expect(service.persistenceMode).toBe('in-memory');
    expect(service.list()).toHaveLength(2);
    expect(service.list('acc_staff_a' as never)).toHaveLength(1);
    expect(service.findByUserId('user_triage' as never)?.id).toBe(first.id);
  });

  it('updates, toggles active state and enforces getOrThrow account scope', async () => {
    const service = new StaffService(undefined, []);
    const member = await service.create('acc_scope' as never, {
      employeeCode: 'OPS-010',
      fullName: 'Operacao Base'
    });

    const updated = await service.update(member.id, {
      fullName: 'Operacao Senior',
      department: 'Operacoes',
      jobTitle: 'Coordenador'
    });
    const inactive = await service.toggleActive(member.id, false);

    expect(updated.fullName).toBe('Operacao Senior');
    expect(updated.department).toBe('Operacoes');
    expect(updated.jobTitle).toBe('Coordenador');
    expect(inactive.status).toBe('inactive');
    expect(() => service.getOrThrow(member.id, 'acc_other' as never)).toThrow(NotFoundError);
  });

  it('hydrates repository records and preserves nullish user mappings safely', async () => {
    const service = new StaffService(
      {
        repository: {
          async create() {
            throw new Error('not used');
          },
          async findById() {
            return null;
          },
          async findByAccountId(accountId) {
            return [
              {
                id: 'staff_repo_1',
                accountId: accountId ?? ('acc_repo' as never),
                userId: 'user_repo' as never,
                employeeCode: 'REP-001',
                fullName: 'Repositorio Ativo',
                department: 'Clinica',
                jobTitle: 'Veterinario',
                isActive: true,
                createdAt: '2026-04-18T10:00:00.000Z',
                updatedAt: '2026-04-18T10:00:00.000Z'
              },
              {
                id: 'staff_repo_2',
                accountId: accountId ?? ('acc_repo' as never),
                userId: null,
                employeeCode: 'REP-002',
                fullName: 'Repositorio Inativo',
                department: null,
                jobTitle: null,
                isActive: false,
                createdAt: '2026-04-18T11:00:00.000Z',
                updatedAt: '2026-04-18T11:00:00.000Z'
              }
            ];
          },
          async findByUserId() {
            return null;
          },
          async update(id, input) {
            return {
              id,
              accountId: 'acc_repo' as never,
              userId: 'user_repo' as never,
              employeeCode: 'REP-001',
              fullName: input.fullName ?? 'Repositorio Ativo',
              department: input.department ?? 'Clinica',
              jobTitle: input.jobTitle ?? 'Veterinario',
              isActive: input.isActive ?? true,
              createdAt: '2026-04-18T10:00:00.000Z',
              updatedAt: '2026-04-18T12:00:00.000Z'
            };
          }
        }
      },
      []
    );

    expect(service.persistenceMode).toBe('database');
    await service.hydrateFromDatabase('acc_repo' as never);

    const listed = service.list('acc_repo' as never);
    expect(listed).toHaveLength(2);
    expect(service.findByUserId('user_repo' as never)?.id).toBe('staff_repo_1');
    expect(listed.find((item) => item.id === 'staff_repo_2')?.status).toBe('inactive');

    const updated = await service.update('staff_repo_1' as never, {
      fullName: 'Repositorio Atualizado',
      isActive: false
    });
    expect(updated.fullName).toBe('Repositorio Atualizado');
    expect(updated.status).toBe('inactive');
  });
});
