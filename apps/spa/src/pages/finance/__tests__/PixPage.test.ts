import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

const mockCreateIntent = vi.fn();

vi.mock('@/services/pix', async () => {
  const actual = await vi.importActual<typeof import('@/services/pix')>('@/services/pix');
  return {
    ...actual,
    pixService: {
      createIntent: (...args: unknown[]) => mockCreateIntent(...args)
    }
  };
});

const pendingIntent = {
  id: 'pix-1',
  accountId: 'acc-1',
  amount: 45,
  currency: 'BRL' as const,
  provider: 'local-pix',
  status: 'pending' as const,
  qrCodePayload: '000201pix',
  qrCodeBase64: 'cGl4LXFyLTE=',
  expiresAt: '2026-04-10T00:15:00Z',
  eventId: 'evt-1',
  eventCorrelationId: 'corr-1'
};

describe('PixPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateIntent.mockResolvedValue(pendingIntent);
  });

  it('creates a PIX intent through the real service contract', async () => {
    const PixPage = (await import('../PixPage.vue')).default;
    const wrapper = mount(PixPage);

    await wrapper.find('#pix-amount').setValue('45');
    await wrapper.find('#pix-description').setValue('Liquidação teste');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(mockCreateIntent).toHaveBeenCalledWith(
      {
        amount: 45,
        description: 'Liquidação teste',
        expirationMinutes: 15
      }
    );
    expect(wrapper.text()).toContain('Intent PIX criada com sucesso');
    expect(wrapper.text()).toContain('pix-1');
    expect(wrapper.text()).toContain('Pendente');
    expect(wrapper.text()).toContain('000201pix');
    expect(wrapper.find('.qr-code').attributes('src')).toBe('data:image/png;base64,cGl4LXFyLTE=');
    expect(wrapper.text()).toContain('confirmed');
    expect(wrapper.text()).toContain('não disponível neste contrato');
  });

  it('renders completed without relabeling it as confirmed', async () => {
    mockCreateIntent.mockResolvedValue({ ...pendingIntent, status: 'completed' });
    const PixPage = (await import('../PixPage.vue')).default;
    const wrapper = mount(PixPage);

    await wrapper.find('#pix-amount').setValue('45');
    await wrapper.find('#pix-description').setValue('Liquidação teste');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('Concluído');
    expect(wrapper.text()).not.toContain('Status: Confirmado');
  });

  it('does not present an unsupported runtime state as operational', async () => {
    mockCreateIntent.mockResolvedValue({
      ...pendingIntent,
      status: 'expired'
    } as unknown as typeof pendingIntent);
    const PixPage = (await import('../PixPage.vue')).default;
    const wrapper = mount(PixPage);

    await wrapper.find('#pix-amount').setValue('45');
    await wrapper.find('#pix-description').setValue('Liquidação teste');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('Expirado');
    expect(wrapper.text()).toContain('não disponível neste contrato');
  });
});
