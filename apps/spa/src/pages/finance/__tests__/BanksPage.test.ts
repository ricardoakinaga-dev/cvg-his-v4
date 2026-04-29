import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';

describe('BanksPage', () => {
  it('renders a Vetus-like read-only banks catalog surface', async () => {
    const BanksPage = (await import('../BanksPage.vue')).default;
    const wrapper = mount(BanksPage);

    expect(wrapper.text()).toContain('Bancos');
    expect(wrapper.text()).toContain('Financeiro');
    expect(wrapper.text()).toContain('Cadastros');
    expect(wrapper.text()).toContain('Banco do Brasil');
    expect(wrapper.text()).toContain('Agência 0001');
    expect(wrapper.text()).toContain('Conta 12345-6');
    expect(wrapper.text()).toContain('Conta Corrente');
    expect(wrapper.text()).toContain('Fluxo de Caixa');
    expect(wrapper.text()).toContain('Contas a Pagar');
    expect(wrapper.text()).toContain('Cartões Débito/Crédito');
    expect(wrapper.find('button[disabled]').text()).toContain('Novo Banco');
  });

  it('filters banks by status, account type and search', async () => {
    const BanksPage = (await import('../BanksPage.vue')).default;
    const wrapper = mount(BanksPage);

    await wrapper.find('#banks-status').setValue('inactive');
    await wrapper.find('#banks-account-type').setValue('savings');
    await wrapper.find('#banks-search').setValue('itaú');

    expect(wrapper.text()).toContain('Itaú');
    expect(wrapper.text()).not.toContain('Banco do Brasil');
    expect(wrapper.text()).not.toContain('Bradesco');
  });

  it('shows empty state wording when filters hide all banks', async () => {
    const BanksPage = (await import('../BanksPage.vue')).default;
    const wrapper = mount(BanksPage);

    await wrapper.find('#banks-search').setValue('sem resultado');

    expect(wrapper.text()).toContain('Nenhum banco encontrado');
  });
});
