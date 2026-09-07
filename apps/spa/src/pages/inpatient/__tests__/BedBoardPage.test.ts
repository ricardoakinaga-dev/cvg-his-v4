import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

const mockBedMap = {
  items: [
    {
      sectorId: 'sec-1',
      sectorCode: 'CLIN',
      sectorName: 'Internação Clínica',
      kind: 'clinical',
      beds: [
        {
          id: 'bed-1',
          code: '01',
          name: 'Leito 01',
          status: 'occupied',
          supportsSpecies: undefined,
          stayId: 'stay-1',
          patientId: 'pat-1',
          encounterId: 'enc-1',
          occupiedSince: '2024-01-15T10:00:00Z'
        },
        {
          id: 'bed-2',
          code: '02',
          name: 'Leito 02',
          status: 'available',
          supportsSpecies: 'canine',
          stayId: undefined,
          patientId: undefined,
          encounterId: undefined,
          occupiedSince: undefined
        }
      ],
      totalBeds: 2,
      occupiedBeds: 1,
      availableBeds: 1
    },
    {
      sectorId: 'sec-2',
      sectorCode: 'UTI',
      sectorName: 'UTI',
      kind: 'icu',
      beds: [
        {
          id: 'bed-3',
          code: '01',
          name: 'UTI Leito 01',
          status: 'maintenance',
          supportsSpecies: undefined,
          stayId: undefined,
          patientId: undefined,
          encounterId: undefined,
          occupiedSince: undefined
        }
      ],
      totalBeds: 1,
      occupiedBeds: 0,
      availableBeds: 0
    }
  ],
  totalBeds: 3,
  occupiedBeds: 1,
  availableBeds: 1
};

const mockGetBedMapFn = vi.fn().mockResolvedValue(mockBedMap);
const mockGetPatientName = vi.fn().mockResolvedValue('Rex');

vi.mock('@/services/inpatient', () => ({
  inpatientService: {
    get getBedMap() {
      return mockGetBedMapFn;
    }
  }
}));

vi.mock('@/composables/useEntityCache', () => ({
  useEntityCache: () => ({
    getPatientName: mockGetPatientName,
    getUserName: vi.fn().mockResolvedValue(''),
    preloadUserNames: vi.fn().mockResolvedValue(undefined),
    loading: new Set()
  })
}));

describe('BedBoardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetBedMapFn.mockResolvedValue(mockBedMap);
    mockGetPatientName.mockResolvedValue('Rex');
  });

  it('renders the page title', async () => {
    const BedBoardPage = (await import('../BedBoardPage.vue')).default;
    const wrapper = mount(BedBoardPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Mapa de Leitos');
  });

  it('keeps occupancy unavailable until the map loads', async () => {
    let resolvePromise: (value: any) => void;
    const slowPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    mockGetBedMapFn.mockImplementation(() => slowPromise);

    const BedBoardPage = (await import('../BedBoardPage.vue')).default;
    const wrapper = mount(BedBoardPage);

    await wrapper.vm.$nextTick();
    expect(wrapper.findAll('.board-stats dd').map((value) => value.text())).toEqual([
      '—',
      '—',
      '—'
    ]);

    resolvePromise!(mockBedMap);
    await flushPromises();
    expect(wrapper.findAll('.board-stats dd').map((value) => value.text())).toEqual([
      '3',
      '1',
      '1'
    ]);
  });

  it('shows error message when API fails', async () => {
    mockGetBedMapFn.mockRejectedValue(new Error('Network error'));

    const BedBoardPage = (await import('../BedBoardPage.vue')).default;
    const wrapper = mount(BedBoardPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Network error');
  });

  it('does not show an empty map or zero occupancy after dismissing a load failure', async () => {
    mockGetBedMapFn.mockRejectedValue(new Error('Mapa temporariamente indisponível'));
    const BedBoardPage = (await import('../BedBoardPage.vue')).default;
    const wrapper = mount(BedBoardPage, { global: { stubs: { DsAlert: false } } });
    await flushPromises();
    await wrapper.get('button[aria-label="Fechar alerta"]').trigger('click');
    expect(wrapper.text()).toContain('Mapa indisponível');
    expect(wrapper.text()).not.toContain('Nenhum setor configurado');
    expect(wrapper.findAll('.board-stats dd').map((value) => value.text())).toEqual([
      '—',
      '—',
      '—'
    ]);
    mockGetBedMapFn.mockResolvedValue(mockBedMap);
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Tentar novamente')!
      .trigger('click');
    await flushPromises();
    expect(wrapper.findAll('.board-stats dd').map((value) => value.text())).toEqual([
      '3',
      '1',
      '1'
    ]);
  });

  it('shows empty state when no sectors configured', async () => {
    mockGetBedMapFn.mockResolvedValue({
      items: [],
      totalBeds: 0,
      occupiedBeds: 0,
      availableBeds: 0
    });

    const BedBoardPage = (await import('../BedBoardPage.vue')).default;
    const wrapper = mount(BedBoardPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Nenhum setor configurado');
    expect(wrapper.text()).toContain('Configurar setores');
  });

  it('renders sectors with their names', async () => {
    const BedBoardPage = (await import('../BedBoardPage.vue')).default;
    const wrapper = mount(BedBoardPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Internação Clínica');
    expect(wrapper.text()).toContain('UTI');
  });

  it('renders beds with correct status classes', async () => {
    const BedBoardPage = (await import('../BedBoardPage.vue')).default;
    const wrapper = mount(BedBoardPage);

    await flushPromises();
    const bedCards = wrapper.findAll('.bed-card');
    expect(bedCards).toHaveLength(3);

    expect(bedCards[0].classes()).toContain('bed-card--occupied');
    expect(bedCards[1].classes()).toContain('bed-card--available');
    expect(bedCards[2].classes()).toContain('bed-card--maintenance');
  });

  it('shows bed status labels in Portuguese', async () => {
    const BedBoardPage = (await import('../BedBoardPage.vue')).default;
    const wrapper = mount(BedBoardPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Ocupado');
    expect(wrapper.text()).toContain('Disponível');
    expect(wrapper.text()).toContain('Manutenção');
  });

  it('displays occupancy stats in header', async () => {
    const BedBoardPage = (await import('../BedBoardPage.vue')).default;
    const wrapper = mount(BedBoardPage);

    await flushPromises();
    expect(wrapper.findAll('.board-stats dd').map((value) => value.text())).toEqual([
      '3',
      '1',
      '1'
    ]);
  });

  it('shows patient name for occupied beds', async () => {
    const BedBoardPage = (await import('../BedBoardPage.vue')).default;
    const wrapper = mount(BedBoardPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Rex');
  });

  it('shows occupancy while patient names are still loading', async () => {
    let resolveName!: (name: string) => void;
    mockGetPatientName.mockReturnValue(
      new Promise<string>((resolve) => {
        resolveName = resolve;
      })
    );
    const BedBoardPage = (await import('../BedBoardPage.vue')).default;
    const wrapper = mount(BedBoardPage);
    await flushPromises();
    expect(wrapper.findAll('.bed-card')).toHaveLength(3);
    expect(wrapper.findAll('.board-stats dd').map((value) => value.text())).toEqual([
      '3',
      '1',
      '1'
    ]);
    expect(wrapper.text()).toContain('Paciente pat-1');
    resolveName('Rex');
    await flushPromises();
    expect(wrapper.text()).toContain('Rex');
    wrapper.unmount();
  });

  it('keeps the loaded map available when a patient name lookup fails', async () => {
    mockGetPatientName.mockRejectedValue(new Error('Name service unavailable'));
    const BedBoardPage = (await import('../BedBoardPage.vue')).default;
    const wrapper = mount(BedBoardPage);
    await flushPromises();
    expect(wrapper.findAll('.bed-card')).toHaveLength(3);
    expect(wrapper.text()).toContain('Paciente pat-1');
    expect(wrapper.text()).not.toContain('Mapa indisponível');
    wrapper.unmount();
  });

  it('ignores a patient name from an older refresh', async () => {
    let resolveOldName!: (name: string) => void;
    mockGetPatientName
      .mockReturnValueOnce(
        new Promise<string>((resolve) => {
          resolveOldName = resolve;
        })
      )
      .mockResolvedValueOnce('Nome atualizado');
    const BedBoardPage = (await import('../BedBoardPage.vue')).default;
    const wrapper = mount(BedBoardPage);
    await flushPromises();
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Atualizar')!
      .trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('Nome atualizado');
    resolveOldName('Nome antigo');
    await flushPromises();
    expect(wrapper.text()).toContain('Nome atualizado');
    expect(wrapper.text()).not.toContain('Nome antigo');
    wrapper.unmount();
  });

  it('does not present the previous occupancy as current after a failed refresh', async () => {
    const BedBoardPage = (await import('../BedBoardPage.vue')).default;
    const wrapper = mount(BedBoardPage);
    await flushPromises();
    expect(wrapper.findAll('.bed-card')).toHaveLength(3);
    mockGetBedMapFn.mockRejectedValueOnce(new Error('Atualização indisponível'));
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Atualizar')!
      .trigger('click');
    await flushPromises();
    expect(wrapper.findAll('.bed-card')).toHaveLength(0);
    expect(wrapper.findAll('.board-stats dd').map((value) => value.text())).toEqual([
      '—',
      '—',
      '—'
    ]);
    expect(wrapper.text()).toContain('Mapa indisponível');
    wrapper.unmount();
  });

  it('shows sector badge with occupancy count', async () => {
    const BedBoardPage = (await import('../BedBoardPage.vue')).default;
    const wrapper = mount(BedBoardPage);

    await flushPromises();
    expect(wrapper.text()).toContain('1/2 ocupados');
  });

  it('shows bed code and name', async () => {
    const BedBoardPage = (await import('../BedBoardPage.vue')).default;
    const wrapper = mount(BedBoardPage);

    await flushPromises();
    expect(wrapper.text()).toContain('01');
    expect(wrapper.text()).toContain('Leito 01');
  });

  it('shows species support when available', async () => {
    const BedBoardPage = (await import('../BedBoardPage.vue')).default;
    const wrapper = mount(BedBoardPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Canina');
  });
});
