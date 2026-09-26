import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import CounterSalesCardList from '../CounterSalesCardList.vue';
import type { CounterSalesCardModel } from '../CounterSalesCard.vue';

const sale: CounterSalesCardModel = {
  id: 'sale-1',
  statusVariant: 'warning',
  statusLabel: 'Aberta',
  number: 'CS-000001',
  openedAtLabel: '15/04/2026 10:00',
  closedAtLabel: '-',
  ownerNameLabel: 'Tutor de teste',
  totalLabel: 'R$ 150,00',
  primaryContactLabel: 'Contato de teste 0001',
  patientsLabel: '1 animal: Paciente de teste',
  openedByLabel: 'Operador de teste',
  accountLabel: 'Conta de demonstração',
  paidLabel: 'R$ 50,00',
  balanceLabel: 'R$ 100,00',
  notes: 'Balcão recepção',
  itemsCountLabel: '0 produto(s) · 1 serviço(s)',
  productsTotalLabel: 'R$ 0,00',
  servicesTotalLabel: 'R$ 150,00',
  selected: false,
  selectLabel: 'Ver comanda',
  ownerHref: '/owners/owner-1'
};

describe('CounterSalesCardList', () => {
  it('renders presentation models and emits selection without owning the workflow', async () => {
    const wrapper = mount(CounterSalesCardList, {
      props: { sales: [sale], loading: false }
    });

    expect(wrapper.text()).toContain('CS-000001');
    expect(wrapper.text()).toContain('Tutor de teste');
    expect(wrapper.text()).toContain('R$ 100,00');
    expect(wrapper.get('a[href="/owners/owner-1"]').text()).toContain('Ver tutor');

    await wrapper.findAll('button').find((button) => button.text() === 'Ver comanda')?.trigger('click');

    expect(wrapper.emitted('select')).toEqual([['sale-1']]);
  });

  it('keeps loading and empty states at the list presentation boundary', () => {
    const loadingWrapper = mount(CounterSalesCardList, {
      props: { sales: [], loading: true }
    });
    expect(loadingWrapper.text()).toContain('Carregando comandas...');

    const emptyWrapper = mount(CounterSalesCardList, {
      props: { sales: [], loading: false }
    });
    expect(emptyWrapper.text()).toContain('Nenhuma comanda encontrada');
    expect(emptyWrapper.find('.counter-sale-card').exists()).toBe(false);
  });
});
