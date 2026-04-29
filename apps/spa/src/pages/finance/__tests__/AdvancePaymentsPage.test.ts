import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockOwnersResponse = [
  {
    id: 'owner-1',
    accountId: 'acc-1',
    fullName: 'João Silva',
    documentId: '123.456.789-00',
    contacts: [{ label: 'Celular', value: '(11) 99999-0000', type: 'phone' as const, primary: true }],
    financialProfile: {
      creditBalance: 180,
      allowedDebtLimit: 0,
      availablePoints: 25
    },
    financialResponsible: true,
    status: 'active' as const,
    createdAt: '2026-04-20T10:00:00.000Z',
    updatedAt: '2026-04-20T10:00:00.000Z'
  },
  {
    id: 'owner-2',
    accountId: 'acc-1',
    fullName: 'Maria Santos',
    contacts: [{ label: 'Email', value: 'maria@example.com', type: 'email' as const, primary: true }],
    financialProfile: {
      creditBalance: 0
    },
    financialResponsible: true,
    status: 'active' as const,
    createdAt: '2026-04-21T10:00:00.000Z',
    updatedAt: '2026-04-21T10:00:00.000Z'
  }
];

const mockListOwners = vi.fn().mockResolvedValue(mockOwnersResponse);

vi.mock('@/services/owner', () => ({
  ownerService: {
    get list() {
      return mockListOwners;
    }
  }
}));

describe('AdvancePaymentsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListOwners.mockResolvedValue(mockOwnersResponse);
  });

  it('renders a Vetus-like advance payments page backed by owner credit balances', async () => {
    const AdvancePaymentsPage = (await import('../AdvancePaymentsPage.vue')).default;
    const wrapper = mount(AdvancePaymentsPage, {
      global: {
        stubs: {
          RouterLink: {
            props: ['to'],
            template: '<a :href="to"><slot /></a>'
          }
        }
      }
    });

    await flushPromises();

    expect(wrapper.text()).toContain('Pagamento Antecipado');
    expect(wrapper.text()).toContain('Gerar Pagamento Antecipado');
    expect(wrapper.text()).toContain('Compensar Em Lote');
    expect(wrapper.text()).toContain('Cliente');
    expect(wrapper.text()).toContain('Emissão de');
    expect(wrapper.text()).toContain('Até');
    expect(wrapper.text()).toContain('Status');
    expect(wrapper.text()).toContain('Emissão');
    expect(wrapper.text()).toContain('Total');
    expect(wrapper.text()).toContain('Compensado');
    expect(wrapper.text()).toContain('Saldo');
    expect(wrapper.text()).toContain('Origem');
    expect(wrapper.text()).toContain('Abrir');
    expect(wrapper.text()).toContain('João Silva');
    expect(wrapper.text()).not.toContain('Maria Santos');
    expect(wrapper.text()).toContain('R$\u00A0180,00');
    expect(mockListOwners).toHaveBeenCalledWith({
      search: '',
      status: 'active',
      financialResponsible: true,
      page: 1,
      pageSize: 50
    });
  });

  it('shows empty and error states with advance payments wording', async () => {
    mockListOwners.mockResolvedValueOnce([]);
    const AdvancePaymentsPage = (await import('../AdvancePaymentsPage.vue')).default;
    const emptyWrapper = mount(AdvancePaymentsPage);

    await flushPromises();
    expect(emptyWrapper.text()).toContain('Nenhum pagamento antecipado encontrado');

    mockListOwners.mockRejectedValueOnce(new Error('Falha em clientes'));
    const errorWrapper = mount(AdvancePaymentsPage);

    await flushPromises();
    expect(errorWrapper.text()).toContain('Falha em clientes');
  });

  it('opens advance payment rows in the owner detail', async () => {
    const AdvancePaymentsPage = (await import('../AdvancePaymentsPage.vue')).default;
    const wrapper = mount(AdvancePaymentsPage, {
      global: {
        stubs: {
          RouterLink: {
            props: ['to'],
            template: '<a :href="to"><slot /></a>'
          }
        }
      }
    });

    await flushPromises();

    const openLinks = wrapper.findAll('a').filter((anchor) => anchor.text() === 'Abrir');
    expect(openLinks).toHaveLength(1);
    expect(openLinks[0].attributes('href')).toBe('/owners/owner-1');
  });
});
