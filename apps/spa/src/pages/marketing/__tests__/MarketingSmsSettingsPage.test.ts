import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { marketingService } from '@/services/marketing';

vi.mock('@/services/marketing', () => ({
  marketingService: {
    getSetting: vi.fn(),
    saveSetting: vi.fn()
  }
}));

describe('MarketingSmsSettingsPage', () => {
  beforeEach(() => {
    vi.mocked(marketingService.getSetting).mockResolvedValue(null);
    vi.mocked(marketingService.saveSetting).mockResolvedValue({
      accountId: 'account-1',
      key: 'sms_automations',
      channel: 'sms',
      values: { agenda: true, animalBirthday: true, clientBirthday: true },
      updatedByUserId: 'user-1',
      updatedAt: '2026-08-07T12:00:00.000Z'
    });
  });

  it('renders the safe Vetus-like SMS settings surface', async () => {
    const MarketingSmsSettingsPage = (await import('../MarketingSmsSettingsPage.vue')).default;
    const wrapper = mount(MarketingSmsSettingsPage);
    await flushPromises();

    expect(wrapper.text()).toContain('Configurações de SMS');
    expect(wrapper.text()).toContain('Marketing');
    expect(wrapper.text()).toContain('Configurações');
    expect(wrapper.text()).toContain('Enviar SMS automático dos agendamentos para os clientes');
    expect(wrapper.text()).toContain('Enviar SMS automático para os Animais aniversariantes do dia');
    expect(wrapper.text()).toContain('Enviar SMS automático para os Clientes aniversariantes do dia');
    expect(wrapper.text()).toContain('Só funcionará se tiver saldo de SMS');
    expect(wrapper.text()).toContain('Provider');
    expect(wrapper.find('#marketing-sms-agenda').element).toHaveProperty('checked', true);
    expect(wrapper.find('#marketing-sms-animal-birthday').element).toHaveProperty('checked', true);
    expect(wrapper.find('#marketing-sms-client-birthday').element).toHaveProperty('checked', true);
    expect(wrapper.find('#marketing-sms-settings-save').attributes('disabled')).toBeUndefined();
  });

  it('prepares a local preview without saving settings or sending SMS', async () => {
    const MarketingSmsSettingsPage = (await import('../MarketingSmsSettingsPage.vue')).default;
    const wrapper = mount(MarketingSmsSettingsPage);
    await flushPromises();

    await wrapper.find('#marketing-sms-animal-birthday').setValue(false);
    await wrapper.find('#marketing-sms-settings-preview').trigger('click');

    expect(wrapper.text()).toContain('Configuração preparada para salvar');
    expect(wrapper.text()).toContain('Agendamentos');
    expect(wrapper.text()).toContain('Ativo');
    expect(wrapper.text()).toContain('Animais aniversariantes');
    expect(wrapper.text()).toContain('Inativo');
    await wrapper.find('#marketing-sms-settings-save').trigger('click');
    await flushPromises();
    expect(marketingService.saveSetting).toHaveBeenCalledWith({
      key: 'sms_automations',
      channel: 'sms',
      values: { agenda: true, animalBirthday: false, clientBirthday: true }
    });
});
});
