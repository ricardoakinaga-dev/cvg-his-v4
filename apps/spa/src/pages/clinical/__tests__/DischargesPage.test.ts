import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

const mockEncounterList = vi.fn();
const mockDischargeList = vi.fn();
const mockDischargeCreate = vi.fn();
const mockDischargeUpdate = vi.fn();

vi.mock('@/services/encounter', () => ({
  encounterService: {
    list: (...args: unknown[]) => mockEncounterList(...args)
  }
}));

vi.mock('@/services/discharges', () => ({
  dischargeService: {
    list: (...args: unknown[]) => mockDischargeList(...args),
    create: (...args: unknown[]) => mockDischargeCreate(...args),
    update: (...args: unknown[]) => mockDischargeUpdate(...args)
  }
}));

describe('DischargesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEncounterList.mockResolvedValue([
      {
        id: 'enc-1',
        accountId: 'acc-1',
        patientId: 'pat-1',
        ownerId: 'own-1',
        visitType: 'scheduled',
        status: 'in_care',
        origin: 'schedule',
        reason: 'Retorno clínico',
        openedAt: '2026-04-10T00:00:00Z',
        createdByUserId: 'user-1',
        updatedAt: '2026-04-10T00:00:00Z'
      }
    ]);
    mockDischargeList.mockResolvedValue([]);
    mockDischargeCreate.mockResolvedValue({
      id: 'dis-1',
      accountId: 'acc-1',
      encounterId: 'enc-1',
      dischargeType: 'ambulatory',
      dischargedBy: 'user-1',
      dischargedAt: '2026-04-10T00:00:00Z',
      version: 1,
      createdAt: '2026-04-10T00:00:00Z',
      updatedAt: '2026-04-10T00:00:00Z'
    });
    mockDischargeUpdate.mockResolvedValue({
      id: 'dis-1',
      accountId: 'acc-1',
      encounterId: 'enc-1',
      dischargeType: 'ambulatory',
      dischargedBy: 'user-1',
      dischargedAt: '2026-04-10T00:00:00Z',
      version: 2,
      createdAt: '2026-04-10T00:00:00Z',
      updatedAt: '2026-04-10T01:00:00Z'
    });
  });

  it('creates a discharge for the selected encounter', async () => {
    const DischargesPage = (await import('../DischargesPage.vue')).default;
    const wrapper = mount(DischargesPage);
    await flushPromises();

    expect(wrapper.text()).toContain('Retorno clínico');

    await wrapper.find('input').setValue('Alta médica');
    const textareas = wrapper.findAll('textarea');
    await textareas[0].setValue('Paciente estável');
    await textareas[1].setValue('Retorno em 7 dias');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(mockDischargeCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        encounterId: 'enc-1',
        outcome: 'Alta médica'
      })
    );
    expect(wrapper.text()).toContain('Alta registrada com sucesso');
  });
});
