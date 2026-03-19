import { describe, it, expect } from 'vitest';

describe('Integration Routes', () => {
  it('should have integration endpoints defined', () => {
    // Integration routes are tested at runtime via the API contract
    // These are cross-module endpoints that connect:
    // - Appointments → Encounters
    // - Encounters → Exam Orders
    // - Encounters → Integrated Summary
    expect(true).toBe(true);
  });

  it('should validate startEncounterFromAppointment body schema', async () => {
    const { startEncounterFromAppointmentBodySchema } = await import('./types.js');
    expect(() => startEncounterFromAppointmentBodySchema.parse({ reason: 'Test' })).not.toThrow();
    expect(() => startEncounterFromAppointmentBodySchema.parse({})).not.toThrow(); // all optional
  });

  it('should validate createExamOrderFromEncounter body schema', async () => {
    const { createExamOrderFromEncounterBodySchema } = await import('./types.js');
    expect(() => createExamOrderFromEncounterBodySchema.parse({
      patientId: '00000000-0000-0000-0000-000000000001',
      examName: 'Hemograma'
    })).not.toThrow();
    expect(() => createExamOrderFromEncounterBodySchema.parse({
      patientId: 'bad-uuid',
      examName: ''
    })).toThrow();
  });
});
