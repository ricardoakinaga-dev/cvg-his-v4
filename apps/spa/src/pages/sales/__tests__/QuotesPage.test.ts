import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

const mockList = vi.fn();
const mockGet = vi.fn();
const mockCreate = vi.fn();
const mockAddItem = vi.fn();
const mockApprove = vi.fn();
const mockReject = vi.fn();
const mockCancel = vi.fn();
const mockConvert = vi.fn();
const mockPrint = vi.fn();

vi.mock('@/services/quotes', () => ({
  quoteService: {
    list: (...args: unknown[]) => mockList(...args),
    get: (...args: unknown[]) => mockGet(...args),
    create: (...args: unknown[]) => mockCreate(...args),
    addItem: (...args: unknown[]) => mockAddItem(...args),
    approve: (...args: unknown[]) => mockApprove(...args),
    reject: (...args: unknown[]) => mockReject(...args),
    cancel: (...args: unknown[]) => mockCancel(...args),
    convertToSale: (...args: unknown[]) => mockConvert(...args),
    print: (...args: unknown[]) => mockPrint(...args)
  }
}));

describe('QuotesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue([
      {
        id: 'qt-1',
        accountId: 'acc-1',
        number: 'QT-000001',
        ownerId: 'owner-1',
        status: 'draft',
        validUntil: '2026-04-15',
        subtotal: 100,
        discountAmount: 0,
        total: 100,
        notes: 'Teste',
        createdByUserId: 'user-1',
        convertedToSaleId: null,
        convertedAt: null,
        createdAt: '2026-04-10T00:00:00Z',
        updatedAt: '2026-04-10T00:00:00Z'
      }
    ]);
    mockGet.mockResolvedValue({
      id: 'qt-1',
      accountId: 'acc-1',
      number: 'QT-000001',
      ownerId: 'owner-1',
      status: 'draft',
      validUntil: '2026-04-15',
      subtotal: 100,
      discountAmount: 0,
      total: 100,
      notes: 'Teste',
      createdByUserId: 'user-1',
      convertedToSaleId: null,
      convertedAt: null,
      createdAt: '2026-04-10T00:00:00Z',
      updatedAt: '2026-04-10T00:00:00Z',
      items: [
        {
          id: 'qi-1',
          quoteId: 'qt-1',
          accountId: 'acc-1',
          itemType: 'service',
          catalogItemId: null,
          nameSnapshot: 'Consulta',
          codeSnapshot: null,
          unitPrice: 100,
          quantity: 1,
          discountAmount: 0,
          lineTotal: 100,
          notes: null,
          createdAt: '2026-04-10T00:00:00Z',
          updatedAt: '2026-04-10T00:00:00Z'
        }
      ]
    });
    mockCreate.mockResolvedValue({
      id: 'qt-2',
      accountId: 'acc-1',
      number: 'QT-000002',
      ownerId: null,
      status: 'draft',
      validUntil: null,
      subtotal: 0,
      discountAmount: 0,
      total: 0,
      notes: null,
      createdByUserId: 'user-1',
      convertedToSaleId: null,
      convertedAt: null,
      createdAt: '2026-04-10T00:00:00Z',
      updatedAt: '2026-04-10T00:00:00Z'
    });
    mockConvert.mockResolvedValue({ counterSaleId: 'cs-1', quoteId: 'qt-1' });
    mockPrint.mockResolvedValue('<html></html>');
  });

  it('loads a quote workspace and converts a quote into a counter sale', async () => {
    const QuotesPage = (await import('../QuotesPage.vue')).default;
    const wrapper = mount(QuotesPage);

    await flushPromises();
    expect(wrapper.text()).toContain('QT-000001');

    const convertButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Converter em venda'));
    expect(convertButton).toBeTruthy();
    await convertButton!.trigger('click');
    await flushPromises();

    expect(mockConvert).toHaveBeenCalledWith('qt-1');
    expect(wrapper.text()).toContain('cs-1');
  });
});
