import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

describe('SplitSimulatorPage', () => {
  it('renders the Vetus-like split simulator surface', async () => {
    const SplitSimulatorPage = (await import('../SplitSimulatorPage.vue')).default;
    const wrapper = mount(SplitSimulatorPage, {
      global: {
        stubs: {
          RouterLink: {
            props: ['to'],
            template: '<a :href="to"><slot /></a>'
          }
        }
      }
    });

    expect(wrapper.text()).toContain('Simulador de Split');
    expect(wrapper.text()).toContain('Simulação de venda, taxas, recebedores e repasse líquido');
    expect(wrapper.text()).toContain('Valor da Venda');
    expect(wrapper.text()).toContain('Parcelas');
    expect(wrapper.text()).toContain('Taxa MDR');
    expect(wrapper.text()).toContain('Percentual CVG');
    expect(wrapper.text()).toContain('Percentual Plataforma');
    expect(wrapper.text()).toContain('Simular Split');
    expect(wrapper.text()).toContain('Configuração do Split');
    expect(wrapper.text()).toContain('Maquininhas');
    expect(wrapper.text()).toContain('Transações de Cartão');
    expect(wrapper.text()).toContain('Valor Bruto');
    expect(wrapper.text()).toContain('Taxa Administradora');
    expect(wrapper.text()).toContain('Líquido Simulado');
    expect(wrapper.text()).toContain('Repasse CVG');
    expect(wrapper.text()).toContain('Repasse Plataforma');
    expect(wrapper.text()).toContain('Centro Veterinário Guarapiranga');
    expect(wrapper.text()).toContain('CVG Pagamentos');
    expect(wrapper.text()).toContain('Recebedor');
    expect(wrapper.text()).toContain('Percentual');
    expect(wrapper.text()).toContain('Valor');
    expect(wrapper.text()).toContain('R$\u00A01.000,00');
    expect(wrapper.text()).toContain('R$\u00A030,00');
    expect(wrapper.text()).toContain('R$\u00A0970,00');
  });

  it('updates the simulated split result when the sale amount changes', async () => {
    const SplitSimulatorPage = (await import('../SplitSimulatorPage.vue')).default;
    const wrapper = mount(SplitSimulatorPage);

    await wrapper.find('#split-simulator-amount').setValue('200');

    expect(wrapper.text()).toContain('R$\u00A0200,00');
    expect(wrapper.text()).toContain('R$\u00A06,00');
    expect(wrapper.text()).toContain('R$\u00A0194,00');
    expect(wrapper.text()).toContain('R$\u00A0164,90');
    expect(wrapper.text()).toContain('R$\u00A029,10');
  });
});
