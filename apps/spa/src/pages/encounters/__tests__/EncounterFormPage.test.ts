import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { reactive } from 'vue';
import { mount, flushPromises, enableAutoUnmount } from '@vue/test-utils';
import type { PatientSummary } from '@/types/patient';
import type { OwnerSummary } from '@/types/owner';
const patients = [
  { id: 'pat-1', name: 'Rex', species: 'canine', breed: 'Golden Retriever', sex: 'male', primaryOwnerId: 'owner-1', status: 'active' },
  { id: 'pat-2', name: 'Mimi', species: 'feline', sex: 'female', primaryOwnerId: 'owner-2', status: 'active' }
] as PatientSummary[];
const owners = [{ id: 'owner-1', fullName: 'Helena Ribeiro', contacts: [] }, { id: 'owner-2', fullName: 'Marcos Almeida', contacts: [] }] as unknown as OwnerSummary[];
const list = vi.fn(), getPatient = vi.fn(), getOwner = vi.fn(), getAppointment = vi.fn(), create = vi.fn(), push = vi.fn();
let route: { query: Record<string, string>; path: string };
vi.mock('@/services/patient', () => ({ patientService: { listPage: (...args: unknown[]) => list(...args), getById: (...args: unknown[]) => getPatient(...args) } }));
vi.mock('@/services/owner', () => ({ ownerService: { getById: (...args: unknown[]) => getOwner(...args) } }));
vi.mock('@/services/appointment', () => ({ appointmentService: { getById: (...args: unknown[]) => getAppointment(...args) } }));
vi.mock('@/services/encounter', () => ({ encounterService: { create: (...args: unknown[]) => create(...args) } }));
vi.mock('vue-router', () => ({ useRouter: () => ({ push }), useRoute: () => route }));
enableAutoUnmount(afterEach);
afterEach(() => vi.useRealTimers());
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; }
async function render() { const Page = (await import('../EncounterFormPage.vue')).default; const wrapper = mount(Page, { global: { stubs: { RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } } } }); await flushPromises(); return wrapper; }
async function select(wrapper: Awaited<ReturnType<typeof render>>, id = 'pat-1') { await wrapper.find('#patientId').setValue(id); await flushPromises(); }
async function fill(wrapper: Awaited<ReturnType<typeof render>>) { await select(wrapper); await wrapper.find('#reason').setValue('  Consulta de rotina  '); }
function button(wrapper: Awaited<ReturnType<typeof render>>, name: string) { return wrapper.findAll('button').find(b => b.text() === name)!; }
describe('EncounterFormPage', () => {
  beforeEach(() => {
    vi.resetAllMocks(); route = reactive({ query: {}, path: '/encounters/new' });
    list.mockResolvedValue({ items: patients });
    getPatient.mockImplementation((id: string) => { const p = patients.find(p => p.id === id); return p ? Promise.resolve(p) : Promise.reject(new Error('Not found')); });
    getOwner.mockImplementation((id: string) => { const o = owners.find(o => o.id === id); return o ? Promise.resolve(o) : Promise.reject(new Error('Not found')); });
    getAppointment.mockResolvedValue({ id: 'appt-1', patientId: 'pat-1', ownerId: 'owner-1' });
    create.mockResolvedValue({ id: 'enc-new' }); push.mockResolvedValue(undefined);
  });
  it('renders the page title and labeled form fields', async () => {
    const w = await render(); expect(w.text()).toContain('Abrir Atendimento');
    for (const id of ['patientId', 'visitType', 'origin', 'reason']) { expect(w.find('#' + id).exists()).toBe(true); expect(w.find(`label[for="${id}"]`).exists()).toBe(true); }
  });
  it('loads the patient list on mount with explicit paging', async () => {
    await render(); expect(list).toHaveBeenCalledWith({ search: undefined, ownerId: undefined, page: 1, pageSize: 12 });
  });
  it('shows and retries a failed patient list without hiding the failure as empty', async () => {
    list.mockRejectedValueOnce(new Error('Offline')); const w = await render();
    expect(w.text()).toContain('Erro ao carregar lista de pacientes'); expect(w.text()).not.toContain('Nenhum paciente encontrado');
    await button(w, 'Recarregar pacientes').trigger('click'); await flushPromises(); expect(w.findAll('#patientId option')).toHaveLength(3);
  });
  it('shows truthful empty results', async () => { list.mockResolvedValue({ items: [] }); const w = await render(); expect(w.text()).toContain('Nenhum paciente encontrado'); expect(w.find('button[type=submit]').attributes('disabled')).toBeDefined(); });
  it('shows validation error when patient is not selected', async () => { const w = await render(); await w.find('form').trigger('submit'); expect(w.text()).toContain('Selecione um paciente'); expect(create).not.toHaveBeenCalled(); });
  it('shows validation error when reason is empty', async () => { const w = await render(); await select(w); await w.find('form').trigger('submit'); expect(w.text()).toContain('Motivo é obrigatório'); expect(create).not.toHaveBeenCalled(); });
  it('submits the exact clinical payload with trimmed reason', async () => {
    const w = await render(); await fill(w); await w.find('form').trigger('submit'); await flushPromises();
    expect(create).toHaveBeenCalledWith({ patientId: 'pat-1', ownerId: 'owner-1', visitType: 'walk_in', origin: 'reception', reason: 'Consulta de rotina' }); expect(w.text()).toContain('Atendimento aberto com sucesso');
  });
  it('preserves appointmentId from verified query context when creating an encounter', async () => {
    route.query = { appointmentId: 'appt-1', patientId: 'pat-1', ownerId: 'owner-1' }; const w = await render();
    expect(getAppointment).toHaveBeenCalledWith('appt-1'); expect(w.find('#patientId').element.matches(':disabled')).toBe(true);
    await w.find('#reason').setValue('Consulta agendada'); await w.find('form').trigger('submit'); await flushPromises();
    expect(create).toHaveBeenCalledWith({ patientId: 'pat-1', ownerId: 'owner-1', appointmentId: 'appt-1', visitType: 'scheduled', origin: 'schedule', reason: 'Consulta agendada' });
  });
  it('allows canonical prefixed patient and owner identifiers', async () => {
    const p = { ...patients[0], id: 'patient_mogeb6qv_5b0gq64z', primaryOwnerId: 'owner_ricardo_akinaga', name: 'DANI' };
    list.mockResolvedValue({ items: [p] }); getOwner.mockResolvedValue({ ...owners[0], id: p.primaryOwnerId }); route.query = { patientId: p.id, ownerId: p.primaryOwnerId };
    const w = await render(); await w.find('#reason').setValue('Consulta'); await w.find('form').trigger('submit'); await flushPromises();
    expect(create).toHaveBeenCalledWith({ patientId: p.id, ownerId: p.primaryOwnerId, visitType: 'walk_in', origin: 'reception', reason: 'Consulta' });
  });
  it('retains the draft and permits retry after create failure', async () => {
    create.mockRejectedValueOnce(new Error('Paciente ja em atendimento')); const w = await render(); await fill(w); await w.find('form').trigger('submit'); await flushPromises();
    expect(w.text()).toContain('Paciente ja em atendimento'); expect((w.find('#reason').element as HTMLTextAreaElement).value).toBe('  Consulta de rotina  ');
    await w.find('form').trigger('submit'); await flushPromises(); expect(create).toHaveBeenCalledTimes(2);
  });
  it('navigates once to the created detail and rejects duplicate completed submissions', async () => {
    vi.useFakeTimers(); const w = await render(); await fill(w); await w.find('form').trigger('submit'); await flushPromises(); await w.find('form').trigger('submit');
    expect(create).toHaveBeenCalledTimes(1); expect(w.find('#reason').element.matches(':disabled')).toBe(true);
    await vi.advanceTimersByTimeAsync(1000); expect(push).toHaveBeenCalledExactlyOnceWith('/encounters/enc-new');
  });
  it('shows cancel link back to encounters list', async () => { const w = await render(); expect(w.findAll('a').find(a => a.text() === 'Cancelar')?.attributes('href')).toBe('/encounters'); });
  it('preserves every visit type and origin option', async () => {
    const w = await render(); expect(w.findAll('#visitType option').map(o => o.attributes('value'))).toEqual(['walk_in', 'scheduled', 'return']); expect(w.findAll('#origin option').map(o => o.attributes('value'))).toEqual(['reception', 'schedule', 'return']);
  });
  it('locks all fields and rejects duplicate pending submissions', async () => {
    const write = deferred<{ id: string }>(); create.mockReturnValue(write.promise); const w = await render(); await fill(w); await w.find('form').trigger('submit');
    for (const id of ['patientId', 'patientSearch', 'visitType', 'origin', 'reason']) expect(w.find('#' + id).element.matches(':disabled')).toBe(true);
    expect(w.find('button[type=submit]').text()).toContain('Abrindo'); await w.find('form').trigger('submit'); expect(create).toHaveBeenCalledTimes(1); write.resolve({ id: 'enc-new' }); await flushPromises();
  });
  it('never shows a previous patient tutor after a slower identity response', async () => {
    const first = deferred<OwnerSummary>(); getOwner.mockImplementation((id: string) => id === 'owner-1' ? first.promise : Promise.resolve(owners[1]));
    const w = await render(); await select(w); await select(w, 'pat-2'); first.resolve(owners[0]); await flushPromises();
    expect(w.text()).toContain('Marcos Almeida'); expect(w.text()).not.toContain('Helena Ribeiro'); await w.find('#reason').setValue('Consulta'); await w.find('form').trigger('submit'); expect(create).toHaveBeenCalledWith(expect.objectContaining({ patientId: 'pat-2', ownerId: 'owner-2' }));
  });
  it('shows prefetched patient identity immediately and resolves it outside the current list page', async () => {
    list.mockResolvedValue({ items: [patients[1]], page: 1, totalPages: 2 }); route.query = { patientId: 'pat-1' }; const w = await render();
    expect(getPatient).toHaveBeenCalledWith('pat-1'); expect((w.find('#patientId').element as HTMLSelectElement).selectedOptions[0].text).toContain('Rex'); expect(w.find('.patient-identity').text()).toContain('Helena Ribeiro');
  });
  it('blocks unknown explicit patient context until deliberate recovery', async () => {
    route.query = { patientId: 'missing' }; const w = await render(); expect(w.text()).toContain('Não foi possível confirmar o contexto'); expect(w.find('.patient-identity').exists()).toBe(false);
    await button(w, 'Escolher outro paciente').trigger('click'); await flushPromises(); await fill(w); await w.find('form').trigger('submit'); expect(create).toHaveBeenCalledTimes(1);
  });
  it('blocks conflicting explicit owner without substituting another identity', async () => { route.query = { patientId: 'pat-1', ownerId: 'owner-2' }; const w = await render(); expect(w.text()).toContain('O paciente não corresponde ao tutor informado'); expect(w.find('button[type=submit]').attributes('disabled')).toBeDefined(); });
  it('filters an owner-only query without claiming a selected patient', async () => { route.query = { ownerId: 'owner-2' }; const w = await render(); expect(list).toHaveBeenCalledWith(expect.objectContaining({ ownerId: 'owner-2' })); expect(w.find('.patient-identity').exists()).toBe(false); });
  it('blocks failed and conflicting appointment context', async () => {
    route.query = { appointmentId: 'appt-1', patientId: 'pat-2' }; const w = await render(); expect(w.text()).toContain('O agendamento não corresponde'); expect(w.find('button[type=submit]').attributes('disabled')).toBeDefined();
  });
  it('resolves a patient from an appointment-only query', async () => { route.query = { appointmentId: 'appt-1' }; const w = await render(); expect(w.find('.patient-identity').text()).toContain('Rex'); expect((w.find('#patientId').element as HTMLSelectElement).value).toBe('pat-1'); });
  it('explicitly unlinks appointment before selecting a different patient', async () => {
    route.query = { appointmentId: 'appt-1' }; const w = await render(); await button(w, 'Desvincular agendamento').trigger('click'); await select(w, 'pat-2'); await w.find('#reason').setValue('Outro paciente'); await w.find('form').trigger('submit');
    expect(create).toHaveBeenCalledWith({ patientId: 'pat-2', ownerId: 'owner-2', visitType: 'scheduled', origin: 'schedule', reason: 'Outro paciente' });
  });
  it('does not treat failed tutor lookup as a confirmed identity and supports retry', async () => {
    getOwner.mockRejectedValueOnce(new Error('Offline')); const w = await render(); await select(w); expect(w.text()).toContain('Não foi possível confirmar o tutor owner-1'); await w.find('#reason').setValue('Consulta'); await w.find('form').trigger('submit'); expect(create).not.toHaveBeenCalled();
    await button(w, 'Recarregar tutor').trigger('click'); await flushPromises(); await w.find('form').trigger('submit'); expect(create).toHaveBeenCalledTimes(1);
  });
  it('rejects a mismatched tutor response', async () => { getOwner.mockResolvedValue(owners[1]); const w = await render(); await select(w); expect(w.text()).toContain('Não foi possível confirmar o tutor owner-1'); expect(w.find('button[type=submit]').attributes('disabled')).toBeDefined(); });
  it('changes server pages and preserves selected patient identity outside results', async () => {
    list.mockResolvedValueOnce({ items: [patients[0]], page: 1, totalPages: 2 }).mockResolvedValueOnce({ items: [patients[1]], page: 2, totalPages: 2 });
    const w = await render(); await select(w); await button(w, 'Próxima').trigger('click'); await flushPromises(); expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })); expect(w.find('.patient-identity').text()).toContain('Rex'); expect(w.find('#patientId option[value="pat-1"]').exists()).toBe(true);
  });
  it('paginates legacy unpaginated results locally', async () => {
    list.mockResolvedValue({ items: Array.from({ length: 13 }, (_, i) => ({ ...patients[0], id: `pat-${i}` })) }); const w = await render(); expect(w.findAll('#patientId option')).toHaveLength(13); await button(w, 'Próxima').trigger('click'); expect(list).toHaveBeenCalledTimes(1); expect(w.findAll('#patientId option')).toHaveLength(2);
  });
  it('applies explicit search while keeping the selected identity', async () => {
    const w = await render(); await select(w); await w.find('#patientSearch').setValue('Mimi'); expect(list).toHaveBeenCalledTimes(1); await button(w, 'Buscar pacientes').trigger('click'); await flushPromises(); expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'Mimi', page: 1 })); expect(w.find('.patient-identity').text()).toContain('Rex');
  });
  it('ignores a stale explicit patient response after same-route query change', async () => {
    const first = deferred<PatientSummary>(); list.mockResolvedValue({ items: [] }); getPatient.mockImplementation((id: string) => id === 'pat-1' ? first.promise : Promise.resolve(patients[1])); route.query = { patientId: 'pat-1' }; const w = await render(); route.query = { patientId: 'pat-2' }; await flushPromises(); first.resolve(patients[0]); await flushPromises(); expect(w.find('.patient-identity').text()).toContain('Mimi'); expect(w.find('.patient-identity').text()).not.toContain('Rex');
  });
  it('keeps a new context locked until an earlier write settles and suppresses old navigation', async () => {
    vi.useFakeTimers(); const write = deferred<{ id: string }>(); create.mockReturnValue(write.promise); const w = await render(); await fill(w); await w.find('form').trigger('submit'); route.query = { patientId: 'pat-2' }; await flushPromises(); expect(w.find('.patient-identity').text()).toContain('Mimi'); expect(w.find('#reason').element.matches(':disabled')).toBe(true); write.resolve({ id: 'old-encounter' }); await flushPromises(); await vi.runAllTimersAsync(); expect(push).not.toHaveBeenCalled(); expect(w.find('#reason').element.matches(':disabled')).toBe(false);
  });
  it('cancels scheduled navigation on unmount', async () => { vi.useFakeTimers(); const w = await render(); await fill(w); await w.find('form').trigger('submit'); await flushPromises(); w.unmount(); await vi.runAllTimersAsync(); expect(push).not.toHaveBeenCalled(); });
  it('cancels scheduled navigation when query context changes after success', async () => { vi.useFakeTimers(); const w = await render(); await fill(w); await w.find('form').trigger('submit'); await flushPromises(); route.query = { patientId: 'pat-2' }; await flushPromises(); await vi.runAllTimersAsync(); expect(push).not.toHaveBeenCalled(); });
  it('reports an earlier successful write with its patient and destination after query changes', async () => {
    const write = deferred<{ id: string }>(); create.mockReturnValue(write.promise); const w = await render(); await fill(w); await w.find('form').trigger('submit'); route.query = { patientId: 'pat-2' }; await flushPromises(); write.resolve({ id: 'enc-rex' }); await flushPromises();
    expect(w.text()).toContain('Atendimento de Rex aberto'); expect(w.find('a[href="/encounters/enc-rex"]').exists()).toBe(true); expect(w.find('.patient-identity').text()).toContain('Mimi'); expect(push).not.toHaveBeenCalled();
  });
  it('reports an earlier failed write against its original patient after query changes', async () => {
    let reject!: (error: Error) => void; create.mockReturnValue(new Promise((_resolve, fail) => { reject = fail; })); const w = await render(); await fill(w); await w.find('form').trigger('submit'); route.query = { patientId: 'pat-2' }; await flushPromises(); reject(new Error('Serviço indisponível')); await flushPromises();
    expect(w.text()).toContain('Não foi possível abrir o atendimento de Rex'); expect(w.find('.patient-identity').text()).toContain('Mimi'); expect(push).not.toHaveBeenCalled();
  });

  it('shows the owner-only search scope and allows explicit search across all tutors', async () => {
    route.query = { ownerId: 'owner-2' }; const w = await render(); expect(w.find('.patient-scope').text()).toContain('owner-2'); await button(w, 'Buscar todos os pacientes').trigger('click'); await flushPromises(); expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ ownerId: undefined, page: 1 }));
  });
  it('clears appointment owner search restriction when the appointment is unlinked', async () => {
    route.query = { appointmentId: 'appt-1', ownerId: 'owner-1' }; list.mockResolvedValueOnce({ items: [patients[0]] }).mockResolvedValueOnce({ items: patients }); const w = await render(); await button(w, 'Desvincular agendamento').trigger('click'); await flushPromises(); expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ ownerId: undefined, page: 1 })); expect(w.find('#patientId option[value="pat-2"]').exists()).toBe(true);
  });

});
