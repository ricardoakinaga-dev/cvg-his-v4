import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

const mockOwner = {
  id: 'owner-1',
  accountId: 'acc-1',
  fullName: 'João Silva',
  documentId: '',
  contacts: [{ label: 'WhatsApp', type: 'whatsapp' as const, value: '(11) 99999-1111', primary: true }],
  financialResponsible: true,
  administrativeNotes: 'Cobrar autorização prévia',
  status: 'active' as const,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-02T00:00:00Z'
};

const mockPatients = [
  {
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
  }
];

const mockGetOwnerById = vi.fn().mockResolvedValue(mockOwner);
const mockPatientList = vi.fn().mockResolvedValue(mockPatients);

vi.mock('@/services/owner', () => ({
  ownerService: {
    getById: (...args: unknown[]) => mockGetOwnerById(...args)
  }
}));

vi.mock('@/services/patient', () => ({
  patientService: {
    list: () => mockPatientList()
  }
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({
    params: { id: 'owner-1' }
  })
}));

describe('OwnerDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetOwnerById.mockResolvedValue(mockOwner);
    mockPatientList.mockResolvedValue(mockPatients);
  });

  it('renders owner context and linked patient actions', async () => {
    const OwnerDetailPage = (await import('../OwnerDetailPage.vue')).default;
    const wrapper = mount(OwnerDetailPage, {
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

    expect(wrapper.text()).toContain('João Silva');
    expect(wrapper.text()).toContain('Atendimento > Cadastrados');
    expect(wrapper.text()).toContain('Novo Paciente');
    expect(wrapper.text()).toContain('Pacientes vinculados');
    expect(wrapper.text()).toContain('Documento ausente');
    expect(wrapper.text()).toContain('Rex');
  });

  it('shows error state when loading fails', async () => {
    mockGetOwnerById.mockRejectedValue(new Error('Falha ao carregar tutor'));

    const OwnerDetailPage = (await import('../OwnerDetailPage.vue')).default;
    const wrapper = mount(OwnerDetailPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Falha ao carregar tutor');
  });
});
