import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import PaymentEnablementPage from '../PaymentEnablementPage.vue';

describe('PaymentEnablementPage', () => {
  it('presents unavailable readiness without inventing merchant or bank approval', () => {
    const wrapper = mount(PaymentEnablementPage);
    expect(wrapper.text()).toContain('Habilitar Pagamento');
    expect(wrapper.text()).toContain('Status de credenciamento indisponível');
    expect(wrapper.text()).toContain('Ainda não é possível consultar ou alterar');
    expect(wrapper.text()).not.toContain('Credenciamento aprovado');
    expect(wrapper.text()).not.toContain('Domicílio bancário validado');
    expect(wrapper.text()).not.toContain('MID-CVG-001');
    expect(wrapper.text()).not.toContain('Habilitada');
    expect(wrapper.text()).not.toContain('Nenhuma habilitação');
  });

  it('retains all related workflow destinations', () => {
    const wrapper = mount(PaymentEnablementPage);
    const links = wrapper.findAll('a');
    expect(links.map(link => link.attributes('href'))).toEqual([
      '/finance/card-machines', '/finance/split', '/finance/payments-dashboard'
    ]);
    expect(links.map(link => link.text())).toEqual(['Maquininhas', 'Configuração do Split', 'Pagamento Dashboard']);
  });
});
