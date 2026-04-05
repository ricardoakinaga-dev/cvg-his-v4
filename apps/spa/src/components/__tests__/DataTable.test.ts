import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import DataTable from '../DataTable.vue';

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
    expect(wrapper.find('table').exists()).toBe(false);
  });

  it('shows empty state when no rows', () => {
    const wrapper = mount(DataTable, {
      props: { columns, rows: [], emptyTitle: 'Vazio', emptyDescription: 'Sem dados' }
    });
    expect(wrapper.find('.empty-state').exists()).toBe(true);
    expect(wrapper.find('.empty-state__title').text()).toBe('Vazio');
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
