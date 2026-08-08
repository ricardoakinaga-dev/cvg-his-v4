import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import InpatientAdmissionPage from '../InpatientAdmissionPage.vue';

const { push, admit } = vi.hoisted(() => ({ push: vi.fn(), admit: vi.fn() }));

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: { encounterId: 'enc-1' } }),
  useRouter: () => ({ push })
}));

vi.mock('@/services/encounter', () => ({
  encounterService: {
    list: vi.fn().mockResolvedValue([
      { id: 'enc-1', patientId: 'pat-1', status: 'in_care', reason: 'Observacao' }
    ])
  }
}));

vi.mock('@/services/inpatient', () => ({
  inpatientService: {
    listSectors: vi.fn().mockResolvedValue([
      { id: 'sector-1', name: 'UTI', code: 'UTI', active: true }
    ]),
    listBeds: vi.fn().mockResolvedValue([
      { id: 'bed-1', sectorId: 'sector-1', name: 'Leito 1', code: 'UTI-01', status: 'available', active: true }
    ]),
    admit
  }
}));

describe('InpatientAdmissionPage', () => {
  beforeEach(() => {
    push.mockReset();
    admit.mockReset().mockResolvedValue({ id: 'stay-1' });
  });

  it('admits an encounter into an available bed and opens the stay', async () => {
    const wrapper = mount(InpatientAdmissionPage, {
      global: { stubs: { AppPageHeader: true } }
    });
    await flushPromises();

    await wrapper.get('[data-testid="sector-select"]').setValue('sector-1');
    await flushPromises();
    await wrapper.get('[data-testid="bed-select"]').setValue('bed-1');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(admit).toHaveBeenCalledWith({
      encounterId: 'enc-1',
      patientId: 'pat-1',
      unit: 'Internacao',
      ward: 'UTI',
      bed: 'UTI-01',
      sectorId: 'sector-1',
      bedId: 'bed-1'
    });
    expect(push).toHaveBeenCalledWith('/inpatient/stay-1');
  });
});
