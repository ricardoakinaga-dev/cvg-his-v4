import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

const mockList = vi.fn();

vi.mock('@/services/financeCards', () => ({
  financeCardsService: {
    list: (...args: unknown[]) => mockList(...args)
  }
}));

describe('SplitExporterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState(null, '', '/');
    mockList.mockResolvedValue([
      {
        transactionId: 'card_txn_1',
        provider: 'pagarme-card',
        status: 'captured',
        amount: 300,
        netAmount: 291,
        feeAmount: 9,
        description: 'Consulta dermatologica',
        installments: 1,
        capturedAt: '2026-04-29T10:00:00.000Z',
        providerAuthorizationCode: 'AUTH-123',
        cardBrand: 'visa',
        cardHolderName: 'Maria Souza',
        cardLast4: '4242',
        reconciliationState: 'reconciled',
        ownerName: 'Maria Souza',
        patientName: 'Rex'
      },
      {
        transactionId: 'card_txn_2',
        provider: 'local-card',
        status: 'authorized_pending_capture',
        amount: 100,
        netAmount: 97,
        feeAmount: 3,
        description: 'Vacina anual',
        installments: 2,
        createdAt: '2026-04-28T12:00:00.000Z',
        providerChargeId: 'CHG-456',
        cardBrand: 'mastercard',
        cardHolderName: 'Joao Pereira',
        cardLast4: '5454',
        reconciliationState: 'pending',
        ownerName: 'Joao Pereira',
        patientName: 'Luna'
      }
    ]);
  });

  it('renders a Vetus-like split exporter surface backed by card transactions', async () => {
    const SplitExporterPage = (await import('../SplitExporterPage.vue')).default;
    const wrapper = mount(SplitExporterPage);

    await flushPromises();

    expect(mockList).toHaveBeenCalledWith({
      search: '',
      provider: '',
      status: '',
      pageSize: 100
    });
    expect(wrapper.text()).toContain('Exportador de Split');
    expect(wrapper.text()).toContain('Financeiro');
    expect(wrapper.text()).toContain('Maquininha de Cartão');
    expect(wrapper.text()).toContain('Consulta dermatologica');
    expect(wrapper.text()).toContain('Centro Veterinário Guarapiranga');
    expect(wrapper.text()).toContain('CVG Pagamentos');
    expect(normalizeCurrencySpaces(wrapper.text())).toContain('R$ 291,00');
    expect(normalizeCurrencySpaces(wrapper.text())).toContain('R$ 247,35');
    expect(normalizeCurrencySpaces(wrapper.text())).toContain('R$ 43,65');
    expect(wrapper.text()).toContain('CSV');
    expect(wrapper.text()).toContain('Gerar Arquivo');
    expect(wrapper.text()).toContain('Transações de Cartão');
    expect(wrapper.text()).toContain('Simulador de Split');
  });

  it('passes filters to the card reconciliation API and keeps export blocked', async () => {
    const SplitExporterPage = (await import('../SplitExporterPage.vue')).default;
    const wrapper = mount(SplitExporterPage);

    await flushPromises();
    await wrapper.find('#split-exporter-search').setValue('Rex');
    await wrapper.find('#split-exporter-provider').setValue('pagarme-card');
    await wrapper.find('#split-exporter-status').setValue('captured');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(mockList).toHaveBeenLastCalledWith({
      search: 'Rex',
      provider: 'pagarme-card',
      status: 'captured',
      pageSize: 100
    });
    expect(wrapper.find('button[disabled]').text()).toContain('Gerar Arquivo');
  });

  it('shows empty and error states with split export wording', async () => {
    mockList.mockResolvedValueOnce([]);
    const SplitExporterPage = (await import('../SplitExporterPage.vue')).default;
    const emptyWrapper = mount(SplitExporterPage);

    await flushPromises();
    expect(emptyWrapper.text()).toContain('Nenhuma transação elegível para exportação');

    mockList.mockRejectedValueOnce(new Error('Falha ao carregar prévia de exportação'));
    const errorWrapper = mount(SplitExporterPage);

    await flushPromises();
    expect(errorWrapper.text()).toContain('Falha ao carregar prévia de exportação');
  });
});

function normalizeCurrencySpaces(value: string): string {
  return value.replace(/\u00a0/g, ' ');
}
