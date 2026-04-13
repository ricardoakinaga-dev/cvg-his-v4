import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

const mockBeds = [
  {
    id: 'bed-1',
    code: 'B01',
    name: 'Leito 01',
    sectorId: 'sector-1',
    status: 'available' as const,
    supportsSpecies: 'canine',
    active: true
  },
  {
    id: 'bed-2',
    code: 'B02',
    name: 'Leito 02',
    sectorId: 'sector-1',
    status: 'occupied' as const,
    supportsSpecies: 'feline',
    active: true
  }
];

const mockListBeds = vi.fn().mockResolvedValue(mockBeds);
const mockCreateBed = vi.fn().mockResolvedValue({ id: 'bed-3' });

vi.mock('@/services/inpatient', () => ({
  inpatientService: {
    listBeds: () => mockListBeds(),
    createBed: (...args: unknown[]) => mockCreateBed(...args)
  }
}));

describe('BedsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListBeds.mockResolvedValue(mockBeds);
    mockCreateBed.mockResolvedValue({ id: 'bed-3' });
  });

  it('renders inpatient bed management context', async () => {
    const BedsPage = (await import('../BedsPage.vue')).default;
    const wrapper = mount(BedsPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Atendimento > Internação > Leitos');
    expect(wrapper.text()).toContain('Mapa de Leitos');
    expect(wrapper.text()).toContain('2 leitos');
  });

  it('creates a new bed and reloads the list', async () => {
    const BedsPage = (await import('../BedsPage.vue')).default;
    const wrapper = mount(BedsPage);

    await flushPromises();
    await wrapper.find('input[placeholder="ID do setor"]').setValue('sector-1');
    await wrapper.find('input[placeholder="Ex.: B01"]').setValue('B03');
    await wrapper.find('input[placeholder="Ex.: Leito 01"]').setValue('Leito 03');
    await wrapper.find('input[placeholder="Ex.: caninos, felinos"]').setValue('canine');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(mockCreateBed).toHaveBeenCalledWith(
      expect.objectContaining({
        sectorId: 'sector-1',
        code: 'B03',
        name: 'Leito 03'
      })
    );
    expect(mockListBeds).toHaveBeenCalledTimes(2);
  });
});
