import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, ref } from 'vue';
import DsCheckbox from '../DsCheckbox.vue';

describe('DsCheckbox.vue', () => {
  it('renders label', () => {
    const wrapper = mount(DsCheckbox, {
      props: { label: 'Test Label' }
    });
    expect(wrapper.text()).toContain('Test Label');
  });

  it('updates v-model boolean value', async () => {
    const TestComponent = defineComponent({
      components: { DsCheckbox },
      setup() {
        const val = ref(false);
        return { val };
      },
      template: '<DsCheckbox v-model="val" id="test-check" />'
    });

    const wrapper = mount(TestComponent);
    const input = wrapper.find('input[type="checkbox"]');

    await input.setValue(true);
    expect(wrapper.vm.val).toBe(true);

    await input.setValue(false);
    expect(wrapper.vm.val).toBe(false);
  });

  it('renders disabled state', () => {
    const wrapper = mount(DsCheckbox, {
      props: { disabled: true }
    });
    const input = wrapper.find('input');
    expect(input.attributes('disabled')).toBeDefined();
    expect(wrapper.classes()).toContain('ds-checkbox-wrapper--disabled');
  });

  it('renders error message and state', () => {
    const wrapper = mount(DsCheckbox, {
      props: { error: 'Required field' }
    });
    expect(wrapper.text()).toContain('Required field');
    expect(wrapper.classes()).toContain('ds-checkbox-wrapper--error');
  });
});
