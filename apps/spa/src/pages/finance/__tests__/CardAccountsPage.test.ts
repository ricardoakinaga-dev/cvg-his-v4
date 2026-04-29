import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockCardRows = [
  {
    transactionId: 'card_txn_1',
    provider: 'pagarme-card',
    status: 'captured',
    amount: 120,
    netAmount: 114,
    feeAmount: 6,
    description: 'Consulta clínica',
    installments: 2,
    createdAt: '2026-04-20T10:00:00.000Z',
    capturedAt: '2026-04-20T10:05:00.000Z',
    providerAuthorizationCode: 'AUTH-123',
    cardBrand: 'visa',
    cardHolderName: 'Maria Souza',
    ownerName: 'Maria Souza',
    patientName: 'Rex',
    reconciliationState: 'reconciled'
  },
  {
    transactionId: 'card_txn_2',
    provider: 'local-card',
    status: 'authorized_pending_capture',
    amount: 80,
    description: 'Vacinação',
    installments: 1,
    createdAt: '2026-04-21T10:00:00.000Z',
    cardHolderName: 'João Pereira',
    ownerName: 'João Pereira',
    patientName: 'Luna',
    reconciliationState: 'attention_required'
  }
];

const mockListCards = vi.fn().mockResolvedValue(mockCardRows);

vi.mock('@/services/financeCards', () => ({
  financeCardsService: {
    get list() {
      return mockListCards;
    }
  }
}));

describe('CardAccountsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListCards.mockResolvedValue(mockCardRows);
  });

  it('renders a Vetus-like card admin accounts page backed by reconciliation cards', async () => {
    const CardAccountsPage = (await import('../CardAccountsPage.vue')).default;
    const wrapper = mount(CardAccountsPage, {
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

    expect(wrapper.text()).toContain('Contas Adm. Cartão');
    expect(wrapper.text()).toContain('Gerar Conta Avulsa');
    expect(wrapper.text()).toContain('Conciliar Em Lote');
    expect(wrapper.text()).toContain('Transações de Cartão');
    expect(wrapper.text()).toContain('Cliente/Provedor');
    expect(wrapper.text()).toContain('Data inicial');
    expect(wrapper.text()).toContain('Data final');
    expect(wrapper.text()).toContain('Provedor');
    expect(wrapper.text()).toContain('Status');
    expect(wrapper.text()).toContain('Conciliação');
    expect(wrapper.text()).toContain('Parcelas');
    expect(wrapper.text()).toContain('Tipo');
    expect(wrapper.text()).toContain('Valor');
    expect(wrapper.text()).toContain('Líquido');
    expect(wrapper.text()).toContain('Taxa');
    expect(wrapper.text()).toContain('Abrir');
    expect(wrapper.text()).toContain('Maria Souza');
    expect(wrapper.text()).toContain('Paciente: Rex');
    expect(wrapper.text()).toContain('Pagar.me');
    expect(wrapper.text()).toContain('AUTH-123');
    expect(wrapper.text()).toContain('2x');
    expect(wrapper.text()).toContain('R$\u00A0120,00');
    expect(wrapper.text()).toContain('R$\u00A0114,00');
    expect(wrapper.text()).toContain('R$\u00A06,00');
    expect(wrapper.text()).toContain('Conciliada');
    expect(wrapper.text()).toContain('Exige atenção');
    expect(mockListCards).toHaveBeenCalledWith({
      search: '',
      status: undefined,
      provider: undefined,
      page: 1,
      pageSize: 100
    });
  });

  it('shows empty and error states with card admin wording', async () => {
    mockListCards.mockResolvedValueOnce([]);
    const CardAccountsPage = (await import('../CardAccountsPage.vue')).default;
    const emptyWrapper = mount(CardAccountsPage);

    await flushPromises();
    expect(emptyWrapper.text()).toContain('Nenhuma conta administrada de cartão encontrada');

    mockListCards.mockRejectedValueOnce(new Error('Falha em cartões'));
    const errorWrapper = mount(CardAccountsPage);

    await flushPromises();
    expect(errorWrapper.text()).toContain('Falha em cartões');
  });

  it('opens card account rows in card transactions filtered by transaction id', async () => {
    const CardAccountsPage = (await import('../CardAccountsPage.vue')).default;
    const wrapper = mount(CardAccountsPage, {
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
    expect(openLinks).toHaveLength(2);
    expect(openLinks[0].attributes('href')).toBe('/finance/card-transactions?search=card_txn_1');
    expect(openLinks[1].attributes('href')).toBe('/finance/card-transactions?search=card_txn_2');
  });
});
