import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';

import DsCard from '../DsCard.vue';

describe('DsCard.vue', () => {
  it('does not block spaces typed in a nested input', () => {
    const wrapper = mount(DsCard, {
      slots: { default: '<input id="description" />' }
    });
    const event = new KeyboardEvent('keydown', {
      key: ' ',
      bubbles: true,
      cancelable: true
    });

    wrapper.find('#description').element.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    expect(wrapper.emitted('click')).toBeUndefined();
  });

  it('activates an interactive card with the space key', async () => {
    const wrapper = mount(DsCard, {
      props: { interactive: true },
      slots: { default: 'Abrir' }
    });

    await wrapper.trigger('keydown', { key: ' ' });

    expect(wrapper.emitted('click')).toHaveLength(1);
  });

  it('renders the title slot as a card header', () => {
    const wrapper = mount(DsCard, {
      slots: { title: 'Custom title', default: 'Content' }
    });

    expect(wrapper.find('.ds-card__header').exists()).toBe(true);
    expect(wrapper.find('.ds-card__header').text()).toBe('Custom title');
  });
});
