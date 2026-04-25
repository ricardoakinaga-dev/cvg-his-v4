import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import VaccinesDewormersPage from '../VaccinesDewormersPage.vue';

describe('VaccinesDewormersPage', () => {
  it('renders the Vetus-like preventive list, filters and actions', () => {
    const wrapper = mount(VaccinesDewormersPage);

    expect(wrapper.text()).toContain('Vacinas e Vermífugos');
    expect(wrapper.text()).toContain('Data Inicial');
    expect(wrapper.text()).toContain('Data Final');
    expect(wrapper.text()).toContain('Cliente (branco = Todos)');
    expect(wrapper.text()).toContain('Animal');
    expect(wrapper.text()).toContain('Pesquisar aplicações executadas');
    expect(wrapper.text()).toContain('Pesquisar');
    expect(wrapper.text()).toContain('Agendar Vacina ou Vermífugo');
    expect(wrapper.text()).toContain('Enviar Email de Aviso');
    expect(wrapper.text()).toContain('Cliente');
    expect(wrapper.text()).toContain('Data');
    expect(wrapper.text()).toContain('Descrição');
    expect(wrapper.text()).toContain('Executar');
    expect(wrapper.text()).toContain('Abrir');
    expect(wrapper.text()).toContain('Email');
    expect(wrapper.text()).toContain('Vacina V10 - reforço anual');
  });

  it('opens the scheduling and execution dialogs', async () => {
    const wrapper = mount(VaccinesDewormersPage);

    const scheduleButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Agendar Vacina ou Vermífugo'));
    expect(scheduleButton).toBeTruthy();
    await scheduleButton!.trigger('click');
    expect(wrapper.text()).toContain('Agendamento');
    expect(wrapper.text()).toContain('Vacina/Vermífugo');
    expect(wrapper.text()).toContain('Salvar');
    expect(wrapper.text()).toContain('Excluir');

    await wrapper.find('.ds-modal__close').trigger('click');

    const executeButton = wrapper.findAll('button').find((button) => button.text() === 'Executar');
    expect(executeButton).toBeTruthy();
    await executeButton!.trigger('click');
    expect(wrapper.text()).toContain('Baixar e Reagendar');
    expect(wrapper.text()).toContain('Observação');
    expect(wrapper.text()).toContain('Reagendar para');
    expect(wrapper.text()).toContain('Baixar');
  });

  it('can include executed applications in the search', async () => {
    const wrapper = mount(VaccinesDewormersPage);

    expect(wrapper.text()).not.toContain('Antirrábica');

    await wrapper.find('input[type="checkbox"]').setValue(true);
    await wrapper.find('form').trigger('submit.prevent');

    expect(wrapper.text()).toContain('Antirrábica');
    expect(wrapper.text()).toContain('Executada');
  });
});
