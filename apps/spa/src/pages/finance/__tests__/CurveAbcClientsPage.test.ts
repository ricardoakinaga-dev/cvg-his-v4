import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockListReceivables = vi.fn();

vi.mock('@/services/financialReceivables', () => ({
  financialReceivablesService: {
    get list() {
      return mockListReceivables;
    }
  }
}));

describe('CurveAbcClientsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListReceivables.mockResolvedValue({
      data: [
        {
          id: 'rec-1',
          encounterId: 'enc-1',
          financialAccountId: 'fin-1',
          installmentNumber: 1,
          installmentLabel: 'Parcela 1/1',
          dueAt: '2026-04-20T00:00:00.000Z',
          status: 'settled',
          amountOriginal: 800,
          amountPaid: 800,
          amountOutstanding: 0,
          issuedAt: '2026-04-18T00:00:00.000Z',
          settledAt: '2026-04-20T00:00:00.000Z',
          notes: null,
          payments: [],
          encounterStatus: 'closed',
          patientId: 'pat-1',
          patientName: 'Nina',
          patientSpecies: 'canina',
          ownerId: 'owner-a',
          ownerName: 'Maria Vetus',
          ownerPhoneMain: null,
          financialStatus: 'paid',
          totalAmount: 800,
          lastClosedAt: '2026-04-20T00:00:00.000Z'
        },
        {
          id: 'rec-2',
          encounterId: 'enc-2',
          financialAccountId: 'fin-2',
          installmentNumber: 1,
          installmentLabel: 'Parcela 1/1',
          dueAt: '2026-04-21T00:00:00.000Z',
          status: 'open',
          amountOriginal: 150,
          amountPaid: 0,
          amountOutstanding: 150,
          issuedAt: '2026-04-19T00:00:00.000Z',
          settledAt: null,
          notes: null,
          payments: [],
          encounterStatus: 'closed',
          patientId: 'pat-2',
          patientName: 'Tito',
          patientSpecies: 'felina',
          ownerId: 'owner-b',
          ownerName: 'Joao Vetus',
          ownerPhoneMain: null,
          financialStatus: 'pending',
          totalAmount: 150,
          lastClosedAt: '2026-04-19T00:00:00.000Z'
        },
        {
          id: 'rec-3',
          encounterId: 'enc-3',
          financialAccountId: 'fin-3',
          installmentNumber: 1,
          installmentLabel: 'Parcela 1/1',
          dueAt: '2026-04-22T00:00:00.000Z',
          status: 'settled',
          amountOriginal: 50,
          amountPaid: 50,
          amountOutstanding: 0,
          issuedAt: '2026-04-20T00:00:00.000Z',
          settledAt: '2026-04-22T00:00:00.000Z',
          notes: null,
          payments: [],
          encounterStatus: 'closed',
          patientId: 'pat-3',
          patientName: 'Luna',
          patientSpecies: 'canina',
          ownerId: 'owner-c',
          ownerName: 'Ana Vetus',
          ownerPhoneMain: null,
          financialStatus: 'paid',
          totalAmount: 50,
          lastClosedAt: '2026-04-20T00:00:00.000Z'
        }
      ],
      page: 1,
      pageSize: 200,
      total: 3,
      openCount: 1,
      settledCount: 2,
      totalOutstanding: 150,
      totalSettled: 850
    });
  });

  it('renders a Vetus-like ABC client curve from financial receivables', async () => {
    const CurveAbcClientsPage = (await import('../CurveAbcClientsPage.vue')).default;
    const wrapper = mount(CurveAbcClientsPage, {
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

    expect(wrapper.text()).toContain('Curva ABC Clientes');
    expect(wrapper.text()).toContain('Classificação por faturamento');
    expect(wrapper.text()).toContain('Cliente');
    expect(wrapper.text()).toContain('De');
    expect(wrapper.text()).toContain('Até');
    expect(wrapper.text()).toContain('Classe');
    expect(wrapper.text()).toContain('Pesquisar');
    expect(wrapper.text()).toContain('Exportar Curva');
    expect(wrapper.text()).toContain('Clientes');
    expect(wrapper.text()).toContain('Faturamento');
    expect(wrapper.text()).toContain('Participação');
    expect(wrapper.text()).toContain('Acumulado');
    expect(wrapper.text()).toContain('Títulos');
    expect(wrapper.text()).toContain('Maria Vetus');
    expect(wrapper.text()).toContain('Joao Vetus');
    expect(wrapper.text()).toContain('Ana Vetus');
    expect(wrapper.text()).toContain('Classe A');
    expect(wrapper.text()).toContain('Classe B');
    expect(wrapper.text()).toContain('Classe C');
    expect(wrapper.text()).toContain('R$\u00A0800,00');
    expect(wrapper.text()).toContain('80,0%');
    expect(mockListReceivables).toHaveBeenCalledWith({ page: 1, pageSize: 200 });
  });

  it('shows empty and error states with ABC client wording', async () => {
    mockListReceivables.mockResolvedValueOnce({
      data: [],
      page: 1,
      pageSize: 200,
      total: 0,
      openCount: 0,
      settledCount: 0,
      totalOutstanding: 0,
      totalSettled: 0
    });
    const CurveAbcClientsPage = (await import('../CurveAbcClientsPage.vue')).default;
    const emptyWrapper = mount(CurveAbcClientsPage);

    await flushPromises();
    expect(emptyWrapper.text()).toContain('Nenhum cliente na curva ABC');

    mockListReceivables.mockRejectedValueOnce(new Error('Falha nos recebíveis'));
    const errorWrapper = mount(CurveAbcClientsPage);

    await flushPromises();
    expect(errorWrapper.text()).toContain('Falha nos recebíveis');
  });

  it('opens the ranked client register', async () => {
    const CurveAbcClientsPage = (await import('../CurveAbcClientsPage.vue')).default;
    const wrapper = mount(CurveAbcClientsPage, {
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
    expect(openLinks[0].attributes('href')).toBe('/owners/owner-a');
  });
});
