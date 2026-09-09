import { describe, it, expect, vi, afterEach } from 'vitest';
import { nextTick } from 'vue';
import { mount, enableAutoUnmount } from '@vue/test-utils';
import DataTable from '../DataTable.vue';

enableAutoUnmount(afterEach);

const columns = [
  { key: 'name', label: 'Nome' },
  { key: 'email', label: 'Email' },
  { key: 'status', label: 'Status' }
];

const rows = [
  { id: '1', name: 'João', email: 'joao@test.com', status: 'active' },
  { id: '2', name: 'Maria', email: 'maria@test.com', status: 'inactive' }
];

describe('DataTable', () => {
  it('renders column headers', () => {
    const wrapper = mount(DataTable, {
      props: { columns, rows }
    });
    const headers = wrapper.findAll('th');
    expect(headers).toHaveLength(3);
    expect(headers[0].text()).toBe('Nome');
    expect(headers[1].text()).toBe('Email');
    expect(headers[2].text()).toBe('Status');
  });

  it('renders row data', () => {
    const wrapper = mount(DataTable, {
      props: { columns, rows }
    });
    const bodyRows = wrapper.findAll('tbody tr');
    expect(bodyRows).toHaveLength(2);
    expect(bodyRows[0].findAll('td')[0].text()).toBe('João');
    expect(bodyRows[0].findAll('td')[1].text()).toBe('joao@test.com');
  });

  it('shows loading state', () => {
    const wrapper = mount(DataTable, {
      props: { columns, rows, loading: true }
    });
    expect(wrapper.find('.data-table-loading').exists()).toBe(true);
    expect(wrapper.findAll('.data-table-loading .ds-skeleton').length).toBeGreaterThan(0);
    expect(wrapper.find('table').exists()).toBe(false);
  });

  it('shows empty state when no rows', () => {
    const wrapper = mount(DataTable, {
      props: { columns, rows: [], emptyTitle: 'Vazio', emptyDescription: 'Sem dados' }
    });
    expect(wrapper.find('.empty-state').exists()).toBe(true);
    expect(wrapper.find('.empty-state__title').text()).toBe('Vazio');
  });

  it('renders an explicit no-results feedback without an assertive announcement', () => {
    const wrapper = mount(DataTable, {
      props: {
        columns,
        rows,
        feedback: {
          kind: 'no-results',
          title: 'Nenhum resultado corresponde aos filtros',
          description: 'Revise os filtros e tente novamente.'
        }
      },
      slots: {
        feedbackAction: '<button type="button" class="retry-button">Limpar filtros</button>'
      }
    });

    expect(wrapper.get('[data-testid="data-table-feedback"] .empty-state__title').text())
      .toBe('Nenhum resultado corresponde aos filtros');
    expect(wrapper.get('.retry-button').text()).toBe('Limpar filtros');
    expect(wrapper.find('table').exists()).toBe(false);
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    expect(wrapper.find('[aria-live]').exists()).toBe(false);
  });

  it('announces terminal feedback once and keeps loading as the highest-priority state', async () => {
    const wrapper = mount(DataTable, {
      props: {
        columns,
        rows: [],
        loading: false,
        feedback: {
          kind: 'error',
          title: 'Não foi possível carregar',
          description: 'Tente novamente.'
        }
      },
      slots: {
        feedbackAction: '<button type="button">Tentar novamente</button>'
      }
    });

    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1);
    expect(wrapper.get('[role="alert"]').attributes('aria-live')).toBe('assertive');
    expect(wrapper.findAll('[aria-live="assertive"]')).toHaveLength(1);

    await wrapper.setProps({ loading: true });
    expect(wrapper.find('.data-table-loading').exists()).toBe(true);
    expect(wrapper.find('[data-testid="data-table-feedback"]').exists()).toBe(false);
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(0);
  });

  it('uses a registered clock icon for unavailable data instead of an emoji fallback', () => {
    const wrapper = mount(DataTable, {
      props: {
        columns,
        rows: [],
        feedback: {
          kind: 'unavailable',
          title: 'Catálogo indisponível'
        }
      }
    });

    expect(wrapper.get('[data-testid="data-table-feedback"] [data-icon="clock"]')).toBeDefined();
    expect(wrapper.get('[role="alert"]').attributes('aria-live')).toBe('assertive');
  });

  it('keeps confirmed rows visible beside a recoverable terminal feedback', () => {
    const wrapper = mount(DataTable, {
      props: {
        columns,
        rows,
        feedback: {
          kind: 'unavailable',
          title: 'Catálogo indisponível',
          description: 'Tente novamente.'
        }
      },
      slots: {
        feedbackAction: '<button type="button">Atualizar</button>'
      }
    });

    expect(wrapper.get('[data-testid="data-table-feedback"]').classes()).toContain(
      'data-table-feedback--with-rows'
    );
    expect(wrapper.findAll('tbody tr')).toHaveLength(rows.length);
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1);
  });

  it('renders custom cell content via slots', () => {
    const wrapper = mount(DataTable, {
      props: { columns, rows },
      slots: {
        'cell-status': '<span class="custom-status">CUSTOM</span>'
      }
    });
    const statusCells = wrapper.findAll('.custom-status');
    expect(statusCells).toHaveLength(2);
  });

  it('applies striped variant class', () => {
    const wrapper = mount(DataTable, {
      props: { columns, rows, variant: 'striped' }
    });
    expect(wrapper.find('table').classes()).toContain('data-table--striped');
  });

  it('applies hoverable variant class', () => {
    const wrapper = mount(DataTable, {
      props: { columns, rows, variant: 'hoverable' }
    });
    expect(wrapper.find('table').classes()).toContain('data-table--hoverable');
  });

  it('applies compact class', () => {
    const wrapper = mount(DataTable, {
      props: { columns, rows, compact: true }
    });
    expect(wrapper.find('.data-table-wrapper').classes()).toContain('data-table-wrapper--compact');
  });

  it('renders caption for accessibility', () => {
    const wrapper = mount(DataTable, {
      props: { columns, rows, caption: 'Lista de usuários' }
    });
    expect(wrapper.find('caption').text()).toBe('Lista de usuários');
    expect(wrapper.find('.table-wrapper').attributes()).toMatchObject({
      role: 'region',
      'aria-label': 'Lista de usuários',
      tabindex: '0'
    });
  });

  it('keeps the named region but does not announce unmeasured overflow', () => {
    const wrapper = mount(DataTable, {props:{columns,rows,caption:'Lista de usuários'}});
    expect(wrapper.get('.table-wrapper').attributes('data-scroll-container')).toBe('local');
    expect(wrapper.get('.table-wrapper').attributes('data-scroll-key')).toBe('Lista de usuários');
    expect(wrapper.get('.table-wrapper').attributes('aria-describedby')).toBeUndefined();
    expect(wrapper.find('.table-wrapper__scroll-cue').exists()).toBe(false);
    expect(wrapper.get('th').attributes('scope')).toBe('col');
    wrapper.unmount();
  });

  it('uses a column formatter when provided', () => {
    const wrapper = mount(DataTable, {
      props: {
        columns: [
          {
            key: 'name',
            label: 'Nome',
            format: (value, row) => `${String(value)} · ${String(row.id)}`
          }
        ],
        rows: [{ id: '1', name: 'João' }]
      }
    });

    expect(wrapper.find('tbody td').text()).toBe('João · 1');
  });

  it('gives blank utility headers a programmatic name', () => {
    const wrapper = mount(DataTable, {
      props: { columns: [{ key: 'select', label: '' }], rows: [{ id: '1', select: '' }] }
    });
    expect(wrapper.get('th').attributes('aria-label')).toBe('Selecionar');
  });

  it.each([1, 100, 1000])('renders a bounded fixture with %i row(s)', (size) => {
    const largeRows = Array.from({ length: size }, (_, index) => ({
      id: String(index),
      name: `Registro ${index}`,
      email: `registro-${index}@test.local`,
      status: index % 2 ? 'active' : 'inactive'
    }));
    const wrapper = mount(DataTable, { props: { columns, rows: largeRows } });

    expect(wrapper.findAll('tbody tr')).toHaveLength(size);
    expect(wrapper.find('.table-wrapper').attributes('tabindex')).toBe('0');
  });

  it('renders empty action slot', () => {
    const wrapper = mount(DataTable, {
      props: { columns, rows: [], emptyTitle: 'Vazio' },
      slots: {
        emptyAction: '<button class="add-btn">Adicionar</button>'
      }
    });
    expect(wrapper.find('.add-btn').exists()).toBe(true);
  });

  it('renders correct number of rows with custom columns', () => {
    const customRows = [
      { email: 'joao@test.com', name: 'João' },
      { email: 'maria@test.com', name: 'Maria' }
    ];
    const wrapper = mount(DataTable, {
      props: { columns: [{ key: 'name', label: 'Nome' }], rows: customRows, rowKeyField: 'email' }
    });
    const bodyRows = wrapper.findAll('tbody tr');
    expect(bodyRows).toHaveLength(2);
    expect(bodyRows[0].text()).toContain('João');
    expect(bodyRows[1].text()).toContain('Maria');
  });
});


describe('DataTable measured overflow', () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  function browserMeasurements() {
    const frames = new Map<number, FrameRequestCallback>();
    let frameId = 0;
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {frames.set(++frameId, callback);return frameId;});
    vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
    const observers: {callback: ResizeObserverCallback; observe: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn>}[] = [];
    vi.stubGlobal('ResizeObserver', class {
      observe = vi.fn(); disconnect = vi.fn();
      constructor(public callback: ResizeObserverCallback) {observers.push(this);}
    });
    async function frame() {
      await nextTick();
      const pending = [...frames.values()]; frames.clear();
      pending.forEach(callback => callback(0));
      await nextTick();
    }
    return {frames, observers, frame};
  }

  it('announces real overflow, then removes both visual and spoken hints when resized to fit', async () => {
    const browser = browserMeasurements();
    const wrapper = mount(DataTable, {props:{columns,rows,caption:'Consulta'}});
    await nextTick();
    const region = wrapper.get('.table-wrapper').element;
    const table = wrapper.get('table').element;
    let regionWidth = 320;
    Object.defineProperty(region,'clientWidth',{get:()=>regionWidth});
    Object.defineProperty(table,'scrollWidth',{get:()=>640});
    await browser.frame();
    const id = wrapper.get('.table-wrapper').attributes('aria-describedby');
    expect(wrapper.get(`#${id}`).text()).toContain('rolagem horizontal local');
    expect(wrapper.get('.table-wrapper__scroll-cue').text()).toContain('Rolagem local');
    region.scrollLeft = 0;
    await wrapper.get('.table-wrapper').trigger('keydown', { key: 'ArrowRight' });
    expect(region.scrollLeft).toBeGreaterThan(0);
    expect(browser.observers[0].observe).toHaveBeenCalledWith(region);
    expect(browser.observers[0].observe).toHaveBeenCalledWith(table);
    regionWidth = 800;
    browser.observers[0].callback([], {} as ResizeObserver);
    await browser.frame();
    expect(wrapper.find('.table-wrapper__scroll-cue').exists()).toBe(false);
    expect(wrapper.get('.table-wrapper').attributes('aria-describedby')).toBeUndefined();
    wrapper.unmount();
    expect(browser.observers[0].disconnect).toHaveBeenCalled();
    expect(browser.frames.size).toBe(0);
  });

  it('remeasures dynamic content and reconnects after loading replaces the table', async () => {
    const browser = browserMeasurements();
    const wrapper = mount(DataTable, {props:{columns,rows}});
    await nextTick();
    let contentWidth = 200;
    Object.defineProperty(wrapper.get('.table-wrapper').element,'clientWidth',{value:320});
    Object.defineProperty(wrapper.get('table').element,'scrollWidth',{get:()=>contentWidth});
    await browser.frame();
    expect(wrapper.find('.table-wrapper__scroll-cue').exists()).toBe(false);
    contentWidth = 700;
    await wrapper.setProps({rows:[{id:'3',name:'Texto longo',email:'new@test.com',status:'active'}]});
    await browser.frame();
    expect(wrapper.find('.table-wrapper__scroll-cue').exists()).toBe(true);
    await wrapper.setProps({loading:true});
    expect(browser.observers[0].disconnect).toHaveBeenCalled();
    expect(wrapper.find('[aria-describedby]').exists()).toBe(false);
    await wrapper.setProps({loading:false});
    await browser.frame();
    expect(browser.observers).toHaveLength(2);
    expect(wrapper.find('.table-wrapper__scroll-cue').exists()).toBe(false);
    wrapper.unmount();
  });

  it('exposes one loading announcement while keeping skeleton cells decorative', () => {
    const wrapper = mount(DataTable, {
      props: { rows: [], loading: true, columns: Array.from({ length: 12 }, (_, i) => ({ key: String(i), label: String(i) })) }
    });
    const announcements = wrapper.findAll('[role="status"]')
      .filter(node => !node.element.closest('[aria-hidden="true"]'));
    expect(announcements).toHaveLength(1);
    expect(announcements[0].attributes('aria-label')).toBe('Carregando dados da tabela');
    expect(announcements[0].attributes('aria-busy')).toBe('true');
    expect(wrapper.findAll('.ds-skeleton')).toHaveLength(61);
  });

  it('connects measured guidance when an empty result gains rows and clears it when emptied', async () => {
    const browser = browserMeasurements();
    const wrapper = mount(DataTable, { props: { columns, rows: [] } });
    await browser.frame();
    expect(browser.observers).toHaveLength(0);
    await wrapper.setProps({ rows });
    Object.defineProperty(wrapper.get('.table-wrapper').element, 'clientWidth', { value: 320 });
    Object.defineProperty(wrapper.get('table').element, 'scrollWidth', { value: 700 });
    await browser.frame();
    expect(wrapper.find('.table-wrapper__scroll-cue').exists()).toBe(true);
    await wrapper.setProps({ rows: [] });
    await browser.frame();
    expect(browser.observers[0].disconnect).toHaveBeenCalled();
    expect(wrapper.find('.table-wrapper').exists()).toBe(false);
    expect(wrapper.find('[aria-describedby]').exists()).toBe(false);
    await wrapper.setProps({ rows });
    await browser.frame();
    expect(browser.observers).toHaveLength(2);
    expect(wrapper.find('.table-wrapper__scroll-cue').exists()).toBe(false);
    wrapper.unmount();
  });

  it('keeps resize-based measurement available without ResizeObserver', async () => {
    const browser = browserMeasurements();vi.stubGlobal('ResizeObserver',undefined);
    const wrapper = mount(DataTable,{props:{columns,rows}});await nextTick();
    Object.defineProperty(wrapper.get('.table-wrapper').element,'clientWidth',{value:320});
    Object.defineProperty(wrapper.get('table').element,'scrollWidth',{value:700});
    window.dispatchEvent(new Event('resize'));await browser.frame();
    expect(wrapper.find('.table-wrapper__scroll-cue').exists()).toBe(true);
    wrapper.unmount();window.dispatchEvent(new Event('resize'));
    expect(browser.frames.size).toBe(0);
  });
});
