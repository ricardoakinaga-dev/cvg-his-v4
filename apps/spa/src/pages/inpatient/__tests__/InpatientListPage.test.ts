import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises, enableAutoUnmount } from '@vue/test-utils';

import { reactive } from 'vue';

enableAutoUnmount(afterEach);
const mockRoute = reactive({ query: { patientId: 'pat-1' } });

const mockStays = [
  {
    id: 'stay-1',
    accountId: 'acc-1',
    encounterId: 'enc-1',
    patientId: 'pat-1',
    unit: 'Clinica',
    ward: 'A',
    bed: '01',
    status: 'admitted' as const,
    admittedAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z'
  },
  {
    id: 'stay-2',
    accountId: 'acc-1',
    encounterId: 'enc-2',
    patientId: 'pat-2',
    unit: 'UTI',
    ward: 'B',
    bed: '03',
    status: 'stable' as const,
    admittedAt: '2024-01-14T08:00:00Z',
    updatedAt: '2024-01-15T12:00:00Z'
  }
];

const mockListFn = vi.fn().mockResolvedValue(mockStays);
const mockListBedsFn = vi.fn().mockResolvedValue([
  { id: 'bed-1', active: true, status: 'occupied' },
  { id: 'bed-2', active: true, status: 'occupied' },
  { id: 'bed-3', active: true, status: 'available' },
  { id: 'bed-4', active: true, status: 'available' }
]);
const mockGetPatientName = vi
  .fn()
  .mockImplementation((id: string) => Promise.resolve(id === 'pat-1' ? 'Rex' : 'Mimi'));

vi.mock('@/services/inpatient', () => ({
  inpatientService: {
    get list() {
      return mockListFn;
    },
    get listBeds() {
      return mockListBedsFn;
    }
  }
}));

vi.mock('vue-router', () => ({
  useRoute: () => mockRoute
}));

vi.mock('@/composables/useEntityCache', () => ({
  useEntityCache: () => ({
    getPatientName: mockGetPatientName,
    getUserName: vi.fn().mockResolvedValue(''),
    preloadUserNames: vi.fn().mockResolvedValue(undefined),
    loading: new Set()
  })
}));

describe('InpatientListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRoute.query.patientId = 'pat-1';
    mockListFn.mockResolvedValue(mockStays);
    mockListBedsFn.mockResolvedValue([
      { id: 'bed-1', active: true, status: 'occupied' },
      { id: 'bed-2', active: true, status: 'occupied' },
      { id: 'bed-3', active: true, status: 'available' },
      { id: 'bed-4', active: true, status: 'available' }
    ]);
    mockGetPatientName.mockImplementation((id: string) =>
      Promise.resolve(id === 'pat-1' ? 'Rex' : 'Mimi')
    );
  });

  it('renders the page title', async () => {
    const InpatientListPage = (await import('../InpatientListPage.vue')).default;
    const wrapper = mount(InpatientListPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Internação');
  });

  it('shows loading state initially', async () => {
    let resolvePromise: (value: any) => void;
    const slowPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    mockListFn.mockImplementation(() => slowPromise);

    const InpatientListPage = (await import('../InpatientListPage.vue')).default;
    const wrapper = mount(InpatientListPage);

    await wrapper.vm.$nextTick();
    expect(wrapper.find('.data-table-loading').exists()).toBe(true);

    resolvePromise!(mockStays);
    await flushPromises();
  });

  it('shows error state when API fails', async () => {
    mockListFn.mockRejectedValue(new Error('Failed to load stays'));

    const InpatientListPage = (await import('../InpatientListPage.vue')).default;
    const wrapper = mount(InpatientListPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Failed to load stays');
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1);
    expect(wrapper.text()).toContain('Tentar novamente');
  });

  it('shows empty state when no stays exist', async () => {
    mockListFn.mockResolvedValue([]);

    const InpatientListPage = (await import('../InpatientListPage.vue')).default;
    const wrapper = mount(InpatientListPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Nenhuma internação ativa');
  });

  it('renders stay data in the table', async () => {
    const InpatientListPage = (await import('../InpatientListPage.vue')).default;
    const wrapper = mount(InpatientListPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Rex');
    expect(wrapper.text()).toContain('Mimi');
    expect(wrapper.text()).toContain('Clinica');
    expect(wrapper.text()).toContain('UTI');
    expect(wrapper.text()).toContain('01');
    expect(wrapper.text()).toContain('03');
    expect(mockListFn).toHaveBeenCalledWith({ patientId: 'pat-1' });
  });

  it('shows status labels for each stay', async () => {
    const InpatientListPage = (await import('../InpatientListPage.vue')).default;
    const wrapper = mount(InpatientListPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Internado');
    expect(wrapper.text()).toContain('Estável');
  });

  it('calculates occupancy from active beds and shows one compact summary', async () => {
    const InpatientListPage = (await import('../InpatientListPage.vue')).default;
    const wrapper = mount(InpatientListPage);

    await flushPromises();
    expect(wrapper.text()).toContain('50%');
    expect(wrapper.text()).toContain('2 de 4 leitos em uso');
    expect(wrapper.findAll('.inpatient-list-page__overview')).toHaveLength(1);
    expect(wrapper.find('.inpatient-list-page__story').exists()).toBe(false);
  });

  it('shows navigation links to detail page', async () => {
    const InpatientListPage = (await import('../InpatientListPage.vue')).default;
    const wrapper = mount(InpatientListPage, {
      global: {
        stubs: {
          RouterLink: {
            template: '<a :href="to"><slot /></a>',
            props: ['to']
          }
        }
      }
    });

    await flushPromises();
    const links = wrapper.findAll('a');
    const detailLinks = links.filter((a) => a.text() === 'Ver');
    expect(detailLinks).toHaveLength(2);
    expect(detailLinks[0].attributes('href')).toBe('/inpatient/stay-1');
    expect(detailLinks[1].attributes('href')).toBe('/inpatient/stay-2');
    expect(detailLinks[0].attributes('aria-label')).toBe('Ver internação de Rex, leito 01');
    expect(detailLinks[1].attributes('aria-label')).toBe('Ver internação de Mimi, leito 03');
  });

  it('shows link to bed board page', async () => {
    const InpatientListPage = (await import('../InpatientListPage.vue')).default;
    const wrapper = mount(InpatientListPage, {
      global: {
        stubs: {
          RouterLink: {
            template: '<a :href="to"><slot /></a>',
            props: ['to']
          }
        }
      }
    });

    await flushPromises();
    const boardLink = wrapper.findAll('a').find((a) => a.text().includes('Mapa de Leitos'));
    expect(boardLink).toBeTruthy();
    expect(boardLink!.attributes('href')).toBe('/inpatient/board');
  });

  it('shows link to admit patient', async () => {
    const InpatientListPage = (await import('../InpatientListPage.vue')).default;
    const wrapper = mount(InpatientListPage, {
      global: {
        stubs: {
          RouterLink: {
            template: '<a :href="to"><slot /></a>',
            props: ['to']
          }
        }
      }
    });

    await flushPromises();
    const admitLink = wrapper.findAll('a').find((a) => a.text().includes('Admitir Paciente'));
    expect(admitLink).toBeTruthy();
    expect(admitLink!.attributes('href')).toBe('/inpatient/admit');
  });
  it('does not present zero occupancy while the backend is pending', async () => {
    mockListFn.mockReturnValue(new Promise(() => {}));
    const Page = (await import('../InpatientListPage.vue')).default;
    const wrapper = mount(Page);
    await flushPromises();
    expect(wrapper.find('.inpatient-list-page__overview').text()).not.toContain('0%');
    expect(wrapper.find('.inpatient-list-page__overview').text()).toContain('Carregando');
    wrapper.unmount();
  });

  it('renders stays while patient names are pending', async () => {
    mockGetPatientName.mockReturnValue(new Promise(() => {}));
    const Page = (await import('../InpatientListPage.vue')).default;
    const wrapper = mount(Page);
    await flushPromises();
    expect(wrapper.find('.data-table-loading').exists()).toBe(false);
    expect(wrapper.text()).toContain('Paciente pat-1');
    expect(wrapper.text()).toContain('50%');
    wrapper.unmount();
  });

  it('keeps stays visible when optional patient enrichment rejects', async () => {
    mockGetPatientName.mockRejectedValue(new Error('Name lookup unavailable'));
    const Page = (await import('../InpatientListPage.vue')).default;
    const wrapper = mount(Page);
    await flushPromises();
    expect(wrapper.text()).toContain('Paciente pat-1');
    expect(wrapper.text()).not.toContain('Name lookup unavailable');
    expect(wrapper.text()).toContain('50%');
    wrapper.unmount();
  });

  it('keeps confirmed rows and occupancy visible when refresh fails', async () => {
    const Page = (await import('../InpatientListPage.vue')).default;
    const wrapper = mount(Page);
    await flushPromises();
    expect(wrapper.text()).toContain('50%');
    mockListFn.mockRejectedValue(new Error('Stays unavailable'));
    await wrapper.findAll('button').find(button => button.text().includes('Atualizar'))!.trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('Stays unavailable');
    expect(wrapper.find('.inpatient-list-page__overview').text()).toContain('50%');
    expect(wrapper.text()).not.toContain('Nenhuma internação ativa');
    expect(wrapper.text()).toContain('Rex');
    expect(wrapper.text()).toContain('Os dados anteriores permanecem visíveis');
    wrapper.unmount();
  });

  it('keeps the current list visible while a refresh is pending', async () => {
    const Page = (await import('../InpatientListPage.vue')).default;
    const wrapper = mount(Page);
    await flushPromises();

    let resolveRefresh!: (value: typeof mockStays) => void;
    mockListFn.mockReturnValueOnce(new Promise((resolve) => { resolveRefresh = resolve; }));
    await wrapper.findAll('button').find(button => button.text().includes('Atualizar'))!.trigger('click');
    await wrapper.vm.$nextTick();

    expect(wrapper.find('.data-table-loading').exists()).toBe(false);
    expect(wrapper.text()).toContain('Atualizando a lista sem remover o contexto confirmado');
    expect(wrapper.text()).toContain('Rex');
    expect(wrapper.text()).toContain('50%');

    resolveRefresh(mockStays);
    await flushPromises();
    wrapper.unmount();
  });

  it('clears the confirmed list when access is revoked', async () => {
    const Page = (await import('../InpatientListPage.vue')).default;
    const wrapper = mount(Page);
    await flushPromises();
    mockListFn.mockRejectedValueOnce({ status: 403 });
    await wrapper.findAll('button').find(button => button.text().includes('Atualizar'))!.trigger('click');
    await flushPromises();

    expect(wrapper.text()).not.toContain('Rex');
    expect(wrapper.find('.inpatient-list-page__overview').text()).toContain('—');
    expect(wrapper.text()).toContain('Tente novamente');
    wrapper.unmount();
  });

  it('ignores older patient names after a refresh', async () => {
    let resolveOldName!: (name: string) => void;
    mockGetPatientName.mockImplementation(() => new Promise<string>(resolve => {
      resolveOldName = resolve;
    }));
    mockListFn.mockResolvedValue([mockStays[0]]);
    const Page = (await import('../InpatientListPage.vue')).default;
    const wrapper = mount(Page);
    await flushPromises();
    mockGetPatientName.mockResolvedValue('Nome atual');
    await wrapper.findAll('button').find(button => button.text().includes('Atualizar'))!.trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('Nome atual');
    resolveOldName('Nome antigo');
    await flushPromises();
    expect(wrapper.text()).toContain('Nome atual');
    expect(wrapper.text()).not.toContain('Nome antigo');
  });

  it('ignores an older failed request after the patient filter changes', async () => {
    let rejectOldRequest!: (error: Error) => void;
    mockListFn.mockReturnValueOnce(new Promise((_, reject) => {
      rejectOldRequest = reject;
    }));
    const Page = (await import('../InpatientListPage.vue')).default;
    const wrapper = mount(Page);
    await flushPromises();
    mockListFn.mockResolvedValue([mockStays[1]]);
    mockRoute.query.patientId = 'pat-2';
    await flushPromises();
    expect(mockListFn).toHaveBeenLastCalledWith({ patientId: 'pat-2' });
    expect(wrapper.text()).toContain('Mimi');
    rejectOldRequest(new Error('Old request failed'));
    await flushPromises();
    expect(wrapper.text()).toContain('Mimi');
    expect(wrapper.text()).not.toContain('Old request failed');
    expect(wrapper.find('.data-table-loading').exists()).toBe(false);
  });

  it('recovers from an API error using refresh', async () => {
    mockListFn.mockRejectedValueOnce(new Error('Temporarily unavailable'));
    const Page = (await import('../InpatientListPage.vue')).default;
    const wrapper = mount(Page);
    await flushPromises();
    expect(wrapper.text()).toContain('Temporarily unavailable');
    await wrapper.findAll('button').find(button => button.text().includes('Atualizar'))!.trigger('click');
    await flushPromises();
    expect(wrapper.text()).not.toContain('Temporarily unavailable');
    expect(wrapper.text()).toContain('Rex');
    expect(wrapper.text()).toContain('50%');
  });

  it('keeps global bed occupancy independent of the patient filter', async () => {
    mockListFn.mockResolvedValue([mockStays[0]]);
    const Page = (await import('../InpatientListPage.vue')).default;
    const wrapper = mount(Page);
    await flushPromises();
    expect(wrapper.text()).toContain('2 de 4 leitos em uso');
    expect(wrapper.text()).toContain('50%');
    expect(wrapper.text()).toContain('Rex');
    expect(wrapper.text()).not.toContain('Mimi');
  });

  it('does not report a percentage when there are no active beds', async () => {
    mockListBedsFn.mockResolvedValue([{ id: 'inactive', active: false, status: 'occupied' }]);
    const Page = (await import('../InpatientListPage.vue')).default;
    const wrapper = mount(Page);
    await flushPromises();
    expect(wrapper.find('.inpatient-list-page__overview').text()).not.toContain('%');
    expect(wrapper.text()).toContain('Nenhum leito ativo');
  });

});
