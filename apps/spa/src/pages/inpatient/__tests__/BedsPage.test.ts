import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

const mockPush = vi.fn();

const mockBeds = [
  {
    id: 'bed-1',
    accountId: 'acc-cvg',
    code: 'B01',
    name: 'Box 01',
    sectorId: 'sector-1',
    status: 'available' as const,
    supportsSpecies: 'caninos',
    active: true,
    createdAt: '2026-04-26T00:00:00.000Z',
    updatedAt: '2026-04-26T00:00:00.000Z'
  },
  {
    id: 'bed-2',
    accountId: 'acc-cvg',
    code: 'B02',
    name: 'Box 02',
    sectorId: 'sector-1',
    status: 'occupied' as const,
    supportsSpecies: 'felinos',
    active: true,
    createdAt: '2026-04-26T00:00:00.000Z',
    updatedAt: '2026-04-26T00:00:00.000Z'
  }
];

const mockSectors = [
  {
    id: 'sector-1',
    accountId: 'acc-cvg',
    code: 'UTI',
    name: 'UTI Veterinária',
    kind: 'icu',
    active: true,
    createdAt: '2026-04-26T00:00:00.000Z',
    updatedAt: '2026-04-26T00:00:00.000Z'
  }
];

const mockListBeds = vi.fn().mockResolvedValue(mockBeds);
const mockListSectors = vi.fn().mockResolvedValue(mockSectors);

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush })
}));

vi.mock('@/services/inpatient', () => ({
  inpatientService: {
    listBeds: (...args: unknown[]) => mockListBeds(...args),
    listSectors: () => mockListSectors()
  }
}));

describe('BedsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListBeds.mockResolvedValue(mockBeds);
    mockListSectors.mockResolvedValue(mockSectors);
  });

  it('renders Vetus-like boxes registry context', async () => {
    const BedsPage = (await import('../BedsPage.vue')).default;
    const wrapper = mount(BedsPage);

    await flushPromises();

    expect(wrapper.text()).toContain('Atendimento');
    expect(wrapper.text()).toContain('Boxes de Internação');
    expect(wrapper.text()).toContain('Incluir');
    expect(wrapper.text()).toContain('Pesquisar');
    expect(wrapper.text()).toContain('2 boxes');
    expect(wrapper.text()).toContain('Código');
    expect(wrapper.text()).toContain('Descrição');
    expect(wrapper.text()).toContain('Abrir');
  });

  it('searches using code, description and active filters', async () => {
    const BedsPage = (await import('../BedsPage.vue')).default;
    const wrapper = mount(BedsPage);

    await flushPromises();
    await wrapper.find('input[placeholder="Código"]').setValue('B01');
    await wrapper.find('input[placeholder="Descrição"]').setValue('Box');
    const searchButton = wrapper.findAll('button').find((button) => button.text().includes('Pesquisar'));
    expect(searchButton).toBeTruthy();
    await searchButton?.trigger('click');
    await flushPromises();

    expect(mockListBeds).toHaveBeenLastCalledWith({
      code: 'B01',
      description: 'Box',
      active: true
    });
  });
});
