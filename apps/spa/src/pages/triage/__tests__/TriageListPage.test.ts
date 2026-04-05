import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

const mockRecords = [
  {
    id: 't1',
    accountId: 'a1',
    encounterId: 'e1',
    patientId: 'p1',
    priority: 'high' as const,
    chiefComplaint: 'Febre alta',
    initialNotes: 'Paciente com 40°C',
    alerts: ['alergia'],
    destination: 'in_care' as const,
    triagedByUserId: 'u1',
    createdAt: '2026-04-05T10:00:00Z',
    updatedAt: '2026-04-05T10:00:00Z'
  },
  {
    id: 't2',
    accountId: 'a1',
    encounterId: 'e2',
    patientId: 'p2',
    priority: 'critical' as const,
    chiefComplaint: 'Dificuldade respiratória',
    initialNotes: null,
    alerts: [],
    destination: 'observation' as const,
    triagedByUserId: 'u2',
    createdAt: '2026-04-05T11:00:00Z',
    updatedAt: '2026-04-05T11:00:00Z'
  }
];

const mockListFn = vi.fn().mockResolvedValue(mockRecords);

vi.mock('@/services/triage', () => ({
  listTriageRecords: () => mockListFn(),
  createTriage: vi.fn(),
  updateTriage: vi.fn(),
  getTriageHistory: vi.fn()
}));

describe('TriageListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListFn.mockResolvedValue(mockRecords);
  });

  it('renders the page title', async () => {
    const TriageListPage = (await import('../TriageListPage.vue')).default;
    const wrapper = mount(TriageListPage, {
      global: {
        stubs: {
          DataTable: {
            template: '<div class="data-table-stub"></div>',
            props: ['columns', 'rows', 'loading', 'variant', 'caption']
          },
          DsButton: { template: '<button><slot /></button>' },
          DsBadge: { template: '<span><slot /></span>' },
          RouterLink: { template: '<a><slot /></a>' }
        }
      }
    });

    await flushPromises();
    expect(wrapper.text()).toContain('Triagem');
  });

  it('passes loading prop to DataTable', async () => {
    const TriageListPage = (await import('../TriageListPage.vue')).default;
    const wrapper = mount(TriageListPage, {
      global: {
        stubs: {
          DataTable: {
            template: '<div class="data-table-stub" :data-loading="loading"></div>',
            props: ['columns', 'rows', 'loading', 'variant', 'caption']
          },
          DsButton: { template: '<button><slot /></button>' },
          DsBadge: { template: '<span><slot /></span>' },
          RouterLink: { template: '<a><slot /></a>' }
        }
      }
    });

    await flushPromises();
    const dataTable = wrapper.find('.data-table-stub');
    expect(dataTable.attributes('data-loading')).toBe('false');
    expect(mockListFn).toHaveBeenCalled();
  });

  it('shows error state when API fails', async () => {
    mockListFn.mockRejectedValue(new Error('API error'));

    const TriageListPage = (await import('../TriageListPage.vue')).default;
    const wrapper = mount(TriageListPage, {
      global: {
        stubs: {
          DataTable: {
            template: '<div class="data-table-stub"></div>',
            props: ['columns', 'rows', 'loading', 'variant', 'caption']
          },
          DsButton: { template: '<button><slot /></button>' },
          DsBadge: { template: '<span><slot /></span>' },
          RouterLink: { template: '<a><slot /></a>' }
        }
      }
    });

    await flushPromises();
    expect(wrapper.text()).toContain('API error');
  });

  it('shows link to create new triage', async () => {
    const TriageListPage = (await import('../TriageListPage.vue')).default;
    const wrapper = mount(TriageListPage, {
      global: {
        stubs: {
          DataTable: {
            template: '<div class="data-table-stub"></div>',
            props: ['columns', 'rows', 'loading', 'variant', 'caption']
          },
          DsButton: { template: '<button><slot /></button>' },
          DsBadge: { template: '<span><slot /></span>' },
          RouterLink: { template: '<a><slot /></a>' }
        }
      }
    });

    await flushPromises();
    expect(wrapper.text()).toContain('Nova Triagem');
  });
});
