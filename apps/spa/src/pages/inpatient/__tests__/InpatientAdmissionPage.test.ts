import { reactive } from 'vue';
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import InpatientAdmissionPage from '../InpatientAdmissionPage.vue';

const { push, admit, listEncounters, getEncounter, listSectors, listBeds, getPatient, getOwner } = vi.hoisted(() => ({
  push: vi.fn(), admit: vi.fn(), listEncounters: vi.fn(), getEncounter: vi.fn(),
  listSectors: vi.fn(), listBeds: vi.fn(), getPatient: vi.fn(), getOwner: vi.fn()
}));
const route = reactive({ query: { encounterId: 'enc-1' } as Record<string, string> });
vi.mock('vue-router', () => ({ useRoute: () => route, useRouter: () => ({ push }) }));
vi.mock('@/services/encounter', () => ({ encounterService: { list: listEncounters, getById: getEncounter } }));
vi.mock('@/services/patient', () => ({ patientService: { getById: getPatient } }));
vi.mock('@/services/owner', () => ({ ownerService: { getById: getOwner } }));
vi.mock('@/services/inpatient', () => ({ inpatientService: { listSectors, listBeds, admit } }));
enableAutoUnmount(afterEach);
const encounter = { id: 'enc-1', patientId: 'pat-1', ownerId: 'owner-1', status: 'in_care', reason: 'Observacao' };
const sector = { id: 'sector-1', name: 'UTI', code: 'UTI', active: true };
const bed = { id: 'bed-1', sectorId: 'sector-1', name: 'Leito 1', code: 'UTI-01', status: 'available', active: true };
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}
function render() {
  return mount(InpatientAdmissionPage, { global: { stubs: { AppPageHeader: true } } });
}
async function selectBed(wrapper: ReturnType<typeof render>, id = 'bed-1') {
  const select = wrapper.find('[data-testid="bed-select"]');
  if (select.exists()) await select.setValue(id);
  else await wrapper.get(`[data-testid="bed-option-${id}"]`).trigger('click');
}
async function ready() {
  const wrapper = render();
  await flushPromises();
  await wrapper.get('[data-testid="sector-select"]').setValue('sector-1');
  await flushPromises();
  await selectBed(wrapper);
  return wrapper;
}
function selectableBed(wrapper: ReturnType<typeof render>, id: string) {
  const option = wrapper.find(`[data-testid="bed-select"] option[value="${id}"]`);
  const button = wrapper.find(`[data-testid="bed-option-${id}"]`);
  return option.exists() || (button.exists() && !button.element.matches(':disabled'));
}

describe('InpatientAdmissionPage', () => {
  beforeEach(() => {
    route.query = { encounterId: 'enc-1' };
    listEncounters.mockReset().mockResolvedValue([encounter]);
    getEncounter.mockReset().mockResolvedValue(encounter);
    listSectors.mockReset().mockResolvedValue([sector]);
    listBeds.mockReset().mockResolvedValue([bed]);
    getPatient.mockReset().mockResolvedValue({ id: 'pat-1', name: 'Amora de Oliveira', ownerId: 'owner-1', species: 'canine' });
    getOwner.mockReset().mockResolvedValue({ id: 'owner-1', fullName: 'Helena de Oliveira' });
    push.mockReset();
    admit.mockReset().mockResolvedValue({ id: 'stay-1' });
  });

  it('admits an encounter into an available bed and opens the stay', async () => {
    const wrapper = mount(InpatientAdmissionPage, {
      global: { stubs: { AppPageHeader: true } }
    });
    await flushPromises();

    await wrapper.get('[data-testid="sector-select"]').setValue('sector-1');
    await flushPromises();
    await selectBed(wrapper);
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(admit).toHaveBeenCalledWith({
      encounterId: 'enc-1',
      patientId: 'pat-1',
      unit: 'Internacao',
      ward: 'UTI',
      bed: 'UTI-01',
      sectorId: 'sector-1',
      bedId: 'bed-1'
    });
    expect(push).toHaveBeenCalledWith('/inpatient/stay-1');
  });


  it('keeps sector B beds when the older sector A request resolves last', async () => {
    const old = deferred<typeof bed[]>();
    listSectors.mockResolvedValue([sector, { ...sector, id: 'sector-2' }]);
    listBeds.mockImplementation(({ sectorId }: { sectorId: string }) => sectorId === 'sector-1'
      ? old.promise : Promise.resolve([{ ...bed, id: 'bed-2', sectorId: 'sector-2', code: 'B02' }]));
    const wrapper = render();
    await flushPromises();
    await wrapper.get('[data-testid="sector-select"]').setValue('sector-1');
    await wrapper.get('[data-testid="sector-select"]').setValue('sector-2');
    await flushPromises();
    expect(selectableBed(wrapper, 'bed-2')).toBe(true);
    old.resolve([bed]);
    await flushPromises();
    expect(selectableBed(wrapper, 'bed-2')).toBe(true);
    expect(selectableBed(wrapper, 'bed-1')).toBe(false);
  });

  it('does not offer a bed returned with membership in a different sector', async () => {
    listBeds.mockResolvedValue([{ ...bed, sectorId: 'sector-other' }]);
    const wrapper = render();
    await flushPromises();
    await wrapper.get('[data-testid="sector-select"]').setValue('sector-1');
    await flushPromises();
    expect(selectableBed(wrapper, 'bed-1')).toBe(false);
    await wrapper.get('form').trigger('submit');
    expect(admit).not.toHaveBeenCalled();
  });

  it('locks context fields while admission is pending', async () => {
    const pending = deferred<{ id: string }>();
    admit.mockReturnValue(pending.promise);
    const wrapper = await ready();
    await wrapper.get('form').trigger('submit');
    expect(wrapper.get('#admission-encounter').element.matches(':disabled')).toBe(true);
    expect(wrapper.get('[data-testid="sector-select"]').element.matches(':disabled')).toBe(true);
    pending.resolve({ id: 'stay-1' });
    await flushPromises();
  });

  it('rejects duplicate submit handler calls while pending and after success', async () => {
    const pending = deferred<{ id: string }>();
    admit.mockReturnValue(pending.promise);
    const wrapper = await ready();
    await wrapper.get('form').trigger('submit');
    await wrapper.get('form').trigger('submit');
    expect(admit).toHaveBeenCalledTimes(1);
    pending.resolve({ id: 'stay-1' });
    await flushPromises();
    await wrapper.get('form').trigger('submit');
    expect(admit).toHaveBeenCalledTimes(1);
  });

  it('rejects a closed explicit encounter even through a direct submit handler', async () => {
    listEncounters.mockResolvedValue([{ ...encounter, status: 'closed' }]);
    getEncounter.mockResolvedValue({ ...encounter, status: 'closed' });
    const wrapper = render();
    await flushPromises();
    await wrapper.get('[data-testid="sector-select"]').setValue('sector-1');
    await flushPromises();
    if (selectableBed(wrapper, 'bed-1')) await selectBed(wrapper);
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(admit).not.toHaveBeenCalled();
  });

  it('shows current bed load failure with a working retry', async () => {
    listBeds.mockRejectedValueOnce(new Error('Falha ao buscar leitos')).mockResolvedValue([bed]);
    const wrapper = render();
    await flushPromises();
    await wrapper.get('[data-testid="sector-select"]').setValue('sector-1');
    await flushPromises();
    expect(wrapper.text()).toContain('Não foi possível carregar os leitos deste setor');
    const retry = wrapper.findAll('button').find(button => /tentar novamente|recarregar leitos/i.test(button.text()));
    expect(retry).toBeDefined();
    await retry!.trigger('click');
    await flushPromises();
    expect(selectableBed(wrapper, 'bed-1')).toBe(true);
    expect(listBeds).toHaveBeenCalledTimes(2);
  });


  it('resolves full patient and encounter tutor identity by exact IDs', async () => {
    getPatient.mockResolvedValue({ id: 'pat-1', name: 'Amora de Oliveira', primaryOwnerId: 'different-current-owner', species: 'canine' });
    const wrapper = await ready();
    expect(getPatient).toHaveBeenCalledWith('pat-1');
    expect(getOwner).toHaveBeenCalledWith('owner-1');
    expect(wrapper.text()).toContain('Amora de Oliveira');
    expect(wrapper.text()).toContain('Helena de Oliveira');
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(admit).toHaveBeenCalledTimes(1);
  });

  it('fetches an explicit encounter omitted from the list and preserves it for admission', async () => {
    listEncounters.mockResolvedValue([]);
    const wrapper = await ready();
    expect(getEncounter).toHaveBeenCalledWith('enc-1');
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(admit).toHaveBeenCalledWith(expect.objectContaining({ encounterId: 'enc-1', patientId: 'pat-1' }));
  });

  it('never uses mismatched patient identity to authorize admission', async () => {
    getPatient.mockResolvedValue({ id: 'other-patient', name: 'Wrong animal', primaryOwnerId: 'owner-1' });
    const wrapper = render();
    await flushPromises();
    await wrapper.get('[data-testid="sector-select"]').setValue('sector-1');
    await flushPromises();
    if (selectableBed(wrapper, 'bed-1')) await selectBed(wrapper);
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(admit).not.toHaveBeenCalled();
    expect(wrapper.text()).not.toContain('Wrong animal');
  });

  it('retains selected context and allows retry after admission failure', async () => {
    admit.mockRejectedValueOnce(new Error('Admissao temporariamente indisponivel')).mockResolvedValue({ id: 'stay-1' });
    const wrapper = await ready();
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(wrapper.text()).toContain('Admissao temporariamente indisponivel');
    expect((wrapper.get('[data-testid="sector-select"]').element as HTMLSelectElement).value).toBe('sector-1');
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(admit).toHaveBeenCalledTimes(2);
    expect(push).toHaveBeenCalledWith('/inpatient/stay-1');
  });

  it('does not navigate from an admission resolving after unmount', async () => {
    const pending = deferred<{ id: string }>();
    admit.mockReturnValue(pending.promise);
    const wrapper = await ready();
    await wrapper.get('form').trigger('submit');
    wrapper.unmount();
    pending.resolve({ id: 'stay-1' });
    await flushPromises();
    expect(push).not.toHaveBeenCalled();
  });

  it('does not navigate from a prior route admission resolving after query context changes', async () => {
    const pending = deferred<{ id: string }>();
    admit.mockReturnValue(pending.promise);
    const wrapper = await ready();
    await wrapper.get('form').trigger('submit');
    route.query = { encounterId: 'enc-2' };
    await flushPromises();
    pending.resolve({ id: 'stay-old' });
    await flushPromises();
    expect(push).not.toHaveBeenCalled();
  });

  it('ignores a stale bed request failure after the newer sector has loaded', async () => {
    const old = deferred<typeof bed[]>();
    listSectors.mockResolvedValue([sector, { ...sector, id: 'sector-2' }]);
    listBeds.mockImplementation(({ sectorId }: { sectorId: string }) => sectorId === 'sector-1'
      ? old.promise : Promise.resolve([{ ...bed, id: 'bed-2', sectorId: 'sector-2' }]));
    const wrapper = render();
    await flushPromises();
    await wrapper.get('[data-testid="sector-select"]').setValue('sector-1');
    await wrapper.get('[data-testid="sector-select"]').setValue('sector-2');
    await flushPromises();
    old.reject(new Error('Old sector failed'));
    await flushPromises();
    expect(wrapper.text()).not.toContain('Old sector failed');
    expect(selectableBed(wrapper, 'bed-2')).toBe(true);
  });

  it('offers only active available beds and displays other occupancy states truthfully', async () => {
    listBeds.mockResolvedValue([bed,
      { ...bed, id: 'occupied', status: 'occupied', name: 'Leito ocupado' },
      { ...bed, id: 'maintenance', status: 'maintenance', name: 'Leito manutencao' },
      { ...bed, id: 'blocked', status: 'blocked', name: 'Leito bloqueado' },
      { ...bed, id: 'inactive', active: false, name: 'Leito inativo' }
    ]);
    const wrapper = await ready();
    for (const id of ['occupied', 'maintenance', 'blocked', 'inactive']) {
      expect(selectableBed(wrapper, id)).toBe(false);
    }
    expect(wrapper.text()).toContain('Leito ocupado');
    expect(wrapper.text()).toContain('Leito manutencao');
    expect(wrapper.text()).toContain('Leito bloqueado');
  });


  it('ignores old patient identity when a newer encounter is selected', async () => {
    const old = deferred<{ id: string; name: string }>();
    listEncounters.mockResolvedValue([encounter, { ...encounter, id: 'enc-2', patientId: 'pat-2' }]);
    getPatient.mockImplementation((id: string) => id === 'pat-1'
      ? old.promise : Promise.resolve({ id: 'pat-2', name: 'Bento Confirmado' }));
    const wrapper = render();
    await flushPromises();
    await wrapper.get('#admission-encounter').setValue('enc-2');
    await flushPromises();
    expect(wrapper.text()).toContain('Bento Confirmado');
    old.resolve({ id: 'pat-1', name: 'Amora Obsoleta' });
    await flushPromises();
    expect(wrapper.text()).toContain('Bento Confirmado');
    expect(wrapper.text()).not.toContain('Amora Obsoleta');
  });

  it('keeps a closed list encounter authoritative instead of replacing it with an open exact response', async () => {
    listEncounters.mockResolvedValue([{ ...encounter, status: 'closed' }]);
    getEncounter.mockResolvedValue(encounter);
    const wrapper = render();
    await flushPromises();
    expect(wrapper.find('#admission-encounter option[value="enc-1"]').exists()).toBe(false);
    await wrapper.get('form').trigger('submit');
    expect(admit).not.toHaveBeenCalled();
  });


  it('keeps a successful admission latched with its stay link if navigation fails', async () => {
    push.mockRejectedValueOnce(new Error('Navigation unavailable'));
    const wrapper = await ready();
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(wrapper.text()).toContain('Admissão de Amora de Oliveira confirmada.');
    expect(wrapper.find('a[href="/inpatient/stay-1"]').exists()).toBe(true);
    await wrapper.get('form').trigger('submit');
    expect(admit).toHaveBeenCalledTimes(1);
  });

  it('refreshes beds after a failed admission and clears a bed that became occupied', async () => {
    admit.mockRejectedValueOnce(new Error('Leito ocupado'));
    const wrapper = await ready();
    listBeds.mockResolvedValue([{ ...bed, status: 'occupied' }]);
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(listBeds).toHaveBeenCalledTimes(2);
    expect(wrapper.get('[data-testid="bed-option-bed-1"]').attributes('aria-pressed')).toBe('false');
    expect(selectableBed(wrapper, 'bed-1')).toBe(false);
    await wrapper.get('form').trigger('submit');
    expect(admit).toHaveBeenCalledTimes(1);
  });

  it('retries identity reads after failure before enabling the sector', async () => {
    getOwner.mockRejectedValueOnce(new Error('Tutor temporarily unavailable'));
    const wrapper = render();
    await flushPromises();
    expect(wrapper.get('#admission-sector').element.matches(':disabled')).toBe(true);
    expect(wrapper.text()).toContain('Não foi possível confirmar o paciente e o tutor');
    await wrapper.findAll('button').find(button => button.text() === 'Recarregar identificação')!.trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('Helena de Oliveira');
    expect(wrapper.get('#admission-sector').element.matches(':disabled')).toBe(false);
  });

  it('starts without an inferred encounter when the route has no explicit ID', async () => {
    route.query = {};
    const wrapper = render();
    await flushPromises();
    expect((wrapper.get('#admission-encounter').element as HTMLSelectElement).value).toBe('');
    expect(getEncounter).not.toHaveBeenCalled();
    expect(getPatient).not.toHaveBeenCalled();
    expect(wrapper.get('#admission-sector').element.matches(':disabled')).toBe(true);
    await wrapper.get('#admission-encounter').setValue('enc-1');
    await flushPromises();
    expect(wrapper.text()).toContain('Amora de Oliveira');
  });

  it('reports a late route admission against the previous patient without navigating away', async () => {
    const pending = deferred<{ id: string }>();
    admit.mockReturnValue(pending.promise);
    listEncounters.mockResolvedValue([encounter, { ...encounter, id: 'enc-2', patientId: 'pat-2' }]);
    const wrapper = await ready();
    getPatient.mockResolvedValue({ id: 'pat-2', name: 'Bento Atual' });
    await wrapper.get('form').trigger('submit');
    route.query = { encounterId: 'enc-2' };
    await flushPromises();
    pending.resolve({ id: 'stay-old' });
    await flushPromises();
    expect(wrapper.text()).toContain('Bento Atual');
    expect(wrapper.text()).toContain('Admissão de Amora de Oliveira confirmada.');
    expect(push).not.toHaveBeenCalled();
    expect(wrapper.find('a[href="/inpatient/stay-old"]').exists()).toBe(true);
  });
});
