import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

const mockBillingRecords = [
  {
    id: 'bill-1',
    accountId: 'acc-1',
    encounterId: 'enc-1',
    patientId: 'pat-1',
    ownerId: 'owner-1',
    status: 'open' as const,
    subtotalAmount: 350.0,
    discountAmount: 0,
    totalAmount: 350.0,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T12:00:00Z'
  },
  {
    id: 'bill-2',
    accountId: 'acc-1',
    encounterId: 'enc-2',
    patientId: 'pat-2',
    ownerId: 'owner-2',
    status: 'draft' as const,
    subtotalAmount: 0,
    discountAmount: 0,
    totalAmount: 0,
    createdAt: '2024-01-15T09:00:00Z',
    updatedAt: '2024-01-15T09:00:00Z'
  },
  {
    id: 'bill-3',
    accountId: 'acc-1',
    encounterId: 'enc-3',
    patientId: 'pat-3',
    ownerId: 'owner-1',
    status: 'settled' as const,
    subtotalAmount: 500.0,
    discountAmount: 50.0,
    totalAmount: 450.0,
    createdAt: '2024-01-14T14:00:00Z',
    updatedAt: '2024-01-14T16:00:00Z'
  }
];

const mockListFn = vi.fn().mockResolvedValue(mockBillingRecords);
const mockGetPatientName = vi
  .fn()
  .mockImplementation((id: string) =>
    Promise.resolve(id === 'pat-1' ? 'Rex' : id === 'pat-2' ? 'Mimi' : 'Buddy')
  );
const mockGetOwnerName = vi
  .fn()
  .mockImplementation((id: string) =>
    Promise.resolve(id === 'owner-1' ? 'João Silva' : 'Maria Santos')
  );

vi.mock('@/services/billing', () => ({
  billingService: {
    get list() {
      return mockListFn;
    }
  }
}));

vi.mock('@/composables/useEntityCache', () => ({
  useEntityCache: () => ({
    getPatientName: mockGetPatientName,
    getOwnerName: mockGetOwnerName,
    getUserName: vi.fn().mockResolvedValue(''),
    preloadUserNames: vi.fn().mockResolvedValue(undefined),
    loading: new Set()
  })
}));

describe('BillingListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListFn.mockResolvedValue(mockBillingRecords);
    mockGetPatientName.mockImplementation((id: string) =>
      Promise.resolve(id === 'pat-1' ? 'Rex' : id === 'pat-2' ? 'Mimi' : 'Buddy')
    );
    mockGetOwnerName.mockImplementation((id: string) =>
      Promise.resolve(id === 'owner-1' ? 'João Silva' : 'Maria Santos')
    );
  });

  it('renders the page title', async () => {
    const BillingListPage = (await import('../BillingListPage.vue')).default;
    const wrapper = mount(BillingListPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Faturamento');
  });

  it('shows loading state initially', async () => {
    let resolvePromise: (value: any) => void;
    const slowPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    mockListFn.mockImplementation(() => slowPromise);

    const BillingListPage = (await import('../BillingListPage.vue')).default;
    const wrapper = mount(BillingListPage);

    await wrapper.vm.$nextTick();
    expect(wrapper.find('.data-table-loading').exists()).toBe(true);

    resolvePromise!(mockBillingRecords);
    await flushPromises();
  });

  it('shows error state when API fails', async () => {
    mockListFn.mockRejectedValue(new Error('Failed to load billing records'));

    const BillingListPage = (await import('../BillingListPage.vue')).default;
    const wrapper = mount(BillingListPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Failed to load billing records');
  });

  it('shows empty state when no billing records exist', async () => {
    mockListFn.mockResolvedValue([]);

    const BillingListPage = (await import('../BillingListPage.vue')).default;
    const wrapper = mount(BillingListPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Nenhum registro de faturamento');
  });

  it('renders billing data in the table', async () => {
    const BillingListPage = (await import('../BillingListPage.vue')).default;
    const wrapper = mount(BillingListPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Rex');
    expect(wrapper.text()).toContain('Mimi');
    expect(wrapper.text()).toContain('João Silva');
    expect(wrapper.text()).toContain('Maria Santos');
  });

  it('shows billing status labels', async () => {
    const BillingListPage = (await import('../BillingListPage.vue')).default;
    const wrapper = mount(BillingListPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Rascunho');
    expect(wrapper.text()).toContain('Aberto');
    expect(wrapper.text()).toContain('Quitado');
  });

  it('formats currency amounts correctly', async () => {
    const BillingListPage = (await import('../BillingListPage.vue')).default;
    const wrapper = mount(BillingListPage);

    await flushPromises();
    expect(wrapper.text()).toContain('R$\u00A0350,00');
    expect(wrapper.text()).toContain('R$\u00A0500,00');
  });

  it('shows truncated encounter IDs', async () => {
    const BillingListPage = (await import('../BillingListPage.vue')).default;
    const wrapper = mount(BillingListPage, {
      global: {
        stubs: {
          RouterLink: {
            template: '<a :href="to"><slot /></a>',
            props: ['to']
          }
        }
      }
    });

    await flushPromises();
    expect(wrapper.text()).toContain('enc-1...');
    expect(wrapper.text()).toContain('enc-2...');
    expect(wrapper.text()).toContain('enc-3...');
  });

  it('shows navigation links to billing management', async () => {
    const BillingListPage = (await import('../BillingListPage.vue')).default;
    const wrapper = mount(BillingListPage, {
      global: {
        stubs: {
          RouterLink: {
            template: '<a :href="to"><slot /></a>',
            props: ['to']
          }
        }
      }
    });

    await flushPromises();
    const manageLinks = wrapper.findAll('a').filter((a) => a.text() === 'Gerenciar');
    expect(manageLinks).toHaveLength(3);
    expect(manageLinks[0].attributes('href')).toBe('/billing/enc-1');
    expect(manageLinks[1].attributes('href')).toBe('/billing/enc-2');
    expect(manageLinks[2].attributes('href')).toBe('/billing/enc-3');
  });

  it('shows links to view items', async () => {
    const BillingListPage = (await import('../BillingListPage.vue')).default;
    const wrapper = mount(BillingListPage, {
      global: {
        stubs: {
          RouterLink: {
            template: '<a :href="to"><slot /></a>',
            props: ['to']
          }
        }
      }
    });

    await flushPromises();
    const itemsLinks = wrapper.findAll('a').filter((a) => a.text().includes('Ver itens'));
    expect(itemsLinks).toHaveLength(3);
    expect(itemsLinks[0].attributes('href')).toBe('/billing/enc-1');
  });

  it('shows encounter links', async () => {
    const BillingListPage = (await import('../BillingListPage.vue')).default;
    const wrapper = mount(BillingListPage, {
      global: {
        stubs: {
          RouterLink: {
            template: '<a :href="to"><slot /></a>',
            props: ['to']
          }
        }
      }
    });

    await flushPromises();
    const encounterLinks = wrapper.findAll('a.encounter-link');
    expect(encounterLinks).toHaveLength(3);
    expect(encounterLinks[0].attributes('href')).toBe('/encounters/enc-1');
  });
});
