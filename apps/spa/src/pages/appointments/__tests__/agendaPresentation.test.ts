import { describe, expect, it } from 'vitest';
import type { SchedulingCockpitAppointmentSummary } from '@/types/appointment';
import {
  appointmentNeedsAttention,
  createAgendaGridHelpers,
  deriveMarkers,
  nextStepForAppointment,
  normalizeText,
  queueBridgeLabel,
  statusLabel
} from '../agendaPresentation';

function appointment(
  overrides: Partial<SchedulingCockpitAppointmentSummary> = {}
): SchedulingCockpitAppointmentSummary {
  return {
    id: 'appointment-1',
    accountId: 'account-1',
    patientId: 'patient-1',
    ownerId: 'owner-1',
    scheduledAt: '2026-09-07T09:00:00.000Z',
    durationMinutes: 30,
    visitType: 'scheduled',
    reason: 'Consulta',
    status: 'scheduled',
    createdAt: '2026-09-01T10:00:00.000Z',
    updatedAt: '2026-09-01T10:00:00.000Z',
    endsAt: '2026-09-07T09:30:00.000Z',
    conflicts: [],
    operational: {
      stage: 'scheduled',
      label: 'Aberto',
      source: 'appointment',
      updatedAt: '2026-09-01T10:00:00.000Z'
    },
    ...overrides
  };
}

describe('agendaPresentation', () => {
  it('normalizes search text and keeps operational labels explicit', () => {
    expect(normalizeText('  Vacinação do Cão  ')).toBe('vacinacao do cao');
    expect(statusLabel('checked_in')).toBe('Confirmado');
    expect(queueBridgeLabel(appointment({ practitionerStaffId: undefined }))).toBe(
      'Pendência antes do check-in'
    );
  });

  it('derives actionable markers and attention state without page-local state', () => {
    const item = appointment({
      reason: 'Vacinação e vermífugo',
      visitType: 'return',
      practitionerStaffId: 'staff-1',
      conflicts: [
        {
          type: 'staff_overlap',
          severity: 'warning',
          message: 'Conflito',
          startsAt: '2026-09-07T09:00:00.000Z',
          endsAt: '2026-09-07T09:30:00.000Z'
        }
      ]
    });

    expect(deriveMarkers(item)).toEqual(['Retorno', 'Vacina', 'Vermífugo', 'Ajuste operacional']);
    expect(appointmentNeedsAttention(item)).toBe(true);
    expect(nextStepForAppointment(item)).toBe('Confirmar chegada ou no-show');
  });

  it('derives day/week slots from explicit reactive source boundaries', () => {
    const items = [
      appointment({ id: 'a', practitionerStaffId: 'staff-1', scheduledAt: '2026-09-07T09:00:00' }),
      appointment({ id: 'b', practitionerStaffId: 'staff-1', scheduledAt: '2026-09-07T09:00:00' }),
      appointment({ id: 'c', practitionerStaffId: 'staff-2', scheduledAt: '2026-09-07T09:00:00' })
    ];
    const grid = createAgendaGridHelpers({
      filteredItems: () => items,
      blocks: () => [
        {
          id: 'block-1',
          accountId: 'account-1',
          title: 'Reunião',
          kind: 'team_huddle',
          startsAt: '2026-09-07T10:00:00',
          endsAt: '2026-09-07T11:00:00',
          practitionerStaffId: 'staff-1'
        }
      ],
      professionalColumns: () => [
        { id: 'unassigned', label: 'Sem profissional' },
        { id: 'staff-1', label: 'Dra. Ana' },
        { id: 'staff-2', label: 'Dr. Beto' }
      ]
    });

    expect(grid.appointmentsByDay('2026-09-07')).toHaveLength(3);
    expect(grid.appointmentsBySlot('2026-09-07', 'staff-1', 9)).toHaveLength(2);
    expect(grid.visibleAppointmentsBySlot('2026-09-07', 'staff-1', 9)).toHaveLength(2);
    expect(grid.hiddenSlotCount('2026-09-07', 'staff-1', 9)).toBe(0);
    expect(grid.blocksBySlot('2026-09-07', 'staff-1', 10)).toHaveLength(1);
    expect(grid.hasAvailableWeekSlot('2026-09-07', 9)).toBe(true);
    expect(grid.dayGridSummary('2026-09-07')).toContain('3 agendados');
  });
});
