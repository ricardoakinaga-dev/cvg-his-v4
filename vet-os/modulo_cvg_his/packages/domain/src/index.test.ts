import { describe, expect, it } from 'vitest';

import {
  AlertSchema,
  DocumentCreateSchema,
  DomainValidationError,
  HandoverDraftSchema,
  InpatientAdmitSchema,
  InpatientDischargeSchema,
  MedicationAdministrationCreateSchema,
  MedicationOrderCreateSchema,
  MedicationScheduleCreateSchema,
  ProtocolContentPublishSchema,
  ProtocolContentSchema,
  ProtocolPublishRequestSchema,
  EncounterCreateSchema,
  NoteCreateSchema,
  NoteVersionSchema,
  OwnerCreateSchema,
  OwnerUpdateSchema,
  PatientCreateSchema,
  PatientUpdateSchema,
  parseOrThrow422
} from './index.js';

describe('domain contracts', () => {
  it('normaliza OwnerCreate email e telefone', () => {
    const parsed = OwnerCreateSchema.parse({
      fullName: '  Maria Silva  ',
      email: '  USER@EXAMPLE.COM ',
      phone: '(11) 98888-7777'
    });

    expect(parsed.fullName).toBe('Maria Silva');
    expect(parsed.email).toBe('user@example.com');
    expect(parsed.phone).toBe('11988887777');
  });

  it('rejeita OwnerUpdate vazio', () => {
    const parsed = OwnerUpdateSchema.safeParse({});
    expect(parsed.success).toBe(false);
  });

  it('rejeita PatientCreate com ownerId inválido', () => {
    const parsed = PatientCreateSchema.safeParse({
      ownerId: 'not-uuid',
      name: 'Rex',
      species: 'canine'
    });

    expect(parsed.success).toBe(false);

    if (!parsed.success) {
      expect(parsed.error.issues[0]?.message).toContain('UUID');
    }
  });

  it('rejeita PatientUpdate vazio', () => {
    const parsed = PatientUpdateSchema.safeParse({});
    expect(parsed.success).toBe(false);
  });

  it('valida EncounterCreate com patientId obrigatório', () => {
    const parsed = EncounterCreateSchema.safeParse({
      patientId: 'invalid-uuid'
    });

    expect(parsed.success).toBe(false);
  });

  it('valida SOAP em NoteCreate', () => {
    const parsed = NoteCreateSchema.safeParse({
      encounterId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef9',
      soap: {
        subjective: '  sem apetite  ',
        objective: ' temperatura 39  ',
        assessment: ' possível infecção ',
        plan: ' solicitar hemograma '
      }
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.soap.subjective).toBe('sem apetite');
    }
  });

  it('exige reason em NoteVersion', () => {
    const parsed = NoteVersionSchema.safeParse({
      reason: '   '
    });

    expect(parsed.success).toBe(false);
  });

  it('valida DocumentCreate com size inteiro positivo', () => {
    const parsed = DocumentCreateSchema.safeParse({
      filename: ' exame.pdf ',
      mimeType: 'application/pdf',
      size: 1024
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.filename).toBe('exame.pdf');
    }
  });

  it('normaliza AlertSchema', () => {
    const parsed = AlertSchema.parse({
      allergies: [' dipirona ', '  '],
      chronic_conditions: [' renal '],
      notes: '   '
    });

    expect(parsed.allergies).toEqual(['dipirona']);
    expect(parsed.chronic_conditions).toEqual(['renal']);
    expect(parsed.notes).toBeNull();
  });

  it('gera erro padronizado 422', () => {
    expect(() => parseOrThrow422(OwnerCreateSchema, { fullName: 'a' })).toThrow(DomainValidationError);
    expect(() =>
      parseOrThrow422(DocumentCreateSchema, {
        filename: '',
        mimeType: 'invalid',
        size: -1
      })
    ).toThrow(DomainValidationError);

    try {
      parseOrThrow422(OwnerCreateSchema, { fullName: 'a' });
    } catch (error) {
      const validationError = error as DomainValidationError;
      const payload = validationError.toJSON();
      expect(payload.statusCode).toBe(422);
      expect(payload.code).toBe('VALIDATION_ERROR');
      expect(payload.issues.length).toBeGreaterThan(0);
    }
  });

  it('rejeita InpatientAdmit sem reason e sem chiefComplaint', () => {
    const parsed = InpatientAdmitSchema.safeParse({
      patientId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef9',
      wardId: 'fdd8c156-b52d-4117-a5e1-73dd61474efa',
      bedId: 'fdd8c156-b52d-4117-a5e1-73dd61474efb'
    });

    expect(parsed.success).toBe(false);
  });

  it('exige reason em InpatientDischarge', () => {
    const parsed = InpatientDischargeSchema.safeParse({
      reason: '   '
    });

    expect(parsed.success).toBe(false);
  });

  it('rejeita HandoverDraft com items vazio', () => {
    const parsed = HandoverDraftSchema.safeParse({
      wardId: 'fdd8c156-b52d-4117-a5e1-73dd61474efa',
      shiftDate: '2026-02-17',
      shiftPeriod: 'night',
      items: []
    });

    expect(parsed.success).toBe(false);
  });

  it('rejeita item de HandoverDraft sem problema/notes e sem plano', () => {
    const parsed = HandoverDraftSchema.safeParse({
      wardId: 'fdd8c156-b52d-4117-a5e1-73dd61474efa',
      shiftDate: '2026-02-17',
      shiftPeriod: 'day',
      items: [
        {
          stayId: 'fdd8c156-b52d-4117-a5e1-73dd61474efb',
          problems_json: [],
          plan_json: [],
          escalation_json: {}
        }
      ]
    });

    expect(parsed.success).toBe(false);
  });

  it('aceita HandoverDraft válido com problemas e plano', () => {
    const parsed = HandoverDraftSchema.safeParse({
      wardId: 'fdd8c156-b52d-4117-a5e1-73dd61474efa',
      shiftDate: '2026-02-17',
      shiftPeriod: 'night',
      items: [
        {
          stayId: 'fdd8c156-b52d-4117-a5e1-73dd61474efb',
          patient_snapshot_json: {
            name: 'Rex',
            species: 'canine'
          },
          problems_json: ['dor abdominal'],
          plan_json: ['monitorar sinais vitais'],
          escalation_json: {
            ifWorse: 'acionar plantonista'
          }
        }
      ]
    });

    expect(parsed.success).toBe(true);
  });

  it('parseOrThrow422 retorna detalhes úteis para HandoverDraft inválido', () => {
    try {
      parseOrThrow422(HandoverDraftSchema, {
        wardId: 'fdd8c156-b52d-4117-a5e1-73dd61474efa',
        shiftDate: '2026-02-17',
        shiftPeriod: 'day',
        items: []
      });
    } catch (error) {
      const validationError = error as DomainValidationError;
      const payload = validationError.toJSON();

      expect(payload.statusCode).toBe(422);
      expect(payload.issues.length).toBeGreaterThan(0);
      expect(payload.issues[0]?.path).toContain('items');
    }
  });

  it('rejeita MedicationOrderCreate sem stayId e sem encounterId', () => {
    const parsed = MedicationOrderCreateSchema.safeParse({
      patientId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef9',
      medicationName: 'ceftriaxona',
      doseValue: 25,
      doseUnit: 'mg/kg',
      route: 'IV',
      frequencyType: 'q12h',
      startAt: '2026-02-18T08:00:00Z'
    });

    expect(parsed.success).toBe(false);
  });

  it('rejeita MedicationOrderCreate com dose <= 0', () => {
    const parsed = MedicationOrderCreateSchema.safeParse({
      patientId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef9',
      stayId: 'fdd8c156-b52d-4117-a5e1-73dd61474efa',
      medicationName: 'ceftriaxona',
      doseValue: 0,
      doseUnit: 'mg/kg',
      route: 'IV',
      frequencyType: 'q12h',
      startAt: '2026-02-18T08:00:00Z'
    });

    expect(parsed.success).toBe(false);
  });

  it('rejeita MedicationScheduleCreate interval sem intervalMinutes', () => {
    const parsed = MedicationScheduleCreateSchema.safeParse({
      orderId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef9',
      scheduleType: 'interval'
    });

    expect(parsed.success).toBe(false);
  });

  it('rejeita MedicationScheduleCreate fixed_times sem times', () => {
    const parsed = MedicationScheduleCreateSchema.safeParse({
      orderId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef9',
      scheduleType: 'fixed_times'
    });

    expect(parsed.success).toBe(false);
  });

  it('rejeita MedicationAdministrationCreate refused sem reason', () => {
    const parsed = MedicationAdministrationCreateSchema.safeParse({
      orderId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef9',
      scheduledFor: '2026-02-18T08:00:00Z',
      status: 'refused'
    });

    expect(parsed.success).toBe(false);
  });

  it('rejeita MedicationAdministrationCreate delayed sem reason', () => {
    const parsed = MedicationAdministrationCreateSchema.safeParse({
      orderId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef9',
      scheduledFor: '2026-02-18T08:00:00Z',
      status: 'delayed',
      delayedUntil: '2026-02-18T09:00:00Z'
    });

    expect(parsed.success).toBe(false);
  });

  it('rejeita MedicationAdministrationCreate delayed sem delayedUntil', () => {
    const parsed = MedicationAdministrationCreateSchema.safeParse({
      orderId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef9',
      scheduledFor: '2026-02-18T08:00:00Z',
      status: 'delayed',
      reason: 'aguardando acesso venoso'
    });

    expect(parsed.success).toBe(false);
  });

  it('parseOrThrow422 retorna detalhes para MedicationAdministration inválida', () => {
    try {
      parseOrThrow422(MedicationAdministrationCreateSchema, {
        orderId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef9',
        scheduledFor: '2026-02-18T08:00:00Z',
        status: 'refused'
      });
    } catch (error) {
      const validationError = error as DomainValidationError;
      const payload = validationError.toJSON();

      expect(payload.statusCode).toBe(422);
      expect(payload.issues.length).toBeGreaterThan(0);
      expect(payload.issues.some((issue) => issue.path.includes('reason'))).toBe(true);
    }
  });

  it('aceita ProtocolContent válido para publish', () => {
    const parsed = ProtocolContentPublishSchema.safeParse({
      protocolId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef9',
      title: 'Trauma hemorrágico',
      severityLevels: [
        {
          level: 'high',
          entryCriteria: ['hipotensão', 'taquicardia'],
          steps: [
            {
              order: 1,
              title: 'Avaliação primária',
              instructions: 'Garantir via aérea, oxigenação e acesso venoso'
            },
            {
              order: 2,
              title: 'Reposição volêmica',
              instructions: 'Iniciar reposição conforme protocolo'
            }
          ],
          contraindications: ['hipervolemia grave'],
          escalation: {
            ifWorse: 'Acionar cirurgia imediatamente',
            callSupervisor: true
          }
        }
      ]
    });

    expect(parsed.success).toBe(true);
  });

  it('rejeita publish sem steps e sem escalation.ifWorse', () => {
    const parsed = ProtocolContentPublishSchema.safeParse({
      protocolId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef9',
      title: 'Trauma hemorrágico',
      severityLevels: [
        {
          level: 'critical',
          entryCriteria: ['choque refratário'],
          steps: [],
          contraindications: [],
          escalation: {}
        }
      ]
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((issue) => issue.path.join('.') === 'severityLevels.0.steps')).toBe(true);
      expect(
        parsed.error.issues.some(
          (issue) => issue.path.join('.') === 'severityLevels.0.escalation.ifWorse'
        )
      ).toBe(true);
    }
  });

  it('rejeita publish sem severityLevels', () => {
    const parsed = ProtocolContentPublishSchema.safeParse({
      protocolId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef9',
      title: 'Trauma hemorrágico',
      severityLevels: []
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((issue) => issue.path.join('.') === 'severityLevels')).toBe(true);
    }
  });

  it('rejeita severity sem level', () => {
    const parsed = ProtocolContentSchema.safeParse({
      protocolId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef9',
      title: 'Trauma hemorrágico',
      severityLevels: [
        {
          entryCriteria: ['instabilidade hemodinâmica'],
          steps: [
            {
              order: 1,
              title: 'Passo inicial',
              instructions: 'Ação imediata'
            }
          ],
          contraindications: [],
          escalation: {
            ifWorse: 'Escalar para UTI'
          }
        }
      ]
    });

    expect(parsed.success).toBe(false);
  });

  it('valida ProtocolPublishRequest com versionId obrigatório', () => {
    const parsed = ProtocolPublishRequestSchema.safeParse({
      versionId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef9'
    });

    expect(parsed.success).toBe(true);

    const invalid = ProtocolPublishRequestSchema.safeParse({
      versionId: 'invalid-id'
    });
    expect(invalid.success).toBe(false);
  });
});
