import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';

import IconSymbol from '../IconSymbol.vue';

describe('IconSymbol', () => {
  it('renders a semantic icon as an inline decorative SVG', () => {
    const wrapper = mount(IconSymbol, {
      props: {
        name: 'search',
        size: 20
      }
    });

    expect(wrapper.element.tagName).toBe('svg');
    expect(wrapper.attributes('viewBox')).toBe('0 0 24 24');
    expect(wrapper.attributes('width')).toBe('20');
    expect(wrapper.attributes('aria-hidden')).toBe('true');
    expect(wrapper.attributes('role')).toBeUndefined();
    expect(wrapper.findAll('path').length).toBeGreaterThan(0);
    expect(wrapper.text()).toBe('');
  });

  it('adapts legacy glyph input without placing the glyph in the DOM', () => {
    const legacyCalendar = String.fromCodePoint(0x1f4c5);
    const wrapper = mount(IconSymbol, {
      props: {
        name: legacyCalendar
      }
    });

    expect(wrapper.classes()).toContain('icon-symbol--calendar');
    expect(wrapper.html()).not.toContain(legacyCalendar);
    expect(wrapper.find('path').exists()).toBe(true);
  });

  it('exposes an accessible name when used as a standalone graphic', () => {
    const wrapper = mount(IconSymbol, {
      props: {
        name: 'brand',
        label: 'Marca CVG'
      }
    });

    expect(wrapper.attributes('role')).toBe('img');
    expect(wrapper.attributes('aria-label')).toBe('Marca CVG');
    expect(wrapper.attributes('aria-hidden')).toBeUndefined();
  });
});
