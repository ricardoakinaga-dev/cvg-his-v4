import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

const mockRecord = {
  id: 'bill-1',
  encounterId: 'enc-1',
  patientId: 'pat-1',
  ownerId: 'owner-1',
  status: 'draft' as const,
  subtotalAmount: 0,
  discountAmount: 0,
  totalAmount: 0,
  currency: 'BRL',
  administrativeNotes: '',
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-15T10:00:00Z'
};

const mockItems = [
  {
    id: 'item-1',
    encounterId: 'enc-1',
    itemType: 'service' as const,
    description: 'Consulta veterinaria',
    quantity: 1,
    unitPriceAmount: 150.0,
    totalAmount: 150.0,
    createdAt: '2024-01-15T11:00:00Z'
  },
  {
    id: 'item-2',
    encounterId: 'enc-1',
    itemType: 'exam' as const,
    description: 'Hemograma completo',
    quantity: 1,
    unitPriceAmount: 200.0,
    totalAmount: 200.0,
    createdAt: '2024-01-15T11:30:00Z'
  }
];

const mockGetByEncounterFn = vi.fn().mockResolvedValue(mockRecord);
const mockListItemsFn = vi.fn().mockResolvedValue(mockItems);
const mockCreateEstimateFn = vi
  .fn()
  .mockResolvedValue({ ...mockRecord, status: 'estimated' as const });
const mockAddItemFn = vi.fn().mockResolvedValue({});
const mockUpdateStatusFn = vi.fn().mockResolvedValue({ ...mockRecord, status: 'open' as const });
const mockGetPatientName = vi.fn().mockResolvedValue('Rex');
const mockGetOwnerName = vi.fn().mockResolvedValue('Joao Silva');

vi.mock('@/services/billing', () => ({
  billingService: {
    get getByEncounter() {
      return mockGetByEncounterFn;
    },
    get listItems() {
      return mockListItemsFn;
    },
    get createEstimate() {
      return mockCreateEstimateFn;
    },
    get addItem() {
      return mockAddItemFn;
    },
    get updateStatus() {
      return mockUpdateStatusFn;
    }
  }
}));

vi.mock('@/composables/useEntityCache', () => ({
  useEntityCache: () => ({
    getPatientName: mockGetPatientName,
    getOwnerName: mockGetOwnerName,
    getUserName: vi.fn().mockResolvedValue(''),
    preloadUserNames: vi.fn().mockResolvedValue(undefined),
    loading: new Set()
  })
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({
    params: { id: 'enc-1' },
    path: '/billing/enc-1'
  }),
  useRouter: () => ({
    push: vi.fn()
  })
}));

function mountBillingDetailPage() {
  return import('../BillingDetailPage.vue').then((mod) => {
    return mount(mod.default, {
      global: {
        stubs: {
          DsModal: {
            template: `
              <div v-if="open" class="ds-modal" :data-size="size">
                <div class="ds-modal__header">
                  <h2 v-if="title" class="ds-modal__title">{{ title }}</h2>
                  <button v-if="closable" class="ds-modal__close" @click="$emit('close')">×</button>
                </div>
                <div class="ds-modal__body"><slot /></div>
                <div v-if="$slots.footer" class="ds-modal__footer"><slot name="footer" /></div>
              </div>
            `,
            props: ['open', 'title', 'size', 'closable', 'teleport'],
            emits: ['close']
          },
          Teleport: true
        }
      }
    });
  });
}

describe('BillingDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetByEncounterFn.mockResolvedValue(mockRecord);
    mockListItemsFn.mockResolvedValue(mockItems);
    mockCreateEstimateFn.mockResolvedValue({ ...mockRecord, status: 'estimated' as const });
    mockAddItemFn.mockResolvedValue({});
    mockUpdateStatusFn.mockResolvedValue({ ...mockRecord, status: 'open' as const });
    mockGetPatientName.mockResolvedValue('Rex');
    mockGetOwnerName.mockResolvedValue('Joao Silva');
  });

  it('shows loading state initially', async () => {
    const BillingDetailPage = (await import('../BillingDetailPage.vue')).default;
    const wrapper = mount(BillingDetailPage);

    expect(wrapper.find('.page-loading').exists()).toBe(true);
  });

  it('shows error state when API fails to load record', async () => {
    mockGetByEncounterFn.mockRejectedValue(new Error('Faturamento nao encontrado'));

    const BillingDetailPage = (await import('../BillingDetailPage.vue')).default;
    const wrapper = mount(BillingDetailPage);

    await flushPromises();
    expect(wrapper.find('[role="alert"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Faturamento nao encontrado');
  });

  it('renders billing details when loaded', async () => {
    const BillingDetailPage = (await import('../BillingDetailPage.vue')).default;
    const wrapper = mount(BillingDetailPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Faturamento');
    expect(wrapper.text()).toContain('Rex');
    expect(wrapper.text()).toContain('Joao Silva');
  });

  it('shows status badge with correct label', async () => {
    const BillingDetailPage = (await import('../BillingDetailPage.vue')).default;
    const wrapper = mount(BillingDetailPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Rascunho');
  });

  it('shows currency and subtotal', async () => {
    const BillingDetailPage = (await import('../BillingDetailPage.vue')).default;
    const wrapper = mount(BillingDetailPage);

    await flushPromises();
    expect(wrapper.text()).toContain('BRL');
  });

  it('shows billing items table when items exist', async () => {
    const BillingDetailPage = (await import('../BillingDetailPage.vue')).default;
    const wrapper = mount(BillingDetailPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Itens de');
    expect(wrapper.text()).toContain('Consulta veterinaria');
    expect(wrapper.text()).toContain('Hemograma completo');
  });

  it('shows item type labels', async () => {
    const BillingDetailPage = (await import('../BillingDetailPage.vue')).default;
    const wrapper = mount(BillingDetailPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Servi');
    expect(wrapper.text()).toContain('Exame');
  });

  it('formats currency amounts correctly', async () => {
    const BillingDetailPage = (await import('../BillingDetailPage.vue')).default;
    const wrapper = mount(BillingDetailPage);

    await flushPromises();
    expect(wrapper.text()).toContain('R$');
  });

  it('shows empty items message when no items exist', async () => {
    mockListItemsFn.mockResolvedValue([]);

    const BillingDetailPage = (await import('../BillingDetailPage.vue')).default;
    const wrapper = mount(BillingDetailPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Nenhum item adicionado ainda');
  });

  it('shows item count in items header', async () => {
    const BillingDetailPage = (await import('../BillingDetailPage.vue')).default;
    const wrapper = mount(BillingDetailPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Itens de');
    expect(wrapper.text()).toContain('(2)');
  });

  it('shows add item button for non-settled records', async () => {
    const BillingDetailPage = (await import('../BillingDetailPage.vue')).default;
    const wrapper = mount(BillingDetailPage);

    await flushPromises();
    const addBtn = wrapper.findAll('button').find((b) => b.text().includes('Adicionar Item'));
    expect(addBtn).toBeTruthy();
  });

  it('does not show add item button for settled records', async () => {
    mockGetByEncounterFn.mockResolvedValue({ ...mockRecord, status: 'settled' as const });

    const BillingDetailPage = (await import('../BillingDetailPage.vue')).default;
    const wrapper = mount(BillingDetailPage);

    await flushPromises();
    const addBtn = wrapper.findAll('button').find((b) => b.text().includes('Adicionar Item'));
    expect(addBtn).toBeFalsy();
  });

  it('shows generate estimate button for draft records', async () => {
    const BillingDetailPage = (await import('../BillingDetailPage.vue')).default;
    const wrapper = mount(BillingDetailPage);

    await flushPromises();
    const estimateBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('Gerar Estimativa'));
    expect(estimateBtn).toBeTruthy();
  });

  it('does not show generate estimate button for non-draft records', async () => {
    mockGetByEncounterFn.mockResolvedValue({ ...mockRecord, status: 'open' as const });

    const BillingDetailPage = (await import('../BillingDetailPage.vue')).default;
    const wrapper = mount(BillingDetailPage);

    await flushPromises();
    const estimateBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('Gerar Estimativa'));
    expect(estimateBtn).toBeFalsy();
  });

  it('generates estimate successfully', async () => {
    const BillingDetailPage = (await import('../BillingDetailPage.vue')).default;
    const wrapper = mount(BillingDetailPage);

    await flushPromises();
    const estimateBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('Gerar Estimativa'));
    await estimateBtn!.trigger('click');
    await flushPromises();

    expect(mockCreateEstimateFn).toHaveBeenCalledWith({ encounterId: 'enc-1' });
    expect(wrapper.text()).toContain('Estimado');
  });

  it('shows error alert when estimate generation fails', async () => {
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});
    mockCreateEstimateFn.mockRejectedValue(new Error('Erro ao gerar estimativa'));

    const BillingDetailPage = (await import('../BillingDetailPage.vue')).default;
    const wrapper = mount(BillingDetailPage);

    await flushPromises();
    const estimateBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('Gerar Estimativa'));
    await estimateBtn!.trigger('click');
    await flushPromises();

    expect(alertMock).toHaveBeenCalledWith('Erro ao gerar estimativa');
    alertMock.mockRestore();
  });

  it('opens add item modal when clicking Adicionar Item', async () => {
    const BillingDetailPage = (await import('../BillingDetailPage.vue')).default;
    const wrapper = mount(BillingDetailPage);

    await flushPromises();
    const addBtn = wrapper.findAll('button').find((b) => b.text().includes('Adicionar Item'));
    await addBtn!.trigger('click');
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('Adicionar Item de Cobran');
    expect(wrapper.find('#itemType').exists()).toBe(true);
    expect(wrapper.find('#itemDescription').exists()).toBe(true);
    expect(wrapper.find('#itemQuantity').exists()).toBe(true);
    expect(wrapper.find('#itemPrice').exists()).toBe(true);
  });

  it('adds item successfully', async () => {
    const BillingDetailPage = (await import('../BillingDetailPage.vue')).default;
    const wrapper = mount(BillingDetailPage);

    await flushPromises();
    const addBtn = wrapper.findAll('button').find((b) => b.text().includes('Adicionar Item'));
    await addBtn!.trigger('click');
    await wrapper.vm.$nextTick();

    const typeSelect = wrapper.find('#itemType');
    await typeSelect.setValue('service');

    const descInput = wrapper.find('#itemDescription');
    await descInput.setValue('Nova consulta');

    const qtyInput = wrapper.find('#itemQuantity');
    await qtyInput.setValue('2');

    const priceInput = wrapper.find('#itemPrice');
    await priceInput.setValue('100');

    const submitBtn = wrapper
      .findAll('.ds-modal__footer .ds-btn')
      .find((b) => b.text().includes('Adicionar'));
    await submitBtn!.trigger('click');
    await flushPromises();

    expect(mockAddItemFn).toHaveBeenCalledWith(
      expect.objectContaining({
        encounterId: 'enc-1',
        itemType: 'service',
        description: 'Nova consulta',
        quantity: 2,
        unitPriceAmount: 100
      })
    );
  });

  it('disables add item button when form is incomplete', async () => {
    const BillingDetailPage = (await import('../BillingDetailPage.vue')).default;
    const wrapper = mount(BillingDetailPage);

    await flushPromises();
    const addBtn = wrapper.findAll('button').find((b) => b.text().includes('Adicionar Item'));
    await addBtn!.trigger('click');
    await wrapper.vm.$nextTick();

    const submitBtn = wrapper
      .findAll('.ds-modal__footer .ds-btn')
      .find((b) => b.text().includes('Adicionar'));
    expect(submitBtn!.attributes('disabled')).toBeDefined();
  });

  it('shows error alert when add item fails', async () => {
    mockAddItemFn.mockRejectedValue(new Error('Erro ao adicionar item'));

    const BillingDetailPage = (await import('../BillingDetailPage.vue')).default;
    const wrapper = mount(BillingDetailPage);

    await flushPromises();
    const addBtn = wrapper.findAll('button').find((b) => b.text().includes('Adicionar Item'));
    await addBtn!.trigger('click');
    await wrapper.vm.$nextTick();

    const typeSelect = wrapper.find('#itemType');
    await typeSelect.setValue('service');

    const descInput = wrapper.find('#itemDescription');
    await descInput.setValue('Consulta');

    const qtyInput = wrapper.find('#itemQuantity');
    await qtyInput.setValue('1');

    const priceInput = wrapper.find('#itemPrice');
    await priceInput.setValue('50');

    const submitBtn = wrapper
      .findAll('.ds-modal__footer .ds-btn')
      .find((b) => b.text().includes('Adicionar'));
    await submitBtn!.trigger('click');
    await flushPromises();

    expect(wrapper.find('[role="alert"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Erro ao adicionar item');
  });

  it('shows update status button for estimated/open records', async () => {
    mockGetByEncounterFn.mockResolvedValue({ ...mockRecord, status: 'estimated' as const });

    const BillingDetailPage = (await import('../BillingDetailPage.vue')).default;
    const wrapper = mount(BillingDetailPage);

    await flushPromises();
    const statusBtn = wrapper.findAll('button').find((b) => b.text().includes('Atualizar Status'));
    expect(statusBtn).toBeTruthy();
  });

  it('does not show update status button for draft records', async () => {
    const BillingDetailPage = (await import('../BillingDetailPage.vue')).default;
    const wrapper = mount(BillingDetailPage);

    await flushPromises();
    const statusBtn = wrapper.findAll('button').find((b) => b.text().includes('Atualizar Status'));
    expect(statusBtn).toBeFalsy();
  });

  it('opens status update modal', async () => {
    mockGetByEncounterFn.mockResolvedValue({ ...mockRecord, status: 'estimated' as const });

    const BillingDetailPage = (await import('../BillingDetailPage.vue')).default;
    const wrapper = mount(BillingDetailPage);

    await flushPromises();
    const statusBtn = wrapper.findAll('button').find((b) => b.text().includes('Atualizar Status'));
    await statusBtn!.trigger('click');
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('Atualizar Status');
    expect(wrapper.find('#newStatus').exists()).toBe(true);
    expect(wrapper.find('#adminNotes').exists()).toBe(true);
  });

  it('updates status successfully', async () => {
    mockGetByEncounterFn.mockResolvedValue({ ...mockRecord, status: 'estimated' as const });

    const BillingDetailPage = (await import('../BillingDetailPage.vue')).default;
    const wrapper = mount(BillingDetailPage);

    await flushPromises();
    const statusBtn = wrapper.findAll('button').find((b) => b.text().includes('Atualizar Status'));
    await statusBtn!.trigger('click');
    await wrapper.vm.$nextTick();

    const statusSelect = wrapper.find('#newStatus');
    await statusSelect.setValue('open');

    const submitBtn = wrapper
      .findAll('.ds-modal__footer .ds-btn')
      .find((b) => b.text().includes('Atualizar'));
    await submitBtn!.trigger('click');
    await flushPromises();

    expect(mockUpdateStatusFn).toHaveBeenCalledWith('enc-1', {
      status: 'open',
      administrativeNotes: undefined
    });
    expect(wrapper.text()).toContain('Aberto');
  });

  it('shows error alert when status update fails', async () => {
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});
    mockUpdateStatusFn.mockRejectedValue(new Error('Erro ao atualizar status'));
    mockGetByEncounterFn.mockResolvedValue({ ...mockRecord, status: 'estimated' as const });

    const BillingDetailPage = (await import('../BillingDetailPage.vue')).default;
    const wrapper = mount(BillingDetailPage);

    await flushPromises();
    const statusBtn = wrapper.findAll('button').find((b) => b.text().includes('Atualizar Status'));
    await statusBtn!.trigger('click');
    await wrapper.vm.$nextTick();

    const statusSelect = wrapper.find('#newStatus');
    await statusSelect.setValue('open');

    const submitBtn = wrapper
      .findAll('.ds-modal__footer .ds-btn')
      .find((b) => b.text().includes('Atualizar'));
    await submitBtn!.trigger('click');
    await flushPromises();

    expect(alertMock).toHaveBeenCalledWith('Erro ao atualizar status');
    alertMock.mockRestore();
  });

  it('shows back link to billing list', async () => {
    const BillingDetailPage = (await import('../BillingDetailPage.vue')).default;
    const wrapper = mount(BillingDetailPage, {
      global: {
        stubs: {
          RouterLink: {
            template: '<a :href="to"><slot /></a>',
            props: ['to']
          }
        }
      }
    });

    await flushPromises();
    const backLink = wrapper.findAll('a').find((a) => a.text() === 'Voltar');
    expect(backLink).toBeTruthy();
    expect(backLink!.attributes('href')).toBe('/billing');
  });

  it('shows item type options in add item modal', async () => {
    const BillingDetailPage = (await import('../BillingDetailPage.vue')).default;
    const wrapper = mount(BillingDetailPage);

    await flushPromises();
    const addBtn = wrapper.findAll('button').find((b) => b.text().includes('Adicionar Item'));
    await addBtn!.trigger('click');
    await wrapper.vm.$nextTick();

    const select = wrapper.find('#itemType');
    const options = select.findAll('option');
    expect(options).toHaveLength(6);
    expect(options[0].text()).toContain('Servi');
    expect(options[1].text()).toBe('Material');
    expect(options[2].text()).toBe('Procedimento');
  });
});
