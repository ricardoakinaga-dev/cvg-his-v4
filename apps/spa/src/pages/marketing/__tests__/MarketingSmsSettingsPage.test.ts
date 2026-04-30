import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';

describe('MarketingSmsSettingsPage', () => {
  it('renders the safe Vetus-like SMS settings surface', async () => {
    const MarketingSmsSettingsPage = (await import('../MarketingSmsSettingsPage.vue')).default;
    const wrapper = mount(MarketingSmsSettingsPage);

    expect(wrapper.text()).toContain('Configurações de SMS');
    expect(wrapper.text()).toContain('Marketing');
    expect(wrapper.text()).toContain('Configurações');
    expect(wrapper.text()).toContain('Enviar SMS automático dos agendamentos para os clientes');
    expect(wrapper.text()).toContain('Enviar SMS automático para os Animais aniversariantes do dia');
    expect(wrapper.text()).toContain('Enviar SMS automático para os Clientes aniversariantes do dia');
    expect(wrapper.text()).toContain('Só funcionará se tiver saldo de SMS');
    expect(wrapper.text()).toContain('Sem automação real');
    expect(wrapper.find('#marketing-sms-agenda').element).toHaveProperty('checked', true);
    expect(wrapper.find('#marketing-sms-animal-birthday').element).toHaveProperty('checked', true);
    expect(wrapper.find('#marketing-sms-client-birthday').element).toHaveProperty('checked', true);
    expect(wrapper.find('#marketing-sms-settings-save').attributes('disabled')).toBeDefined();
  });

  it('prepares a local preview without saving settings or sending SMS', async () => {
    const MarketingSmsSettingsPage = (await import('../MarketingSmsSettingsPage.vue')).default;
    const wrapper = mount(MarketingSmsSettingsPage);

    await wrapper.find('#marketing-sms-animal-birthday').setValue(false);
    await wrapper.find('#marketing-sms-settings-preview').trigger('click');

    expect(wrapper.text()).toContain('Configuração preparada sem salvar');
    expect(wrapper.text()).toContain('Agendamentos');
    expect(wrapper.text()).toContain('Ativo');
    expect(wrapper.text()).toContain('Animais aniversariantes');
    expect(wrapper.text()).toContain('Inativo');
    expect(wrapper.find('#marketing-sms-settings-save').attributes('disabled')).toBeDefined();
  });
});
