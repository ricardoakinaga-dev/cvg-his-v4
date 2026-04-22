import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

const mockList = vi.fn();

vi.mock('@/services/financeCards', () => ({
  financeCardsService: {
    list: (...args: unknown[]) => mockList(...args)
  }
}));

describe('CardsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue([
      {
        transactionId: 'card_txn_1',
        provider: 'local-card',
        status: 'captured',
        amount: 180.5,
        description: 'Consulta cirúrgica',
        installments: 1,
        cardBrand: 'visa',
        cardHolderName: 'Maria Souza',
        cardLast4: '4242',
        reconciliationState: 'reconciled',
        ownerName: 'Maria Souza',
        patientName: 'Rex'
      },
      {
        transactionId: 'card_txn_2',
        provider: 'pagarme-card',
        status: 'authorized_pending_capture',
        amount: 95,
        description: 'Vacinação',
        installments: 2,
        cardBrand: 'mastercard',
        cardHolderName: 'João Pereira',
        cardLast4: '5454',
        reconciliationState: 'pending',
        ownerName: 'João Pereira',
        patientName: 'Luna'
      }
    ]);
  });

  it('loads real card rows and renders operational data', async () => {
    const CardsPage = (await import('../CardsPage.vue')).default;
    const wrapper = mount(CardsPage);

    await flushPromises();

    expect(mockList).toHaveBeenCalled();
    expect(wrapper.text()).toContain('Maria Souza');
    expect(wrapper.text()).toContain('Consulta cirúrgica');
    expect(wrapper.text()).toContain('visa');
    expect(wrapper.text()).toContain('4242');
    expect(wrapper.text()).toContain('2 cartão(ões)');
  });

  it('filters cards by query', async () => {
    const CardsPage = (await import('../CardsPage.vue')).default;
    const wrapper = mount(CardsPage);

    await flushPromises();
    await wrapper.find('input[type="search"]').setValue('joão');
    await flushPromises();

    expect(wrapper.text()).toContain('João Pereira');
    expect(wrapper.text()).not.toContain('Maria SouzaConsulta cirúrgica');
  });

  it('shows empty state when no rows are returned', async () => {
    mockList.mockResolvedValueOnce([]);

    const CardsPage = (await import('../CardsPage.vue')).default;
    const wrapper = mount(CardsPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Nenhum cartão encontrado');
  });

  it('shows service errors', async () => {
    mockList.mockRejectedValueOnce(new Error('Falha ao carregar cartões'));

    const CardsPage = (await import('../CardsPage.vue')).default;
    const wrapper = mount(CardsPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Falha ao carregar cartões');
  });
});
