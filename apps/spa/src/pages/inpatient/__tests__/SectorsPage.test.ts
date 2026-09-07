import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';

const mockSectors = [
  {
    id: 'sector-1',
    code: 'UTI',
    name: 'UTI',
    kind: 'icu',
    active: true,
    createdAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'sector-2',
    code: 'OBS',
    name: 'Observação',
    kind: 'observation',
    active: false,
    createdAt: '2024-01-02T00:00:00Z'
  }
];

const mockListSectors = vi.fn().mockResolvedValue(mockSectors);
const mockCreateSector = vi.fn().mockResolvedValue({ id: 'sector-3' });

vi.mock('@/services/inpatient', () => ({
  inpatientService: {
    listSectors: () => mockListSectors(),
    createSector: (...args: unknown[]) => mockCreateSector(...args)
  }
}));

describe('SectorsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListSectors.mockResolvedValue(mockSectors);
    mockCreateSector.mockResolvedValue({ id: 'sector-3' });
  });

  it('renders inpatient sector management context', async () => {
    const SectorsPage = (await import('../SectorsPage.vue')).default;
    const wrapper = mount(SectorsPage);

    await flushPromises();
    expect(wrapper.get('.app-page-header__title').text()).toBe('Setores');
    expect(wrapper.get('a[href="/beds"]').text()).toMatch(/Boxes|Leitos/);
    expect(wrapper.text()).toContain('Mapa de Leitos');
    expect(wrapper.text()).toContain('2 setores');
  });

  it('creates a new sector and reloads the list', async () => {
    const SectorsPage = (await import('../SectorsPage.vue')).default;
    const wrapper = mount(SectorsPage);

    await flushPromises();
    await wrapper.find('input[placeholder="Ex.: UTI"]').setValue('CLIN');
    await wrapper.find('input[placeholder="Ex.: Unidade de Terapia Intensiva"]').setValue('Clínica');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(mockCreateSector).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'CLIN',
        name: 'Clínica'
      })
    );
    expect(mockListSectors).toHaveBeenCalledTimes(2);
  });
});


const mounted: VueWrapper[] = [];
afterEach(() => { mounted.splice(0).forEach(wrapper => wrapper.unmount()); document.body.innerHTML = ''; });
function deferred<T>() { let resolve!: (value: T) => void; let reject!: (error: Error) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
async function renderSector() { const Page = (await import('../SectorsPage.vue')).default; const wrapper = mount(Page, { attachTo: document.body }); mounted.push(wrapper); await flushPromises(); return wrapper; }
function button(wrapper: VueWrapper, name: RegExp) { const result = wrapper.findAll('button').find(item=>name.test(item.text())); expect(result, `Button ${name}`).toBeDefined(); return result!; }
async function fillSector(wrapper: VueWrapper) { await wrapper.get('input[placeholder="Ex.: UTI"]').setValue('  REC  '); await wrapper.get('input[placeholder="Ex.: Unidade de Terapia Intensiva"]').setValue('  Recuperação  '); await wrapper.get('select').setValue('observation'); }
function expectUnknown(wrapper: VueWrapper) { expect(wrapper.text()).not.toContain('0 setores'); expect(wrapper.text()).not.toContain('Nenhum setor cadastrado'); for (const dd of wrapper.findAll('dd')) expect(dd.text()).not.toMatch(/^0$/); }

describe('SectorsPage native workflow and truth', () => {
  beforeEach(() => { vi.resetAllMocks(); mockListSectors.mockResolvedValue(mockSectors); mockCreateSector.mockResolvedValue({ id: 'sector-created', code: 'REC', name: 'Recuperação', kind: 'observation', active: true }); });
  it('submits exactly the supported three fields with the native create button', async () => {
    const wrapper = await renderSector(); await fillSector(wrapper); await button(wrapper, /^Criar setor$/).trigger('click'); await flushPromises();
    expect(mockCreateSector).toHaveBeenCalledExactlyOnceWith({ code: 'REC', name: 'Recuperação', kind: 'observation' });
  });
  it('does not show zero or empty while the initial catalog is pending', async () => {
    const pending = deferred<typeof mockSectors>(); mockListSectors.mockReturnValueOnce(pending.promise); const wrapper = await renderSector(); expectUnknown(wrapper); pending.resolve(mockSectors); await flushPromises(); expect(wrapper.text()).toContain('2 setores');
  });
  it('distinguishes failed catalog from successful empty and preserves the draft on retry', async () => {
    mockListSectors.mockRejectedValueOnce(new Error('Catálogo indisponível')).mockResolvedValueOnce([]); const wrapper = await renderSector(); expectUnknown(wrapper); await fillSector(wrapper); await button(wrapper, /Recarregar setores|Atualizar/).trigger('click'); await flushPromises(); expect(wrapper.text()).toContain('Nenhum setor cadastrado'); expect(wrapper.get('input[placeholder="Ex.: UTI"]').element).toHaveProperty('value','  REC  ');
  });
  it('locks all create fields and guards repeated pending submit events', async () => {
    const pending = deferred<{id:string}>(); mockCreateSector.mockReturnValueOnce(pending.promise); const wrapper = await renderSector(); await fillSector(wrapper); await wrapper.get('form').trigger('submit'); await flushPromises();
    for(const field of wrapper.findAll('form input, form select')) expect(field.element.matches(':disabled')).toBe(true);
    await wrapper.get('form').trigger('submit'); await flushPromises(); expect(mockCreateSector).toHaveBeenCalledTimes(1); pending.resolve({id:'sector-created'}); await flushPromises();
  });
  it('keeps acknowledged creation separate from a failed catalog refresh', async () => {
    const wrapper = await renderSector(); await fillSector(wrapper); mockListSectors.mockRejectedValueOnce(new Error('Consulta indisponível')); await wrapper.get('form').trigger('submit'); await flushPromises();
    expect(wrapper.text()).toContain('Recuperação'); expect(wrapper.text()).toContain('sector-created'); expect(wrapper.text()).toMatch(/criado|cadastrado/); expectUnknown(wrapper);
    await wrapper.get('form').trigger('submit'); await flushPromises(); expect(mockCreateSector).toHaveBeenCalledTimes(1);
    await button(wrapper, /Recarregar setores|Atualizar/).trigger('click'); await flushPromises(); expect(mockCreateSector).toHaveBeenCalledTimes(1); expect(wrapper.text()).toContain('sector-created');
  });
  it('requires an explicit new registration after acknowledged success', async () => {
    const wrapper = await renderSector(); await fillSector(wrapper); await wrapper.get('form').trigger('submit'); await flushPromises(); await wrapper.get('form').trigger('submit'); await flushPromises(); expect(mockCreateSector).toHaveBeenCalledTimes(1);
    await button(wrapper, /^Cadastrar outro setor$/).trigger('click'); await flushPromises(); expect(wrapper.get('input[placeholder="Ex.: UTI"]').element).toHaveProperty('value',''); await fillSector(wrapper); await button(wrapper, /^Criar setor$/).trigger('click'); await flushPromises(); expect(mockCreateSector).toHaveBeenCalledTimes(2);
  });
  it('rejects whitespace-only forced creation and keeps an actual failure draft', async () => {
    const wrapper = await renderSector(); await wrapper.get('input[placeholder="Ex.: UTI"]').setValue('   '); await wrapper.get('form').trigger('submit'); await flushPromises(); expect(mockCreateSector).not.toHaveBeenCalled();
    await fillSector(wrapper); mockCreateSector.mockRejectedValueOnce(new Error('Código recusado')); await wrapper.get('form').trigger('submit'); await flushPromises(); expect(wrapper.text()).toContain('Código recusado'); expect(wrapper.get('input[placeholder="Ex.: UTI"]').element).toHaveProperty('value','  REC  ');
  });
  it('does not overwrite a fresh post-create catalog with an older initial read', async () => {
    const older = deferred<typeof mockSectors>(); mockListSectors.mockReturnValueOnce(older.promise).mockResolvedValueOnce([{...mockSectors[0],code:'LATEST'}]); const wrapper = await renderSector(); await fillSector(wrapper); await wrapper.get('form').trigger('submit'); await flushPromises(); expect(wrapper.get('tbody').text()).toContain('LATEST'); older.resolve([{...mockSectors[0],code:'STALE'}]); await flushPromises(); expect(wrapper.get('tbody').text()).toContain('LATEST'); expect(wrapper.get('tbody').text()).not.toContain('STALE');
  });
  it('does not start another catalog request when creation settles after unmount', async () => {
    const pending = deferred<{id:string}>(); mockCreateSector.mockReturnValueOnce(pending.promise); const wrapper = await renderSector(); await fillSector(wrapper); await wrapper.get('form').trigger('submit'); wrapper.unmount(); pending.resolve({id:'sector-created'}); await flushPromises(); expect(mockListSectors).toHaveBeenCalledTimes(1);
  });
});
