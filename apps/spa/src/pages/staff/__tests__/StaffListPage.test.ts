import { describe, expect, it, beforeEach, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createRouter, createWebHistory } from 'vue-router';
import StaffListPage from '@/pages/staff/StaffListPage.vue';
import { staffService } from '@/services/staff';
import type { StaffSummary } from '@cvg-his-v2/shared-types';

vi.mock('@/services/staff', () => ({
  staffService: {
    list: vi.fn()
  }
}));

const staff: StaffSummary[] = [
  {
    id: 'staff-1',
    accountId: 'acc-1',
    employeeCode: 'PR-001',
    fullName: 'Ana Paula',
    department: 'Clínica',
    jobTitle: 'Médica Veterinária',
    status: 'active',
    createdAt: '2026-04-01T10:00:00Z',
    updatedAt: '2026-04-01T10:00:00Z'
  },
  {
    id: 'staff-2',
    accountId: 'acc-1',
    employeeCode: 'LAB-009',
    fullName: 'Rafael Lima',
    department: 'Laboratório',
    jobTitle: 'Bioquímico',
    status: 'inactive',
    createdAt: '2026-04-01T10:00:00Z',
    updatedAt: '2026-04-01T10:00:00Z'
  }
] as StaffSummary[];

function mountPage() {
  const router = createRouter({
    history: createWebHistory(),
    routes: [{ path: '/staff', component: StaffListPage }]
  });
  router.push('/staff');
  return mount(StaffListPage, {
    global: {
      plugins: [router]
    }
  });
}

describe('StaffListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(staffService.list).mockResolvedValue(staff);
  });

  it('renders professionals and explains where to manage system access', async () => {
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.text()).toContain('RH');
    expect(wrapper.text()).toContain('Cadastros');
    expect(wrapper.text()).toContain('Profissionais');
    expect(wrapper.text()).toContain('Profissionais, funções, disponibilidade e produção operacional');
    expect(wrapper.text()).toContain('Para configurar acesso ao sistema, use RH / Usuários.');
    expect(wrapper.text()).not.toContain('rh-profissionais-01.png');
    expect(wrapper.text()).toContain('+ Incluir Novo Profissional');
    expect(wrapper.text()).toContain('Busca por ID ou nome');
    expect(wrapper.text()).toContain('ID staff-1');
    expect(wrapper.text()).toContain('Ativo');
    expect(wrapper.text()).not.toContain('Contrato atual');
    expect(wrapper.findAll('tbody tr')).toHaveLength(2);
    expect(wrapper.findAll('tbody tr').filter((row) => row.text().includes('Ana Paula'))).toHaveLength(1);
    expect(wrapper.findAll('details').every((details) => !details.attributes('open'))).toBe(true);
    expect(wrapper.text()).toContain('Editar');
    expect(wrapper.text()).toContain('Ver Detalhes');
    expect(wrapper.text()).toContain('Agenda');
    expect(wrapper.text()).toContain('Folgas');
    expect(wrapper.text()).toContain('Comissões');
    expect(wrapper.text()).toContain('Profissões');
    expect(wrapper.find('button[data-focus-key="staff-create"]').exists()).toBe(true);
    expect(wrapper.find('button[data-focus-key="staff-details-staff-1"]').exists()).toBe(true);
    expect(wrapper.find('button[data-focus-key="staff-edit-staff-1"]').exists()).toBe(true);
    expect(wrapper.find('button[data-focus-key="staff-details-staff-2"]').exists()).toBe(true);
    expect(wrapper.find('button[data-focus-key="staff-edit-staff-2"]').exists()).toBe(true);
    expect(wrapper.get('button[data-focus-key="staff-details-staff-1"]').attributes('id')).toBeUndefined();
  });

  it('filters professionals by employee code or name', async () => {
    const wrapper = mountPage();
    await flushPromises();

    const searchInput = wrapper.find('input[placeholder="por ID ou nome"]');
    await searchInput.setValue('LAB-009');
    await flushPromises();

    expect(wrapper.text()).toContain('Rafael Lima');
    expect(wrapper.text()).not.toContain('Ana Paula');
  });
});
