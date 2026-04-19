import { beforeEach, describe, expect, it } from 'vitest';

import { OwnersService } from '@cvg-his-v2/module-owners';
import { PatientsService } from '@cvg-his-v2/module-patients';
import type { AccountId, EncounterId } from '@cvg-his-v2/shared-types';

import { SchedulingService } from '../../../packages/modules/scheduling/src/index.ts';

describe('module-scheduling / operational overview', () => {
  let service: SchedulingService;

  beforeEach(() => {
    const owners = new OwnersService();
    const patients = new PatientsService({ owners });
    const staff = {
      list: () => [
        {
          id: 'staff_vet',
          accountId: 'acc_cvg_demo' as AccountId,
          fullName: 'Veterinário Responsável',
          department: 'Clinica',
          jobTitle: 'Médico Veterinário',
          status: 'active' as const
        }
      ],
      getOrThrow: () => ({
        id: 'staff_vet',
        accountId: 'acc_cvg_demo' as AccountId,
        fullName: 'Veterinário Responsável',
        department: 'Clinica',
        jobTitle: 'Médico Veterinário',
        status: 'active' as const
      })
    };
    const services = {
      getOrThrow: (id: string) => ({ id, name: 'Consulta' })
    };

    service = new SchedulingService(owners, patients, [], {
      staff: staff as never,
      services: services as never
    });
  });

  it('returns lunch blocks and active professionals in the day overview', async () => {
    const accountId = 'acc_cvg_demo' as AccountId;

    const appointment = await service.createAppointment(accountId, {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      scheduledAt: '2026-04-15T10:00:00.000Z',
      durationMinutes: 30,
      practitionerStaffId: 'staff_vet',
      unit: 'Clinica',
      specialty: 'Clinico geral',
      visitType: 'scheduled',
      reason: 'Consulta com overview'
    });

    const overview = service.getSchedulingOverview(accountId, {
      viewMode: 'day',
      referenceDate: '2026-04-15T00:00:00.000Z'
    });

    expect(overview.professionals.some((professional) => professional.id === 'staff_vet')).toBe(
      true
    );
    expect(overview.items.some((item) => item.id === appointment.id)).toBe(true);
    expect(overview.blocks.some((block) => block.practitionerStaffId === 'staff_vet')).toBe(true);
  });

  it('projects queue-linked appointments into the operational stage summary', async () => {
    const accountId = 'acc_cvg_demo' as AccountId;

    const appointment = await service.createAppointment(accountId, {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      scheduledAt: '2026-04-16T10:00:00.000Z',
      durationMinutes: 30,
      practitionerStaffId: 'staff_vet',
      visitType: 'scheduled',
      reason: 'Jornada operacional'
    });
    const queueEntry = await service.checkIn(accountId, {
      patientId: appointment.patientId,
      ownerId: appointment.ownerId,
      appointmentId: appointment.id,
      reason: 'Check-in operacional'
    });
    await service.callQueueEntry(queueEntry.id);
    await service.attachEncounter(queueEntry.id, 'enc_operational' as EncounterId);

    const overview = service.getSchedulingOverview(accountId, {
      viewMode: 'day',
      referenceDate: '2026-04-16T00:00:00.000Z'
    });
    const item = overview.items.find((candidate) => candidate.id === appointment.id);

    expect(item?.operational.stage).toBe('in_triage');
    expect(item?.operational.queueEntryId).toBe(queueEntry.id);
    expect(item?.operational.encounterId).toBe('enc_operational');
    expect(item?.operational.source).toBe('queue');
  });

  it('returns outside-hours conflicts and actionable availability suggestions', async () => {
    const accountId = 'acc_cvg_demo' as AccountId;
    await service.createAppointment(accountId, {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      scheduledAt: '2026-04-17T09:00:00.000Z',
      durationMinutes: 30,
      practitionerStaffId: 'staff_vet',
      resourceLabel: 'Sala US',
      visitType: 'scheduled',
      reason: 'Ultrassom original'
    });

    const availability = service.getAvailability(accountId, {
      scheduledAt: '2026-04-17T06:30:00.000Z',
      durationMinutes: 30,
      patientId: 'patient_luna',
      practitionerStaffId: 'staff_vet',
      resourceLabel: 'Sala US'
    });

    expect(availability.available).toBe(false);
    expect(availability.conflicts.some((conflict) => conflict.type === 'outside_hours')).toBe(
      true
    );
    expect(availability.suggestions.length).toBeGreaterThan(0);
    expect(availability.suggestions.some((slot) => slot.available)).toBe(true);
  });

  it('flags resource and staff overlap for competing slots', async () => {
    const accountId = 'acc_cvg_demo' as AccountId;
    const owners = new OwnersService();
    const patients = new PatientsService({ owners });
    const otherPatient = patients.create(accountId, {
      name: 'Simba',
      species: 'cat',
      breed: 'SRD',
      sex: 'male',
      primaryOwnerId: 'owner_maria_silva'
    });

    await service.createAppointment(accountId, {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      scheduledAt: '2026-04-18T11:00:00.000Z',
      durationMinutes: 30,
      practitionerStaffId: 'staff_vet',
      resourceLabel: 'Consultorio 2',
      visitType: 'scheduled',
      reason: 'Consulta 1'
    });

    const availability = service.getAvailability(accountId, {
      scheduledAt: '2026-04-18T11:15:00.000Z',
      durationMinutes: 30,
      patientId: otherPatient.id,
      practitionerStaffId: 'staff_vet',
      resourceLabel: 'Consultorio 2'
    });

    expect(availability.conflicts.some((conflict) => conflict.type === 'resource_overlap')).toBe(
      true
    );
    expect(availability.conflicts.some((conflict) => conflict.type === 'staff_overlap')).toBe(
      true
    );
  });
});
