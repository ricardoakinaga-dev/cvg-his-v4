import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn()
}));

vi.mock('@/services/financeOperationalCatalog', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/services/financeOperationalCatalog')>();
  return {
    ...original,
    financeOperationalCatalogService: mocks
  };
});

const bank = {
  id: '11111111-1111-4111-8111-111111111111',
  accountId: 'acc-1',
  type: 'banks' as const,
  code: 'BANK_001',
  name: 'Banco Operacional',
  status: 'active' as const,
  configuration: {
    bankCode: '001',
    agency: '0001',
    accountNumber: '12345-6',
    accountType: 'checking' as const,
    usageKey: 'settlement' as const,
    usageDescription: 'Liquidação operacional',
    reconciliationMode: 'manual' as const
  },
  version: 3,
  createdBy: 'user-1',
  updatedBy: 'user-1',
  createdAt: '2026-09-02T12:00:00.000Z',
  updatedAt: '2026-09-02T12:00:00.000Z'
};

function findButton(wrapper: ReturnType<typeof mount>, label: string) {
  const button = wrapper.findAll('button').find((candidate) => candidate.text().includes(label));
  if (!button) throw new Error(`Button ${label} not found`);
  return button;
}

describe('OperationalFinanceCatalog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.list.mockResolvedValue({
      items: [bank],
      page: 1,
      pageSize: 25,
      totalItems: 1,
      totalPages: 1
    });
    mocks.update.mockResolvedValue({ ...bank, name: 'Banco Principal', version: 4 });
    mocks.remove.mockResolvedValue({ ok: true });
  });

  it('loads persisted records and exposes versioned edit and audited delete commands', async () => {
    const OperationalFinanceCatalog = (await import('../OperationalFinanceCatalog.vue')).default;
    const wrapper = mount(OperationalFinanceCatalog, { props: { type: 'banks' } });
    await flushPromises();

    expect(mocks.list).toHaveBeenCalledWith('banks', {
      page: 1,
      pageSize: 25
    });
    expect(wrapper.text()).toContain('Banco Operacional');
    expect(wrapper.text()).toContain('v3');
    expect(findButton(wrapper, 'Novo Banco').attributes('disabled')).toBeUndefined();

    await findButton(wrapper, 'Editar').trigger('click');
    await wrapper.find('#banks-form-name').setValue('Banco Principal');
    await findButton(wrapper, 'Salvar alterações').trigger('click');
    await flushPromises();

    expect(mocks.update).toHaveBeenCalledWith(
      'banks',
      bank.id,
      3,
      expect.objectContaining({
        code: 'BANK_001',
        name: 'Banco Principal',
        configuration: expect.objectContaining({
          bankCode: '001',
          reconciliationMode: 'manual'
        })
      })
    );

    await findButton(wrapper, 'Excluir').trigger('click');
    expect(wrapper.text()).toContain('Confirma a exclusão');
    await findButton(wrapper, 'Excluir definitivamente').trigger('click');
    await flushPromises();
    expect(mocks.remove).toHaveBeenCalledWith('banks', bank.id);
  });
});
