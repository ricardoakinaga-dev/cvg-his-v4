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

const mockGetPatient = vi
  .fn()
  .mockImplementation((id: string) =>
    Promise.resolve({ id, name: id === 'pat-1' ? 'Rex' : 'Mimi' })
  );
vi.mock('@/services/patient', () => ({
  patientService: { getById: (...args: unknown[]) => mockGetPatient(...args) }
}));

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
    mockGetPatient
      .mockReset()
      .mockImplementation((id: string) =>
        Promise.resolve({ id, name: id === 'pat-1' ? 'Rex' : 'Mimi' })
      );
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
    await clickFilter(wrapper);
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

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

async function mountPage() {
  const Page = (await import('../InpatientDailyChargesPage.vue')).default;
  return mount(Page, {
    global: { stubs: { RouterLink: { template: '<a :href="to"><slot /></a>', props: ['to'] } } }
  });
}

async function clickFilter(wrapper: Awaited<ReturnType<typeof mountPage>>) {
  const button = wrapper.findAll('button').find((item) => item.text() === 'Filtrar');
  expect(button, 'Filter action remains available during overlapping requests').toBeDefined();
  const form = wrapper.find('form');
  if (form.exists()) await form.trigger('submit');
  else await button!.trigger('click');
}

const pendingOnly = {
  totalPendingAmount: 360,
  totalBilledAmount: 0,
  items: [mockWorklist.items[0]!]
};
const billedOnly = {
  totalPendingAmount: 0,
  totalBilledAmount: 180,
  items: [mockWorklist.items[1]!]
};

describe('daily charge result truth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPatient
      .mockReset()
      .mockImplementation((id: string) =>
        Promise.resolve({ id, name: id === 'pat-1' ? 'Rex' : 'Mimi' })
      );
    mockListWorklist.mockReset().mockResolvedValue(pendingOnly);
    mockGetPatientName.mockImplementation((id: string) =>
      Promise.resolve(id === 'pat-1' ? 'Rex' : 'Mimi')
    );
  });

  it('keeps billed B rows and totals when the initial pending A resolves late', async () => {
    const first = deferred<typeof pendingOnly>();
    mockListWorklist.mockReturnValueOnce(first.promise).mockResolvedValueOnce(billedOnly);
    const wrapper = await mountPage();
    await wrapper.find('select').setValue('billed');
    await clickFilter(wrapper);
    await flushPromises();
    expect(wrapper.text()).toContain('Diária Internação');
    first.resolve(pendingOnly);
    await flushPromises();
    expect(wrapper.text()).toContain('Diária Internação');
    expect(wrapper.text()).not.toContain('Diária UTI');
    expect(wrapper.find('select').element.value).toBe('billed');
    expect(wrapper.text()).not.toMatch(/R\$\s*360,00/);
    wrapper.unmount();
  });

  it('does not present zero balances or a successful empty result after initial failure', async () => {
    mockListWorklist.mockRejectedValueOnce(new Error('Falha na fila'));
    const wrapper = await mountPage();
    await flushPromises();
    expect(wrapper.text()).toContain('Falha na fila');
    expect(wrapper.text()).not.toMatch(/R\$\s*0,00/);
    expect(wrapper.text()).not.toContain('Nenhuma diária encontrada');
    wrapper.unmount();
  });

  it('does not present numeric balances while the initial result is unknown', async () => {
    const request = deferred<typeof pendingOnly>();
    mockListWorklist.mockReturnValueOnce(request.promise);
    const wrapper = await mountPage();
    expect(wrapper.text()).not.toMatch(/R\$\s*0,00/);
    wrapper.unmount();
    request.resolve(pendingOnly);
    await flushPromises();
  });

  it('ignores stale errors after the newer billed result succeeds', async () => {
    const first = deferred<typeof pendingOnly>();
    mockListWorklist.mockReturnValueOnce(first.promise).mockResolvedValueOnce(billedOnly);
    const wrapper = await mountPage();
    await wrapper.find('select').setValue('billed');
    await clickFilter(wrapper);
    await flushPromises();
    first.reject(new Error('Obsolete pending failure'));
    await flushPromises();
    expect(wrapper.text()).not.toContain('Obsolete pending failure');
    expect(wrapper.text()).toContain('Diária Internação');
    wrapper.unmount();
  });
});

describe('daily charge identity and request lifecycle', () => {
  beforeEach(() => {
    mockListWorklist.mockReset().mockResolvedValue(pendingOnly);
    mockGetPatient
      .mockReset()
      .mockImplementation((id: string) => Promise.resolve({ id, name: 'Rex' }));
  });

  it('uses exact patient IDs and retains the full ID when identity lookup fails', async () => {
    const patientId = 'patient-12345678-aaaa-bbbb-cccc-full-identifier';
    mockListWorklist.mockResolvedValueOnce({
      ...pendingOnly,
      items: [{ ...pendingOnly.items[0]!, patientId }]
    });
    mockGetPatient.mockRejectedValueOnce(new Error('Patient unavailable'));
    const wrapper = await mountPage();
    await flushPromises();
    expect(mockGetPatient).toHaveBeenCalledWith(patientId);
    expect(wrapper.text()).toContain(patientId);
    expect(wrapper.text()).toContain('Diária UTI');
    expect(wrapper.text()).toMatch(/identifica/i);
    const retry = wrapper
      .findAll('button')
      .find((button) => /Recarregar identificação/i.test(button.text()));
    expect(retry).toBeDefined();
    mockGetPatient.mockResolvedValueOnce({ id: patientId, name: 'Nome confirmado' });
    await retry!.trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('Nome confirmado');
    expect(mockListWorklist).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it('does not accept a lookup result belonging to a different patient', async () => {
    mockGetPatient.mockResolvedValueOnce({ id: 'different-patient', name: 'Wrong identity' });
    const wrapper = await mountPage();
    await flushPromises();
    expect(wrapper.text()).not.toContain('Wrong identity');
    expect(wrapper.text()).toContain('pat-1');
    wrapper.unmount();
  });

  it('does not begin patient lookups after the page has unmounted', async () => {
    const request = deferred<typeof pendingOnly>();
    mockListWorklist.mockReturnValueOnce(request.promise);
    const wrapper = await mountPage();
    wrapper.unmount();
    request.resolve(pendingOnly);
    await flushPromises();
    expect(mockGetPatient).not.toHaveBeenCalled();
  });

  it('does not hydrate patients from a stale worklist response', async () => {
    const request = deferred<typeof pendingOnly>();
    mockListWorklist.mockReturnValueOnce(request.promise).mockResolvedValueOnce(billedOnly);
    const wrapper = await mountPage();
    await wrapper.find('select').setValue('billed');
    await clickFilter(wrapper);
    await flushPromises();
    request.resolve(pendingOnly);
    await flushPromises();
    expect(mockGetPatient).toHaveBeenCalledWith('pat-2');
    expect(mockGetPatient).not.toHaveBeenCalledWith('pat-1');
    wrapper.unmount();
  });

  it('preserves the failed request context when retrying with unsent draft edits', async () => {
    const wrapper = await mountPage();
    await flushPromises();
    await wrapper.find('select').setValue('billed');
    await wrapper.findAll('input')[0]!.setValue('  UTI  ');
    mockListWorklist.mockRejectedValueOnce(new Error('Filtro indisponível'));
    await clickFilter(wrapper);
    await flushPromises();
    expect(wrapper.text()).toContain('Filtro indisponível');
    expect(wrapper.text()).not.toContain('Diária UTI');
    await wrapper.find('select').setValue('pending');
    await wrapper.findAll('input')[0]!.setValue('Draft unidade');
    const retry = wrapper
      .findAll('button')
      .find((button) => /Tentar novamente/i.test(button.text()));
    expect(retry).toBeDefined();
    mockListWorklist.mockResolvedValueOnce(billedOnly);
    await retry!.trigger('click');
    await flushPromises();
    expect(mockListWorklist).toHaveBeenLastCalledWith({
      status: 'billed',
      unit: 'UTI',
      ward: undefined
    });
    expect(wrapper.text()).not.toContain('Filtro indisponível');
    expect(wrapper.text()).toContain('Diária Internação');
    wrapper.unmount();
  });
});

describe('bounded identity hydration', () => {
  it('limits concurrent exact lookups, deduplicates IDs, and finishes the remaining names', async () => {
    const ids = Array.from({ length: 7 }, (_, index) => `patient-${index}`);
    mockListWorklist.mockReset().mockResolvedValue({
      ...pendingOnly,
      items: [...ids, ids[0]!].map((patientId, index) => ({
        ...pendingOnly.items[0]!,
        id: `charge-${index}`,
        patientId
      }))
    });
    const requests = ids.map(() => deferred<{ id: string; name: string }>());
    mockGetPatient
      .mockReset()
      .mockImplementation((id: string) => requests[ids.indexOf(id)]!.promise);
    const wrapper = await mountPage();
    await flushPromises();
    expect(mockGetPatient.mock.calls.length).toBeGreaterThan(0);
    expect(mockGetPatient.mock.calls.length).toBeLessThanOrEqual(4);
    for (let index = 0; index < ids.length; index += 1) {
      requests[index]!.resolve({ id: ids[index]!, name: `Confirmed ${index}` });
      await flushPromises();
    }
    expect(mockGetPatient).toHaveBeenCalledTimes(7);
    for (let index = 0; index < ids.length; index += 1)
      expect(wrapper.text()).toContain(`Confirmed ${index}`);
    wrapper.unmount();
  });

  it('ignores an old name resolution for the same patient after a newer worklist hydration', async () => {
    const oldIdentity = deferred<{ id: string; name: string }>();
    mockListWorklist.mockReset().mockResolvedValue(pendingOnly);
    mockGetPatient
      .mockReset()
      .mockReturnValueOnce(oldIdentity.promise)
      .mockResolvedValue({ id: 'pat-1', name: 'Current name' });
    const wrapper = await mountPage();
    await flushPromises();
    await clickFilter(wrapper);
    await flushPromises();
    expect(wrapper.text()).toContain('Current name');
    oldIdentity.resolve({ id: 'pat-1', name: 'Obsolete name' });
    await flushPromises();
    expect(wrapper.text()).toContain('Current name');
    expect(wrapper.text()).not.toContain('Obsolete name');
    wrapper.unmount();
  });
});

describe('worklist filter contract', () => {
  beforeEach(() => {
    mockListWorklist.mockReset().mockResolvedValue(pendingOnly);
    mockGetPatient
      .mockReset()
      .mockImplementation((id: string) => Promise.resolve({ id, name: 'Rex' }));
  });

  it('separates a successful empty result from unknown or failed totals', async () => {
    mockListWorklist.mockResolvedValueOnce({
      items: [],
      totalPendingAmount: 0,
      totalBilledAmount: 0
    });
    const wrapper = await mountPage();
    await flushPromises();
    expect(wrapper.text()).toMatch(/Nenhuma diária/);
    expect(wrapper.text()).toMatch(/R\$\s*0,00/);
    expect(mockGetPatient).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('submits all statuses as undefined and trims empty location fields', async () => {
    const wrapper = await mountPage();
    await flushPromises();
    await wrapper.find('select').setValue('');
    await wrapper.findAll('input')[0]!.setValue('   ');
    await wrapper.findAll('input')[1]!.setValue('  Ala B  ');
    await clickFilter(wrapper);
    await flushPromises();
    expect(mockListWorklist).toHaveBeenLastCalledWith({
      status: undefined,
      unit: undefined,
      ward: 'Ala B'
    });
    wrapper.unmount();
  });

  it('keeps server supplied amounts rather than recomputing them from visible rows', async () => {
    mockListWorklist.mockResolvedValueOnce({
      ...pendingOnly,
      totalPendingAmount: 987.65,
      totalBilledAmount: 123.45
    });
    const wrapper = await mountPage();
    await flushPromises();
    expect(wrapper.text()).toMatch(/R\$\s*987,65/);
    expect(wrapper.text()).toMatch(/R\$\s*123,45/);
    expect(wrapper.text()).toMatch(/R\$\s*360,00/);
    wrapper.unmount();
  });
});

describe('visible applied scope and loading ownership', () => {
  beforeEach(() => {
    mockListWorklist.mockReset().mockResolvedValue(pendingOnly);
    mockGetPatient
      .mockReset()
      .mockImplementation((id: string) => Promise.resolve({ id, name: 'Rex' }));
  });

  it('keeps applied scope on draft edits and refresh, then applies the submitted form snapshot', async () => {
    const wrapper = await mountPage();
    await flushPromises();
    const context = () => wrapper.find('.query-context').text();
    expect(context()).toContain('Filtros aplicados');
    expect(context()).toContain('Pendentes');
    await wrapper.find('select').setValue('billed');
    await wrapper.findAll('input')[0]!.setValue('Internação');
    expect(context()).toContain('Pendentes');
    expect(context()).not.toContain('Faturadas');
    expect(context()).toContain('ainda não aplicadas');
    expect(mockListWorklist).toHaveBeenCalledTimes(1);
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Atualizar')!
      .trigger('click');
    await flushPromises();
    expect(mockListWorklist).toHaveBeenLastCalledWith({
      status: 'pending',
      unit: undefined,
      ward: undefined
    });
    expect(context()).toContain('Pendentes');
    mockListWorklist.mockResolvedValueOnce(billedOnly);
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(mockListWorklist).toHaveBeenLastCalledWith({
      status: 'billed',
      unit: 'Internação',
      ward: undefined
    });
    expect(context()).toContain('Filtros aplicados');
    expect(context()).toContain('Faturadas');
    expect(context()).toContain('Internação');
    expect(context()).not.toContain('ainda não aplicadas');
    wrapper.unmount();
  });

  it('keeps the newer request loading when the obsolete request finishes first', async () => {
    const first = deferred<typeof pendingOnly>();
    const second = deferred<typeof billedOnly>();
    mockListWorklist.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const wrapper = await mountPage();
    await wrapper.find('select').setValue('billed');
    await clickFilter(wrapper);
    first.resolve(pendingOnly);
    await flushPromises();
    expect(wrapper.find('[aria-busy="true"]').exists()).toBe(true);
    expect(wrapper.find('.query-context').text()).toContain('Consulta solicitada');
    expect(wrapper.find('.query-context').text()).toContain('Faturadas');
    expect(wrapper.text()).not.toContain('Diária UTI');
    expect(wrapper.text()).not.toMatch(/R\$/);
    second.resolve(billedOnly);
    await flushPromises();
    expect(wrapper.find('[aria-busy="true"]').exists()).toBe(false);
    expect(wrapper.text()).toContain('Diária Internação');
    wrapper.unmount();
  });
});


describe('refreshing resolved patient identity', () => {
  it('refreshes a previously resolved name along with the requested worklist', async () => {
    mockListWorklist.mockReset().mockResolvedValue(pendingOnly);
    mockGetPatient.mockReset().mockResolvedValueOnce({ id: 'pat-1', name: 'Nome anterior' }).mockResolvedValue({ id: 'pat-1', name: 'Nome atualizado' });
    const wrapper = await mountPage();
    await flushPromises();
    expect(wrapper.text()).toContain('Nome anterior');
    await wrapper.findAll('button').find(button => button.text() === 'Atualizar')!.trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('Nome atualizado');
    expect(wrapper.text()).not.toContain('Nome anterior');
    wrapper.unmount();
  });
});
