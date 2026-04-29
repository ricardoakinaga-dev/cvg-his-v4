import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';

describe('PaymentEnablementPage', () => {
  it('renders a Vetus-like payment enablement surface', async () => {
    const PaymentEnablementPage = (await import('../PaymentEnablementPage.vue')).default;
    const wrapper = mount(PaymentEnablementPage);

    expect(wrapper.text()).toContain('Habilitar Pagamento');
    expect(wrapper.text()).toContain('Financeiro');
    expect(wrapper.text()).toContain('Maquininha de Cartão');
    expect(wrapper.text()).toContain('Centro Veterinário Guarapiranga');
    expect(wrapper.text()).toContain('CVG Pay');
    expect(wrapper.text()).toContain('Stone');
    expect(wrapper.text()).toContain('Credenciamento');
    expect(wrapper.text()).toContain('Domicílio bancário');
    expect(wrapper.text()).toContain('Habilitação bloqueada');
    expect(wrapper.text()).toContain('Maquininhas');
    expect(wrapper.text()).toContain('Configuração do Split');
    expect(wrapper.text()).toContain('Pagamento Dashboard');
  });

  it('filters enablement rows by provider and status', async () => {
    const PaymentEnablementPage = (await import('../PaymentEnablementPage.vue')).default;
    const wrapper = mount(PaymentEnablementPage);

    await wrapper.find('#payment-enablement-provider').setValue('stone');
    await wrapper.find('#payment-enablement-status').setValue('blocked');

    expect(wrapper.text()).toContain('Stone');
    expect(wrapper.text()).toContain('Bloqueada');
    expect(wrapper.text()).not.toContain('CVG-PAY-001');
  });

  it('shows empty state wording when filters hide all rows', async () => {
    const PaymentEnablementPage = (await import('../PaymentEnablementPage.vue')).default;
    const wrapper = mount(PaymentEnablementPage);

    await wrapper.find('#payment-enablement-search').setValue('sem resultado');

    expect(wrapper.text()).toContain('Nenhuma habilitação de pagamento encontrada');
  });
});
