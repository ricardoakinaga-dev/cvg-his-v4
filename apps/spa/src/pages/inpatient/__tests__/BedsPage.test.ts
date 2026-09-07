import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';

const mockPush = vi.fn();

const mockBeds = [
  {
    id: 'bed-1',
    accountId: 'acc-cvg',
    code: 'B01',
    name: 'Box 01',
    sectorId: 'sector-1',
    status: 'available' as const,
    supportsSpecies: 'caninos',
    active: true,
    createdAt: '2026-04-26T00:00:00.000Z',
    updatedAt: '2026-04-26T00:00:00.000Z'
  },
  {
    id: 'bed-2',
    accountId: 'acc-cvg',
    code: 'B02',
    name: 'Box 02',
    sectorId: 'sector-1',
    status: 'occupied' as const,
    supportsSpecies: 'felinos',
    active: true,
    createdAt: '2026-04-26T00:00:00.000Z',
    updatedAt: '2026-04-26T00:00:00.000Z'
  }
];

const mockSectors = [
  {
    id: 'sector-1',
    accountId: 'acc-cvg',
    code: 'UTI',
    name: 'UTI Veterinária',
    kind: 'icu',
    active: true,
    createdAt: '2026-04-26T00:00:00.000Z',
    updatedAt: '2026-04-26T00:00:00.000Z'
  }
];

const mockListBeds = vi.fn().mockResolvedValue(mockBeds);
const mockListSectors = vi.fn().mockResolvedValue(mockSectors);

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush })
}));

vi.mock('@/services/inpatient', () => ({
  inpatientService: {
    listBeds: (...args: unknown[]) => mockListBeds(...args),
    listSectors: () => mockListSectors()
  }
}));

afterEach(() => { document.body.innerHTML = ''; });

describe('BedsPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockListBeds.mockResolvedValue(mockBeds);
    mockListSectors.mockResolvedValue(mockSectors);
  });

  it('renders Vetus-like boxes registry context', async () => {
    const BedsPage = (await import('../BedsPage.vue')).default;
    const wrapper = mount(BedsPage);

    await flushPromises();

    expect(wrapper.text()).toContain('Atendimento');
    expect(wrapper.text()).toContain('Boxes de Internação');
    expect(wrapper.text()).toContain('Incluir');
    expect(wrapper.text()).toContain('Pesquisar');
    expect(wrapper.text()).toContain('2 boxes');
    expect(wrapper.text()).toContain('Código');
    expect(wrapper.text()).toContain('Descrição');
    expect(wrapper.text()).toContain('Abrir');
  });

  it('searches using code, description and active filters', async () => {
    const BedsPage = (await import('../BedsPage.vue')).default;
    const wrapper = mount(BedsPage, { attachTo: document.body });

    await flushPromises();
    await wrapper.find('input[placeholder="Código"]').setValue('B01');
    await wrapper.find('input[placeholder="Descrição"]').setValue('Box');
    const searchButton = wrapper.findAll('button').find((button) => button.text().includes('Pesquisar'));
    expect(searchButton).toBeTruthy();
    await searchButton?.trigger('click');
    await flushPromises();

    expect(mockListBeds).toHaveBeenLastCalledWith({
      code: 'B01',
      description: 'Box',
      active: true
    });
  });
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

async function renderBeds() {
  const page = (await import('../BedsPage.vue')).default;
  const wrapper = mount(page);
  await flushPromises();
  return wrapper;
}

function action(wrapper: VueWrapper, name: RegExp) {
  const button = wrapper.findAll('button').find((item) => name.test(item.text()));
  expect(button, `native button matching ${name}`).toBeTruthy();
  return button!;
}

async function search(wrapper: VueWrapper) {
  const form = wrapper.find('form');
  if (form.exists()) await form.trigger('submit');
  else await action(wrapper, /Pesquisar/).trigger('click');
  await flushPromises();
}

function countText(wrapper: VueWrapper, label: string) {
  const item = wrapper.findAll('*').find((node) => node.text() === label && node.element.children.length === 0);
  expect(item, `visible summary label ${label}`).toBeTruthy();
  const element = item!.element;
  return element.tagName === 'DT'
    ? element.nextElementSibling?.textContent ?? ''
    : element.parentElement?.textContent ?? '';
}

function expectUnknown(wrapper: VueWrapper) {
  expect(wrapper.text()).not.toContain('0 boxes');
  expect(wrapper.text()).not.toMatch(/Nenhum registro encontrado|Nenhum box encontrado/);
  for (const label of ['Total', 'Disponíveis', 'Ocupados', 'Bloqueados']) {
    expect(countText(wrapper, label)).not.toMatch(/\d/);
  }
}

describe('BedsPage operational truth', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockListBeds.mockResolvedValue(mockBeds);
    mockListSectors.mockResolvedValue(mockSectors);
  });

  it('keeps initial loading totals unknown, including the header badge', async () => {
    mockListBeds.mockReturnValueOnce(deferred<typeof mockBeds>().promise);
    const wrapper = await renderBeds();
    expectUnknown(wrapper);
  });

  it('distinguishes failed reads from successful empty results and retries', async () => {
    mockListBeds.mockRejectedValueOnce(new Error('Consulta indisponível')).mockResolvedValueOnce([]);
    const wrapper = await renderBeds();
    expect(wrapper.text()).toContain('Consulta indisponível');
    expectUnknown(wrapper);
    await action(wrapper, /Tentar novamente|Repetir consulta|Recarregar boxes/i).trigger('click');
    await flushPromises();
    expect(mockListBeds).toHaveBeenCalledTimes(2);
    expect(wrapper.text()).toMatch(/Nenhum registro encontrado|Nenhum box encontrado/);
    expect(countText(wrapper, 'Total')).toMatch(/0/);
    expect(wrapper.text()).not.toContain('Consulta indisponível');
  });

  it('counts active statuses separately from inactive records of every status', async () => {
    const statuses = ['available', 'occupied', 'maintenance', 'blocked'] as const;
    const records = statuses.flatMap((status, index) => [
      { ...mockBeds[0], id: `active-${status}`, code: `A${index}`, status, active: true },
      { ...mockBeds[0], id: `inactive-${status}`, code: `I${index}`, status, active: false }
    ]);
    mockListBeds.mockResolvedValue(records);
    const wrapper = await renderBeds();
    await wrapper.get('input[type="checkbox"]').setValue(false);
    await search(wrapper);
    expect(mockListBeds).toHaveBeenLastCalledWith({ code: undefined, description: undefined, active: false });
    for (const [label, count] of [['Total', 8], ['Disponíveis', 1], ['Ocupados', 1], ['Manutenção', 1], ['Bloqueados', 1], ['Inativos', 4]] as const) {
      expect(countText(wrapper, label)).toMatch(new RegExp(`(?:^|\\D)${count}(?:\\D|$)`));
    }
    expect(wrapper.findAll('tbody tr')).toHaveLength(8);
    expect(wrapper.text()).toMatch(/ativos e inativos|todos os boxes/i);
  });

  it('retries the failed captured filters after the draft changes', async () => {
    const wrapper = await renderBeds();
    mockListBeds.mockRejectedValueOnce(new Error('Falha filtrada'));
    await wrapper.get('input[placeholder="Código"]').setValue('  FAIL  ');
    await wrapper.get('input[placeholder="Descrição"]').setValue('  Capturada  ');
    await wrapper.get('input[type="checkbox"]').setValue(false);
    await search(wrapper);
    expect(wrapper.text()).toContain('Falha filtrada');
    expect(wrapper.findAll('tbody tr')).toHaveLength(0);
    expectUnknown(wrapper);
    await wrapper.get('input[placeholder="Código"]').setValue('DRAFT');
    await wrapper.get('input[placeholder="Descrição"]').setValue('Nova');
    await wrapper.get('input[type="checkbox"]').setValue(true);
    expect(wrapper.text()).toContain('FAIL');
    await action(wrapper, /Tentar novamente|Repetir consulta|Recarregar boxes/i).trigger('click');
    await flushPromises();
    expect(mockListBeds).toHaveBeenLastCalledWith({ code: 'FAIL', description: 'Capturada', active: false });
    expect(wrapper.get('input[placeholder="Código"]').element).toHaveProperty('value', 'DRAFT');
    expect(wrapper.text()).toMatch(/alterad|pendente|não aplicad/i);
  });

  it('shows successful rows while sector lookup remains pending', async () => {
    const sectors = deferred<typeof mockSectors>();
    mockListSectors.mockReturnValueOnce(sectors.promise);
    const wrapper = await renderBeds();
    expect(wrapper.findAll('tbody tr')).toHaveLength(2);
    expect(wrapper.text()).toContain('sector-1');
    expect(wrapper.text()).toMatch(/carregando setores|consultando setores/i);
    sectors.resolve(mockSectors);
    await flushPromises();
    expect(wrapper.text()).toContain('UTI Veterinária');
  });

  it('preserves bed rows on sector failure and retries only the lookup', async () => {
    mockListSectors.mockRejectedValueOnce(new Error('Setores indisponíveis'));
    const wrapper = await renderBeds();
    expect(wrapper.findAll('tbody tr')).toHaveLength(2);
    expect(wrapper.text()).toContain('sector-1');
    expect(wrapper.text()).toMatch(/setores.*indispon|falha.*setores|não foi possível.*setores/i);
    await action(wrapper, /tentar.*setores|recarregar setores|consultar setores/i).trigger('click');
    await flushPromises();
    expect(mockListBeds).toHaveBeenCalledTimes(1);
    expect(mockListSectors).toHaveBeenCalledTimes(2);
    expect(wrapper.text()).toContain('UTI Veterinária');
  });

  it('uses the entire unmatched sector ID without inventing a label', async () => {
    const fullId = 'sector-missing-12345678-abcdef-987654321';
    mockListBeds.mockResolvedValueOnce([{ ...mockBeds[0], sectorId: fullId }]);
    const wrapper = await renderBeds();
    expect(wrapper.get('tbody').text()).toContain(fullId);
  });

  it('preserves all six columns and all four canonical destinations', async () => {
    const wrapper = await renderBeds();
    expect(wrapper.findAll('th').map((cell) => cell.text())).toEqual(['Código', 'Descrição', 'Setor', 'Status', 'Boxes Ativos', 'Abrir']);
    expect(wrapper.get('a[href="/sectors"]').text()).toContain('Setores');
    expect(wrapper.get('a[href="/inpatient/board"]').text()).toContain('Mapa de Leitos');
    await action(wrapper, /^Incluir$/).trigger('click');
    expect(mockPush).toHaveBeenLastCalledWith('/beds/new');
    await action(wrapper, /^Abrir$/).trigger('click');
    expect(mockPush).toHaveBeenLastCalledWith('/beds/bed-1');
  });

  for (const lateOutcome of ['success', 'error'] as const) {
    it(`ignores older ${lateOutcome} after a newer successful read`, async () => {
      const wrapper = await renderBeds();
      const older = deferred<typeof mockBeds>();
      mockListBeds.mockReturnValueOnce(older.promise).mockResolvedValueOnce([{ ...mockBeds[0], code: 'LATEST' }]);
      await wrapper.get('input[placeholder="Código"]').setValue('OLD');
      await search(wrapper);
      await wrapper.get('input[placeholder="Código"]').setValue('LATEST');
      await search(wrapper);
      expect(mockListBeds).toHaveBeenCalledTimes(3);
      expect(wrapper.get('tbody').text()).toContain('LATEST');
      if (lateOutcome === 'success') older.resolve([{ ...mockBeds[0], code: 'STALE' }]);
      else older.reject(new Error('Erro antigo'));
      await flushPromises();
      expect(wrapper.get('tbody').text()).toContain('LATEST');
      expect(wrapper.text()).not.toContain('STALE');
      expect(wrapper.text()).not.toContain('Erro antigo');
    });
  }

  it('does not let an older finally expose empty results while the latest read is pending', async () => {
    const wrapper = await renderBeds();
    const older = deferred<typeof mockBeds>();
    const latest = deferred<typeof mockBeds>();
    mockListBeds.mockReturnValueOnce(older.promise).mockReturnValueOnce(latest.promise);
    await wrapper.get('input[placeholder="Código"]').setValue('OLD');
    await search(wrapper);
    await wrapper.get('input[placeholder="Código"]').setValue('LATEST');
    await search(wrapper);
    expect(mockListBeds).toHaveBeenCalledTimes(3);
    older.resolve([]);
    await flushPromises();
    expectUnknown(wrapper);
    latest.resolve([{ ...mockBeds[0], code: 'LATEST' }]);
    await flushPromises();
    expect(wrapper.get('tbody').text()).toContain('LATEST');
  });
});
