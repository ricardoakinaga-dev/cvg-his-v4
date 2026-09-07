import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { reactive } from 'vue';
import BedDetailPage from '../BedDetailPage.vue';
const service = vi.hoisted(() => ({ getBedById: vi.fn(), listSectors: vi.fn(), updateBed: vi.fn(), archiveBed: vi.fn() }));
const navigation = vi.hoisted(() => ({ push: vi.fn() }));
const route = reactive({ params: { id: 'bed-first' } });
vi.mock('@/services/inpatient', () => ({ inpatientService: service }));
vi.mock('vue-router', () => ({ useRoute: () => route, useRouter: () => navigation }));
const metadata = { accountId: 'fixture', createdAt: '2026-09-06T00:00:00Z', updatedAt: '2026-09-06T00:00:00Z' };
const sector = { ...metadata, id: 'sector-a', code: 'INT', name: 'Internação', active: true, kind: 'clinic' };
const first = { ...metadata, id: 'bed-first', code: 'A01', name: 'Box primeiro', sectorId: sector.id, status: 'available', active: true, supportsSpecies: null };
const second = { ...first, id: 'bed-second', code: 'B02', name: 'Box segundo', status: 'occupied' };
let wrapper: VueWrapper;
function deferred<T>() { let resolve!: (value: T) => void; let reject!: (error: Error) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
async function render() { wrapper = mount(BedDetailPage, { global: { stubs: { AppPageHeader: { props: ['title'], template: '<header>{{ title }}<slot name="actions" /></header>' } } } }); await flushPromises(); return wrapper; }
function action(name: RegExp) { const button = wrapper.findAll('button').find(b => name.test(b.text())); expect(button, `Button ${name}`).toBeDefined(); return button!; }
async function click(name: RegExp) { await action(name).trigger('click'); await flushPromises(); }
beforeEach(() => { vi.resetAllMocks(); route.params.id = first.id; service.getBedById.mockImplementation(async (id: string) => id === second.id ? second : first); service.listSectors.mockResolvedValue([sector]); service.updateBed.mockResolvedValue({ ...first, active: false, status: 'blocked' }); service.archiveBed.mockResolvedValue(undefined); });
afterEach(() => { wrapper?.unmount(); vi.restoreAllMocks(); });

describe('BedDetailPage confirmed identity and guarded actions', () => {
  it('preserves the toggle contract and canonical navigation', async () => {
    await render(); await click(/^Editar$/); expect(navigation.push).toHaveBeenLastCalledWith('/beds/bed-first/edit');
    await click(/^Mapa de Leitos$/); expect(navigation.push).toHaveBeenLastCalledWith('/inpatient/board');
    await click(/^Voltar$/); expect(navigation.push).toHaveBeenLastCalledWith('/beds');
    await click(/^Inativar$/); expect(service.updateBed).toHaveBeenCalledExactlyOnceWith(first.id, { active: false, status: 'blocked' });
    service.updateBed.mockResolvedValueOnce(first); await click(/^Reativar$/); expect(service.updateBed).toHaveBeenLastCalledWith(first.id, { active: true, status: 'available' });
  });
  it('reloads exact route identity before edit or mutation', async () => {
    await render(); route.params.id = second.id; await flushPromises();
    expect(service.getBedById).toHaveBeenLastCalledWith(second.id); expect(wrapper.text()).toContain(second.name); expect(wrapper.text()).not.toContain(first.name);
    await click(/^Editar$/); expect(navigation.push).toHaveBeenLastCalledWith('/beds/bed-second/edit');
    service.updateBed.mockResolvedValueOnce({ ...second, active: false, status: 'blocked' }); await click(/^Inativar$/); expect(service.updateBed).toHaveBeenLastCalledWith(second.id, { active: false, status: 'blocked' });
  });
  it('blocks duplicate toggle and other actions while pending', async () => {
    const pending = deferred<typeof first>(); service.updateBed.mockReturnValueOnce(pending.promise); await render(); await click(/^Inativar$/);
    const button = wrapper.findAll('button').find(b => /Inativar|Atualizando/.test(b.text())); expect(button?.element.matches(':disabled')).toBe(true);
    await button!.trigger('click'); await flushPromises(); expect(service.updateBed).toHaveBeenCalledTimes(1); expect(action(/^Editar$/).element.matches(':disabled')).toBe(true);
    pending.resolve({ ...first, active: false, status: 'blocked' }); await flushPromises(); expect(action(/^Reativar$/).element.matches(':disabled')).toBe(false);
  });
  it('shows known bed while sector lookup remains pending', async () => {
    const pending = deferred<typeof sector[]>(); service.listSectors.mockReturnValueOnce(pending.promise); await render(); expect(wrapper.text()).toContain(first.name); expect(wrapper.text()).toContain(sector.id); expect(wrapper.text()).toMatch(/Consultando setores|Carregando setores/); pending.resolve([sector]); await flushPromises(); expect(wrapper.text()).toContain(sector.name);
  });
  it('retries failed sector lookup without refetching the known bed', async () => {
    service.listSectors.mockRejectedValueOnce(new Error('Setores indisponíveis')); await render(); expect(wrapper.text()).toContain(first.name); expect(wrapper.text()).toContain(sector.id);
    await click(/^Recarregar setores$/); expect(service.getBedById).toHaveBeenCalledTimes(1); expect(service.listSectors).toHaveBeenCalledTimes(2); expect(wrapper.text()).toContain(sector.name);
  });
  it('does not infer unrestricted species from missing metadata', async () => { await render(); expect(wrapper.text()).not.toContain('Sem restrição'); expect(wrapper.text()).toContain('Não informada'); });
  it('rejects a successful read with a different identity', async () => {
    service.getBedById.mockResolvedValueOnce(second); await render(); expect(wrapper.text()).not.toContain(second.name); expect(action(/^Editar$/).element.matches(':disabled')).toBe(true); expect(service.updateBed).not.toHaveBeenCalled();
  });
  it('offers contextual retry after failed record read', async () => {
    service.getBedById.mockRejectedValueOnce(new Error('Cadastro indisponível')); await render(); expect(action(/^Editar$/).element.matches(':disabled')).toBe(true); await click(/^Recarregar box$/); expect(service.getBedById).toHaveBeenLastCalledWith(first.id); expect(wrapper.text()).toContain(first.name);
  });
  it('ignores an older read after the next route has resolved', async () => {
    const pending = deferred<typeof first>(); service.getBedById.mockReturnValueOnce(pending.promise); await render(); route.params.id = second.id; await flushPromises(); pending.resolve(first); await flushPromises(); expect(wrapper.text()).toContain(second.name); expect(wrapper.text()).not.toContain(first.name);
  });
  it('keeps a late toggle outcome separate from the next record', async () => {
    const pending = deferred<typeof first>(); service.updateBed.mockReturnValueOnce(pending.promise); await render(); await click(/^Inativar$/); route.params.id = second.id; await flushPromises(); pending.resolve({ ...first, active: false, status: 'blocked' }); await flushPromises();
    expect(wrapper.text()).toContain(second.name); expect(service.updateBed).toHaveBeenCalledExactlyOnceWith(first.id, { active: false, status: 'blocked' }); expect(wrapper.get('a[href="/beds/bed-first"]').text()).toMatch(/anterior/); expect(navigation.push).not.toHaveBeenCalled();
  });
  it('requires record confirmation after failed mutation before another toggle', async () => {
    service.updateBed.mockRejectedValueOnce(new Error('Resposta indisponível')); await render(); await click(/^Inativar$/); await click(/^Inativar$/); expect(service.updateBed).toHaveBeenCalledTimes(1);
    await click(/^Recarregar box$/); expect(service.getBedById).toHaveBeenCalledTimes(2); expect(action(/^Inativar$/).element.matches(':disabled')).toBe(false);
  });
  it('keeps archive cancellation free of domain writes', async () => { vi.spyOn(window, 'confirm').mockReturnValue(false); await render(); await click(/^Arquivar$/); expect(service.archiveBed).not.toHaveBeenCalled(); expect(service.updateBed).not.toHaveBeenCalled(); });
  it('guards duplicate archive confirmation and submission', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true); const pending = deferred<void>(); service.archiveBed.mockReturnValueOnce(pending.promise); await render(); await click(/^Arquivar$/);
    const button = wrapper.findAll('button').find(b => /Arquivar|Arquivando/.test(b.text())); expect(button?.element.matches(':disabled')).toBe(true); await button!.trigger('click'); await flushPromises(); expect(service.archiveBed).toHaveBeenCalledExactlyOnceWith(first.id); expect(confirm).toHaveBeenCalledTimes(1); pending.resolve(); await flushPromises();
  });
  it('shows acknowledged soft archive even if sector refresh is unavailable', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true); await render(); service.getBedById.mockResolvedValue({ ...first, active: false, status: 'blocked' }); service.listSectors.mockRejectedValue(new Error('Setores indisponíveis')); await click(/^Arquivar$/);
    expect(service.archiveBed).toHaveBeenCalledExactlyOnceWith(first.id); expect(wrapper.text()).toContain('Bloqueado'); expect(action(/^Reativar$/).exists()).toBe(true); expect(wrapper.findAll('button').some(b=>b.text()==='Arquivar')).toBe(false);
  });
  it('reconfirms a returning record before unlocking after its old mutation settles', async () => {
    const pendingWrite = deferred<typeof first>();
    const reconciliation = deferred<typeof first>();
    service.updateBed.mockReturnValueOnce(pendingWrite.promise);
    await render(); await click(/^Inativar$/);
    route.params.id = second.id; await flushPromises();
    route.params.id = first.id; await flushPromises();
    service.getBedById.mockReturnValueOnce(reconciliation.promise);
    pendingWrite.resolve({ ...first, active: false, status: 'blocked' }); await flushPromises();
    expect(service.getBedById).toHaveBeenCalledTimes(4);
    expect(action(/^Editar$/).element.matches(':disabled')).toBe(true);
    reconciliation.resolve({ ...first, active: false, status: 'blocked' }); await flushPromises();
    expect(action(/^Reativar$/).element.matches(':disabled')).toBe(false);
  });

  it('does not present availability as confirmed after an ambiguous mutation failure', async () => {
    service.updateBed.mockRejectedValueOnce(new Error('Resposta indisponível'));
    await render(); await click(/^Inativar$/);
    expect(wrapper.find('.detail-list').text()).not.toContain('Disponível');
    expect(wrapper.find('.detail-list').text()).toContain('A confirmar');
  });

});
