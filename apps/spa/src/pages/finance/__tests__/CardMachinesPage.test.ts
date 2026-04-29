import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

describe('CardMachinesPage', () => {
  it('renders the Vetus-like card machines surface', async () => {
    const CardMachinesPage = (await import('../CardMachinesPage.vue')).default;
    const wrapper = mount(CardMachinesPage, {
      global: {
        stubs: {
          RouterLink: {
            props: ['to'],
            template: '<a :href="to"><slot /></a>'
          }
        }
      }
    });

    expect(wrapper.text()).toContain('Maquininhas');
    expect(wrapper.text()).toContain('Terminais de cartão, provedores, unidades e status operacional');
    expect(wrapper.text()).toContain('Unidade');
    expect(wrapper.text()).toContain('Provedor');
    expect(wrapper.text()).toContain('Status');
    expect(wrapper.text()).toContain('Pesquisar');
    expect(wrapper.text()).toContain('Cadastrar Maquininha');
    expect(wrapper.text()).toContain('Configuração do Split');
    expect(wrapper.text()).toContain('Transações de Cartão');
    expect(wrapper.text()).toContain('Habilitar Pagamento');
    expect(wrapper.text()).toContain('Terminais');
    expect(wrapper.text()).toContain('Ativas');
    expect(wrapper.text()).toContain('Provedores');
    expect(wrapper.text()).toContain('Última Conciliação');
    expect(wrapper.text()).toContain('Maquininha Recepção');
    expect(wrapper.text()).toContain('CVG-POS-001');
    expect(wrapper.text()).toContain('Centro Veterinário Guarapiranga');
    expect(wrapper.text()).toContain('CVG Pay');
    expect(wrapper.text()).toContain('Ativa');
    expect(wrapper.text()).toContain('Maquininha Consultório');
    expect(wrapper.text()).toContain('Homologação');
  });

  it('filters card machines without losing the empty state wording', async () => {
    const CardMachinesPage = (await import('../CardMachinesPage.vue')).default;
    const wrapper = mount(CardMachinesPage);

    await wrapper.find('#card-machines-search').setValue('sem resultado');

    expect(wrapper.text()).toContain('Nenhuma maquininha encontrada');
    expect(wrapper.text()).toContain('Ajuste os filtros para visualizar terminais, provedores e status.');
  });
});
