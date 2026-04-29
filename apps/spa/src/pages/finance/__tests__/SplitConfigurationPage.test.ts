import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

describe('SplitConfigurationPage', () => {
  it('renders the Vetus-like split configuration surface', async () => {
    const SplitConfigurationPage = (await import('../SplitConfigurationPage.vue')).default;
    const wrapper = mount(SplitConfigurationPage, {
      global: {
        stubs: {
          RouterLink: {
            props: ['to'],
            template: '<a :href="to"><slot /></a>'
          }
        }
      }
    });

    expect(wrapper.text()).toContain('Configuração do Split');
    expect(wrapper.text()).toContain('Regras de split, recebedores, percentuais e repasse da maquininha');
    expect(wrapper.text()).toContain('Unidade');
    expect(wrapper.text()).toContain('Provedor');
    expect(wrapper.text()).toContain('Status');
    expect(wrapper.text()).toContain('Pesquisar');
    expect(wrapper.text()).toContain('Salvar Configuração');
    expect(wrapper.text()).toContain('Simulador de Split');
    expect(wrapper.text()).toContain('Exportador de Split');
    expect(wrapper.text()).toContain('Transações de Cartão');
    expect(wrapper.text()).toContain('Regras');
    expect(wrapper.text()).toContain('Recebedores');
    expect(wrapper.text()).toContain('Percentual CVG');
    expect(wrapper.text()).toContain('Repasse');
    expect(wrapper.text()).toContain('Centro Veterinário Guarapiranga');
    expect(wrapper.text()).toContain('Conta operacional');
    expect(wrapper.text()).toContain('CVG Pagamentos');
    expect(wrapper.text()).toContain('Taxa/plataforma');
    expect(wrapper.text()).toContain('85%');
    expect(wrapper.text()).toContain('15%');
    expect(wrapper.text()).toContain('Pronto para validar');
  });

  it('filters split rules without losing the empty state wording', async () => {
    const SplitConfigurationPage = (await import('../SplitConfigurationPage.vue')).default;
    const wrapper = mount(SplitConfigurationPage);

    await wrapper.find('#split-configuration-search').setValue('sem resultado');

    expect(wrapper.text()).toContain('Nenhuma regra de split encontrada');
    expect(wrapper.text()).toContain('Ajuste os filtros para visualizar recebedores e percentuais configurados.');
  });
});
