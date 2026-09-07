import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { reactive } from 'vue';

const mockRecord = {
  id: 'tri-1',
  accountId: 'acc-1',
  encounterId: 'enc-1',
  patientId: 'pat-1',
  priority: 'critical' as const,
  chiefComplaint: 'Dispneia',
  initialNotes: 'Paciente chegou prostrado',
  alerts: ['oxigenio'],
  destination: 'in_care' as const,
  triagedByUserId: 'user-1',
  createdAt: '2026-04-05T10:00:00Z',
  updatedAt: '2026-04-05T10:10:00Z'
};

const mockVersions = [
  {
    id: 'ver-1',
    triageId: 'tri-1',
    accountId: 'acc-1',
    encounterId: 'enc-1',
    changedFields: ['priority', 'destination'],
    previousSnapshot: null,
    nextSnapshot: null,
    changedByUserId: 'user-2',
    createdAt: '2026-04-05T10:20:00Z'
  }
];
const mockRecordSecond = {
  ...mockRecord,
  id: 'tri-2',
  encounterId: 'enc-2',
  patientId: 'pat-2',
  priority: 'medium' as const,
  chiefComplaint: 'Consulta felina',
  destination: 'observation' as const,
  triagedByUserId: 'user-2'
};

const mockListFn = vi.fn().mockResolvedValue([mockRecord]);
const mockHistoryFn = vi.fn().mockResolvedValue(mockVersions);
const mockUpdateFn = vi.fn().mockResolvedValue(mockRecord);
const mockGetPatientName = vi.fn().mockResolvedValue('Rex');
const mockGetUserName = vi.fn((id: string) =>
  Promise.resolve(id === 'user-1' ? 'Dra. Julia' : 'Dr. Marcos')
);
const mockPreloadUserNames = vi.fn().mockResolvedValue(undefined);
const mockRoute = reactive({ params: { id: 'tri-1' }, path: '/triage/tri-1' });
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

vi.mock('@/services/triage', () => ({
  listTriageRecords: (...args: unknown[]) => mockListFn(...args),
  getTriageHistory: (...args: unknown[]) => mockHistoryFn(...args),
  updateTriage: (...args: unknown[]) => mockUpdateFn(...args),
  createTriage: vi.fn()
}));

vi.mock('@/composables/useEntityCache', () => ({
  useEntityCache: () => ({
    getPatientName: mockGetPatientName,
    getUserName: mockGetUserName,
    preloadUserNames: mockPreloadUserNames,
    loading: new Set()
  })
}));

vi.mock('vue-router', () => ({
  useRoute: () => mockRoute
}));

describe('TriageDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListFn.mockResolvedValue([mockRecord]);
    mockHistoryFn.mockResolvedValue(mockVersions);
    mockUpdateFn.mockResolvedValue(mockRecord);
    mockGetPatientName.mockResolvedValue('Rex');
    mockGetUserName.mockImplementation((id: string) =>
      Promise.resolve(id === 'user-1' ? 'Dra. Julia' : 'Dr. Marcos')
    );
    mockRoute.params.id = 'tri-1';
    mockRoute.path = '/triage/tri-1';
  });

  it('renders resolved patient and triage user names', async () => {
    const TriageDetailPage = (await import('../TriageDetailPage.vue')).default;
    const wrapper = mount(TriageDetailPage, {
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
    expect(wrapper.text()).toContain('Rex');
    expect(wrapper.text()).toContain('Dra. Julia');
  });

  it('renders version author names instead of raw ids', async () => {
    const TriageDetailPage = (await import('../TriageDetailPage.vue')).default;
    const wrapper = mount(TriageDetailPage, {
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
    expect(mockPreloadUserNames).toHaveBeenCalledWith(['user-2']);
    expect(wrapper.text()).toContain('Dr. Marcos');
  });

  it('shows quick action to open the encounter', async () => {
    const TriageDetailPage = (await import('../TriageDetailPage.vue')).default;
    const wrapper = mount(TriageDetailPage, {
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
    const encounterLink = wrapper.findAll('a').find((node) => node.text().includes('Abrir atendimento'));
    expect(encounterLink).toBeTruthy();
    expect(encounterLink!.attributes('href')).toBe('/encounters/enc-1');
  });

  it('ignores a late previous triage response after the route changes', async () => {
    const first = deferred<typeof mockRecord[]>();
    const second = deferred<typeof mockRecordSecond[]>();
    let listCall = 0;
    mockListFn.mockImplementation(() => (listCall++ === 0 ? first.promise : second.promise));

    const TriageDetailPage = (await import('../TriageDetailPage.vue')).default;
    const wrapper = mount(TriageDetailPage);
    mockRoute.params.id = 'tri-2';
    mockRoute.path = '/triage/tri-2';
    await flushPromises();
    second.resolve([mockRecordSecond]);
    mockHistoryFn.mockResolvedValue([]);
    await flushPromises();
    first.resolve([mockRecord]);
    await flushPromises();

    expect(wrapper.text()).toContain('Consulta felina');
    expect(wrapper.text()).not.toContain('Dispneia');
    expect(wrapper.text()).not.toContain('tri-1');
  });

  it('keeps the record visible when version history fails', async () => {
    mockHistoryFn.mockRejectedValue(new Error('Histórico indisponível'));

    const TriageDetailPage = (await import('../TriageDetailPage.vue')).default;
    const wrapper = mount(TriageDetailPage);
    await flushPromises();

    expect(wrapper.text()).toContain('Dispneia');
    expect(wrapper.text()).toContain('histórico de versões está indisponível');
  });
});
