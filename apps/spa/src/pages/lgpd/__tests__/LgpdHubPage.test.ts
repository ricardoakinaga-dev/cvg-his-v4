import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

const mockGetConsentStatus = vi.fn();
const mockGrantConsent = vi.fn();
const mockRevokeConsent = vi.fn();
const mockListDsrRequests = vi.fn();
const mockCreateDsrRequest = vi.fn();
const mockCompleteDsrRequest = vi.fn();
const mockRejectDsrRequest = vi.fn();

vi.mock('@/services/lgpd', () => ({
  lgpdService: {
    getConsentStatus: (...args: unknown[]) => mockGetConsentStatus(...args),
    grantConsent: (...args: unknown[]) => mockGrantConsent(...args),
    revokeConsent: (...args: unknown[]) => mockRevokeConsent(...args),
    listDsrRequests: (...args: unknown[]) => mockListDsrRequests(...args),
    createDsrRequest: (...args: unknown[]) => mockCreateDsrRequest(...args),
    completeDsrRequest: (...args: unknown[]) => mockCompleteDsrRequest(...args),
    rejectDsrRequest: (...args: unknown[]) => mockRejectDsrRequest(...args)
  }
}));

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    user: {
      id: 'user-1'
    }
  })
}));

const baseConsentStatus = {
  clinical: false,
  financial: true,
  operational: true,
  marketing: false,
  analytics: false,
  notifications: true
};

const baseDsrRequests = [
  {
    id: 'dsr-1',
    accountId: 'acc-1',
    subjectId: 'owner-1',
    subjectType: 'owner',
    requestType: 'data_access',
    status: 'pending',
    requestedBy: 'user-1',
    requestedAt: '2026-04-22T12:00:00Z',
    completedBy: null,
    completedAt: null,
    rejectionReason: null,
    notes: 'Exportar histórico'
  },
  {
    id: 'dsr-2',
    accountId: 'acc-1',
    subjectId: 'patient-1',
    subjectType: 'patient',
    requestType: 'data_export',
    status: 'completed',
    requestedBy: 'user-1',
    requestedAt: '2026-04-20T12:00:00Z',
    completedBy: 'user-1',
    completedAt: '2026-04-21T12:00:00Z',
    rejectionReason: null,
    notes: null
  }
];

describe('LgpdHubPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetConsentStatus.mockResolvedValue(baseConsentStatus);
    mockGrantConsent.mockResolvedValue({ ok: true });
    mockRevokeConsent.mockResolvedValue({ ok: true });
    mockListDsrRequests.mockResolvedValue(baseDsrRequests);
    mockCreateDsrRequest.mockResolvedValue(baseDsrRequests[0]);
    mockCompleteDsrRequest.mockResolvedValue(baseDsrRequests[0]);
    mockRejectDsrRequest.mockResolvedValue(baseDsrRequests[0]);
  });

  it('renders consent alerts and KPIs after loading', async () => {
    const LgpdHubPage = (await import('../LgpdHubPage.vue')).default;
    const wrapper = mount(LgpdHubPage);

    await flushPromises();

    expect(wrapper.text()).toContain('LGPD');
    expect(wrapper.text()).toContain('Consentimento clínico pendente');
    expect(wrapper.text()).toContain('DSRs pendentes');
    expect(wrapper.text()).toContain('2 solicitaçao(s) total');
    expect(mockGetConsentStatus).toHaveBeenCalledWith('user-1', 'user');
    expect(mockListDsrRequests).toHaveBeenCalled();
  });

  it('grants and revokes consent through the action buttons', async () => {
    mockGetConsentStatus
      .mockResolvedValueOnce(baseConsentStatus)
      .mockResolvedValueOnce({ ...baseConsentStatus, clinical: true })
      .mockResolvedValueOnce({ ...baseConsentStatus, clinical: false });

    const LgpdHubPage = (await import('../LgpdHubPage.vue')).default;
    const wrapper = mount(LgpdHubPage);

    await flushPromises();

    const grantButton = wrapper.findAll('button').find((button) => button.text().includes('Conceder'));
    expect(grantButton).toBeTruthy();
    await grantButton!.trigger('click');
    await flushPromises();

    expect(mockGrantConsent).toHaveBeenCalledWith({
      subjectId: 'user-1',
      subjectType: 'user',
      purpose: 'clinical'
    });

    const revokeButton = wrapper.findAll('button').find((button) => button.text().includes('Revogar'));
    expect(revokeButton).toBeTruthy();
    await revokeButton!.trigger('click');
    await flushPromises();

    expect(mockRevokeConsent).toHaveBeenCalledWith({
      subjectId: 'user-1',
      subjectType: 'user',
      purpose: 'clinical'
    });
  });

  it('validates subject id before creating a DSR', async () => {
    const LgpdHubPage = (await import('../LgpdHubPage.vue')).default;
    const wrapper = mount(LgpdHubPage);

    await flushPromises();
    const newRequestButton = wrapper.findAll('button').find((button) => button.text().includes('Nova Solicitaçao'));
    await newRequestButton!.trigger('click');
    await flushPromises();

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(mockCreateDsrRequest).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('ID do titular é obrigatório');
  });

  it('creates a DSR and filters the requests table by status', async () => {
    const LgpdHubPage = (await import('../LgpdHubPage.vue')).default;
    const wrapper = mount(LgpdHubPage);

    await flushPromises();
    const newRequestButton = wrapper.findAll('button').find((button) => button.text().includes('Nova Solicitaçao'));
    await newRequestButton!.trigger('click');
    await flushPromises();

    await wrapper.find('input[placeholder="ID do owner, paciente ou usuário"]').setValue('owner-99');
    const selects = wrapper.findAll('select');
    await selects[0].setValue('user');
    await selects[1].setValue('data_export');
    await wrapper.find('textarea').setValue('Solicitação de exportação');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(mockCreateDsrRequest).toHaveBeenCalledWith({
      subjectId: 'owner-99',
      subjectType: 'user',
      requestType: 'data_export',
      notes: 'Solicitação de exportação'
    });

    await selects[2].setValue('completed');
    await flushPromises();
    expect(wrapper.text()).toContain('dsr-2');
    expect(wrapper.text()).not.toContain('dsr-1');
  });

  it('completes and rejects pending DSR actions', async () => {
    mockListDsrRequests
      .mockResolvedValueOnce(baseDsrRequests)
      .mockResolvedValueOnce(baseDsrRequests)
      .mockResolvedValueOnce(baseDsrRequests);

    const LgpdHubPage = (await import('../LgpdHubPage.vue')).default;
    const wrapper = mount(LgpdHubPage);

    await flushPromises();
    const newRequestButton = wrapper.findAll('button').find((button) => button.text().includes('Nova Solicitaçao'));
    await newRequestButton!.trigger('click');
    await flushPromises();

    const completeButton = wrapper.findAll('button').find((button) => button.text().includes('Completar'));
    expect(completeButton).toBeTruthy();
    await completeButton!.trigger('click');
    await flushPromises();
    expect(mockCompleteDsrRequest).toHaveBeenCalledWith('dsr-1');

    const rejectButton = wrapper.findAll('button').find((button) => button.text().includes('Rejeitar'));
    expect(rejectButton).toBeTruthy();
    await rejectButton!.trigger('click');
    await flushPromises();
    expect(mockRejectDsrRequest).toHaveBeenCalledWith('dsr-1', 'Solicitação rejeitada pelo operador');
  });
});
