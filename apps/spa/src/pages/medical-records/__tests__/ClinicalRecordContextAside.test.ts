import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import ClinicalRecordContextAside from '../ClinicalRecordContextAside.vue';

describe('ClinicalRecordContextAside', () => {
  it('renders synthetic clinical context and preserves page-owned destinations', () => {
    const wrapper = mount(ClinicalRecordContextAside, {
      props: {
        patientName: 'Paciente Sintético',
        patientSummary: 'Canina · SRD · Fêmea · 4 ano(s) · 12 kg',
        ownerName: 'Tutor Sintético',
        ownerPrimaryContact: 'Contato sintético',
        recordStatusLabel: 'Aberto',
        activeEntryCount: 3,
        prescriptionCount: 1,
        ownerHref: '/owners/owner-1',
        patientHref: '/patients/patient-1'
      }
    });

    expect(wrapper.get('aside').attributes('aria-label')).toBe('Resumo do paciente e tutor');
    expect(wrapper.text()).toContain('Paciente Sintético');
    expect(wrapper.text()).toContain('Tutor Sintético');
    expect(wrapper.text()).toContain('Contato sintético');
    expect(wrapper.text()).toContain('Aberto');
    expect(wrapper.text()).toContain('3');
    expect(wrapper.text()).toContain('1');
    expect(wrapper.get('a[href="/owners/owner-1"]').text()).toContain('Ver tutor');
    expect(wrapper.get('a[href="/patients/patient-1"]').text()).toContain('Ver paciente');
  });

  it('does not render navigation actions without page-provided destinations', () => {
    const wrapper = mount(ClinicalRecordContextAside, {
      props: {
        patientName: 'Paciente Sintético',
        patientSummary: 'Contexto indisponível',
        ownerName: '',
        ownerPrimaryContact: 'Não informado',
        recordStatusLabel: 'Concluído',
        activeEntryCount: 0,
        prescriptionCount: 0
      }
    });

    expect(wrapper.text()).toContain('Não informado');
    expect(wrapper.findAll('a')).toHaveLength(0);
  });
});
