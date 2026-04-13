import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

const mockSectors = [
  {
    id: 'sector-1',
    code: 'UTI',
    name: 'UTI',
    kind: 'icu',
    active: true,
    createdAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'sector-2',
    code: 'OBS',
    name: 'Observação',
    kind: 'observation',
    active: false,
    createdAt: '2024-01-02T00:00:00Z'
  }
];

const mockListSectors = vi.fn().mockResolvedValue(mockSectors);
const mockCreateSector = vi.fn().mockResolvedValue({ id: 'sector-3' });

vi.mock('@/services/inpatient', () => ({
  inpatientService: {
    listSectors: () => mockListSectors(),
    createSector: (...args: unknown[]) => mockCreateSector(...args)
  }
}));

describe('SectorsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListSectors.mockResolvedValue(mockSectors);
    mockCreateSector.mockResolvedValue({ id: 'sector-3' });
  });

  it('renders inpatient sector management context', async () => {
    const SectorsPage = (await import('../SectorsPage.vue')).default;
    const wrapper = mount(SectorsPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Atendimento > Internação > Setores');
    expect(wrapper.text()).toContain('Mapa de Leitos');
    expect(wrapper.text()).toContain('2 setores');
  });

  it('creates a new sector and reloads the list', async () => {
    const SectorsPage = (await import('../SectorsPage.vue')).default;
    const wrapper = mount(SectorsPage);

    await flushPromises();
    await wrapper.find('input[placeholder="Ex.: UTI"]').setValue('CLIN');
    await wrapper.find('input[placeholder="Ex.: Unidade de Terapia Intensiva"]').setValue('Clínica');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(mockCreateSector).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'CLIN',
        name: 'Clínica'
      })
    );
    expect(mockListSectors).toHaveBeenCalledTimes(2);
  });
});
