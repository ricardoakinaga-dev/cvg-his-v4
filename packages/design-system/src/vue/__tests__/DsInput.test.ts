import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, ref } from 'vue';
import DsInput from '../DsInput.vue';

describe('DsInput.vue', () => {
  it('updates string value without modifiers', async () => {
    const TestComponent = defineComponent({
      components: { DsInput },
      setup() {
        const val = ref('');
        return { val };
      },
      template: '<DsInput v-model="val" id="test-input" />'
    });

    const wrapper = mount(TestComponent);
    const input = wrapper.find('input');

    await input.setValue('hello ');
    expect(wrapper.vm.val).toBe('hello ');
  });

  it('trims string with .trim modifier', async () => {
    const TestComponent = defineComponent({
      components: { DsInput },
      setup() {
        const val = ref('');
        return { val };
      },
      template: '<DsInput v-model.trim="val" id="test-input" />'
    });

    const wrapper = mount(TestComponent);
    const input = wrapper.find('input');

    await input.setValue('  spaced  ');
    expect(wrapper.vm.val).toBe('spaced');
  });

  it('converts to number with .number modifier', async () => {
    const TestComponent = defineComponent({
      components: { DsInput },
      setup() {
        const val = ref<string | number>('');
        return { val };
      },
      template: '<DsInput v-model.number="val" type="number" id="test-input" />'
    });

    const wrapper = mount(TestComponent);
    const input = wrapper.find('input');

    await input.setValue('42.5');
    expect(wrapper.vm.val).toBe(42.5);
  });

  it('keeps value as string if .number modifier fails to parse', async () => {
    const TestComponent = defineComponent({
      components: { DsInput },
      setup() {
        const val = ref<string | number>('');
        return { val };
      },
      template: '<DsInput v-model.number="val" id="test-input" />'
    });

    const wrapper = mount(TestComponent);
    const input = wrapper.find('input');

    await input.setValue('abc');
    expect(wrapper.vm.val).toBe('abc');
  });

  it('keeps empty string instead of converting to 0 with .number modifier', async () => {
    const TestComponent = defineComponent({
      components: { DsInput },
      setup() {
        const val = ref<string | number>(10);
        return { val };
      },
      template: '<DsInput v-model.number="val" id="test-input" />'
    });

    const wrapper = mount(TestComponent);
    const input = wrapper.find('input');

    await input.setValue('');
    expect(wrapper.vm.val).toBe('');
  });

  it('associates a visible hint with the input for assistive technology', () => {
    const wrapper = mount(DsInput, {
      props: {
        id: 'setup-token',
        modelValue: '',
        label: 'Token de instalação',
        hint: 'Use o token fornecido pelo operador.'
      }
    });

    const input = wrapper.get('input');
    const hint = wrapper.get('.ds-input__hint');

    expect(hint.attributes('id')).toBe('setup-token-hint');
    expect(input.attributes('aria-describedby')).toBe('setup-token-hint');
  });

  it.each([
    { type: 'textarea' as const, selector: 'textarea' },
    { type: 'select' as const, selector: 'select' }
  ])('associates a hint with a $type control', ({ type, selector }) => {
    const wrapper = mount(DsInput, {
      props: {
        id: `field-${type}`,
        modelValue: '',
        type,
        hint: 'Descrição acessível do campo.'
      }
    });

    expect(wrapper.get(selector).attributes('aria-describedby')).toBe(`field-${type}-hint`);
    expect(wrapper.get(`#field-${type}-hint`).text()).toContain('Descrição acessível');
  });

  it('switches the description target to the visible error message', () => {
    const wrapper = mount(DsInput, {
      props: {
        id: 'setup-token',
        modelValue: '',
        label: 'Token de instalação',
        hint: 'Use o token fornecido pelo operador.',
        error: 'Token inválido.'
      }
    });

    expect(wrapper.get('input').attributes('aria-describedby')).toBe('setup-token-error');
    expect(wrapper.find('#setup-token-hint').exists()).toBe(false);
    expect(wrapper.get('#setup-token-error').text()).toBe('Token inválido.');
  });
});
