import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsBadge from '@cvg-his-v2/design-system/vue/DsBadge.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsSpinner from '@cvg-his-v2/design-system/vue/DsSpinner.vue';
import DsTabs from '@cvg-his-v2/design-system/vue/DsTabs.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsModal from '@cvg-his-v2/design-system/vue/DsModal.vue';

describe('DsButton', () => {
  it('renders with default props', () => {
    const wrapper = mount(DsButton, { slots: { default: 'Click me' } });
    expect(wrapper.text()).toContain('Click me');
    expect(wrapper.classes()).toContain('ds-btn');
    expect(wrapper.classes()).toContain('ds-btn--primary');
    expect(wrapper.classes()).toContain('ds-btn--md');
  });

  it('applies variant classes', () => {
    const wrapper = mount(DsButton, {
      props: { variant: 'danger' },
      slots: { default: 'Delete' }
    });
    expect(wrapper.classes()).toContain('ds-btn--danger');
  });

  it('applies size classes', () => {
    const wrapper = mount(DsButton, {
      props: { size: 'sm' },
      slots: { default: 'Small' }
    });
    expect(wrapper.classes()).toContain('ds-btn--sm');
  });

  it('is disabled when prop is true', () => {
    const wrapper = mount(DsButton, {
      props: { disabled: true },
      slots: { default: 'Disabled' }
    });
    expect(wrapper.attributes('disabled')).toBeDefined();
  });

  it('emits click when not disabled', async () => {
    const wrapper = mount(DsButton, { slots: { default: 'Click' } });
    await wrapper.trigger('click');
    expect(wrapper.emitted('click')).toHaveLength(1);
  });

  it('does not emit click when disabled', async () => {
    const wrapper = mount(DsButton, {
      props: { disabled: true },
      slots: { default: 'Click' }
    });
    await wrapper.trigger('click');
    expect(wrapper.emitted('click')).toBeUndefined();
  });

  it('shows spinner when loading', () => {
    const wrapper = mount(DsButton, {
      props: { loading: true },
      slots: { default: 'Loading' }
    });
    expect(wrapper.find('.ds-btn__spinner').exists()).toBe(true);
    expect(wrapper.classes()).toContain('ds-btn--loading');
  });

  it('renders as anchor when tag is a', () => {
    const wrapper = mount(DsButton, {
      props: { tag: 'a', href: '/test' },
      slots: { default: 'Link' }
    });
    expect(wrapper.element.tagName).toBe('A');
    expect(wrapper.attributes('href')).toBe('/test');
  });

  it('renders as anchor when to prop is provided', () => {
    const wrapper = mount(DsButton, {
      props: { to: '/patients' },
      slots: { default: 'Patients' }
    });
    expect(wrapper.element.tagName).toBe('A');
    expect(wrapper.attributes('href')).toBe('/patients');
  });

  it('prioritizes to over tag', () => {
    const wrapper = mount(DsButton, {
      props: { tag: 'a', href: '/old', to: '/new' },
      slots: { default: 'Link' }
    });
    expect(wrapper.element.tagName).toBe('A');
    expect(wrapper.attributes('href')).toBe('/new');
  });

  it('renders as anchor with to and disabled', () => {
    const wrapper = mount(DsButton, {
      props: { to: '/test', disabled: true },
      slots: { default: 'Link' }
    });
    expect(wrapper.element.tagName).toBe('A');
    expect(wrapper.attributes('disabled')).toBeDefined();
    expect(wrapper.attributes('href')).toBe('/test');
  });
});

describe('DsCard', () => {
  it('renders with default props', () => {
    const wrapper = mount(DsCard, { slots: { default: 'Card content' } });
    expect(wrapper.text()).toContain('Card content');
    expect(wrapper.classes()).toContain('ds-card');
    expect(wrapper.classes()).toContain('ds-card--default');
  });

  it('applies variant classes', () => {
    const wrapper = mount(DsCard, { props: { variant: 'elevated' } });
    expect(wrapper.classes()).toContain('ds-card--elevated');
  });

  it('renders title in header', () => {
    const wrapper = mount(DsCard, { props: { title: 'My Card' } });
    expect(wrapper.find('.ds-card__title').text()).toBe('My Card');
  });

  it('renders footer slot', () => {
    const wrapper = mount(DsCard, {
      slots: { default: 'Body', footer: 'Footer content' }
    });
    expect(wrapper.find('.ds-card__footer').text()).toBe('Footer content');
  });

  it('renders as article tag', () => {
    const wrapper = mount(DsCard, { props: { tag: 'article' } });
    expect(wrapper.element.tagName).toBe('ARTICLE');
  });
});

describe('DsBadge', () => {
  it('renders with default props', () => {
    const wrapper = mount(DsBadge, { slots: { default: 'Badge' } });
    expect(wrapper.text()).toBe('Badge');
    expect(wrapper.classes()).toContain('ds-badge');
    expect(wrapper.classes()).toContain('ds-badge--default');
  });

  it('applies variant classes', () => {
    const wrapper = mount(DsBadge, {
      props: { variant: 'success' },
      slots: { default: 'OK' }
    });
    expect(wrapper.classes()).toContain('ds-badge--success');
  });

  it('applies size classes', () => {
    const wrapper = mount(DsBadge, {
      props: { size: 'md' },
      slots: { default: 'Medium' }
    });
    expect(wrapper.classes()).toContain('ds-badge--md');
  });

  it('renders dot indicator', () => {
    const wrapper = mount(DsBadge, {
      props: { dot: true },
      slots: { default: 'Active' }
    });
    expect(wrapper.classes()).toContain('ds-badge--dot');
  });
});

describe('DsAlert', () => {
  it('renders message', () => {
    const wrapper = mount(DsAlert, { slots: { default: 'Alert message' } });
    expect(wrapper.text()).toContain('Alert message');
    expect(wrapper.attributes('role')).toBe('alert');
  });

  it('applies variant classes', () => {
    const wrapper = mount(DsAlert, {
      props: { variant: 'danger' },
      slots: { default: 'Error' }
    });
    expect(wrapper.classes()).toContain('ds-alert--danger');
  });

  it('renders title', () => {
    const wrapper = mount(DsAlert, {
      props: { title: 'Warning' },
      slots: { default: 'Details here' }
    });
    expect(wrapper.find('.ds-alert__title').text()).toBe('Warning');
  });

  it('renders dismiss button when dismissible', () => {
    const wrapper = mount(DsAlert, {
      props: { dismissible: true },
      slots: { default: 'Dismiss me' }
    });
    expect(wrapper.find('.ds-alert__dismiss').exists()).toBe(true);
  });

  it('emits dismiss on button click', async () => {
    const wrapper = mount(DsAlert, {
      props: { dismissible: true },
      slots: { default: 'Dismiss me' }
    });
    await wrapper.find('.ds-alert__dismiss').trigger('click');
    expect(wrapper.emitted('dismiss')).toHaveLength(1);
  });
});

describe('DsSpinner', () => {
  it('renders with default size', () => {
    const wrapper = mount(DsSpinner);
    expect(wrapper.classes()).toContain('ds-spinner');
    expect(wrapper.classes()).toContain('ds-spinner--md');
  });

  it('applies size classes', () => {
    const wrapper = mount(DsSpinner, { props: { size: 'lg' } });
    expect(wrapper.classes()).toContain('ds-spinner--lg');
  });
});

describe('DsTabs', () => {
  const tabs = [
    { key: 'tab1', label: 'Tab One' },
    { key: 'tab2', label: 'Tab Two' }
  ];

  it('renders all tabs', () => {
    const wrapper = mount(DsTabs, {
      props: { tabs, modelValue: 'tab1' }
    });
    expect(wrapper.findAll('.ds-tab')).toHaveLength(2);
  });

  it('marks active tab', () => {
    const wrapper = mount(DsTabs, {
      props: { tabs, modelValue: 'tab2' }
    });
    const activeTab = wrapper
      .findAll('.ds-tab')
      .find((t) => t.classes().includes('ds-tab--active'));
    expect(activeTab?.text()).toBe('Tab Two');
  });

  it('emits update:modelValue on click', async () => {
    const wrapper = mount(DsTabs, {
      props: { tabs, modelValue: 'tab1' }
    });
    await wrapper.findAll('.ds-tab')[1].trigger('click');
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['tab2']);
  });
});

describe('DsInput', () => {
  it('renders text input', () => {
    const wrapper = mount(DsInput, { props: { modelValue: 'hello' } });
    expect(wrapper.find('input').exists()).toBe(true);
    expect(wrapper.find('input').attributes('type')).toBe('text');
  });

  it('renders label', () => {
    const wrapper = mount(DsInput, { props: { label: 'Email' } });
    expect(wrapper.find('.ds-input__label').text()).toBe('Email');
  });

  it('renders required indicator', () => {
    const wrapper = mount(DsInput, { props: { label: 'Name', required: true } });
    expect(wrapper.find('.ds-input__required').text()).toBe('*');
  });

  it('renders error message', () => {
    const wrapper = mount(DsInput, { props: { error: 'Required field' } });
    expect(wrapper.find('.ds-input__error').text()).toBe('Required field');
  });

  it('renders hint when no error', () => {
    const wrapper = mount(DsInput, { props: { hint: 'Max 50 chars' } });
    expect(wrapper.find('.ds-input__hint').text()).toBe('Max 50 chars');
  });

  it('emits update:modelValue on input', async () => {
    const wrapper = mount(DsInput);
    await wrapper.find('input').setValue('test value');
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['test value']);
  });

  it('renders textarea when type is textarea', () => {
    const wrapper = mount(DsInput, { props: { type: 'textarea' } });
    expect(wrapper.find('textarea').exists()).toBe(true);
  });

  it('renders select when type is select', () => {
    const wrapper = mount(DsInput, {
      props: { type: 'select', placeholder: 'Choose...' },
      slots: { default: '<option value="a">A</option>' }
    });
    expect(wrapper.find('select').exists()).toBe(true);
  });

  describe('datetime-local type', () => {
    it('renders input with type datetime-local', () => {
      const wrapper = mount(DsInput, { props: { type: 'datetime-local' } });
      expect(wrapper.find('input').attributes('type')).toBe('datetime-local');
    });
  });

  describe('search type', () => {
    it('renders input with type search', () => {
      const wrapper = mount(DsInput, { props: { type: 'search' } });
      expect(wrapper.find('input').attributes('type')).toBe('search');
    });
  });

  describe('step, min, max attributes', () => {
    it('applies step attribute', () => {
      const wrapper = mount(DsInput, {
        props: { type: 'number', step: 0.5 }
      });
      expect(wrapper.find('input').attributes('step')).toBe('0.5');
    });

    it('applies min attribute', () => {
      const wrapper = mount(DsInput, {
        props: { type: 'number', min: 0 }
      });
      expect(wrapper.find('input').attributes('min')).toBe('0');
    });

    it('applies max attribute', () => {
      const wrapper = mount(DsInput, {
        props: { type: 'number', max: 100 }
      });
      expect(wrapper.find('input').attributes('max')).toBe('100');
    });

    it('applies all three together', () => {
      const wrapper = mount(DsInput, {
        props: { type: 'number', step: 0.1, min: 1, max: 10 }
      });
      const input = wrapper.find('input');
      expect(input.attributes('step')).toBe('0.1');
      expect(input.attributes('min')).toBe('1');
      expect(input.attributes('max')).toBe('10');
    });
  });
});
