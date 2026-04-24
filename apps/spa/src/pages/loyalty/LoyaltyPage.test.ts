import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import LoyaltyPage from './LoyaltyPage.vue';
import { getLoyaltySummary, listLoyaltyRedemptions } from '@/services/commercial';

vi.mock('@/services/commercial', () => ({
  getLoyaltySummary: vi.fn(),
  listLoyaltyRedemptions: vi.fn()
}));

const redemptions = [
  {
    id: 'red-101',
    ownerId: 'Mariana Rocha',
    pointsUsed: 240,
    rewardDescription: 'Banho terapêutico bonificado',
    productQuantity: 0,
    serviceQuantity: 1,
    status: 'completed',
    redeemedAt: '2026-04-18T00:00:00.000Z'
  },
  {
    id: 'red-102',
    ownerId: 'Carlos Mendes',
    pointsUsed: 180,
    rewardDescription: 'Desconto em antipulgas',
    productQuantity: 1,
    serviceQuantity: 0,
    status: 'completed',
    redeemedAt: '2026-04-12T00:00:00.000Z'
  }
] as const;

async function flush() {
  await Promise.resolve();
  await nextTick();
}

describe('LoyaltyPage', () => {
  beforeEach(() => {
    vi.mocked(getLoyaltySummary).mockResolvedValue({
      ownerId: null,
      availablePoints: 420,
      blockedPoints: 80,
      redeemedPoints: 240,
      redemptionCount: 2
    });
    vi.mocked(listLoyaltyRedemptions).mockResolvedValue([...redemptions]);
  });

  it('renders the Vetus points redemption workflow', async () => {
    const wrapper = mount(LoyaltyPage);
    await flush();

    expect(wrapper.text()).toContain('Resgate de Pontos');
    expect(wrapper.text()).toContain('Cliente');
    expect(wrapper.text()).toContain('Data');
    expect(wrapper.text()).toContain('Pontos');
    expect(wrapper.text()).toContain('Abrir');
    expect(wrapper.text()).toContain('Produto');
    expect(wrapper.text()).toContain('Serviço');
    expect(wrapper.text()).toContain('Saldo disponível');
    expect(wrapper.text()).toContain('Saldo bloqueado');
  });

  it('filters redemption history by client and date', async () => {
    const wrapper = mount(LoyaltyPage);
    await flush();

    await wrapper.find('input[placeholder="Cliente"]').setValue('mariana');
    await wrapper.find('input[placeholder="Data"]').setValue('2026-04-18');

    expect(wrapper.text()).toContain('Mariana Rocha');
    expect(wrapper.text()).not.toContain('Carlos Mendes');
  });

  it('shows commercial integrations documented for loyalty', async () => {
    const wrapper = mount(LoyaltyPage);
    await flush();

    expect(wrapper.text()).toContain('Vendas');
    expect(wrapper.text()).toContain('Comandas');
    expect(wrapper.text()).toContain('Pacotes');
    expect(wrapper.text()).toContain('Clientes');
  });
});
