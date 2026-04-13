import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

const mockCreateTriage = vi.fn().mockResolvedValue({ id: 'triage-1' });
const mockRouterPush = vi.fn();

vi.mock('@/services/triage', () => ({
  createTriage: (...args: unknown[]) => mockCreateTriage(...args)
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockRouterPush
  })
}));

describe('TriageFormPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateTriage.mockResolvedValue({ id: 'triage-1' });
    mockRouterPush.mockResolvedValue(undefined);
    window.history.replaceState({}, '', '/triage/new?encounterId=enc-1&patientId=pat-1');
  });

  it('prefills encounter and patient from query string', async () => {
    vi.resetModules();
    const TriageFormPage = (await import('../TriageFormPage.vue')).default;
    const wrapper = mount(TriageFormPage);

    await flushPromises();
    expect((wrapper.find('#encounterId').element as HTMLInputElement).value).toBe('enc-1');
    expect((wrapper.find('#patientId').element as HTMLInputElement).value).toBe('pat-1');
    expect(wrapper.text()).toContain('Atendimento > Triagem');
  });

  it('submits triage and redirects to detail page', async () => {
    vi.resetModules();
    window.history.replaceState({}, '', '/triage/new');
    const TriageFormPage = (await import('../TriageFormPage.vue')).default;
    const wrapper = mount(TriageFormPage);

    await wrapper.find('#encounterId').setValue('enc-1');
    await wrapper.find('#patientId').setValue('pat-1');
    await wrapper.find('#chiefComplaint').setValue('Febre alta');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(mockCreateTriage).toHaveBeenCalledWith(
      expect.objectContaining({
        encounterId: 'enc-1',
        patientId: 'pat-1',
        chiefComplaint: 'Febre alta'
      })
    );
    expect(mockRouterPush).toHaveBeenCalledWith('/triage/triage-1');
  });
});
