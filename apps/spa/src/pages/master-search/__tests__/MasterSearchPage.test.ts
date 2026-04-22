import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

const mockOwnerList = vi.fn();
const mockPatientList = vi.fn();

vi.mock('@/services/owner', () => ({
  ownerService: {
    list: (...args: unknown[]) => mockOwnerList(...args)
  }
}));

vi.mock('@/services/patient', () => ({
  patientService: {
    list: (...args: unknown[]) => mockPatientList(...args)
  }
}));

const allOwners = [
  {
    id: 'owner-1',
    accountId: 'acc-1',
    fullName: 'Maria Souza',
    documentId: '12345678900',
    contacts: [{ type: 'phone', value: '11999999999' }],
    financialResponsible: true,
    status: 'active'
  },
  {
    id: 'owner-2',
    accountId: 'acc-1',
    fullName: 'João Pereira',
    documentId: '98765432100',
    contacts: [{ type: 'email', value: 'joao@example.com' }],
    financialResponsible: false,
    status: 'inactive'
  }
];

const allPatients = [
  {
    id: 'patient-1',
    accountId: 'acc-1',
    name: 'Rex',
    species: 'Canino',
    sex: 'male',
    primaryOwnerId: 'owner-1',
    createdAt: '2026-04-10T00:00:00Z'
  },
  {
    id: 'patient-2',
    accountId: 'acc-1',
    name: 'Luna',
    species: 'Felino',
    sex: 'female',
    primaryOwnerId: 'owner-2',
    createdAt: '2026-04-11T00:00:00Z'
  }
];

const ownersSearchResult = [allOwners[0]];
const patientsSearchResult = [allPatients[0]];

describe('MasterSearchPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOwnerList.mockImplementation((query?: string) => {
      if (!query) return Promise.resolve(allOwners);
      return Promise.resolve(ownersSearchResult);
    });
    mockPatientList.mockImplementation((query?: string) => {
      if (!query) return Promise.resolve(allPatients);
      return Promise.resolve(patientsSearchResult);
    });
  });

  it('keeps empty state when search query is blank', async () => {
    const MasterSearchPage = (await import('../MasterSearchPage.vue')).default;
    const wrapper = mount(MasterSearchPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Busca federada');
    expect(wrapper.text()).not.toContain('Nenhum resultado encontrado');

    const buttons = wrapper.findAll('button');
    const buscarButton = buttons.find((button) => button.text() === 'Buscar');
    expect(buscarButton).toBeTruthy();
    await buscarButton!.trigger('click');
    await flushPromises();

    expect(mockOwnerList).toHaveBeenCalledTimes(1);
    expect(mockPatientList).toHaveBeenCalledTimes(1);
    expect(wrapper.text()).not.toContain('resultado(s) para');
  });

  it('renders grouped results for owners, patients and links', async () => {
    const MasterSearchPage = (await import('../MasterSearchPage.vue')).default;
    const wrapper = mount(MasterSearchPage);

    await flushPromises();
    const searchInput = wrapper.find('input[type="search"]');
    await searchInput.setValue('rex');

    const buttons = wrapper.findAll('button');
    const buscarButton = buttons.find((button) => button.text() === 'Buscar');
    await buscarButton!.trigger('click');
    await flushPromises();

    expect(mockOwnerList).toHaveBeenLastCalledWith('rex');
    expect(mockPatientList).toHaveBeenLastCalledWith('rex');
    expect(wrapper.text()).toContain('3 resultado(s) para "rex"');
    expect(wrapper.text()).toContain('Tutores');
    expect(wrapper.text()).toContain('Pacientes');
    expect(wrapper.text()).toContain('Vínculos');
    expect(wrapper.text()).toContain('Maria Souza');
    expect(wrapper.text()).toContain('Rex');
    expect(wrapper.text()).toContain('Principal');
  });

  it('shows no results message when the search returns nothing', async () => {
    mockOwnerList.mockImplementation((query?: string) => {
      if (!query) return Promise.resolve(allOwners);
      return Promise.resolve([]);
    });
    mockPatientList.mockImplementation((query?: string) => {
      if (!query) return Promise.resolve(allPatients);
      return Promise.resolve([]);
    });

    const MasterSearchPage = (await import('../MasterSearchPage.vue')).default;
    const wrapper = mount(MasterSearchPage);

    await flushPromises();
    await wrapper.find('input[type="search"]').setValue('sem-match');
    const buscarButton = wrapper.findAll('button').find((button) => button.text() === 'Buscar');
    await buscarButton!.trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Nenhum resultado encontrado para "sem-match"');
  });

  it('clears query and aggregated results', async () => {
    const MasterSearchPage = (await import('../MasterSearchPage.vue')).default;
    const wrapper = mount(MasterSearchPage);

    await flushPromises();
    const searchInput = wrapper.find('input[type="search"]');
    await searchInput.setValue('rex');
    const buscarButton = wrapper.findAll('button').find((button) => button.text() === 'Buscar');
    await buscarButton!.trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('3 resultado(s) para "rex"');
    const limparButton = wrapper.findAll('button').find((button) => button.text() === 'Limpar');
    expect(limparButton).toBeTruthy();
    await limparButton!.trigger('click');
    await flushPromises();

    expect((searchInput.element as HTMLInputElement).value).toBe('');
    expect(wrapper.text()).not.toContain('resultado(s) para "rex"');
    expect(wrapper.text()).not.toContain('Maria Souza');
    expect(wrapper.text()).not.toContain('Rex');
  });
});
