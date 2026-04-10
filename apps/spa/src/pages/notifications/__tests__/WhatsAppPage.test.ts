import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

const mockSendInbound = vi.fn();

vi.mock('@/services/whatsapp', () => ({
  whatsappService: {
    sendInbound: (...args: unknown[]) => mockSendInbound(...args)
  }
}));

describe('WhatsAppPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSendInbound.mockResolvedValue('CONFIRMADO');
  });

  it('sends an inbound webhook and shows the vendor response', async () => {
    const WhatsAppPage = (await import('../WhatsAppPage.vue')).default;
    const wrapper = mount(WhatsAppPage);

    await wrapper.find('#wa-body').setValue('CONFIRMAR');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(mockSendInbound).toHaveBeenCalledWith(
      expect.objectContaining({
        Body: 'CONFIRMAR',
        From: 'whatsapp:+5511999998888'
      })
    );
    expect(wrapper.text()).toContain('CONFIRMADO');
  });
});
