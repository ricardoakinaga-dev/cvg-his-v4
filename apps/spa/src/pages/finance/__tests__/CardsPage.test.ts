import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

const mockList = vi.fn();

vi.mock('@/services/financeCards', () => ({
  financeCardsService: {
    list: (...args: unknown[]) => mockList(...args)
  }
}));

const cardRows = [
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
    installments: 3,
    cardBrand: 'mastercard',
    cardHolderName: 'João Pereira',
    cardLast4: '5454',
    reconciliationState: 'pending',
    ownerName: 'João Pereira',
    patientName: 'Luna'
  }
];

describe('CardsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue(structuredClone(cardRows));
  });

  it('renders a Vetus-like read-only debit and credit cards catalog surface', async () => {
    const CardsPage = (await import('../CardsPage.vue')).default;
    const wrapper = mount(CardsPage);
    await flushPromises();

    expect(mockList).toHaveBeenCalledWith({ page: 1, pageSize: 100 });
    expect(wrapper.text()).toContain('Cartões Débito/Crédito');
    expect(wrapper.text()).toContain('Financeiro');
    expect(wrapper.text()).toContain('Cadastros');
    expect(wrapper.text()).toContain('Maria Souza');
    expect(wrapper.text()).toContain('Consulta cirúrgica');
    expect(wrapper.text()).toContain('visa');
    expect(wrapper.text()).toContain('4242');
    expect(wrapper.text()).toContain('Crédito parcelado');
    expect(wrapper.text()).toContain('Transações de Cartão');
    expect(wrapper.text()).toContain('Contas Adm. Cartão');
    expect(wrapper.text()).toContain('Maquininhas');
    expect(wrapper.find('button[disabled]').text()).toContain('Novo Cartão');
  });

  it('filters cards by provider, status and type', async () => {
    const CardsPage = (await import('../CardsPage.vue')).default;
    const wrapper = mount(CardsPage);
    await flushPromises();

    await wrapper.find('#cards-provider').setValue('pagarme-card');
    await wrapper.find('#cards-status').setValue('authorized_pending_capture');
    await wrapper.find('#cards-type').setValue('credit');

    expect(wrapper.text()).toContain('João Pereira');
    expect(wrapper.text()).not.toContain('Maria Souza');
  });

  it('shows empty state wording when filters hide all cards', async () => {
    const CardsPage = (await import('../CardsPage.vue')).default;
    const wrapper = mount(CardsPage);
    await flushPromises();

    await wrapper.find('#cards-search').setValue('sem resultado');

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
