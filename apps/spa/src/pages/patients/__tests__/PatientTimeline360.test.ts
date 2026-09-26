import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import PatientTimeline360, { type PatientTimelineFeedItem } from '../PatientTimeline360.vue';

const dsCardStub = {
  template: '<article><slot /></article>'
};

const routerLinkStub = {
  props: ['to'],
  template: '<a :href="to"><slot /></a>'
};

function mountTimeline(items: readonly PatientTimelineFeedItem[]) {
  return mount(PatientTimeline360, {
    props: { items },
    global: {
      stubs: {
        DsCard: dsCardStub,
        RouterLink: routerLinkStub
      }
    }
  });
}

describe('PatientTimeline360', () => {
  it('renders a linked event with the public timeline semantics', () => {
    const wrapper = mountTimeline([
      {
        id: 'enc-1',
        source: 'Atendimento',
        title: 'Paciente chamado',
        description: 'Evento operacional',
        occurredAt: '2024-01-03T09:05:00Z',
        href: '/encounters/enc-1'
      }
    ]);

    expect(wrapper.get('section[aria-label="Timeline 360 unificada do paciente"]')).toBeTruthy();
    expect(wrapper.text()).toContain('Atendimento · Paciente chamado');
    expect(wrapper.text()).toContain('03/01/2024');
    expect(wrapper.get('a[href="/encounters/enc-1"]').text()).toBe('Abrir');
  });

  it('keeps the explicit empty state when there are no events', () => {
    const wrapper = mountTimeline([]);

    expect(wrapper.text()).toContain('Sem eventos consolidados para a timeline 360.');
    expect(wrapper.find('.timeline-list').exists()).toBe(false);
  });
});
