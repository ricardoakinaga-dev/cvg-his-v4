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

  it('renders the Vetus professionals surface and RH integrations', async () => {
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.text()).toContain('RH');
    expect(wrapper.text()).toContain('Cadastros');
    expect(wrapper.text()).toContain('Profissionais');
    expect(wrapper.text()).toContain('cadastro/profissionais');
    expect(wrapper.text()).toContain('rh-profissionais-01.png');
    expect(wrapper.text()).toContain('+ Incluir Novo Profissional');
    expect(wrapper.text()).toContain('Busca por ID ou nome');
    expect(wrapper.text()).toContain('ID staff-1');
    expect(wrapper.text()).toContain('Ativo');
    expect(wrapper.text()).toContain('Informações de Contato');
    expect(wrapper.text()).toContain('Ver Detalhes');
    expect(wrapper.text()).toContain('Agenda');
    expect(wrapper.text()).toContain('Folgas');
    expect(wrapper.text()).toContain('Comissões');
    expect(wrapper.text()).toContain('Profissões');
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
