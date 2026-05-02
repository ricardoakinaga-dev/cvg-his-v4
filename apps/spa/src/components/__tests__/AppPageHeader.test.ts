import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import AppPageHeader from '../AppPageHeader.vue';

describe('AppPageHeader', () => {
  it('renders title prop', () => {
    const wrapper = mount(AppPageHeader, {
      props: { title: 'Page Title' }
    });
    expect(wrapper.find('.app-page-header__title').text()).toBe('Page Title');
  });

  it('renders subtitle prop', () => {
    const wrapper = mount(AppPageHeader, {
      props: { title: 'Title', subtitle: 'Subtitle text' }
    });
    expect(wrapper.find('.app-page-header__subtitle').text()).toBe('Subtitle text');
  });

  it('renders breadcrumb props in order', () => {
    const wrapper = mount(AppPageHeader, {
      props: { title: 'Title', breadcrumbs: ['Atendimento', 'Cadastros', 'Pacientes'] }
    });

    expect(wrapper.find('.app-page-header__breadcrumbs').exists()).toBe(true);
    expect(wrapper.text()).toContain('Atendimento');
    expect(wrapper.text()).toContain('Cadastros');
    expect(wrapper.text()).toContain('Pacientes');
  });

  it('renders optional clickable breadcrumb items without requiring consumers to change string breadcrumbs', () => {
    const wrapper = mount(AppPageHeader, {
      props: {
        title: 'Title',
        breadcrumbItems: [
          { key: 'home', label: 'Inicio', to: '/' },
          { key: 'queue', label: 'Esteira', to: '/queue' },
          { key: 'case', label: 'Atendimento', current: true }
        ]
      }
    });

    const links = wrapper.findAll('.app-page-header__breadcrumb-link');
    expect(links).toHaveLength(2);
    expect(links[0].attributes('href')).toBe('/');
    expect(links[1].attributes('href')).toBe('/queue');
    expect(wrapper.find('.app-page-header__breadcrumb-current').attributes('aria-current')).toBe('page');
  });

  it('renders title slot', () => {
    const wrapper = mount(AppPageHeader, {
      slots: { title: 'Custom Title <em>HTML</em>' }
    });
    expect(wrapper.find('.app-page-header__title').html()).toContain('Custom Title');
  });

  it('renders subtitle slot', () => {
    const wrapper = mount(AppPageHeader, {
      props: { title: 'Title' },
      slots: { subtitle: 'Custom Subtitle' }
    });
    expect(wrapper.find('.app-page-header__subtitle').text()).toBe('Custom Subtitle');
  });

  it('renders actions slot', () => {
    const wrapper = mount(AppPageHeader, {
      props: { title: 'Title' },
      slots: {
        actions: '<button class="custom-action">Action</button>'
      }
    });
    expect(wrapper.find('.app-page-header__actions').exists()).toBe(true);
    expect(wrapper.find('.custom-action').exists()).toBe(true);
  });

  it('does not render actions slot when empty', () => {
    const wrapper = mount(AppPageHeader, {
      props: { title: 'Title' }
    });
    expect(wrapper.find('.app-page-header__actions').exists()).toBe(false);
  });

  it('renders standardized CTA props when no actions slot is provided', () => {
    const wrapper = mount(AppPageHeader, {
      props: {
        title: 'Title',
        primaryAction: {
          label: 'Novo',
          to: '/new'
        },
        secondaryActions: [
          {
            label: 'Atualizar',
            variant: 'secondary'
          }
        ]
      }
    });

    expect(wrapper.find('.app-page-header__actions').exists()).toBe(true);
    expect(wrapper.findAll('.ds-btn').length).toBe(2);
    expect(wrapper.text()).toContain('Novo');
    expect(wrapper.text()).toContain('Atualizar');
  });

  it('renders optional operational context and next steps', () => {
    const wrapper = mount(AppPageHeader, {
      props: {
        title: 'Atendimento',
        contextItems: [
          { key: 'patient', label: 'Animal', value: 'Luna' },
          { key: 'status', label: 'Status', value: 'Em atendimento', tone: 'warning' }
        ],
        nextSteps: [
          {
            key: 'handoff',
            label: 'Devolver para recepcao',
            description: 'Resumo clinico e pendencias',
            to: '/queue'
          }
        ]
      }
    });

    expect(wrapper.find('.app-page-header__context').text()).toContain('Luna');
    expect(wrapper.find('.app-page-header__context').text()).toContain('Em atendimento');
    expect(wrapper.find('.app-page-header__next-steps').text()).toContain('Devolver para recepcao');
    expect(wrapper.find('.app-page-header__next-step').attributes('href')).toBe('/queue');
  });

  it('keeps a single visual primary CTA when secondary actions accidentally request primary variant', () => {
    const wrapper = mount(AppPageHeader, {
      props: {
        title: 'Title',
        primaryAction: {
          label: 'Continuar'
        },
        secondaryActions: [
          {
            label: 'Atualizar',
            variant: 'primary'
          }
        ]
      }
    });

    const buttons = wrapper.findAll('.ds-btn');
    expect(buttons).toHaveLength(2);
    expect(buttons[0].classes()).not.toContain('ds-btn--primary');
    expect(buttons[1].text()).toContain('Continuar');
  });

  it('applies correct container class', () => {
    const wrapper = mount(AppPageHeader, {
      props: { title: 'Title' }
    });
    expect(wrapper.find('.app-page-header').exists()).toBe(true);
  });
});
