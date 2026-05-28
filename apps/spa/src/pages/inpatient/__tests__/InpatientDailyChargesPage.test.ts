import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

const mockWorklist = {
  totalPendingAmount: 360,
  totalBilledAmount: 180,
  items: [
    {
      id: 'charge-1',
      accountId: 'acc-1',
      stayId: 'stay-1',
      encounterId: 'enc-1',
      patientId: 'pat-1',
      description: 'Diária UTI',
      chargeDate: '2026-05-28',
      quantity: 2,
      unitAmount: 180,
      totalAmount: 360,
      status: 'pending' as const,
      createdByUserId: 'user-1',
      createdAt: '2026-05-28T10:00:00Z',
      updatedAt: '2026-05-28T10:00:00Z',
      unit: 'UTI',
      ward: 'Ala A',
      bed: 'B12',
      stayStatus: 'admitted' as const
    },
    {
      id: 'charge-2',
      accountId: 'acc-1',
      stayId: 'stay-2',
      encounterId: 'enc-2',
      patientId: 'pat-2',
      description: 'Diária Internação',
      chargeDate: '2026-05-27',
      quantity: 1,
      unitAmount: 180,
      totalAmount: 180,
      status: 'billed' as const,
      billingRecordId: 'bill-1',
      createdByUserId: 'user-1',
      createdAt: '2026-05-27T10:00:00Z',
      updatedAt: '2026-05-27T10:00:00Z',
      unit: 'Internação',
      ward: 'Ala B',
      bed: 'B03',
      stayStatus: 'stable' as const
    }
  ]
};

const mockListWorklist = vi.fn().mockResolvedValue(mockWorklist);
const mockGetPatientName = vi
  .fn()
  .mockImplementation((id: string) => Promise.resolve(id === 'pat-1' ? 'Rex' : 'Mimi'));

vi.mock('@/services/inpatient', () => ({
  inpatientService: {
    get listDailyChargeWorklist() {
      return mockListWorklist;
    }
  }
}));

vi.mock('@/composables/useEntityCache', () => ({
  useEntityCache: () => ({
    getPatientName: mockGetPatientName
  })
}));

describe('InpatientDailyChargesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListWorklist.mockResolvedValue(mockWorklist);
    mockGetPatientName.mockImplementation((id: string) =>
      Promise.resolve(id === 'pat-1' ? 'Rex' : 'Mimi')
    );
  });

  it('renders daily charge worklist totals and rows', async () => {
    const InpatientDailyChargesPage = (await import('../InpatientDailyChargesPage.vue')).default;
    const wrapper = mount(InpatientDailyChargesPage, {
      global: {
        stubs: {
          RouterLink: { template: '<a :href="to"><slot /></a>', props: ['to'] }
        }
      }
    });

    await flushPromises();

    expect(wrapper.text()).toContain('Diárias de Internação');
    expect(wrapper.text()).toContain('Rex');
    expect(wrapper.text()).toContain('Diária UTI');
    expect(wrapper.text()).toContain('Ala A');
    expect(wrapper.text()).toContain('Pendente');
    expect(wrapper.find('a[href="/inpatient/stay-1"]').exists()).toBe(true);
    expect(wrapper.find('a[href="/billing/enc-2"]').exists()).toBe(true);
  });

  it('filters worklist by current form values', async () => {
    const InpatientDailyChargesPage = (await import('../InpatientDailyChargesPage.vue')).default;
    const wrapper = mount(InpatientDailyChargesPage);

    await flushPromises();
    await wrapper.find('select').setValue('billed');
    const inputs = wrapper.findAll('input');
    await inputs[0]!.setValue('Internação');
    await inputs[1]!.setValue('Ala B');
    const filterButton = wrapper.findAll('button').find((button) => button.text() === 'Filtrar');
    await filterButton!.trigger('click');
    await flushPromises();

    expect(mockListWorklist).toHaveBeenLastCalledWith({
      status: 'billed',
      unit: 'Internação',
      ward: 'Ala B'
    });
  });

  it('shows error state when worklist fails', async () => {
    mockListWorklist.mockRejectedValueOnce(new Error('Falha na fila'));
    const InpatientDailyChargesPage = (await import('../InpatientDailyChargesPage.vue')).default;
    const wrapper = mount(InpatientDailyChargesPage);

    await flushPromises();

    expect(wrapper.text()).toContain('Falha na fila');
  });
});
