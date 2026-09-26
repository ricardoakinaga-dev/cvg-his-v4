import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createAppointmentReminderHandler,
  type AppointmentReminderRow
} from './appointment-reminder-handler.js';

const NOW = new Date('2026-10-01T12:00:00.000Z');
const context = {
  accountId: '00000000-0000-4000-8000-000000000001',
  workerId: 'worker-test',
  correlationId: 'corr-reminder'
} as never;
const task = { metadata: { appointmentId: 'appt-1' } } as never;

function row(overrides: Partial<AppointmentReminderRow> = {}): AppointmentReminderRow {
  return {
    id: 'appt-1',
    start_at: '2026-10-02T12:00:00.000Z',
    status: 'scheduled',
    type: 'vaccination',
    patient_id: 'patient-1',
    owner_id: 'owner-1',
    patient_name: 'Luna',
    owner_name: 'Maria',
    owner_phone: '+55 11 90000-0000',
    ...overrides
  };
}

test('sends the reminder with the appointment re-read at delivery time', async () => {
  const sent: unknown[] = [];
  const handler = createAppointmentReminderHandler({
    loadAppointment: async () => row(),
    send: async (data) => {
      sent.push(data);
      return { sent: true, messageId: 'wamid.1', provider: '360dialog' };
    },
    clinicName: 'Clínica Teste',
    now: () => NOW
  });

  await handler(task, context);

  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0], {
    appointmentId: 'appt-1',
    accountId: '00000000-0000-4000-8000-000000000001',
    patientId: 'patient-1',
    ownerId: 'owner-1',
    patientName: 'Luna',
    ownerName: 'Maria',
    ownerPhone: '+55 11 90000-0000',
    scheduledAt: '2026-10-02T12:00:00.000Z',
    visitType: 'Vacinação',
    clinicName: 'Clínica Teste'
  });
});

test('completes without sending when the appointment is gone, cancelled, past or the tutor has no phone', async () => {
  const cases: Array<[AppointmentReminderRow | null, string]> = [
    [null, 'appointment_not_found'],
    [row({ status: 'cancelled' }), 'appointment_cancelled'],
    [row({ start_at: '2026-09-30T12:00:00.000Z' }), 'appointment_in_past'],
    [row({ owner_phone: null }), 'tutor_without_phone']
  ];
  for (const [loaded, expectedReason] of cases) {
    const skipped: string[] = [];
    let sends = 0;
    const handler = createAppointmentReminderHandler({
      loadAppointment: async () => loaded,
      send: async () => {
        sends += 1;
        return { sent: true };
      },
      clinicName: 'Clínica Teste',
      now: () => NOW,
      onSkipped: (reason) => skipped.push(reason)
    });
    await handler(task, context);
    assert.equal(sends, 0, expectedReason);
    assert.deepEqual(skipped, [expectedReason]);
  }
});

test('a provider failure throws so the workflow runner retries and eventually dead-letters', async () => {
  const handler = createAppointmentReminderHandler({
    loadAppointment: async () => row(),
    send: async () => ({ sent: false, error: 'gateway timeout', provider: '360dialog' }),
    clinicName: 'Clínica Teste',
    now: () => NOW
  });

  await assert.rejects(() => handler(task, context), /WhatsApp reminder not sent: gateway timeout/);
});
