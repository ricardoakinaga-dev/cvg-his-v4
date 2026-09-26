import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';

import PatientAllergiesEditor from '../PatientAllergiesEditor.vue';

describe('PatientAllergiesEditor', () => {
  it('adds, edits and removes structured allergies through v-model', async () => {
    const wrapper = mount(PatientAllergiesEditor, {
      props: {
        modelValue: [],
        'onUpdate:modelValue': (value: unknown) => wrapper.setProps({ modelValue: value as never })
      }
    });

    await wrapper.get('button').trigger('click');
    expect(wrapper.props('modelValue')).toEqual([{ substance: '', severity: 'moderate' }]);

    await wrapper.get('#allergy-substance-0').setValue('Dipirona');
    await wrapper.get('#allergy-severity-0').setValue('anaphylaxis');
    await wrapper.get('#allergy-class-0').setValue('pyrazolones');
    expect(wrapper.props('modelValue')).toEqual([
      { substance: 'Dipirona', severity: 'anaphylaxis', drugClass: 'pyrazolones' }
    ]);

    await wrapper.get('button[aria-label^="Remover alergia"]').trigger('click');
    expect(wrapper.props('modelValue')).toEqual([]);
  });
});
