import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

const mockCreateIntent = vi.fn();

vi.mock('@/services/pix', () => ({
  pixService: {
    createIntent: (...args: unknown[]) => mockCreateIntent(...args)
  }
}));

describe('PixPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateIntent.mockResolvedValue({
      id: 'pix-1',
      accountId: 'acc-1',
      billingRecordId: 'bill-1',
      amount: 45,
      currency: 'BRL',
      provider: 'local-pix',
      status: 'pending',
      qrCodeText: '000201',
      qrCodeImageUrl: 'https://example.test/qrcode.png',
      expiresAt: '2026-04-10T00:15:00Z',
      createdAt: '2026-04-10T00:00:00Z',
      updatedAt: '2026-04-10T00:00:00Z',
      eventId: 'evt-1',
      eventCorrelationId: 'corr-1'
    });
  });

  it('creates a PIX intent through the real service contract', async () => {
    const PixPage = (await import('../PixPage.vue')).default;
    const wrapper = mount(PixPage);

    await wrapper.find('#pix-amount').setValue('45');
    await wrapper.find('#pix-description').setValue('Liquidação teste');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(mockCreateIntent).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 45,
        description: 'Liquidação teste'
      })
    );
    expect(wrapper.text()).toContain('Intent PIX criada com sucesso');
    expect(wrapper.text()).toContain('pix-1');
  });
});
