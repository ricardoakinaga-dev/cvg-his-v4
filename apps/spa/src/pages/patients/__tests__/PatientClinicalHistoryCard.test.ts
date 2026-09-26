import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import PatientClinicalHistoryCard from '../PatientClinicalHistoryCard.vue';

function mountCard(overrides: Record<string, unknown> = {}) {
  return mount(PatientClinicalHistoryCard, {
    props: {
      draft: 'Histórico atual',
      summary: 'Registro confirmado.',
      expanded: true,
      canWrite: true,
      saving: false,
      encounterId: 'enc-1',
      ...overrides
    },
    global: {
      stubs: {
        DsButton: {
          template:
            '<button :disabled="disabled" :aria-busy="loading" :data-to="to" @click="$emit(\'click\')"><slot /></button>',
          props: ['disabled', 'loading', 'to', 'tag', 'variant', 'size'],
          emits: ['click']
        },
        DsIcon: true
      }
    }
  });
}

describe('PatientClinicalHistoryCard', () => {
  it('preserves the accordion region and emits controlled draft and page navigation events', async () => {
    const wrapper = mountCard();
    const trigger = wrapper.get('#patient-card-clinical-history-trigger');

    expect(trigger.attributes('aria-expanded')).toBe('true');
    expect(trigger.attributes('aria-controls')).toBe('patient-card-clinical-history-panel');
    expect(wrapper.get('#patient-card-clinical-history-panel').attributes()).toMatchObject({
      role: 'region',
      'aria-labelledby': 'patient-card-clinical-history-trigger'
    });
    expect(wrapper.get('label[for="patient-clinical-history-field"]').text()).toContain(
      'Histórico clínico longitudinal'
    );

    await wrapper.get('textarea').setValue('Novo rascunho');
    await trigger.trigger('click');
    await trigger.trigger('keydown', { key: 'ArrowDown' });
    await wrapper.findAll('button')[1]!.trigger('click');

    expect(wrapper.emitted('update:draft')).toEqual([['Novo rascunho']]);
    expect(wrapper.emitted('toggle')).toHaveLength(1);
    expect(wrapper.emitted('header-keydown')?.[0]?.[0]).toMatchObject({ key: 'ArrowDown' });
    expect(wrapper.emitted('save')).toHaveLength(1);
  });

  it('keeps closed encounters read-only and routes to the full history', () => {
    const wrapper = mountCard({ expanded: true, canWrite: false, encounterId: null });

    expect(wrapper.get('textarea').attributes('disabled')).toBeDefined();
    expect(wrapper.text()).toContain('Abra um atendimento para registrar');
    expect(wrapper.findAll('button')[1]?.attributes('disabled')).toBeDefined();
    expect(wrapper.findAll('button')[2]?.attributes('data-to')).toBe('/medical-records');
  });
});
