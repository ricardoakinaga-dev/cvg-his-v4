import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { marketingService } from '@/services/marketing';

vi.mock('@/services/marketing', () => ({
  marketingService: {
    getSetting: vi.fn(),
    saveSetting: vi.fn()
  }
}));

describe('VaccineEmailLayoutPage', () => {
  beforeEach(() => {
    vi.mocked(marketingService.getSetting).mockResolvedValue(null);
    vi.mocked(marketingService.saveSetting).mockResolvedValue({
      accountId: 'account-1',
      key: 'vaccine_email',
      channel: 'email',
      values: { title: 'Lembrete Vacinas Anuais', body: 'Olá' },
      updatedByUserId: 'user-1',
      updatedAt: '2026-08-07T12:00:00.000Z'
    });
  });

  it('renders the safe Vetus-like vaccine email layout surface', async () => {
    const VaccineEmailLayoutPage = (await import('../VaccineEmailLayoutPage.vue')).default;
    const wrapper = mount(VaccineEmailLayoutPage);
    await flushPromises();

    expect(wrapper.text()).toContain('Layout de Email de Vacina');
    expect(wrapper.text()).toContain('Marketing');
    expect(wrapper.text()).toContain('Configurações');
    expect(wrapper.text()).toContain('Título do Email');
    expect(wrapper.find('#vaccine-email-title').element).toHaveProperty('value', 'Lembrete Vacinas Anuais');
    expect(wrapper.text()).toContain('Corpo do Email');
    expect(wrapper.text()).toContain('@NOME@');
    expect(wrapper.text()).toContain('@CLIENTE@');
    expect(wrapper.text()).toContain('@DATADAVACINA@');
    expect(wrapper.text()).toContain('@VACINA@');
    expect(wrapper.find('#vaccine-email-save').attributes('disabled')).toBeUndefined();
  });

  it('prepares a local preview without saving or sending email', async () => {
    const VaccineEmailLayoutPage = (await import('../VaccineEmailLayoutPage.vue')).default;
    const wrapper = mount(VaccineEmailLayoutPage);
    await flushPromises();

    await wrapper.find('#vaccine-email-title').setValue('Vacina anual de @NOME@');
    await wrapper.find('#vaccine-email-body').setValue('Olá @CLIENTE@, a vacina @VACINA@ vence em @DATADAVACINA@.');
    await wrapper.find('#vaccine-email-preview-button').trigger('click');

    expect(wrapper.text()).toContain('Layout preparado para salvar');
    expect(wrapper.text()).toContain('Vacina anual de Luna');
    expect(wrapper.text()).toContain('Olá Maria Souza, a vacina V10 vence em 30/04/2026.');
    await wrapper.find('#vaccine-email-save').trigger('click');
    await flushPromises();
    expect(marketingService.saveSetting).toHaveBeenCalledWith({
      key: 'vaccine_email',
      channel: 'email',
      values: {
        title: 'Vacina anual de @NOME@',
        body: 'Olá @CLIENTE@, a vacina @VACINA@ vence em @DATADAVACINA@.'
      }
    });
  });

  it('inserts Vetus dynamic keys into the email body locally', async () => {
    const VaccineEmailLayoutPage = (await import('../VaccineEmailLayoutPage.vue')).default;
    const wrapper = mount(VaccineEmailLayoutPage);
    await flushPromises();

    await wrapper.find('#vaccine-email-body').setValue('Paciente: ');
    await wrapper.find('[data-token="@NOME@"]').trigger('click');

    expect(wrapper.find('#vaccine-email-body').element).toHaveProperty('value', 'Paciente: @NOME@');
  });
});
