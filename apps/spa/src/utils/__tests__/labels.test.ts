import { describe, expect, it } from 'vitest';
import { clinicalLabels } from '@/utils/labels';

describe('clinical vocabulary', () => {
  it('keeps the FEA-015 clinical glossary canonical', () => {
    expect(clinicalLabels).toEqual({
      tutor: {
        singular: 'Tutor',
        singularLower: 'tutor',
        plural: 'Tutores',
        pluralLower: 'tutores'
      },
      patient: {
        singular: 'Paciente',
        singularLower: 'paciente',
        plural: 'Pacientes',
        pluralLower: 'pacientes'
      },
      encounter: {
        singular: 'Atendimento',
        singularLower: 'atendimento',
        plural: 'Atendimentos',
        pluralLower: 'atendimentos'
      },
      appointment: {
        singular: 'Agendamento',
        singularLower: 'agendamento',
        plural: 'Agendamentos',
        pluralLower: 'agendamentos'
      },
      agenda: 'Agenda',
      queue: 'Fila',
      conveyor: 'Esteira'
    });
  });
});
