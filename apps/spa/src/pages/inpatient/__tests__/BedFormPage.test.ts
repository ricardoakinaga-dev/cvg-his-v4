import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { reactive } from 'vue';
import BedFormPage from '../BedFormPage.vue';

const service = vi.hoisted(() => ({ listSectors: vi.fn(), getBedById: vi.fn(), createBed: vi.fn(), updateBed: vi.fn() }));
const navigation = vi.hoisted(() => ({ push: vi.fn() }));
const route = reactive<{ params: { id?: string } }>({ params: {} });
vi.mock('@/services/inpatient', () => ({ inpatientService: service }));
vi.mock('vue-router', () => ({ useRoute: () => route, useRouter: () => navigation, onBeforeRouteLeave: vi.fn() }));

const metadata = { accountId: 'account-test', createdAt: '2026-09-06T00:00:00Z', updatedAt: '2026-09-06T00:00:00Z' };
const sector = { ...metadata, id: 'sector-a', code: 'INT', name: 'Internação', kind: 'inpatient', active: true };
const first = { ...metadata, id: 'bed-first', sectorId: sector.id, code: 'A01', name: 'Box primeiro', status: 'available', supportsSpecies: null, active: true };
const second = { ...first, id: 'bed-second', code: 'B02', name: 'Box segundo', status: 'blocked', supportsSpecies: 'felinos', active: false };
let wrapper: VueWrapper;
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
async function render(id?: string) {
  route.params = id ? { id } : {};
  wrapper = mount(BedFormPage, { global: { stubs: { AppPageHeader: { props: ['title'], template: '<header>{{ title }}<slot name="actions" /></header>' } } } });
  await flushPromises();
  return wrapper;
}
function field(label: string) {
  const found = wrapper.findAll('label').find(item => item.text().replace('*', '').trim() === label);
  if (!found) throw new Error(`Missing field ${label}`);
  return wrapper.get(`#${found.attributes('for')}`);
}
async function fill() {
  await field('Código').setValue('  N03  ');
  await field('Descrição').setValue('  Box novo  ');
  await field('Setor').setValue(sector.id);
  await field('Espécie suportada').setValue('  caninos  ');
}
async function submit() { await wrapper.get('form').trigger('submit'); await flushPromises(); }

beforeEach(() => {
  vi.useFakeTimers();
  vi.resetAllMocks();
  service.listSectors.mockResolvedValue([sector]);
  service.getBedById.mockImplementation(async (id: string) => id === first.id ? first : second);
  service.createBed.mockResolvedValue({ ...first, id: 'bed-created', code: 'N03', name: 'Box novo', supportsSpecies: 'caninos' });
  service.updateBed.mockResolvedValue(first);
});
afterEach(() => { wrapper?.unmount(); vi.clearAllTimers(); vi.useRealTimers(); });

describe('BedFormPage request and context safety', () => {
  it('preserves the four-field create contract with trimmed values', async () => {
    await render(); await fill(); await submit();
    expect(service.createBed).toHaveBeenCalledExactlyOnceWith({ sectorId: sector.id, code: 'N03', name: 'Box novo', supportsSpecies: 'caninos' });
    expect(service.updateBed).not.toHaveBeenCalled();
  });

  it('preserves all six update fields, including empty species and inactive status', async () => {
    await render(first.id); await fill();
    await field('Espécie suportada').setValue('  ');
    await field('Status').setValue('maintenance');
    await wrapper.get('input[type="checkbox"]').setValue(false);
    await submit();
    expect(service.updateBed).toHaveBeenCalledExactlyOnceWith(first.id, { sectorId: sector.id, code: 'N03', name: 'Box novo', status: 'maintenance', supportsSpecies: null, active: false });
    expect(service.createBed).not.toHaveBeenCalled();
  });

  it('reloads the next route identity before updating that record', async () => {
    await render(first.id);
    route.params.id = second.id; await flushPromises();
    expect(service.getBedById).toHaveBeenLastCalledWith(second.id);
    expect((field('Código').element as HTMLInputElement).value).toBe('B02');
    await submit();
    expect(service.updateBed).toHaveBeenCalledExactlyOnceWith(second.id, { sectorId: sector.id, code: second.code, name: second.name, status: second.status, supportsSpecies: second.supportsSpecies, active: second.active });
  });

  it('retries only the remaining PATCH after creation succeeds and follow-up fails', async () => {
    service.updateBed.mockRejectedValueOnce(new Error('Status indisponível'));
    await render(); await fill(); await field('Status').setValue('maintenance'); await submit();
    expect(service.createBed).toHaveBeenCalledTimes(1);
    expect(service.updateBed).toHaveBeenNthCalledWith(1, 'bed-created', { status: 'maintenance', active: true });
    expect(wrapper.text()).toContain('Status indisponível');
    await submit();
    expect(service.createBed).toHaveBeenCalledTimes(1);
    expect(service.updateBed).toHaveBeenNthCalledWith(2, 'bed-created', { sectorId: sector.id, code: 'N03', name: 'Box novo', supportsSpecies: 'caninos', status: 'maintenance', active: true });
  });

  it('disables all six fields while saving and guards repeated submit events', async () => {
    const pending = deferred<typeof first>(); service.createBed.mockReturnValue(pending.promise);
    await render(); await fill(); await submit();
    for (const control of wrapper.findAll('form input, form select')) expect(control.element.matches(':disabled')).toBe(true);
    await submit(); expect(service.createBed).toHaveBeenCalledTimes(1);
    pending.resolve(first); await flushPromises();
  });

  it('does not PATCH when loading the edit record failed, even with forced submit', async () => {
    service.getBedById.mockRejectedValueOnce(new Error('Box não encontrado'));
    await render(first.id);
    if (wrapper.find('form').exists()) {
      if (wrapper.findAll('input').length) await fill();
      await submit();
    }
    expect(wrapper.text()).toContain('Não foi possível confirmar este box');
    expect(service.updateBed).not.toHaveBeenCalled();
    expect(service.createBed).not.toHaveBeenCalled();
  });

  it('ignores an older edit read that resolves after the current route read', async () => {
    const pending = deferred<typeof first>();
    service.getBedById.mockImplementation((id: string) => id === first.id ? pending.promise : Promise.resolve(second));
    await render(first.id);
    route.params.id = second.id; await flushPromises();
    pending.resolve(first); await flushPromises();
    expect((field('Código').element as HTMLInputElement).value).toBe(second.code);
    await submit();
    expect(service.updateBed).toHaveBeenCalledWith(second.id, expect.objectContaining({ code: second.code, name: second.name }));
  });

  it('resets the draft when leaving an edit route for a new bed', async () => {
    await render(first.id); route.params = {}; await flushPromises();
    expect((field('Código').element as HTMLInputElement).value).toBe('');
    expect((field('Descrição').element as HTMLInputElement).value).toBe('');
    await fill(); await submit();
    expect(service.createBed).toHaveBeenCalledTimes(1);
    expect(service.updateBed).not.toHaveBeenCalled();
  });

  it('latches a successful create against repeated submits before navigation', async () => {
    await render(); await fill(); await submit(); await submit();
    expect(service.createBed).toHaveBeenCalledTimes(1);
    for (const control of wrapper.findAll('form input, form select')) expect(control.element.matches(':disabled')).toBe(true);
    await vi.advanceTimersByTimeAsync(1500);
    expect(navigation.push).toHaveBeenCalledWith('/beds');
  });

  it('keeps the original captured follow-up when the route changes during creation', async () => {
    const pending = deferred<typeof first>(); service.createBed.mockReturnValueOnce(pending.promise);
    await render(); await fill(); await field('Status').setValue('maintenance');
    await wrapper.get('input[type="checkbox"]').setValue(false); await submit();
    route.params.id = second.id; await flushPromises();
    pending.resolve({ ...first, id: 'bed-created' }); await flushPromises();
    expect(service.updateBed).toHaveBeenCalledExactlyOnceWith('bed-created', { status: 'maintenance', active: false });
    expect((field('Código').element as HTMLInputElement).value).toBe(second.code);
    await vi.advanceTimersByTimeAsync(1500);
    expect(navigation.push).not.toHaveBeenCalled();
  });

  it('does not navigate after unmounting while an update is pending', async () => {
    const pending = deferred<typeof first>(); service.updateBed.mockReturnValueOnce(pending.promise);
    await render(first.id); await submit(); wrapper.unmount();
    pending.resolve(first); await flushPromises(); await vi.advanceTimersByTimeAsync(1500);
    expect(navigation.push).not.toHaveBeenCalled();
  });

  it('retains user input after a rejected create so a deliberate retry can succeed', async () => {
    service.createBed.mockRejectedValueOnce(new Error('Conexão indisponível'));
    await render(); await fill(); await submit();
    expect(wrapper.text()).toContain('Conexão indisponível');
    expect((field('Código').element as HTMLInputElement).value.trim()).toBe('N03');
    await submit(); expect(service.createBed).toHaveBeenCalledTimes(2);
  });

  it('prevents updates when the record references an unavailable sector', async () => {
    service.getBedById.mockResolvedValueOnce({ ...first, sectorId: 'missing-sector' });
    await render(first.id); await submit();
    expect(service.updateBed).not.toHaveBeenCalled();
  });

  it('preserves an existing inactive sector in the update contract', async () => {
    service.listSectors.mockResolvedValueOnce([{ ...sector, active: false }]);
    await render(first.id); await submit();
    expect(service.updateBed).toHaveBeenCalledExactlyOnceWith(first.id, { sectorId: sector.id, code: first.code, name: first.name, status: first.status, supportsSpecies: null, active: true });
  });

  it('guards programmatic duplicate submissions while creation is unresolved', async () => {
    const pending = deferred<typeof first>(); service.createBed.mockReturnValueOnce(pending.promise);
    await render(); await fill(); await submit(); await submit();
    expect(service.createBed).toHaveBeenCalledTimes(1);
    pending.resolve(first); await flushPromises();
  });

  it('blocks mutation while the new route record is still loading', async () => {
    const pending = deferred<typeof second>();
    await render(first.id); service.getBedById.mockReturnValueOnce(pending.promise);
    route.params.id = second.id; await flushPromises();
    if (wrapper.find('form').exists()) await submit();
    expect(service.updateBed).not.toHaveBeenCalled();
    pending.resolve(second); await flushPromises();
  });

  it('keeps the saved identity and duplicate guard when navigation rejects', async () => {
    navigation.push.mockRejectedValueOnce(new Error('Navigation failed'));
    await render(); await fill(); await submit(); await submit();
    expect(service.createBed).toHaveBeenCalledTimes(1);
    expect(wrapper.text()).toContain('Box novo');
    expect(wrapper.text()).toContain('Abrir cadastro');
    expect(wrapper.get('button[type="submit"]').element.matches(':disabled')).toBe(true);
  });

  it('retries the sector catalog without discarding a draft', async () => {
    service.listSectors.mockRejectedValueOnce(new Error('Catalog failed'));
    await render();
    await field('Código').setValue('DRAFT'); await field('Descrição').setValue('Rascunho');
    const retry = wrapper.findAll('button').find(button => button.text() === 'Recarregar setores');
    expect(retry).toBeDefined(); await retry!.trigger('click'); await flushPromises();
    expect((field('Código').element as HTMLInputElement).value).toBe('DRAFT');
    expect((field('Descrição').element as HTMLInputElement).value).toBe('Rascunho');
    expect(service.listSectors).toHaveBeenCalledTimes(2);
    await field('Setor').setValue(sector.id); await submit();
    expect(service.createBed).toHaveBeenCalledWith({ sectorId: sector.id, code: 'DRAFT', name: 'Rascunho', supportsSpecies: undefined });
  });

  it('rejects a successful edit response containing a different record identity', async () => {
    service.getBedById.mockResolvedValueOnce(second);
    await render(first.id); await submit();
    expect(wrapper.text()).toContain('Não foi possível confirmar este box');
    expect(service.updateBed).not.toHaveBeenCalled();
    expect(wrapper.get('button[type="submit"]').element.matches(':disabled')).toBe(true);
  });
  it('does not claim a sector is missing while its catalog is still loading', async () => {
    const pending = deferred<typeof sector[]>();
    service.listSectors.mockReturnValueOnce(pending.promise);
    await render(first.id);
    expect(field('Setor').text()).not.toContain('Setor não localizado');
    expect(field('Setor').text()).toContain('Carregando setor');
    expect(wrapper.get('button[type="submit"]').element.matches(':disabled')).toBe(true);
    pending.resolve([sector]); await flushPromises();
    expect(field('Setor').text()).toContain('Internação');
  });

  it('recovers a successful empty catalog without losing the draft', async () => {
    service.listSectors.mockResolvedValueOnce([]);
    await render(); await field('Descrição').setValue('Rascunho sem setor');
    const retry = wrapper.findAll('button').find(button => button.text() === 'Recarregar setores');
    expect(retry, 'Empty catalog needs a contextual refresh action').toBeDefined();
    await retry!.trigger('click'); await flushPromises();
    expect(service.listSectors).toHaveBeenCalledTimes(2);
    expect((field('Descrição').element as HTMLInputElement).value).toBe('Rascunho sem setor');
    expect(field('Setor').text()).toContain('Internação');
    expect(service.createBed).not.toHaveBeenCalled();
  });

});
