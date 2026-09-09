import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { reactive } from 'vue';
import InpatientDetailPage from '../InpatientDetailPage.vue';
const service = vi.hoisted(() => ({ list: vi.fn(), listProgress: vi.fn(), listOccurrences: vi.fn(), listDailyCharges: vi.fn(), updateStatus: vi.fn(), addProgress: vi.fn(), addOccurrence: vi.fn(), createDailyCharge: vi.fn(), markDailyChargeBilled: vi.fn() }));
const cache = vi.hoisted(() => ({ getPatientName: vi.fn(), getUserName: vi.fn(), preloadUserNames: vi.fn() }));
const route = reactive({ params: { id: 'stay-first' } });
vi.mock('@/services/inpatient', () => ({ inpatientService: service }));
vi.mock('@/composables/useEntityCache', () => ({ useEntityCache: () => cache }));
vi.mock('vue-router', () => ({ useRoute: () => route, useRouter: () => ({ push: vi.fn() }) }));
const first = { id: 'stay-first', accountId: 'fixture', patientId: 'patient-first', encounterId: 'encounter-first', ownerId: 'owner-first', admittedByUserId: 'user-first', unit: 'Clínica', ward: 'Internação', bed: 'A01', status: 'admitted', admittedAt: '2026-09-06T10:00:00Z', updatedAt: '2026-09-06T10:00:00Z' };
const second = { ...first, id: 'stay-second', patientId: 'patient-second', encounterId: 'encounter-second', bed: 'B02' };
const charge = { id: 'charge-first', accountId: 'fixture', stayId: first.id, encounterId: first.encounterId, patientId: first.patientId, description: 'Diária UTI', quantity: 1, unitAmount: 180, totalAmount: 180, status: 'pending', chargeDate: '2026-09-06', createdAt: first.admittedAt, updatedAt: first.updatedAt, createdByUserId: 'user-first' };
let wrapper: VueWrapper | undefined;
function deferred<T>() { let resolve!: (value: T) => void; let reject!: (reason: Error) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
async function render() { wrapper = mount(InpatientDetailPage, { global: { stubs: { RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } } } }); await flushPromises(); return wrapper; }
function action(name: RegExp) { const button = wrapper!.findAll('button').find(b => name.test(b.text())); expect(button, String(name)).toBeDefined(); return button!; }
beforeEach(() => { vi.resetAllMocks(); route.params.id = first.id; service.list.mockResolvedValue([first, second]); service.listProgress.mockResolvedValue([]); service.listOccurrences.mockResolvedValue([]); service.listDailyCharges.mockResolvedValue([]); cache.getPatientName.mockImplementation(async id => id === first.patientId ? 'Rex' : 'Luna'); cache.getUserName.mockResolvedValue('Veterinário'); cache.preloadUserNames.mockResolvedValue(undefined); service.updateStatus.mockImplementation(async (id, payload) => ({ ...(id === first.id ? first : second), ...payload })); });
afterEach(() => { wrapper?.unmount(); wrapper = undefined; });
describe('Inpatient detail exact context and truthful collections', () => {
  it('includes discharged stays in the exact detail lookup', async () => { await render(); expect(service.list).toHaveBeenCalledWith({ includeDischarged: true }); });
  it('clears old chart immediately on route change and targets the newly loaded stay', async () => {
    await render(); const pending = deferred<typeof first[]>(); service.list.mockReturnValueOnce(pending.promise); route.params.id = second.id; await flushPromises();
    expect(wrapper!.text()).not.toContain('Rex'); expect(wrapper!.findAll('button').some(b => /^Marcar Estável$/.test(b.text()))).toBe(false);
    pending.resolve([first, second]); await flushPromises(); expect(wrapper!.text()).toContain('Luna'); await action(/^Marcar Estável$/).trigger('click'); await flushPromises(); expect(service.updateStatus).toHaveBeenCalledWith(second.id, { status: 'stable' });
  });
  it('does not retain old chart actions when the next stay is unavailable', async () => {
    await render(); service.list.mockResolvedValueOnce([first]); route.params.id = second.id; await flushPromises(); expect(wrapper!.text()).toContain('Internação não encontrada'); expect(wrapper!.text()).not.toContain('Rex'); expect(wrapper!.findAll('button').some(b => /^Dar Alta$/.test(b.text()))).toBe(false);
  });
  it('closes and clears a discharge draft before switching to another stay', async () => {
    await render();
    await action(/^Dar Alta$/).trigger('click');
    await wrapper!.find('#dischargeReason').setValue('Alta clínica da primeira internação');

    route.params.id = second.id;
    await flushPromises();

    expect(wrapper!.text()).toContain('Luna');
    expect(wrapper!.text()).toContain('B02');
    expect(wrapper!.find('#dischargeReason').exists()).toBe(false);
    expect(wrapper!.text()).not.toContain('Alta clínica da primeira internação');
    expect(service.updateStatus).not.toHaveBeenCalled();
  });
  it('renders collection errors instead of successful empty clinical and financial records', async () => {
    service.listProgress.mockRejectedValueOnce(new Error('Evoluções indisponíveis')); service.listOccurrences.mockRejectedValueOnce(new Error('Ocorrências indisponíveis')); service.listDailyCharges.mockRejectedValueOnce(new Error('Diárias indisponíveis')); await render();
    expect(wrapper!.text()).toContain('Evoluções indisponíveis'); expect(wrapper!.text()).toContain('Ocorrências indisponíveis'); expect(wrapper!.text()).toContain('Diárias indisponíveis'); expect(wrapper!.text()).not.toContain('Nenhuma evolução registrada'); expect(wrapper!.text()).not.toContain('Nenhuma ocorrência registrada'); expect(wrapper!.text()).not.toContain('Nenhuma diária lançada'); expect(wrapper!.text()).not.toMatch(/R\$\s*0,00/);
  });
  it('shows known stay information while the patient display-name request is pending', async () => {
    const name = deferred<string>(); cache.getPatientName.mockReturnValueOnce(name.promise); await render(); expect(wrapper!.text()).toContain('A01'); expect(wrapper!.text()).toContain(first.patientId); expect(service.listProgress).toHaveBeenCalledWith(first.id); name.resolve('Rex'); await flushPromises();
  });
  it('does not let a previous collection response populate another chart', async () => {
    const older = deferred<unknown[]>(); service.listProgress.mockReturnValueOnce(older.promise); await render(); route.params.id = second.id; await flushPromises(); older.resolve([{ id: 'old-note', accountId: 'fixture', stayId: first.id, encounterId: first.encounterId, note: 'Nota exclusiva de Rex', authoredByUserId: 'user-first', createdAt: first.admittedAt }]); await flushPromises(); expect(wrapper!.text()).toContain('Luna'); expect(wrapper!.text()).not.toContain('Nota exclusiva de Rex');
  });
  it('keeps billing errors visible without opening the daily-charge creation form', async () => {
    service.listDailyCharges.mockResolvedValue([charge]); service.markDailyChargeBilled.mockRejectedValueOnce(new Error('Faturamento indisponível')); await render(); await action(/^Marcar Faturada$/).trigger('click'); await flushPromises(); expect(wrapper!.find('#dailyChargeDescription').exists()).toBe(false); expect(wrapper!.text()).toContain('Faturamento indisponível');
  });
  it('locks a pending progress draft and cancellation', async () => {
    const pending = deferred<unknown>(); service.addProgress.mockReturnValueOnce(pending.promise); await render(); await action(/Nova Evolução/).trigger('click'); await wrapper!.find('#progressNote').setValue('Observação capturada'); await action(/^Salvar$/).trigger('click'); await flushPromises(); expect(wrapper!.find('#progressNote').attributes('disabled')).toBeDefined(); expect(action(/^Cancelar$/).attributes('disabled')).toBeDefined(); expect(service.addProgress).toHaveBeenCalledTimes(1); pending.resolve({ id: 'note-new', accountId: 'fixture', stayId: first.id, encounterId: first.encounterId, note: 'Observação capturada', authoredByUserId: 'user-first', createdAt: first.admittedAt }); await flushPromises();
  });
});
