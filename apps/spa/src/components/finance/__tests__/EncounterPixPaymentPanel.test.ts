// @vitest-environment jsdom

import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requestEncounterAttempt: vi.fn(),
  getEncounterAttempt: vi.fn(),
  getLatestEncounterAttempt: vi.fn()
}));

vi.mock('@/services/pix', async () => {
  const actual = await vi.importActual<typeof import('@/services/pix')>('@/services/pix');
  return {
    ...actual,
    pixService: {
      ...actual.pixService,
      requestEncounterAttempt: (...args: unknown[]) => mocks.requestEncounterAttempt(...args),
      getEncounterAttempt: (...args: unknown[]) => mocks.getEncounterAttempt(...args),
      getLatestEncounterAttempt: (...args: unknown[]) => mocks.getLatestEncounterAttempt(...args)
    }
  };
});

const pendingAttempt = {
  id: 'attempt-1',
  encounterId: 'encounter-1',
  billingRecordId: 'billing-1',
  state: 'pending_dispatch' as const,
  amountCents: 4550,
  currency: 'BRL' as const,
  qrCodePayload: null,
  qrCodeBase64: null,
  expiresAt: null,
  error: null,
  createdAt: '2026-09-07T12:00:00.000Z',
  updatedAt: '2026-09-07T12:00:00.000Z'
};

const closedProps = {
  encounterId: 'encounter-1',
  encounterStatus: 'closed',
  financialEligible: true
} as const;

function button(wrapper: ReturnType<typeof mount>, label: string) {
  const found = wrapper.findAll('button').find((candidate) => candidate.text().includes(label));
  if (!found) throw new Error(`Button ${label} not found`);
  return found;
}

async function requestPending(wrapper: ReturnType<typeof mount>) {
  mocks.requestEncounterAttempt.mockResolvedValueOnce(pendingAttempt);
  await button(wrapper, 'Solicitar despacho PIX').trigger('click');
  await flushPromises();
}

describe('EncounterPixPaymentPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getLatestEncounterAttempt.mockResolvedValue(null);
  });

  it('sends the request, treats 202 as pending dispatch, and reuses the key after an uncertain retry', async () => {
    const Panel = (await import('../EncounterPixPaymentPanel.vue')).default;
    const wrapper = mount(Panel, { props: closedProps });
    await flushPromises();
    mocks.requestEncounterAttempt.mockRejectedValueOnce(new Error('resultado incerto'));

    await button(wrapper, 'Solicitar despacho PIX').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('resultado incerto');

    mocks.requestEncounterAttempt.mockResolvedValueOnce(pendingAttempt);
    await button(wrapper, 'Tentar novamente').trigger('click');
    await flushPromises();

    expect(mocks.requestEncounterAttempt).toHaveBeenCalledTimes(2);
    expect(mocks.requestEncounterAttempt.mock.calls[0][0]).toBe('encounter-1');
    expect(mocks.requestEncounterAttempt.mock.calls[0][1]).toBe(mocks.requestEncounterAttempt.mock.calls[1][1]);
    expect(wrapper.text()).toContain('Solicitação aceita (202)');
    expect(wrapper.text()).toContain('Despacho pendente');
    expect(wrapper.text()).toContain('202 não representa liquidação');
    expect(wrapper.find('.attempt__state').text()).not.toContain('Liquidado');
  });

  it('renders settled without relabeling it as pending and only renders returned QR data', async () => {
    const Panel = (await import('../EncounterPixPaymentPanel.vue')).default;
    const wrapper = mount(Panel, { props: closedProps });
    await flushPromises();
    const settledAttempt = {
      ...pendingAttempt,
      state: 'settled' as const,
      qrCodePayload: '000201pix-copy-paste',
      qrCodeBase64: 'cGl4LXFyLTE='
    };
    mocks.requestEncounterAttempt.mockResolvedValueOnce(settledAttempt);

    await button(wrapper, 'Solicitar despacho PIX').trigger('click');
    await flushPromises();

    expect(wrapper.find('.attempt__state').text()).toContain('Liquidado');
    expect(wrapper.find('.attempt__state').text()).not.toContain('Despacho pendente');
    expect(wrapper.find('img').exists()).toBe(true);
    expect(wrapper.text()).toContain('000201pix-copy-paste');
    expect(wrapper.text()).not.toContain('202 não representa liquidação');
  });

  it('does not render a QR when the response has no payload or base64', async () => {
    const Panel = (await import('../EncounterPixPaymentPanel.vue')).default;
    const wrapper = mount(Panel, { props: closedProps });
    await flushPromises();
    await requestPending(wrapper);

    expect(wrapper.find('img').exists()).toBe(false);
    expect(wrapper.text()).toContain('não contém QR Code ou payload PIX');
  });

  it.each([
    ['awaiting_confirmation', 'Aguardando confirmação'],
    ['confirmed_pending_apply', 'Confirmação recebida · aplicação pendente'],
    ['expired', 'Expirado'],
    ['cancelled', 'Cancelado'],
    ['dispatch_failed', 'Falha no despacho'],
    ['reconciliation_required', 'Reconciliação necessária']
  ] as const)('shows the backend label for %s', async (state, label) => {
    const Panel = (await import('../EncounterPixPaymentPanel.vue')).default;
    const wrapper = mount(Panel, { props: closedProps });
    await flushPromises();
    mocks.requestEncounterAttempt.mockResolvedValueOnce({ ...pendingAttempt, state });

    await button(wrapper, 'Solicitar despacho PIX').trigger('click');
    await flushPromises();

    expect(wrapper.find('.attempt__state').text()).toContain(label);
  });

  it('keeps request disabled until the encounter is closed', async () => {
    const Panel = (await import('../EncounterPixPaymentPanel.vue')).default;
    const wrapper = mount(Panel, {
      props: { ...closedProps, encounterStatus: 'in_care', financialEligible: false }
    });
    await flushPromises();
    const requestButton = button(wrapper, 'Solicitar despacho PIX');

    expect(requestButton.attributes('disabled')).toBeDefined();
    await requestButton.trigger('click');
    expect(mocks.requestEncounterAttempt).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('só pode ser solicitado depois que o atendimento estiver fechado');
  });

  it('keeps request disabled when the closed encounter has no eligible open billing balance', async () => {
    const Panel = (await import('../EncounterPixPaymentPanel.vue')).default;
    const wrapper = mount(Panel, {
      props: { ...closedProps, financialEligible: false }
    });
    await flushPromises();
    const requestButton = button(wrapper, 'Solicitar despacho PIX');

    expect(requestButton.attributes('disabled')).toBeDefined();
    await requestButton.trigger('click');
    expect(mocks.requestEncounterAttempt).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('cobrança aberta, saldo integral em aberto');
  });

  it('updates explicitly and ignores polling callbacks after unmount', async () => {
    vi.useFakeTimers();
    try {
      const Panel = (await import('../EncounterPixPaymentPanel.vue')).default;
      const wrapper = mount(Panel, { props: closedProps });
      await flushPromises();
      await requestPending(wrapper);

      const settledAttempt = { ...pendingAttempt, state: 'settled' as const };
      mocks.getEncounterAttempt.mockResolvedValueOnce(settledAttempt);
      await button(wrapper, 'Atualizar status').trigger('click');
      await flushPromises();
      expect(mocks.getEncounterAttempt).toHaveBeenCalledWith('attempt-1');
      expect(wrapper.find('.attempt__state').text()).toContain('Liquidado');

      mocks.requestEncounterAttempt.mockResolvedValueOnce(pendingAttempt);
      const secondWrapper = mount(Panel, {
        props: { ...closedProps, encounterId: 'encounter-2' }
      });
      await flushPromises();
      await requestPending(secondWrapper);
      secondWrapper.unmount();
      await vi.advanceTimersByTimeAsync(30_000);
      expect(mocks.getEncounterAttempt).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('restores the latest durable attempt when the billing step mounts', async () => {
    const Panel = (await import('../EncounterPixPaymentPanel.vue')).default;
    mocks.getLatestEncounterAttempt.mockResolvedValueOnce({
      ...pendingAttempt,
      state: 'settled',
      qrCodePayload: '000201restored-pix',
      qrCodeBase64: 'cmVzdG9yZWQtcGl4'
    });
    const wrapper = mount(Panel, {
      props: closedProps
    });

    await flushPromises();

    expect(mocks.getLatestEncounterAttempt).toHaveBeenCalledWith('encounter-1');
    expect(wrapper.find('.attempt__state').text()).toContain('Liquidado');
    expect(wrapper.text()).toContain('000201restored-pix');
    expect(mocks.requestEncounterAttempt).not.toHaveBeenCalled();
  });

  it('keeps automatic polling alive after a transient status failure', async () => {
    vi.useFakeTimers();
    try {
      const Panel = (await import('../EncounterPixPaymentPanel.vue')).default;
      mocks.getLatestEncounterAttempt.mockResolvedValueOnce(pendingAttempt);
      mocks.getEncounterAttempt
        .mockRejectedValueOnce(new Error('poll transitório'))
        .mockResolvedValueOnce({ ...pendingAttempt, state: 'settled' });
      const wrapper = mount(Panel, {
        props: closedProps
      });

      await flushPromises();
      await vi.advanceTimersByTimeAsync(30_000);
      await flushPromises();
      expect(wrapper.text()).toContain('poll transitório');

      await vi.advanceTimersByTimeAsync(30_000);
      await flushPromises();
      expect(wrapper.find('.attempt__state').text()).toContain('Liquidado');
      expect(mocks.getEncounterAttempt).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
});
