import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

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

const mockListFn = vi.fn().mockResolvedValue([mockRecord]);
const mockHistoryFn = vi.fn().mockResolvedValue(mockVersions);
const mockUpdateFn = vi.fn().mockResolvedValue(mockRecord);
const mockGetPatientName = vi.fn().mockResolvedValue('Rex');
const mockGetUserName = vi.fn((id: string) =>
  Promise.resolve(id === 'user-1' ? 'Dra. Julia' : 'Dr. Marcos')
);
const mockPreloadUserNames = vi.fn().mockResolvedValue(undefined);

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
  useRoute: () => ({
    params: { id: 'tri-1' },
    path: '/triage/tri-1'
  })
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
});
