import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import SplitSimulatorPage from '../SplitSimulatorPage.vue';

const createPage = () => mount(SplitSimulatorPage, {
  global: { stubs: { RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } } }
});
const money = (amount: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);

describe('SplitSimulatorPage', () => {
  it('presents a hypothetical calculation and the three related routes', () => {
    const wrapper = createPage();
    expect(wrapper.text()).toContain('Simulador de Split');
    expect(wrapper.text()).toContain('Compare taxas e a distribuição de uma venda hipotética.');
    expect(wrapper.text()).toContain('cálculo local, sem capturas ou repasses');
    for (const label of ['Valor da Venda', 'Parcelas', 'Taxa MDR (%)', 'Percentual CVG (%)', 'Percentual Plataforma (%)']) {
      expect(wrapper.text()).toContain(label);
    }
    expect(wrapper.findAll('.simulation-totals dd').map((item) => item.text())).toEqual([money(1000), money(30), money(970)]);
    expect(wrapper.find('table').text()).toContain('Distribuição hipotética do líquido');
    expect(wrapper.find('table').text()).toContain(money(824.5));
    expect(wrapper.find('table').text()).toContain(money(145.5));
    expect(wrapper.text()).not.toContain('CVG Pagamentos');
    expect(wrapper.text()).not.toContain('D+1');
    expect(wrapper.find('details').text()).toContain('Nenhuma data de liquidação é prevista');
    expect(wrapper.find('details').text()).toContain('preservando o líquido total');
    expect(wrapper.findAll('nav[aria-label="Rotinas relacionadas"] a').map((link) => link.attributes('href')))
      .toEqual(['/finance/split', '/finance/card-machines', '/finance/card-transactions']);
  });

  it('updates the simulated split immediately when the sale amount changes', async () => {
    const wrapper = createPage();
    await wrapper.get('#split-simulator-amount').setValue('200');
    expect(wrapper.findAll('.simulation-totals dd').map((item) => item.text())).toEqual([money(200), money(6), money(194)]);
    expect(wrapper.find('table').text()).toContain(money(164.9));
    expect(wrapper.find('table').text()).toContain(money(29.1));
  });

  it('formats the largest accepted amount without losing its final cent', async () => {
    const wrapper = createPage();
    await wrapper.get('#split-simulator-amount').setValue('90071992547409.91');
    expect(wrapper.findAll('.simulation-totals dd')[0].text()).toBe('R$\u00a090.071.992.547.409,91');
    expect(wrapper.find('table').exists()).toBe(true);
  });

  it('hides invalid distribution and totals, preserves inputs, and restores the example', async () => {
    const wrapper = createPage();
    await wrapper.get('#split-simulator-clinic-share').setValue('90');
    expect(wrapper.text()).toContain('A soma dos percentuais CVG e Plataforma deve ser 100%.');
    expect(wrapper.find('table').exists()).toBe(false);
    expect(wrapper.findAll('.simulation-totals dd').map((item) => item.text())).toEqual(['—', '—', '—']);
    expect((wrapper.get('#split-simulator-clinic-share').element as HTMLInputElement).value).toBe('90');
    const reset = wrapper.findAll('button').find((button) => button.text() === 'Repor exemplo');
    expect(reset).toBeDefined();
    await reset!.trigger('click');
    expect((wrapper.get('#split-simulator-clinic-share').element as HTMLInputElement).value).toBe('85');
    expect(wrapper.find('table').exists()).toBe(true);
    expect(wrapper.text()).not.toContain('A soma dos percentuais');
    expect(wrapper.findAll('.simulation-totals dd').map((item) => item.text())).toEqual([money(1000), money(30), money(970)]);
  });

  it('keeps a genuine zero sale visible and differentiates it from a blank input', async () => {
    const wrapper = createPage();
    await wrapper.get('#split-simulator-amount').setValue('0');
    expect(wrapper.findAll('.simulation-totals dd').map((item) => item.text())).toEqual([money(0), money(0), money(0)]);
    expect(wrapper.findAll('tbody tr')).toHaveLength(2);
    await wrapper.get('#split-simulator-amount').setValue('');
    expect(wrapper.text()).toContain('Informe um número válido em Valor da venda.');
    expect(wrapper.find('table').exists()).toBe(false);
    expect(wrapper.findAll('.simulation-totals dd').map((item) => item.text())).toEqual(['—', '—', '—']);
  });
});
