import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import ClinicalStepNavigator from '../ClinicalStepNavigator.vue';

const steps = [
  { key: 'anamnesis', number: 1, label: 'Anamnese' },
  { key: 'exam', number: 2, label: 'Exame' },
  { key: 'assessment', number: 3, label: 'Avaliação' },
  { key: 'plan', number: 4, label: 'Plano' }
] as const;

describe('ClinicalStepNavigator', () => {
  it('keeps tab and panel relationships explicit for the active step', () => {
    const wrapper = mount(ClinicalStepNavigator, {
      props: { steps, activeKey: 'exam' }
    });

    const activeTab = wrapper.get('[data-testid="clinical-step-exam"]');
    const inactiveTab = wrapper.get('[data-testid="clinical-step-anamnesis"]');

    expect(wrapper.get('[role="tablist"]').attributes('aria-label')).toBe('Etapas do prontuário');
    expect(activeTab.attributes()).toMatchObject({
      role: 'tab',
      'aria-selected': 'true',
      'aria-controls': 'medical-record-step-panel-exam',
      tabindex: '0'
    });
    expect(inactiveTab.attributes('tabindex')).toBe('-1');
  });

  it('emits the next step and handles Home/End keyboard navigation', async () => {
    const wrapper = mount(ClinicalStepNavigator, {
      props: { steps, activeKey: 'anamnesis' }
    });

    await wrapper.get('[data-testid="clinical-step-anamnesis"]').trigger('keydown', {
      key: 'ArrowRight'
    });
    await wrapper.get('[data-testid="clinical-step-anamnesis"]').trigger('keydown', {
      key: 'End'
    });

    expect(wrapper.emitted('select')).toEqual([['exam'], ['plan']]);
  });
});
