import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

const mockOwnerListPage = vi.fn();
const mockOwnerCreate = vi.fn();
const mockPatientListPage = vi.fn();

vi.mock('@/services/owner', () => ({
  ownerService: {
    listPage: (...args: unknown[]) => mockOwnerListPage(...args),
    create: (...args: unknown[]) => mockOwnerCreate(...args)
  }
}));

vi.mock('@/services/patient', () => ({
  patientService: {
    listPage: (...args: unknown[]) => mockPatientListPage(...args)
  }
}));

describe('AppointmentClientSelectorModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOwnerListPage.mockResolvedValue({
      items: [
        {
          id: 'owner-1',
          accountId: 'acc-1',
          fullName: 'Maria Silva',
          documentId: '111',
          contacts: [{ label: 'WhatsApp', value: '1199999', type: 'whatsapp', primary: true }],
          financialResponsible: true,
          status: 'active',
          createdAt: '',
          updatedAt: ''
        }
      ],
      totalPages: 1
    });
    mockPatientListPage.mockResolvedValue({
      items: [{ id: 'pat-1', accountId: 'acc-1', name: 'Luna', species: 'canine', sex: 'female', primaryOwnerId: 'owner-1', status: 'active', createdAt: '', updatedAt: '' }]
    });
    mockOwnerCreate.mockResolvedValue({
      id: 'owner-new',
      accountId: 'acc-1',
      fullName: 'Novo Cliente',
      documentId: undefined,
      contacts: [{ label: 'WhatsApp', value: '1198888', type: 'whatsapp', primary: true }],
      financialResponsible: true,
      status: 'active',
      createdAt: '',
      updatedAt: ''
    });
  });

  it('loads registered clients and emits the selected owner', async () => {
    const Component = (await import('../AppointmentClientSelectorModal.vue')).default;
    const wrapper = mount(Component, {
      props: { open: true },
      global: {
        stubs: {
          DsModal: {
            template: '<div><slot /><slot name="footer" /></div>',
            props: ['open', 'title', 'size']
          }
        }
      }
    });

    await flushPromises();

    expect(wrapper.text()).toContain('Maria Silva');

    const addButton = wrapper.findAll('button').find((button) =>
      button.text().includes('Adicionar Cliente')
    );

    await addButton!.trigger('click');

    expect(wrapper.emitted('selected')?.[0]?.[0]).toMatchObject({ id: 'owner-1' });
  });

  it('exposes a keyboard-operable tablist and independent client actions', async () => {
    const Component = (await import('../AppointmentClientSelectorModal.vue')).default;
    const wrapper = mount(Component, {
      props: { open: true },
      global: {
        stubs: {
          DsModal: {
            template: '<div><slot /><slot name="footer" /></div>',
            props: ['open', 'title', 'size']
          }
        }
      }
    });

    await flushPromises();

    const tabs = wrapper.findAll('[role="tab"]');
    expect(tabs).toHaveLength(2);
    expect(tabs[0].attributes('aria-controls')).toBe('client-selector-panel-registered');
    expect(tabs[0].attributes('aria-selected')).toBe('true');
    expect(tabs[1].attributes('tabindex')).toBe('-1');

    const card = wrapper.find('.client-card');
    expect(card.element.tagName).toBe('ARTICLE');
    expect(card.find('.client-card__select').attributes('aria-pressed')).toBe('true');
    expect(card.findAll('button')).toHaveLength(2);

    await tabs[0].trigger('keydown', { key: 'ArrowRight' });
    expect(wrapper.findAll('[role="tab"]')[1].attributes('aria-selected')).toBe('true');

    await tabs[1].trigger('click');
    expect(wrapper.find('#client-selector-panel-new').attributes('aria-labelledby')).toBe(
      'client-selector-tab-new'
    );
  });

  it('creates a new owner from the inline tab and continues the flow', async () => {
    const Component = (await import('../AppointmentClientSelectorModal.vue')).default;
    const wrapper = mount(Component, {
      props: { open: true },
      global: {
        stubs: {
          DsModal: {
            template: '<div><slot /><slot name="footer" /></div>',
            props: ['open', 'title', 'size']
          }
        }
      }
    });

    await flushPromises();

    const newTab = wrapper.findAll('button').find((button) => button.text().includes('Novo Cliente'));
    await newTab!.trigger('click');
    await flushPromises();

    const nameInput = wrapper.find('#client-name');
    const whatsappInput = wrapper.find('#client-whatsapp');
    await nameInput.setValue('Novo Cliente');
    await whatsappInput.setValue('1198888');

    const createButton = wrapper.findAll('button').find((button) =>
      button.text().includes('Criar Cliente')
    );
    await createButton!.trigger('click');
    await flushPromises();

    expect(mockOwnerCreate).toHaveBeenCalled();
    expect(wrapper.emitted('selected')?.[0]?.[0]).toMatchObject({ id: 'owner-new' });
  });
});
