import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';

describe('PaymentMethodsPage', () => {
  it('renders a Vetus-like payment methods catalog surface', async () => {
    const PaymentMethodsPage = (await import('../PaymentMethodsPage.vue')).default;
    const wrapper = mount(PaymentMethodsPage);

    expect(wrapper.text()).toContain('Formas de Pagamento');
    expect(wrapper.text()).toContain('Financeiro');
    expect(wrapper.text()).toContain('Cadastros');
    expect(wrapper.text()).toContain('Dinheiro');
    expect(wrapper.text()).toContain('PIX');
    expect(wrapper.text()).toContain('Cartão de Crédito');
    expect(wrapper.text()).toContain('TEF/Maquininha');
    expect(wrapper.text()).toContain('Integração');
    expect(wrapper.text()).toContain('Status');
    expect(wrapper.text()).toContain('Gaveta');
    expect(wrapper.text()).toContain('Contas a Receber');
    expect(wrapper.text()).toContain('Pagamento Dashboard');
    expect(wrapper.find('button[disabled]').text()).toContain('Nova Forma');
  });

  it('filters payment methods by type and status', async () => {
    const PaymentMethodsPage = (await import('../PaymentMethodsPage.vue')).default;
    const wrapper = mount(PaymentMethodsPage);

    await wrapper.find('#payment-methods-type').setValue('digital');
    await wrapper.find('#payment-methods-status').setValue('active');

    expect(wrapper.text()).toContain('PIX');
    expect(wrapper.text()).toContain('Cartão de Crédito');
    expect(wrapper.text()).not.toContain('Faturamento a Prazo');
  });

  it('shows empty state wording when filters hide all methods', async () => {
    const PaymentMethodsPage = (await import('../PaymentMethodsPage.vue')).default;
    const wrapper = mount(PaymentMethodsPage);

    await wrapper.find('#payment-methods-search').setValue('sem resultado');

    expect(wrapper.text()).toContain('Nenhuma forma de pagamento encontrada');
  });
});
