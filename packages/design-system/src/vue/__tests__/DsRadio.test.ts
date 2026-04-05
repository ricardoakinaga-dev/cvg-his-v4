import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, ref } from 'vue';
import DsRadio from '../DsRadio.vue';

describe('DsRadio.vue', () => {
  it('renders label', () => {
    const wrapper = mount(DsRadio, {
      props: { label: 'Test Label', value: 'a' }
    });
    expect(wrapper.text()).toContain('Test Label');
  });

  it('updates v-model value', async () => {
    const TestComponent = defineComponent({
      components: { DsRadio },
      setup() {
        const val = ref('a');
        return { val };
      },
      template: `
        <div>
          <DsRadio v-model="val" value="a" id="opt-a" />
          <DsRadio v-model="val" value="b" id="opt-b" />
        </div>
      `
    });

    const wrapper = mount(TestComponent);
    const options = wrapper.findAll('input[type="radio"]');

    // Currently selected is 'a'
    expect((options[0].element as HTMLInputElement).checked).toBe(true);
    expect((options[1].element as HTMLInputElement).checked).toBe(false);

    // Select 'b'
    await options[1].setValue(true);
    expect(wrapper.vm.val).toBe('b');
    expect((options[0].element as HTMLInputElement).checked).toBe(false);
    expect((options[1].element as HTMLInputElement).checked).toBe(true);
  });

  it('renders disabled state', () => {
    const wrapper = mount(DsRadio, {
      props: { disabled: true, value: 'a' }
    });
    const input = wrapper.find('input');
    expect(input.attributes('disabled')).toBeDefined();
    expect(wrapper.classes()).toContain('ds-radio-wrapper--disabled');
  });

  it('renders error message and state', () => {
    const wrapper = mount(DsRadio, {
      props: { error: 'Required field', value: 'a' }
    });
    expect(wrapper.text()).toContain('Required field');
    expect(wrapper.classes()).toContain('ds-radio-wrapper--error');
  });
});
