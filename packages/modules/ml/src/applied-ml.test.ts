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
});
