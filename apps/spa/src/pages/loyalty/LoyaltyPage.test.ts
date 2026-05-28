import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import LoyaltyPage from './LoyaltyPage.vue';
import { getLoyaltySummary, listLoyaltyRedemptions, redeemLoyaltyPoints } from '@/services/commercial';

vi.mock('@/services/commercial', () => ({
  getLoyaltySummary: vi.fn(),
  listLoyaltyRedemptions: vi.fn(),
  redeemLoyaltyPoints: vi.fn()
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
    vi.clearAllMocks();
    vi.mocked(getLoyaltySummary).mockResolvedValue({
      ownerId: null,
      availablePoints: 420,
      blockedPoints: 80,
      redeemedPoints: 240,
      redemptionCount: 2
    });
    vi.mocked(listLoyaltyRedemptions).mockResolvedValue([...redemptions]);
    vi.mocked(redeemLoyaltyPoints).mockResolvedValue({
      id: 'red-103',
      ownerId: 'Mariana Rocha',
      pointsUsed: 90,
      rewardDescription: 'Brinde loja',
      productQuantity: 1,
      serviceQuantity: 0,
      status: 'completed',
      redeemedAt: '2026-04-20T00:00:00.000Z'
    });
  });

  it('renders the Vetus points redemption workflow', async () => {
    const wrapper = mount(LoyaltyPage);
    await flush();

    expect(wrapper.text()).toContain('Resgate de Pontos');
    expect(wrapper.text()).toContain('Cliente');
    expect(wrapper.text()).toContain('Data');
    expect(wrapper.text()).toContain('Pontos');
    expect(wrapper.text()).toContain('Benefício');
    expect(wrapper.text()).toContain('Status');
    expect(wrapper.text()).toContain('Abrir');
    expect(wrapper.text()).not.toContain('BenefícioAbrir');
    expect(wrapper.text()).toContain('Produto');
    expect(wrapper.text()).toContain('Serviço');
    expect(wrapper.text()).toContain('Saldo disponível');
    expect(wrapper.text()).toContain('Saldo bloqueado');
    expect(wrapper.text()).toContain('Pontos resgatados');
    expect(wrapper.text()).toContain('Banho terapêutico bonificado');
    expect(wrapper.text()).toContain('Concluído');
    expect(wrapper.text()).toContain('Trilha de auditoria');
    expect(wrapper.text()).toContain('red-101');
    expect(wrapper.text()).toContain('17/04/2026');
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

  it('updates the selected redemption audit trail when opening another redemption', async () => {
    const wrapper = mount(LoyaltyPage);
    await flush();

    const openButtons = wrapper.findAll('button').filter((button) => button.text() === 'Abrir');
    expect(openButtons.length).toBeGreaterThanOrEqual(2);
    await openButtons[1]!.trigger('click');
    await nextTick();

    expect(wrapper.text()).toContain('red-102');
    expect(wrapper.text()).toContain('Carlos Mendes');
    expect(wrapper.text()).toContain('Desconto em antipulgas');
    expect(wrapper.text()).toContain('11/04/2026');
  });

  it('includes a redemption with product or service quantity', async () => {
    const wrapper = mount(LoyaltyPage);
    await flush();

    const includeButton = wrapper.findAll('button').find((button) => button.text() === 'Incluir');
    expect(includeButton).toBeTruthy();
    await includeButton?.trigger('click');
    await nextTick();

    expect(wrapper.text()).toContain('Incluir Resgate');
    expect(wrapper.text()).toContain('Adicionar Produto');
    expect(wrapper.text()).toContain('Adicionar Serviço');

    await wrapper.find('#redemption-owner').setValue('Mariana Rocha');
    await wrapper.find('#redemption-points').setValue('90');
    await wrapper.find('#redemption-reward').setValue('Brinde loja');
    await wrapper.find('#redemption-product-quantity').setValue('1');
    await wrapper.find('form').trigger('submit');
    await flush();

    expect(redeemLoyaltyPoints).toHaveBeenCalledWith({
      ownerId: 'Mariana Rocha',
      pointsUsed: 90,
      rewardDescription: 'Brinde loja',
      productQuantity: 1,
      serviceQuantity: 0
    });
    expect(listLoyaltyRedemptions).toHaveBeenCalledTimes(2);
    expect(wrapper.text()).toContain('Resgate de pontos incluído com sucesso.');
  });
});
