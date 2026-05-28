import { describe, expect, it } from 'vitest';

import type { DiagnosticOrderSummary, LaboratoryReferenceValueSummary, SchedulingAppointmentSummary } from '@cvg-his-v2/shared-types';

import { DemandForecastingService } from './demand-forecasting.service.js';
import { LabAnomalyDetectionService } from './lab-anomaly-detection.service.js';
import { OcrFiscalService } from './ocr-fiscal.service.js';

describe('OcrFiscalService', () => {
  it('extracts fiscal preview fields from raw document text', () => {
    const service = new OcrFiscalService();
    const preview = service.preview({
      rawText: `
        NFS-e Numero: 12345
        Serie: 7
        Emissao: 19/04/2026
        CNPJ Prestador: 12.345.678/0001-90
        Tomador: 987.654.321-00
        Consulta Clinica 1 150,00 150,00
        Valor Total: R$ 150,00
      `
    });

    expect(preview.detectedType).toBe('nfse');
    expect(preview.documentNumber).toBe('12345');
    expect(preview.series).toBe('7');
    expect(preview.issuerDocument).toBe('12345678000190');
    expect(preview.totalAmount).toBe(150);
    expect(preview.lineItems).toHaveLength(1);
  });

  it('classifies receipts and returns warnings when fiscal signals are missing', () => {
    const service = new OcrFiscalService();
    const preview = service.preview({
      rawText: 'RECIBO COMPROVANTE atendimento veterinario sem campos fiscais'
    });

    expect(preview.detectedType).toBe('receipt');
    expect(preview.confidence).toBe(0.4);
    expect(preview.warnings).toEqual(
      expect.arrayContaining([
        'document_number_not_detected',
        'issue_date_not_detected',
        'issuer_document_not_detected',
        'total_amount_not_detected',
        'line_items_not_detected'
      ])
    );
  });

  it('extracts NFe fields with ISO dates and decimal quantities', () => {
    const service = new OcrFiscalService();
    const preview = service.preview({
      rawText: `
        DANFE NF-e: ABC-999
        Data: 2026-05-28
        CNPJ: 11.222.333/0001-44
        CPF/CNPJ: 123.456.789-00
        Racao Premium 2,5 x 10,00 = 25,00
        Total Geral: 25,00
      `
    });

    expect(preview.detectedType).toBe('nfe');
    expect(preview.issuedAt).toBe('2026-05-28T00:00:00.000Z');
    expect(preview.recipientDocument).toBe('12345678900');
    expect(preview.lineItems[0]).toMatchObject({
      description: 'Racao Premium',
      quantity: 2.5,
      unitAmount: 10,
      totalAmount: 25
    });
  });
});

describe('DemandForecastingService', () => {
  it('generates a demand forecast from appointment history', () => {
    const service = new DemandForecastingService();
    const appointments: SchedulingAppointmentSummary[] = [
      {
        id: 'appt_1' as never,
        accountId: 'acc_test' as never,
        patientId: 'patient_1' as never,
        ownerId: 'owner_1' as never,
        scheduledAt: '2026-04-14T10:00:00.000Z',
        durationMinutes: 30,
        visitType: 'scheduled',
        reason: 'Checkup',
        status: 'completed',
        createdAt: '2026-04-14T08:00:00.000Z',
        updatedAt: '2026-04-14T10:30:00.000Z'
      },
      {
        id: 'appt_2' as never,
        accountId: 'acc_test' as never,
        patientId: 'patient_2' as never,
        ownerId: 'owner_2' as never,
        scheduledAt: '2026-04-15T11:00:00.000Z',
        durationMinutes: 45,
        visitType: 'return',
        reason: 'Review',
        status: 'completed',
        createdAt: '2026-04-15T08:00:00.000Z',
        updatedAt: '2026-04-15T11:45:00.000Z'
      }
    ];

    const forecast = service.forecast({
      appointments,
      referenceDate: '2026-04-19T00:00:00.000Z',
      horizonDays: 5
    });

    expect(forecast.horizonDays).toBe(5);
    expect(forecast.days).toHaveLength(5);
    expect(forecast.days[0]?.predictedAppointments).toBeGreaterThanOrEqual(1);
  });

  it('clamps horizon and ignores cancelled appointments while preserving mixed fallback', () => {
    const service = new DemandForecastingService();
    const forecast = service.forecast({
      referenceDate: '2026-04-19T00:00:00.000Z',
      horizonDays: 60,
      appointments: [
        {
          id: 'appt_cancelled' as never,
          accountId: 'acc_test' as never,
          patientId: 'patient_1' as never,
          ownerId: 'owner_1' as never,
          scheduledAt: '2026-04-14T10:00:00.000Z',
          durationMinutes: undefined,
          visitType: 'walk_in',
          reason: 'Cancelado',
          status: 'cancelled',
          createdAt: '2026-04-14T08:00:00.000Z',
          updatedAt: '2026-04-14T10:30:00.000Z'
        }
      ]
    });

    expect(forecast.horizonDays).toBe(30);
    expect(forecast.baselineSampleSize).toBe(0);
    expect(forecast.days[0]).toMatchObject({
      predictedAppointments: 1,
      predictedMinutes: 15,
      peakVisitType: 'mixed',
      confidence: 0.45
    });
  });
});

describe('LabAnomalyDetectionService', () => {
  it('flags out-of-range laboratory results', () => {
    const service = new LabAnomalyDetectionService();
    const orders: DiagnosticOrderSummary[] = [
      {
        id: 'diag_1' as never,
        accountId: 'acc_test' as never,
        encounterId: 'enc_1' as never,
        patientId: 'patient_1' as never,
        examType: 'HEM',
        reason: 'Investigacao',
        status: 'resulted',
        resultSummary: 'Hemoglobina: 7.2 Leucocitos: 8000',
        createdAt: '2026-04-19T00:00:00.000Z',
        updatedAt: '2026-04-19T00:00:00.000Z'
      }
    ];
    const referenceValues: LaboratoryReferenceValueSummary[] = [
      {
        id: 'ref_1',
        parameter: 'Hemoglobina',
        examType: 'HEM',
        minValue: 12,
        maxValue: 18,
        unit: 'g/dL'
      }
    ];

    const result = service.detect(orders, referenceValues);

    expect(result.flaggedOrders).toBe(1);
    expect(result.flags[0]?.classification).toBe('out_of_range');
    expect(result.flags[0]?.severity).toBe('critical');
  });

  it('flags keyword-only critical results and warning range deviations', () => {
    const service = new LabAnomalyDetectionService();
    const orders: DiagnosticOrderSummary[] = [
      {
        id: 'diag_warning' as never,
        accountId: 'acc_test' as never,
        encounterId: 'enc_1' as never,
        patientId: 'patient_1' as never,
        examType: 'BIO',
        reason: 'Investigacao',
        status: 'resulted',
        resultSummary: 'Glicose: 115 Observacao urgente',
        createdAt: '2026-04-19T00:00:00.000Z',
        updatedAt: '2026-04-19T00:00:00.000Z'
      },
      {
        id: 'diag_skipped' as never,
        accountId: 'acc_test' as never,
        encounterId: 'enc_2' as never,
        patientId: 'patient_2' as never,
        examType: 'BIO',
        reason: 'Sem resultado',
        status: 'requested',
        resultSummary: undefined,
        createdAt: '2026-04-19T00:00:00.000Z',
        updatedAt: '2026-04-19T00:00:00.000Z'
      }
    ];
    const referenceValues: LaboratoryReferenceValueSummary[] = [
      {
        id: 'ref_glicose',
        parameter: 'Glicose',
        examType: 'BIO',
        minValue: 70,
        maxValue: 100,
        unit: 'mg/dL'
      }
    ];

    const result = service.detect(orders, referenceValues);

    expect(result.totalAnalyzed).toBe(2);
    expect(result.flaggedOrders).toBe(1);
    expect(result.flags.map((flag) => flag.classification)).toEqual([
      'out_of_range',
      'keyword_match'
    ]);
    expect(result.flags[0]?.severity).toBe('warning');
  });
});
