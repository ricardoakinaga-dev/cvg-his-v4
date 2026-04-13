import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

const mockPatient = {
  id: 'pat-1',
  accountId: 'acc-1',
  name: 'Rex',
  species: 'canine' as const,
  breed: 'Golden Retriever',
  sex: 'male' as const,
  size: 'large' as const,
  baseWeightKg: 30.5,
  birthDateApproximate: '2020-05-15',
  primaryOwnerId: 'owner-1',
  status: 'active' as const,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-02T00:00:00Z'
};

const mockEncounters = [
  {
    id: 'enc-1',
    accountId: 'acc-1',
    patientId: 'pat-1',
    ownerId: 'owner-1',
    visitType: 'scheduled' as const,
    origin: 'schedule' as const,
    reason: 'Revisão',
    status: 'in_care' as const,
    openedAt: '2024-01-03T09:00:00Z',
    createdAt: '2024-01-03T09:00:00Z',
    updatedAt: '2024-01-03T09:00:00Z'
  }
];

const mockGetPatientById = vi.fn().mockResolvedValue(mockPatient);
const mockEncounterList = vi.fn().mockResolvedValue(mockEncounters);
const mockGetOwnerName = vi.fn().mockResolvedValue('João Silva');

vi.mock('@/services/patient', () => ({
  patientService: {
    getById: (...args: unknown[]) => mockGetPatientById(...args)
  }
}));

vi.mock('@/services/encounter', () => ({
  encounterService: {
    list: () => mockEncounterList()
  }
}));

vi.mock('@/composables/useEntityCache', () => ({
  useEntityCache: () => ({
    getOwnerName: (...args: unknown[]) => mockGetOwnerName(...args)
  })
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({
    params: { id: 'pat-1' }
  })
}));

describe('PatientDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPatientById.mockResolvedValue(mockPatient);
    mockEncounterList.mockResolvedValue(mockEncounters);
    mockGetOwnerName.mockResolvedValue('João Silva');
  });

  it('renders patient context and journey actions', async () => {
    const PatientDetailPage = (await import('../PatientDetailPage.vue')).default;
    const wrapper = mount(PatientDetailPage, {
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
    expect(wrapper.text()).toContain('Atendimento > Cadastrados');
    expect(wrapper.text()).toContain('Novo Atendimento');
    expect(wrapper.text()).toContain('Internação');
    expect(wrapper.text()).toContain('João Silva');
    const newEncounterLink = wrapper.findAll('a').find((link) => link.text().includes('Novo Atendimento'));
    expect(newEncounterLink?.attributes('href')).toBe('/encounters/new?patientId=pat-1&ownerId=owner-1');
  });

  it('shows error state when loading fails', async () => {
    mockGetPatientById.mockRejectedValue(new Error('Falha ao carregar paciente'));

    const PatientDetailPage = (await import('../PatientDetailPage.vue')).default;
    const wrapper = mount(PatientDetailPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Falha ao carregar paciente');
  });
});
