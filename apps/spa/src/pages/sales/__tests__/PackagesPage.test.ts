import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CustomerPackageDetail } from '@/services/packages';

const mockPackagesList = vi.fn();
const mockPackagesActivate = vi.fn();
const mockPackagesCancel = vi.fn();
const mockPackagesRenew = vi.fn();
const mockPackagesConsumeItem = vi.fn();

vi.mock('@/services/packages', () => ({
  packagesService: {
    list: (...args: unknown[]) => mockPackagesList(...args),
    activate: (...args: unknown[]) => mockPackagesActivate(...args),
    cancel: (...args: unknown[]) => mockPackagesCancel(...args),
    renew: (...args: unknown[]) => mockPackagesRenew(...args),
    consumeItem: (...args: unknown[]) => mockPackagesConsumeItem(...args)
  }
}));

const packageDetail: CustomerPackageDetail = {
  id: 'pkg-1',
  accountId: 'acc-1',
  ownerId: 'owner-1',
  patientId: 'patient-1',
  number: 'PKG-000001',
  status: 'active',
  startsAt: '2026-06-01',
  expiresAt: '2026-07-31',
  notes: 'Contrato preventivo com vacinas seriadas e pagamento no nível do pacote.',
  createdByUserId: 'user-1',
  renewedFromPackageId: null,
  createdAt: '2026-06-14T10:00:00Z',
  updatedAt: '2026-06-14T10:00:00Z',
  activatedAt: '2026-06-14T10:05:00Z',
  cancelledAt: null,
  completedAt: null,
  items: [
    {
      id: 'pkg-item-1',
      accountId: 'acc-1',
      packageId: 'pkg-1',
      itemKind: 'service',
      catalogItemId: 'svc-1',
      nameSnapshot: 'VACINA V4 FELINA',
      quantityPurchased: 2,
      quantityConsumed: 1,
      unitPrice: 60,
      validFrom: '2026-06-01',
      validUntil: '2026-07-31',
      createdAt: '2026-06-14T10:01:00Z',
      updatedAt: '2026-06-20T10:01:00Z'
    },
    {
      id: 'pkg-item-2',
      accountId: 'acc-1',
      packageId: 'pkg-1',
      itemKind: 'service',
      catalogItemId: 'svc-2',
      nameSnapshot: 'VACINA ANTI-RÁBICA',
      quantityPurchased: 1,
      quantityConsumed: 0,
      unitPrice: 60,
      validFrom: '2026-06-01',
      validUntil: '2026-07-31',
      createdAt: '2026-06-14T10:02:00Z',
      updatedAt: '2026-06-14T10:02:00Z'
    }
  ],
  consumptions: [
    {
      id: 'cons-1',
      accountId: 'acc-1',
      packageId: 'pkg-1',
      packageItemId: 'pkg-item-1',
      quantity: 1,
      consumedByUserId: 'user-1',
      consumedAt: '2026-06-20',
      sourceType: 'appointment',
      sourceId: 'appt-1',
      notes: null
    }
  ],
  balance: [
    {
      packageItemId: 'pkg-item-1',
      itemKind: 'service',
      nameSnapshot: 'VACINA V4 FELINA',
      quantityPurchased: 2,
      quantityConsumed: 1,
      quantityAvailable: 1,
      validUntil: '2026-07-31'
    },
    {
      packageItemId: 'pkg-item-2',
      itemKind: 'service',
      nameSnapshot: 'VACINA ANTI-RÁBICA',
      quantityPurchased: 1,
      quantityConsumed: 0,
      quantityAvailable: 1,
      validUntil: '2026-07-31'
    }
  ]
};

describe('PackagesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPackagesList.mockResolvedValue([packageDetail]);
    mockPackagesActivate.mockResolvedValue({ ...packageDetail, status: 'active' });
    mockPackagesCancel.mockResolvedValue({
      ...packageDetail,
      status: 'cancelled',
      cancelledAt: '2026-06-21T10:00:00Z'
    });
    mockPackagesRenew.mockResolvedValue({
      ...packageDetail,
      id: 'pkg-2',
      number: 'PKG-000002',
      renewedFromPackageId: 'pkg-1',
      balance: packageDetail.balance.map((item) => ({
        ...item,
        quantityConsumed: 0,
        quantityAvailable: item.quantityPurchased
      })),
      items: packageDetail.items.map((item) => ({
        ...item,
        quantityConsumed: 0
      })),
      consumptions: []
    });
    mockPackagesConsumeItem.mockResolvedValue({
      ...packageDetail,
      items: packageDetail.items.map((item) =>
        item.id === 'pkg-item-1'
          ? { ...item, quantityConsumed: 2 }
          : item
      ),
      balance: packageDetail.balance.map((item) =>
        item.packageItemId === 'pkg-item-1'
          ? { ...item, quantityConsumed: 2, quantityAvailable: 0 }
          : item
      ),
      consumptions: [
        ...packageDetail.consumptions,
        {
          id: 'cons-2',
          accountId: 'acc-1',
          packageId: 'pkg-1',
          packageItemId: 'pkg-item-1',
          quantity: 1,
          consumedByUserId: 'user-1',
          consumedAt: '2026-06-21',
          sourceType: 'manual',
          sourceId: null,
          notes: null
        }
      ]
    });
  });

  it('renders the Vetus package cockpit backed by the real packages API', async () => {
    const PackagesPage = (await import('../PackagesPage.vue')).default;
    const wrapper = mount(PackagesPage);
    await flushPromises();

    expect(wrapper.text()).toContain('Pacotes');
    expect(wrapper.text()).toContain('Atendimento > Atendimentos > Pacotes');
    expect(wrapper.text()).toContain('Contrato de consumo futuro');
    expect(wrapper.text()).toContain('Incluir Novo Pacote');
    expect(wrapper.text()).toContain('Filtrar');
    expect(wrapper.text()).toContain('Cliente e animal');
    expect(wrapper.text()).toContain('Cliente:');
    expect(wrapper.text()).toContain('Animal:');
    expect(wrapper.text()).toContain('Pagar pacote');
    expect(wrapper.text()).toContain('Ver serviços');
    expect(wrapper.text()).toContain('Observações gerais sobre o pacote');
    expect(wrapper.text()).toContain('VACINA V4 FELINA');
    expect(wrapper.text()).toContain('VACINA ANTI-RÁBICA');
    expect(wrapper.text()).toContain('2/3 disponível(is)');
    expect(wrapper.text()).toContain('Saldo: 1/2');
    expect(wrapper.text()).toContain('Consumido: 1');
    expect(wrapper.text()).toContain('Agenda consome sessões');
    expect(wrapper.text()).toContain('Comanda materializa consumo');
    expect(wrapper.text()).toContain('Financeiro recebe pacote');
    expect(wrapper.text()).toContain('Cancelar pacote');
    expect(wrapper.text()).toContain('Imprimir');
    expect(wrapper.text()).toContain('Pagar Pacote');
    expect(wrapper.text()).toContain('Renovar pacote');
    expect(wrapper.text()).toContain('Consumir 1');
    expect(wrapper.text()).toContain('Cliente owner-1');
    expect(wrapper.text()).toContain('Paciente patient-1');
    expect(wrapper.find('a[href="/counter-sales?ownerId=owner-1"]').exists()).toBe(true);
    expect(mockPackagesList).toHaveBeenCalledWith();
  });

  it('filters packages by customer or package number and opens the matching detail', async () => {
    const PackagesPage = (await import('../PackagesPage.vue')).default;
    const wrapper = mount(PackagesPage);
    await flushPromises();

    const search = wrapper.find('input[type="search"]');
    await search.setValue('PKG-000001');

    expect(wrapper.text()).toContain('Cliente owner-1');
    expect(wrapper.text()).toContain('VACINA V4 FELINA');

    const detailButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Ver detalhes'));
    expect(detailButton).toBeTruthy();
    await detailButton!.trigger('click');

    expect(wrapper.text()).toContain('Editar Pacote');
    expect(wrapper.text()).toContain('Pacote PKG-000001 selecionado');
  });

  it('shows an API error state instead of falling back to quote-derived package data', async () => {
    mockPackagesList.mockRejectedValue(new Error('API indisponível'));

    const PackagesPage = (await import('../PackagesPage.vue')).default;
    const wrapper = mount(PackagesPage);
    await flushPromises();

    expect(wrapper.text()).toContain('Não foi possível carregar os pacotes: API indisponível');
    expect(wrapper.text()).not.toContain('Ariane Ferreira Costa');
    expect(wrapper.text()).not.toContain('ABOBORA');
  });

  it('consumes one available package session through the real package service', async () => {
    const PackagesPage = (await import('../PackagesPage.vue')).default;
    const wrapper = mount(PackagesPage);
    await flushPromises();

    const consumeButton = wrapper.findAll('button').find((button) => button.text() === 'Consumir 1');
    expect(consumeButton).toBeTruthy();
    await consumeButton!.trigger('click');
    await flushPromises();

    expect(mockPackagesConsumeItem).toHaveBeenCalledWith('pkg-item-1', {
      quantity: 1,
      sourceType: 'manual'
    });
    expect(wrapper.text()).toContain('Sessão consumida.');
    expect(wrapper.text()).toContain('Saldo: 0/2');
  });

  it('renews and cancels packages through the real package service', async () => {
    const PackagesPage = (await import('../PackagesPage.vue')).default;
    const wrapper = mount(PackagesPage);
    await flushPromises();

    const renewButton = wrapper.findAll('button').find((button) => button.text() === 'Renovar pacote');
    expect(renewButton).toBeTruthy();
    await renewButton!.trigger('click');
    await flushPromises();

    expect(mockPackagesRenew).toHaveBeenCalledWith('pkg-1', {});
    expect(wrapper.text()).toContain('Pacote renovado.');
    expect(wrapper.text()).toContain('Pacote PKG-000002 selecionado');

    const cancelButton = wrapper.findAll('button').find((button) => button.text() === 'Cancelar pacote');
    expect(cancelButton).toBeTruthy();
    await cancelButton!.trigger('click');
    await flushPromises();

    expect(mockPackagesCancel).toHaveBeenCalledWith('pkg-2');
    expect(wrapper.text()).toContain('Pacote cancelado.');
    expect(wrapper.text()).toContain('Cancelado');
  });

  it('activates draft packages through the real package service', async () => {
    mockPackagesList.mockResolvedValueOnce([{ ...packageDetail, status: 'draft' }]);
    const PackagesPage = (await import('../PackagesPage.vue')).default;
    const wrapper = mount(PackagesPage);
    await flushPromises();

    const activateButton = wrapper.findAll('button').find((button) => button.text() === 'Ativar pacote');
    expect(activateButton).toBeTruthy();
    await activateButton!.trigger('click');
    await flushPromises();

    expect(mockPackagesActivate).toHaveBeenCalledWith('pkg-1');
    expect(wrapper.text()).toContain('Pacote ativado.');
    expect(wrapper.text()).toContain('Ativo');
  });
});
