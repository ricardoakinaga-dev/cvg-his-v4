import { beforeEach, describe, expect, it } from 'vitest';

import { OwnersService } from '@cvg-his-v2/module-owners';
import { PatientsService } from '@cvg-his-v2/module-patients';
import type {
  AccountId,
  AppointmentId,
  EncounterId,
  QueueEntryId,
  QueueTransferId,
  QueueTransferSummary,
  QueueEntrySummary,
  SchedulingAppointmentSummary,
  StaffId,
  UserId
} from '@cvg-his-v2/shared-types';

import { SchedulingService } from './index.js';
import type { SchedulingRepository } from './repositories/database-scheduling.repository.js';

class InMemorySchedulingRepository implements SchedulingRepository {
  readonly appointments = new Map<AppointmentId, SchedulingAppointmentSummary>();
  readonly queueEntries = new Map<QueueEntryId, QueueEntrySummary>();
  readonly queueTransfers = new Map<QueueTransferId, QueueTransferSummary>();

  constructor(
    seedAppointments: readonly SchedulingAppointmentSummary[] = [],
    seedQueueEntries: readonly QueueEntrySummary[] = []
  ) {
    for (const appointment of seedAppointments) {
      this.appointments.set(appointment.id, appointment);
    }

    for (const queueEntry of seedQueueEntries) {
      this.queueEntries.set(queueEntry.id, queueEntry);
    }
  }

  async createAppointment(appointment: SchedulingAppointmentSummary): Promise<void> {
    this.appointments.set(appointment.id, appointment);
  }

  async updateAppointment(appointment: SchedulingAppointmentSummary): Promise<void> {
    this.appointments.set(appointment.id, appointment);
  }

  async findAppointmentById(id: AppointmentId): Promise<SchedulingAppointmentSummary | null> {
    return this.appointments.get(id) ?? null;
  }

  async findAllAppointments(
    accountId?: AccountId
  ): Promise<readonly SchedulingAppointmentSummary[]> {
    return Array.from(this.appointments.values()).filter((item) =>
      accountId ? item.accountId === accountId : true
    );
  }

  async createQueueEntry(entry: QueueEntrySummary): Promise<void> {
    this.queueEntries.set(entry.id, entry);
  }

  async updateQueueEntry(entry: QueueEntrySummary): Promise<void> {
    this.queueEntries.set(entry.id, entry);
  }

  async findQueueEntryById(id: QueueEntryId): Promise<QueueEntrySummary | null> {
    return this.queueEntries.get(id) ?? null;
  }

  async findAllQueueEntries(accountId?: AccountId): Promise<readonly QueueEntrySummary[]> {
    return Array.from(this.queueEntries.values()).filter((item) =>
      accountId ? item.accountId === accountId : true
    );
  }

  async createQueueTransfer(transfer: QueueTransferSummary): Promise<void> {
    this.queueTransfers.set(transfer.id, transfer);
  }

  async findQueueTransfersByQueueEntry(
    queueEntryId: QueueEntryId
  ): Promise<readonly QueueTransferSummary[]> {
    return Array.from(this.queueTransfers.values()).filter(
      (item) => item.queueEntryId === queueEntryId
    );
  }
}

describe('SchedulingService', () => {
  let owners: OwnersService;
  let patients: PatientsService;
  let staff: {
    list: () => Array<{
      id: string;
      accountId: AccountId;
      fullName: string;
      department: string;
      jobTitle: string;
      status: 'active' | 'inactive';
    }>;
    getOrThrow: () => {
      id: string;
      accountId: AccountId;
      fullName: string;
      department: string;
      jobTitle: string;
      status: 'active' | 'inactive';
    };
  };
  let services: {
    getOrThrow: (id: string) => { id: string; name: string };
  };
  let service: SchedulingService;

  beforeEach(() => {
    owners = new OwnersService();
    patients = new PatientsService({ owners });
    staff = {
      list: () => [
        {
          id: 'staff_vet',
          accountId: 'acc_cvg_demo' as AccountId,
          fullName: 'Veterinário Responsável',
          department: 'Clinica',
          jobTitle: 'Médico Veterinário',
          status: 'active'
        }
      ],
      getOrThrow: () => ({
        id: 'staff_vet',
        accountId: 'acc_cvg_demo' as AccountId,
        fullName: 'Veterinário Responsável',
        department: 'Clinica',
        jobTitle: 'Médico Veterinário',
        status: 'active'
      })
    };
    services = {
      getOrThrow: (id: string) => ({ id, name: 'Consulta' })
    };
    service = new SchedulingService(owners, patients, [], {
      staff: staff as never,
      services: services as never
    });
  });

  it('creates appointments with canonical UUID identifiers', async () => {
    const appointment = await service.createAppointment('acc_cvg_demo' as AccountId, {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      scheduledAt: '2026-04-01T08:00:00.000Z',
      visitType: 'scheduled',
      reason: 'Consulta com identificador canonico'
    });

    expect(appointment.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
  });

  it('blocks appointment creation during staff time off', async () => {
    const timeOff = {
      listTimeOffOverlaps: () => [
        {
          startsAt: '2026-04-02T09:00:00.000Z',
          endsAt: '2026-04-02T13:00:00.000Z',
          reason: 'Folga programada'
        }
      ]
    };
    const serviceWithTimeOff = new SchedulingService(owners, patients, [], {
      staff: staff as never,
      services: services as never,
      timeOff: timeOff as never
    });

    await expect(
      serviceWithTimeOff.createAppointment('acc_cvg_demo' as AccountId, {
        patientId: 'patient_luna',
        ownerId: 'owner_maria_silva',
        scheduledAt: '2026-04-02T10:00:00.000Z',
        durationMinutes: 30,
        practitionerStaffId: 'staff_vet',
        reason: 'Consulta em folga'
      })
    ).rejects.toThrow(/slot is unavailable/);
  });

  it('creates appointments and returns them ordered by scheduledAt', async () => {
    const accountId = 'acc_cvg_demo' as AccountId;

    const later = await service.createAppointment(accountId, {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      scheduledAt: '2026-04-02T12:00:00.000Z',
      visitType: 'scheduled',
      reason: 'Consulta posterior'
    });
    const earlier = await service.createAppointment(accountId, {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      scheduledAt: '2026-04-01T08:00:00.000Z',
      visitType: 'return',
      reason: 'Consulta anterior'
    });

    const items = service.listAppointments();
    expect(items.map((item) => item.id)).toEqual([earlier.id, later.id]);
    expect(service.getAppointmentOrThrow(earlier.id).reason).toBe('Consulta anterior');
  });

  it('rejects conflicting appointments for the same patient and time slot', async () => {
    const accountId = 'acc_cvg_demo' as AccountId;
    await service.createAppointment(accountId, {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      scheduledAt: '2026-04-01T11:00:00.000Z',
      visitType: 'scheduled',
      reason: 'Consulta original'
    });

    await expect(
      service.createAppointment(accountId, {
        patientId: 'patient_luna',
        ownerId: 'owner_maria_silva',
        scheduledAt: '2026-04-01T11:00:00.000Z',
        visitType: 'return',
        reason: 'Consulta conflitante'
      })
    ).rejects.toThrow('Patient already has an appointment within a 30-minute window');
  });

  it('rejects appointments within 30-minute window for same patient', async () => {
    const accountId = 'acc_cvg_demo' as AccountId;
    await service.createAppointment(accountId, {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      scheduledAt: '2026-04-01T11:00:00.000Z',
      visitType: 'scheduled',
      reason: 'Consulta original'
    });

    await expect(
      service.createAppointment(accountId, {
        patientId: 'patient_luna',
        ownerId: 'owner_maria_silva',
        scheduledAt: '2026-04-01T11:15:00.000Z',
        visitType: 'return',
        reason: 'Consulta dentro da janela'
      })
    ).rejects.toThrow('Patient already has an appointment within a 30-minute window');
  });

  it('allows appointments outside 30-minute window for same patient', async () => {
    const accountId = 'acc_cvg_demo' as AccountId;
    await service.createAppointment(accountId, {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      scheduledAt: '2026-04-01T11:00:00.000Z',
      visitType: 'scheduled',
      reason: 'Consulta original'
    });

    const later = await service.createAppointment(accountId, {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      scheduledAt: '2026-04-01T12:00:00.000Z',
      visitType: 'return',
      reason: 'Consulta fora da janela'
    });

    expect(later.status).toBe('scheduled');
  });

  it('allows appointments for different patients at same time', async () => {
    const accountId = 'acc_cvg_demo' as AccountId;
    await service.createAppointment(accountId, {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      scheduledAt: '2026-04-01T11:00:00.000Z',
      visitType: 'scheduled',
      reason: 'Consulta luna'
    });

    const newPatient = patients.create(accountId, {
      name: 'Simba',
      species: 'cat',
      breed: 'SRD',
      sex: 'male',
      primaryOwnerId: 'owner_maria_silva'
    });

    const other = await service.createAppointment(accountId, {
      patientId: newPatient.id,
      ownerId: 'owner_maria_silva',
      scheduledAt: '2026-04-01T11:00:00.000Z',
      visitType: 'scheduled',
      reason: 'Consulta simba'
    });

    expect(other.status).toBe('scheduled');
  });

  it('reschedules an appointment with conflict validation and updated resource metadata', async () => {
    const accountId = 'acc_cvg_demo' as AccountId;
    const appointment = await service.createAppointment(accountId, {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      scheduledAt: '2026-04-01T11:00:00.000Z',
      visitType: 'scheduled',
      reason: 'Consulta original',
      practitionerStaffId: 'staff_vet',
      resourceLabel: 'Consultorio 1'
    });

    const rescheduled = await service.rescheduleAppointment(accountId, appointment.id, {
      scheduledAt: '2026-04-01T14:00:00.000Z',
      durationMinutes: 45,
      reason: 'Consulta reagendada',
      resourceLabel: 'Consultorio 2'
    });

    expect(rescheduled.id).toBe(appointment.id);
    expect(rescheduled.status).toBe('scheduled');
    expect(rescheduled.scheduledAt).toBe('2026-04-01T14:00:00.000Z');
    expect(rescheduled.durationMinutes).toBe(45);
    expect(rescheduled.reason).toBe('Consulta reagendada');
    expect(rescheduled.resourceLabel).toBe('Consultorio 2');
  });

  it('rejects rescheduling when the new slot conflicts with the same patient', async () => {
    const accountId = 'acc_cvg_demo' as AccountId;
    const first = await service.createAppointment(accountId, {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      scheduledAt: '2026-04-01T11:00:00.000Z',
      visitType: 'scheduled',
      reason: 'Consulta original'
    });

    await service.createAppointment(accountId, {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      scheduledAt: '2026-04-01T14:00:00.000Z',
      visitType: 'scheduled',
      reason: 'Consulta conflitante'
    });

    await expect(
      service.rescheduleAppointment(accountId, first.id, {
        scheduledAt: '2026-04-01T14:00:00.000Z'
      })
    ).rejects.toThrow('Patient already has an appointment within a 30-minute window');
  });

  it('persists all rescheduled appointment fields when repository is injected', async () => {
    const repository = new InMemorySchedulingRepository();
    const persistent = new SchedulingService(owners, patients, [], {
      repository,
      staff: staff as never
    });
    const accountId = 'acc_cvg_demo' as AccountId;
    const appointment = await persistent.createAppointment(accountId, {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      scheduledAt: '2026-04-01T11:00:00.000Z',
      visitType: 'scheduled',
      reason: 'Consulta original',
      practitionerStaffId: 'staff_vet',
      resourceLabel: 'Consultorio 1'
    });

    await persistent.rescheduleAppointment(accountId, appointment.id, {
      scheduledAt: '2026-04-01T15:00:00.000Z',
      durationMinutes: 60,
      reason: 'Reagendado com persistencia',
      practitionerStaffId: 'staff_vet',
      resourceLabel: 'Consultorio 3'
    });

    expect(repository.appointments.get(appointment.id)).toMatchObject({
      scheduledAt: '2026-04-01T15:00:00.000Z',
      durationMinutes: 60,
      reason: 'Reagendado com persistencia',
      resourceLabel: 'Consultorio 3'
    });
  });

  it('cancels a scheduled appointment successfully', async () => {
    const accountId = 'acc_cvg_demo' as AccountId;
    const appointment = await service.createAppointment(accountId, {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      scheduledAt: '2026-04-01T11:00:00.000Z',
      visitType: 'scheduled',
      reason: 'Consulta para cancelar'
    });

    const cancelled = await service.cancelAppointment(appointment.id, 'Cliente desistiu');

    expect(cancelled.status).toBe('cancelled');
    expect(cancelled.reason).toBe('Cliente desistiu');
    expect(service.getAppointmentOrThrow(appointment.id).status).toBe('cancelled');
  });

  it('cancels a checked_in appointment successfully', async () => {
    const accountId = 'acc_cvg_demo' as AccountId;
    const appointment = await service.createAppointment(accountId, {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      scheduledAt: '2026-04-01T11:00:00.000Z',
      visitType: 'scheduled',
      reason: 'Consulta com check-in'
    });
    await service.checkIn(accountId, {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      appointmentId: appointment.id,
      reason: 'Check-in para cancelar'
    });

    const cancelled = await service.cancelAppointment(appointment.id);

    expect(cancelled.status).toBe('cancelled');
  });

  it('rejects cancellation of completed appointment', async () => {
    const accountId = 'acc_cvg_demo' as AccountId;
    const appointment = await service.createAppointment(accountId, {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      scheduledAt: '2026-04-01T11:00:00.000Z',
      visitType: 'scheduled',
      reason: 'Consulta completada'
    });

    const completedAppointment = {
      ...appointment,
      status: 'completed' as const,
      updatedAt: appointment.updatedAt
    };
    (
      service as unknown as {
        getAppointmentOrThrow: (id: AppointmentId) => SchedulingAppointmentSummary;
      }
    ).getAppointmentOrThrow = () => completedAppointment;

    await expect(service.cancelAppointment(appointment.id)).rejects.toThrow(
      'Appointment cannot be cancelled in its current state'
    );
  });

  it('rejects cancellation of already cancelled appointment', async () => {
    const accountId = 'acc_cvg_demo' as AccountId;
    const appointment = await service.createAppointment(accountId, {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      scheduledAt: '2026-04-01T11:00:00.000Z',
      visitType: 'scheduled',
      reason: 'Consulta para cancelar duas vezes'
    });

    await service.cancelAppointment(appointment.id, 'Primeiro cancelamento');

    await expect(service.cancelAppointment(appointment.id, 'Segundo cancelamento')).rejects.toThrow(
      'Appointment cannot be cancelled in its current state'
    );
  });

  it('persists cancelled appointment when repository is injected', async () => {
    const repository = new InMemorySchedulingRepository();
    const persistent = new SchedulingService(owners, patients, [], { repository });
    const accountId = 'acc_cvg_demo' as AccountId;

    const appointment = await persistent.createAppointment(accountId, {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      scheduledAt: '2026-04-07T10:00:00.000Z',
      visitType: 'scheduled',
      reason: 'Persist cancel appointment'
    });

    await persistent.cancelAppointment(appointment.id, 'Cancelado pelo cliente');

    expect(repository.appointments.get(appointment.id)?.status).toBe('cancelled');
  });

  it('keeps the cached appointment unchanged when cancellation persistence fails', async () => {
    const repository = new InMemorySchedulingRepository();
    const persistent = new SchedulingService(owners, patients, [], { repository });
    const accountId = 'acc_cvg_demo' as AccountId;
    const appointment = await persistent.createAppointment(accountId, {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      scheduledAt: '2026-04-07T11:00:00.000Z',
      visitType: 'scheduled',
      reason: 'Falha de persistencia'
    });
    repository.updateAppointment = async () => {
      throw new Error('database unavailable');
    };

    await expect(persistent.cancelAppointment(appointment.id)).rejects.toThrow(
      'database unavailable'
    );
    expect(persistent.getAppointmentOrThrow(appointment.id).status).toBe('scheduled');
  });

  it('rejects cancelled appointment from being re-check-in', async () => {
    const accountId = 'acc_cvg_demo' as AccountId;
    const appointment = await service.createAppointment(accountId, {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      scheduledAt: '2026-04-01T11:00:00.000Z',
      visitType: 'scheduled',
      reason: 'Consulta cancelada'
    });

    await service.cancelAppointment(appointment.id);

    await expect(
      service.checkIn(accountId, {
        patientId: 'patient_luna',
        ownerId: 'owner_maria_silva',
        appointmentId: appointment.id,
        reason: 'Re-check-in apos cancelamento'
      })
    ).rejects.toThrow('Appointment cannot be checked in from its current state');
  });

  it('rejects duplicate active queue entries for the same appointment', async () => {
    const accountId = 'acc_cvg_demo' as AccountId;
    const appointment = await service.createAppointment(accountId, {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      scheduledAt: '2026-04-01T12:00:00.000Z',
      visitType: 'scheduled',
      reason: 'Duplicidade de fila'
    });

    await service.checkIn(accountId, {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      appointmentId: appointment.id,
      reason: 'Primeiro check-in'
    });

    await expect(
      service.checkIn(accountId, {
        patientId: 'patient_luna',
        ownerId: 'owner_maria_silva',
        appointmentId: appointment.id,
        reason: 'Segundo check-in'
      })
    ).rejects.toThrow('Appointment already has an active queue entry');
  });

  it('allows valid queue transitions: waiting -> called -> in_triage -> in_care -> observation -> completed', async () => {
    const accountId = 'acc_cvg_demo' as AccountId;
    const queued = await service.checkIn(accountId, {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      reason: 'Fluxo completo'
    });

    expect(queued.status).toBe('waiting');

    const called = await service.callQueueEntry(queued.id);
    expect(called.status).toBe('called');

    const attached = await service.attachEncounter(queued.id, 'enc_1' as EncounterId);
    expect(attached.status).toBe('in_triage');

    const inCare = await service.transitionQueueForEncounter(queued.id, 'in_care');
    expect(inCare.status).toBe('in_care');

    const observation = await service.transitionQueueForEncounter(queued.id, 'observation');
    expect(observation.status).toBe('observation');

    const completed = await service.completeQueueEntry(queued.id);
    expect(completed.status).toBe('completed');
  });

  it('allows idempotent encounter sync after attach moves queue to triage', async () => {
    const accountId = 'acc_cvg_demo' as AccountId;
    const queued = await service.checkIn(accountId, {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      reason: 'Sincronizar triagem'
    });

    await service.callQueueEntry(queued.id);
    const attached = await service.attachEncounter(queued.id, 'enc_sync' as EncounterId);
    expect(attached.status).toBe('in_triage');

    const synced = await service.transitionQueueForEncounter(queued.id, 'in_triage');
    expect(synced.status).toBe('in_triage');
    expect(synced.encounterId).toBe('enc_sync');
  });

  it('allows waiting -> cancelled transition', async () => {
    const accountId = 'acc_cvg_demo' as AccountId;
    const queued = await service.checkIn(accountId, {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      reason: 'Para cancelar da fila'
    });

    const cancelled = await service.transitionQueueEntry(queued.id, 'cancelled');
    expect(cancelled.status).toBe('cancelled');
  });

  it('allows called -> cancelled transition', async () => {
    const accountId = 'acc_cvg_demo' as AccountId;
    const queued = await service.checkIn(accountId, {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      reason: 'Para cancelar depois de chamado'
    });

    await service.callQueueEntry(queued.id);
    const cancelled = await service.transitionQueueEntry(queued.id, 'cancelled');
    expect(cancelled.status).toBe('cancelled');
  });

  it('blocks invalid transition: completed -> waiting', async () => {
    const accountId = 'acc_cvg_demo' as AccountId;
    const queued = await service.checkIn(accountId, {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      reason: 'Fluxo para bloquear'
    });

    await service.callQueueEntry(queued.id);
    await service.attachEncounter(queued.id, 'enc_2' as EncounterId);
    await service.transitionQueueForEncounter(queued.id, 'in_care');
    await service.completeQueueEntry(queued.id);

    await expect(service.transitionQueueForEncounter(queued.id, 'waiting')).rejects.toThrow(
      'Invalid queue entry status transition'
    );
  });

  it('blocks invalid transition: cancelled -> waiting', async () => {
    const accountId = 'acc_cvg_demo' as AccountId;
    const queued = await service.checkIn(accountId, {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      reason: 'Cancelado para bloquear'
    });

    await service.transitionQueueEntry(queued.id, 'cancelled');

    await expect(service.transitionQueueForEncounter(queued.id, 'waiting')).rejects.toThrow(
      'Invalid queue entry status transition'
    );
  });

  it('blocks invalid transition: waiting -> in_care (skip)', async () => {
    const accountId = 'acc_cvg_demo' as AccountId;
    const queued = await service.checkIn(accountId, {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      reason: 'Pular etapas'
    });

    await expect(service.transitionQueueForEncounter(queued.id, 'in_care')).rejects.toThrow(
      'Invalid queue entry status transition'
    );
  });

  it('blocks calling an already completed entry', async () => {
    const accountId = 'acc_cvg_demo' as AccountId;
    const queued = await service.checkIn(accountId, {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      reason: 'Completado para bloquear call'
    });

    await service.callQueueEntry(queued.id);
    await service.attachEncounter(queued.id, 'enc_3' as EncounterId);
    await service.transitionQueueForEncounter(queued.id, 'in_care');
    await service.transitionQueueForEncounter(queued.id, 'observation');
    await service.transitionQueueEntry(queued.id, 'completed');

    await expect(service.callQueueEntry(queued.id)).rejects.toThrow(
      'Queue entry cannot be called from its current status'
    );
  });

  it('blocks attaching encounter to a completed entry', async () => {
    const accountId = 'acc_cvg_demo' as AccountId;
    const queued = await service.checkIn(accountId, {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      reason: 'Completado para bloquear attach'
    });

    await service.callQueueEntry(queued.id);
    await service.attachEncounter(queued.id, 'enc_4' as EncounterId);
    await service.transitionQueueForEncounter(queued.id, 'in_care');
    await service.transitionQueueEntry(queued.id, 'completed');

    await expect(service.attachEncounter(queued.id, 'enc_new' as EncounterId)).rejects.toThrow(
      'Queue entry cannot attach encounter from its current status'
    );
  });

  it('persists queue transition to cancelled when repository is injected', async () => {
    const repository = new InMemorySchedulingRepository();
    const persistent = new SchedulingService(owners, patients, [], { repository });
    const accountId = 'acc_cvg_demo' as AccountId;

    const queueEntry = await persistent.checkIn(accountId, {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      reason: 'Persistir cancelamento de fila'
    });

    await persistent.transitionQueueEntry(queueEntry.id, 'cancelled');

    expect(repository.queueEntries.get(queueEntry.id)?.status).toBe('cancelled');
  });

  it('syncs linked appointment status from queue cancellation and completion', async () => {
    const accountId = 'acc_cvg_demo' as AccountId;
    const cancelledAppointment = await service.createAppointment(accountId, {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      scheduledAt: '2026-04-01T13:00:00.000Z',
      visitType: 'scheduled',
      reason: 'Cancelar via fila'
    });

    const cancelledQueueEntry = await service.checkIn(accountId, {
      patientId: cancelledAppointment.patientId,
      ownerId: cancelledAppointment.ownerId,
      appointmentId: cancelledAppointment.id,
      reason: 'Fluxo cancelado'
    });
    await service.transitionQueueEntry(cancelledQueueEntry.id, 'cancelled');

    expect(service.getAppointmentOrThrow(cancelledAppointment.id).status).toBe('cancelled');

    const completedAppointment = await service.createAppointment(accountId, {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      scheduledAt: '2026-04-01T14:00:00.000Z',
      visitType: 'scheduled',
      reason: 'Completar via fila'
    });
    const completedQueueEntry = await service.checkIn(accountId, {
      patientId: completedAppointment.patientId,
      ownerId: completedAppointment.ownerId,
      appointmentId: completedAppointment.id,
      reason: 'Fluxo concluido'
    });

    await service.callQueueEntry(completedQueueEntry.id);
    await service.attachEncounter(completedQueueEntry.id, 'enc_complete' as EncounterId);
    await service.transitionQueueForEncounter(completedQueueEntry.id, 'in_care');
    await service.completeQueueEntry(completedQueueEntry.id);

    expect(service.getAppointmentOrThrow(completedAppointment.id).status).toBe('completed');
  });

  it('checks in patient, updates linked appointment and keeps queue ordered by priority', async () => {
    const accountId = 'acc_cvg_demo' as AccountId;
    const appointment = await service.createAppointment(accountId, {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      scheduledAt: '2026-04-01T09:00:00.000Z',
      visitType: 'scheduled',
      reason: 'Consulta com check-in'
    });

    const medium = await service.checkIn(accountId, {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      appointmentId: appointment.id,
      reason: 'Aguardando atendimento',
      priority: 'medium'
    });
    const critical = await service.checkIn(accountId, {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      reason: 'Emergencia',
      priority: 'critical'
    });

    expect(service.getAppointmentOrThrow(appointment.id).status).toBe('checked_in');
    expect(service.getQueue().map((entry) => entry.id)).toEqual([critical.id, medium.id]);
  });

  it('calls queue entries, attaches encounter and transitions main statuses', async () => {
    const accountId = 'acc_cvg_demo' as AccountId;
    const queued = await service.checkIn(accountId, {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      reason: 'Fluxo operacional'
    });

    const called = await service.callQueueEntry(queued.id);
    const attached = await service.attachEncounter(queued.id, 'encounter_1' as EncounterId);
    const inCare = await service.transitionQueueForEncounter(queued.id, 'in_care');
    const completed = await service.completeQueueEntry(queued.id);

    expect(called.status).toBe('called');
    expect(called.calledAt).toBeDefined();
    expect(attached.status).toBe('in_triage');
    expect(attached.encounterId).toBe('encounter_1');
    expect(inCare.status).toBe('in_care');
    expect(completed.status).toBe('completed');
  });

  it('hydrates appointments from repository when available', async () => {
    const repository = new InMemorySchedulingRepository([
      {
        id: 'appt_repo_1' as AppointmentId,
        accountId: '' as AccountId,
        patientId: 'patient_luna' as never,
        ownerId: 'owner_maria_silva' as never,
        scheduledAt: '2026-04-03T10:00:00.000Z',
        visitType: 'scheduled',
        reason: 'Hydrated appointment',
        status: 'scheduled',
        createdAt: '2026-04-01T10:00:00.000Z',
        updatedAt: '2026-04-01T10:00:00.000Z'
      }
    ]);
    const hydrated = new SchedulingService(owners, patients, [], { repository });

    await hydrated.hydrateFromDatabase();

    const appointments = hydrated.listAppointments();
    expect(appointments).toHaveLength(1);
    expect(appointments[0]?.id).toBe('appt_repo_1');
    expect(appointments[0]?.reason).toBe('Hydrated appointment');
  });

  it('hydrates persisted queue entries when repository is injected', async () => {
    const repository = new InMemorySchedulingRepository(
      [],
      [
        {
          id: 'queue_repo_1' as QueueEntryId,
          accountId: 'acc_cvg_demo' as AccountId,
          patientId: 'patient_luna' as never,
          ownerId: 'owner_maria_silva' as never,
          reason: 'Hydrated queue entry',
          priority: 'high',
          status: 'waiting',
          checkedInAt: '2026-04-03T10:00:00.000Z',
          createdAt: '2026-04-03T10:00:00.000Z',
          updatedAt: '2026-04-03T10:00:00.000Z'
        }
      ]
    );
    const hydrated = new SchedulingService(owners, patients, [], { repository });

    await hydrated.hydrateFromDatabase();

    const queue = hydrated.getQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0]?.id).toBe('queue_repo_1');
    expect(queue[0]?.reason).toBe('Hydrated queue entry');
  });

  it('hydrates queue transfer history when repository is injected', async () => {
    const queueEntry: QueueEntrySummary = {
      id: 'queue_repo_transfer_1' as QueueEntryId,
      accountId: 'acc_cvg_demo' as AccountId,
      patientId: 'patient_luna' as never,
      ownerId: 'owner_maria_silva' as never,
      reason: 'Hydrated queue transfer',
      priority: 'medium',
      status: 'waiting',
      checkedInAt: '2026-04-03T10:00:00.000Z',
      createdAt: '2026-04-03T10:00:00.000Z',
      updatedAt: '2026-04-03T10:00:00.000Z'
    };
    const repository = new InMemorySchedulingRepository([], [queueEntry]);
    repository.queueTransfers.set('queue_transfer_repo_1' as QueueTransferId, {
      id: 'queue_transfer_repo_1' as QueueTransferId,
      accountId: queueEntry.accountId,
      queueEntryId: queueEntry.id,
      fromSector: 'Recepcao',
      toSector: 'Clinica',
      sentByUserId: 'user_reception' as never,
      sentAt: '2026-04-03T10:05:00.000Z',
      receivedByUserId: 'user_vet' as never,
      responsibleStaffId: 'staff_vet' as never,
      nextSector: 'Exames',
      reason: 'Hydrated transfer',
      urgency: 'medium',
      createdAt: '2026-04-03T10:05:00.000Z'
    });
    const hydrated = new SchedulingService(owners, patients, [], { repository });

    await hydrated.hydrateFromDatabase('acc_cvg_demo' as AccountId);

    expect(hydrated.listQueueTransfers(queueEntry.id)).toEqual([
      expect.objectContaining({
        queueEntryId: queueEntry.id,
        fromSector: 'Recepcao',
        toSector: 'Clinica',
        sentByUserId: 'user_reception'
      })
    ]);
  });

  it('persists created appointments when repository is injected', async () => {
    const repository = new InMemorySchedulingRepository();
    const persistent = new SchedulingService(owners, patients, [], { repository });

    const created = await persistent.createAppointment('acc_cvg_demo' as AccountId, {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      scheduledAt: '2026-04-05T10:00:00.000Z',
      visitType: 'scheduled',
      reason: 'Persist appointment'
    });

    expect(repository.appointments.get(created.id)?.reason).toBe('Persist appointment');
  });

  it('persists queue lifecycle updates when repository is injected', async () => {
    const repository = new InMemorySchedulingRepository();
    const persistent = new SchedulingService(owners, patients, [], { repository });
    const accountId = 'acc_cvg_demo' as AccountId;
    const appointment = await persistent.createAppointment(accountId, {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      scheduledAt: '2026-04-06T10:00:00.000Z',
      visitType: 'scheduled',
      reason: 'Queue persistence'
    });

    const queueEntry = await persistent.checkIn(accountId, {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      appointmentId: appointment.id,
      reason: 'Persist queue entry',
      priority: 'high'
    });
    expect(repository.queueEntries.get(queueEntry.id)?.status).toBe('waiting');
    expect(repository.appointments.get(appointment.id)?.status).toBe('checked_in');

    const called = await persistent.callQueueEntry(queueEntry.id);
    expect(repository.queueEntries.get(queueEntry.id)?.status).toBe('called');
    expect(repository.queueEntries.get(queueEntry.id)?.calledAt).toBe(called.calledAt);

    await persistent.attachEncounter(queueEntry.id, 'encounter_repo_1' as EncounterId);
    expect(repository.queueEntries.get(queueEntry.id)?.status).toBe('in_triage');
    expect(repository.queueEntries.get(queueEntry.id)?.encounterId).toBe('encounter_repo_1');

    await persistent.transitionQueueForEncounter(queueEntry.id, 'observation');
    expect(repository.queueEntries.get(queueEntry.id)?.status).toBe('observation');

    await persistent.completeQueueEntry(queueEntry.id);
    expect(repository.queueEntries.get(queueEntry.id)?.status).toBe('completed');
  });

  it('stores explicit operational ownership when checking in a patient', async () => {
    const accountId = 'acc_cvg_demo' as AccountId;

    const queueEntry = await service.checkIn(accountId, {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      reason: 'Urgencia respiratoria',
      priority: 'critical',
      entryType: 'emergency',
      currentSector: 'Recepcao',
      currentResponsibleStaffId: 'staff_vet',
      nextSector: 'Clinica'
    });

    expect(queueEntry.entryType).toBe('emergency');
    expect(queueEntry.currentSector).toBe('Recepcao');
    expect(queueEntry.currentResponsibleStaffId).toBe('staff_vet');
    expect(queueEntry.nextSector).toBe('Clinica');
    expect(queueEntry.operationalStatus).toBe('waiting');
    expect(queueEntry.clinicalStatus).toBe('not_started');
    expect(queueEntry.billingStatus).toBe('not_started');
    expect(queueEntry.handoffStatus).toBe('not_started');
  });

  it('transfers queue entry between sectors and keeps auditable history', async () => {
    const repository = new InMemorySchedulingRepository();
    const persistent = new SchedulingService(owners, patients, [], { repository });
    const accountId = 'acc_cvg_demo' as AccountId;

    const queueEntry = await persistent.checkIn(accountId, {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      reason: 'Encaminhar para clinica',
      currentSector: 'Recepcao',
      nextSector: 'Clinica'
    });

    const transferred = await persistent.transferQueueEntry(queueEntry.id, {
      toSector: 'Clinica',
      sentByUserId: 'user_reception',
      receivedByUserId: 'user_vet',
      responsibleStaffId: 'staff_vet',
      nextSector: 'Exames',
      reason: 'Veterinario assumiu atendimento',
      urgency: 'high'
    });

    expect(transferred.currentSector).toBe('Clinica');
    expect(transferred.currentResponsibleStaffId).toBe('staff_vet');
    expect(transferred.nextSector).toBe('Exames');
    expect(transferred.lastTransferredByUserId).toBe('user_reception');
    expect(transferred.lastTransferredAt).toBeDefined();
    expect(repository.queueEntries.get(queueEntry.id)?.currentSector).toBe('Clinica');

    const history = persistent.listQueueTransfers(queueEntry.id);
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      accountId,
      queueEntryId: queueEntry.id,
      fromSector: 'Recepcao',
      toSector: 'Clinica',
      sentByUserId: 'user_reception',
      receivedByUserId: 'user_vet',
      responsibleStaffId: 'staff_vet',
      nextSector: 'Exames',
      reason: 'Veterinario assumiu atendimento',
      urgency: 'high'
    });
    expect(repository.queueTransfers.size).toBe(1);
  });

  it('should invoke onAppointmentCreated callback when creating an appointment', async () => {
    const accountId = 'acc_cvg_demo' as AccountId;

    let callbackInvoked = false;
    let capturedAppointmentId: string | null = null;

    const serviceWithCallback = new SchedulingService(owners, patients, [], {
      onAppointmentCreated: async (appointment) => {
        callbackInvoked = true;
        capturedAppointmentId = appointment.id;
      }
    });

    const appointment = await serviceWithCallback.createAppointment(accountId, {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      scheduledAt: '2026-04-10T09:00:00.000Z',
      visitType: 'scheduled',
      reason: 'Callback test'
    });

    expect(callbackInvoked).toBe(true);
    expect(capturedAppointmentId).toBe(appointment.id);
  });

  it('should invoke onAppointmentStatusChanged callback when cancelling an appointment', async () => {
    const accountId = 'acc_cvg_demo' as AccountId;

    let callbackInvoked = false;
    let capturedAppointmentId: string | null = null;
    let capturedPreviousStatus: string | null = null;

    const serviceWithCallback = new SchedulingService(owners, patients, [], {
      onAppointmentStatusChanged: async (appointment, previousStatus) => {
        callbackInvoked = true;
        capturedAppointmentId = appointment.id;
        capturedPreviousStatus = previousStatus;
      }
    });

    const appointment = await serviceWithCallback.createAppointment(accountId, {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      scheduledAt: '2026-04-11T09:00:00.000Z',
      visitType: 'scheduled',
      reason: 'Status change test'
    });

    expect(callbackInvoked).toBe(false);

    await serviceWithCallback.cancelAppointment(appointment.id, 'Cliente desistiu');

    expect(callbackInvoked).toBe(true);
    expect(capturedAppointmentId).toBe(appointment.id);
    expect(capturedPreviousStatus).toBe('scheduled');
  });

  it('should invoke onAppointmentStatusChanged callback when checking in and linking appointment', async () => {
    const accountId = 'acc_cvg_demo' as AccountId;

    let callbackInvoked = false;
    let capturedPreviousStatus: string | null = null;

    const serviceWithCallback = new SchedulingService(owners, patients, [], {
      onAppointmentStatusChanged: async (_appointment, previousStatus) => {
        callbackInvoked = true;
        capturedPreviousStatus = previousStatus;
      }
    });

    const appointment = await serviceWithCallback.createAppointment(accountId, {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      scheduledAt: '2026-04-12T09:00:00.000Z',
      visitType: 'scheduled',
      reason: 'Check-in status change test'
    });

    expect(callbackInvoked).toBe(false);

    await serviceWithCallback.checkIn(accountId, {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      appointmentId: appointment.id,
      reason: 'Check-in'
    });

    expect(callbackInvoked).toBe(true);
    expect(capturedPreviousStatus).toBe('scheduled');
  });

  it('returns availability conflicts for overlapping professional allocation', async () => {
    const accountId = 'acc_cvg_demo' as AccountId;
    await service.createAppointment(accountId, {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      scheduledAt: '2026-04-14T09:00:00.000Z',
      durationMinutes: 30,
      practitionerStaffId: 'staff_vet',
      visitType: 'scheduled',
      reason: 'Consulta original'
    });

    const availability = service.getAvailability(accountId, {
      scheduledAt: '2026-04-14T09:15:00.000Z',
      durationMinutes: 30,
      patientId: 'patient_luna',
      practitionerStaffId: 'staff_vet'
    });

    expect(availability.available).toBe(false);
    expect(availability.conflicts.some((conflict) => conflict.type === 'staff_overlap')).toBe(true);
    expect(availability.conflicts.some((conflict) => conflict.type === 'patient_overlap')).toBe(
      true
    );
  });

  it('returns operational blocks in overview for scheduling professionals', async () => {
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

  it('uses persisted professional availability when checking a slot', async () => {
    const configured = new SchedulingService(owners, patients, [], {
      staff: staff as never,
      agendaConfig: {
        async listAvailability() {
          return [{
            id: 'availability-wed',
            accountId: 'acc_cvg_demo' as AccountId,
            professionalUserId: 'staff_vet',
            dayOfWeek: 3,
            startTime: '09:00',
            endTime: '17:00',
            slotDurationMinutes: 30,
            timezone: 'UTC',
            notes: null
          }];
        }
      }
    });

    await configured.hydrateFromDatabase('acc_cvg_demo' as AccountId);

    const available = configured.getAvailability('acc_cvg_demo' as AccountId, {
      scheduledAt: '2026-04-15T16:30:00.000Z',
      durationMinutes: 30,
      patientId: 'patient_luna',
      practitionerStaffId: 'staff_vet'
    });
    const outside = configured.getAvailability('acc_cvg_demo' as AccountId, {
      scheduledAt: '2026-04-15T17:00:00.000Z',
      durationMinutes: 30,
      patientId: 'patient_luna',
      practitionerStaffId: 'staff_vet'
    });

    expect(available.available).toBe(true);
    expect(outside.conflicts.some((conflict) => conflict.type === 'outside_hours')).toBe(true);
  });

  it('maps persisted availability user ids to staff ids used by appointment commands', async () => {
    const configured = new SchedulingService(owners, patients, [], {
      staff: {
        list: () => [
          {
            id: 'staff_vet' as StaffId,
            userId: 'user_vet' as UserId,
            accountId: 'acc_cvg_demo' as AccountId,
            fullName: 'Veterinário Responsável',
            department: 'Clinica',
            jobTitle: 'Médico Veterinário',
            status: 'active'
          }
        ],
        getOrThrow: () => ({
          id: 'staff_vet' as StaffId,
          accountId: 'acc_cvg_demo' as AccountId,
          fullName: 'Veterinário Responsável',
          department: 'Clinica',
          jobTitle: 'Médico Veterinário',
          status: 'active'
        })
      },
      agendaConfig: {
        async listAvailability() {
          return [
            {
              id: 'availability-user-vet',
              accountId: 'acc_cvg_demo' as AccountId,
              professionalUserId: 'user_vet',
              dayOfWeek: 3,
              startTime: '09:00',
              endTime: '17:00',
              slotDurationMinutes: 30,
              timezone: 'UTC',
              notes: null
            }
          ];
        }
      }
    });

    await configured.hydrateFromDatabase('acc_cvg_demo' as AccountId);

    const available = configured.getAvailability('acc_cvg_demo' as AccountId, {
      scheduledAt: '2026-04-15T16:30:00.000Z',
      durationMinutes: 30,
      patientId: 'patient_luna',
      practitionerStaffId: 'staff_vet'
    });

    expect(available.available).toBe(true);
  });

  it('returns aggregated operational stage for appointments already in queue', async () => {
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

  it('returns outside-hours and resource conflicts with actionable availability suggestions', async () => {
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
    expect(availability.conflicts.some((conflict) => conflict.type === 'outside_hours')).toBe(true);
    expect(availability.suggestions.length).toBeGreaterThan(0);
    expect(availability.suggestions.some((slot) => slot.available)).toBe(true);
  });

  it('flags resource overlap in the cockpit overview when a second patient competes for the same room', async () => {
    const accountId = 'acc_cvg_demo' as AccountId;
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
    await expect(
      service.createAppointment(accountId, {
        patientId: otherPatient.id,
        ownerId: 'owner_maria_silva',
        scheduledAt: '2026-04-18T11:15:00.000Z',
        durationMinutes: 30,
        practitionerStaffId: 'staff_vet',
        resourceLabel: 'Consultorio 2',
        visitType: 'scheduled',
        reason: 'Consulta 2'
      })
    ).rejects.toThrow('Appointment slot is unavailable for the requested schedule');

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
    expect(availability.conflicts.some((conflict) => conflict.type === 'staff_overlap')).toBe(true);
  });
});
