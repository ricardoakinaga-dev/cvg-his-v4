import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

const mockRecords = [
  {
    record: {
      encounterId: 'enc-1',
      patientId: 'pat-1',
      status: 'open' as const,
      updatedAt: '2024-01-03T10:00:00Z'
    },
    entryCount: 3
  },
  {
    record: {
      encounterId: 'enc-2',
      patientId: 'pat-2',
      status: 'closed' as const,
      updatedAt: '2024-01-04T10:00:00Z'
    },
    entryCount: 1
  }
];

const mockListAll = vi.fn().mockResolvedValue(mockRecords);
const mockGetPatientName = vi.fn()
  .mockResolvedValueOnce('Rex')
  .mockResolvedValueOnce('Mimi');

vi.mock('@/services/medicalRecords', () => ({
  medicalRecordsService: {
    listAll: () => mockListAll()
  }
}));

vi.mock('@/composables/useEntityCache', () => ({
  useEntityCache: () => ({
    getPatientName: (...args: unknown[]) => mockGetPatientName(...args)
  })
}));

describe('MedicalRecordsListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListAll.mockResolvedValue(mockRecords);
    mockGetPatientName
      .mockResolvedValueOnce('Rex')
      .mockResolvedValueOnce('Mimi');
  });

  it('renders the medical records operational summary', async () => {
    const MedicalRecordsListPage = (await import('../MedicalRecordsListPage.vue')).default;
    const wrapper = mount(MedicalRecordsListPage, {
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

    expect(wrapper.text()).toContain('Atendimento > Prontuário');
    expect(wrapper.text()).toContain('Prontuários carregados');
    expect(wrapper.text()).toContain('Taxa aberta');
    expect(wrapper.text()).toContain('Rex');
    expect(wrapper.text()).toContain('Ver prontuário');
  });

  it('shows empty state when no records exist', async () => {
    mockListAll.mockResolvedValue([]);

    const MedicalRecordsListPage = (await import('../MedicalRecordsListPage.vue')).default;
    const wrapper = mount(MedicalRecordsListPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Nenhum prontuário encontrado');
    expect(wrapper.text()).toContain('Abrir Atendimento');
  });
});
