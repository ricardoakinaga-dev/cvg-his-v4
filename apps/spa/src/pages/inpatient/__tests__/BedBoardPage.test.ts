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

  it('starts with zero stats before data loads', async () => {
    let resolvePromise: (value: any) => void;
    const slowPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    mockGetBedMapFn.mockImplementation(() => slowPromise);

    const BedBoardPage = (await import('../BedBoardPage.vue')).default;
    const wrapper = mount(BedBoardPage);

    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('Total: 0');

    resolvePromise!(mockBedMap);
    await flushPromises();
    expect(wrapper.text()).toContain('Total: 3');
  });

  it('shows error message when API fails', async () => {
    mockGetBedMapFn.mockRejectedValue(new Error('Network error'));

    const BedBoardPage = (await import('../BedBoardPage.vue')).default;
    const wrapper = mount(BedBoardPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Network error');
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
    expect(wrapper.text()).toContain('Total: 3');
    expect(wrapper.text()).toContain('Ocupados: 1');
    expect(wrapper.text()).toContain('Disponíveis: 1');
  });

  it('shows patient name for occupied beds', async () => {
    const BedBoardPage = (await import('../BedBoardPage.vue')).default;
    const wrapper = mount(BedBoardPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Rex');
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
    expect(wrapper.text()).toContain('Canino');
  });
});
