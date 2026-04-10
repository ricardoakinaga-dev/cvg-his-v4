/**
 * Smart Scheduling Tests
 * F3-03: Smart Scheduling MVP tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SmartSchedulingService, type AppointmentHistory } from './smart-scheduling.service.js';

describe('SmartSchedulingService', () => {
  let service: SmartSchedulingService;

  beforeEach(() => {
    // SmartSchedulingService doesn't need ModelRegistry for these tests
    service = new SmartSchedulingService({} as any);
  });

  describe('predictDuration', () => {
    it('predicts consulta duration as 30 minutes', async () => {
      const result = await service.predictDuration({ visitType: 'consulta' });
      expect(result.predictedMinutes).toBe(30);
      expect(result.historicalAvg).toBe(30);
    });

    it('predicts cirurgia duration as 120 minutes base', async () => {
      const result = await service.predictDuration({ visitType: 'cirurgia' });
      expect(result.predictedMinutes).toBe(140); // 120 + 20 buffer
      expect(result.factors).toContain('Surgery buffer: +20min');
    });

    it('predicts vacina duration as 15 minutes', async () => {
      const result = await service.predictDuration({ visitType: 'vacina' });
      expect(result.predictedMinutes).toBe(15);
    });

    it('adjusts for experienced patients (5+ visits)', async () => {
      const result = await service.predictDuration({
        visitType: 'consulta',
        previousVisits: 10
      });
      expect(result.predictedMinutes).toBe(25); // 30 - 5
      expect(result.factors).toContain('Experienced patient: -5min');
    });

    it('adds emergency buffer', async () => {
      const result = await service.predictDuration({ visitType: 'emergencia' });
      expect(result.predictedMinutes).toBe(60); // 45 + 15
      expect(result.factors).toContain('Emergency buffer: +15min');
    });

    it('returns minimum 15 minutes', async () => {
      const result = await service.predictDuration({ visitType: 'vacina' });
      expect(result.predictedMinutes).toBeGreaterThanOrEqual(15);
    });

    it('calculates confidence based on visit type', async () => {
      const result = await service.predictDuration({ visitType: 'consulta' });
      expect(result.confidence).toBeGreaterThan(0.7);
    });
  });

  describe('getRecommendation', () => {
    it('returns recommendation with predicted duration', async () => {
      const result = await service.getRecommendation({
        appointmentId: 'apt_123',
        visitType: 'consulta'
      });
      expect(result.appointmentId).toBe('apt_123');
      expect(result.predictedDuration).toBe(30);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.factors.length).toBeGreaterThan(0);
    });

    it('includes factors in recommendation', async () => {
      const result = await service.getRecommendation({
        appointmentId: 'apt_456',
        visitType: 'cirurgia'
      });
      expect(result.factors.some(f => f.includes('cirurgia'))).toBe(true);
    });
  });

  describe('optimizeSlotAllocation', () => {
    it('marks slots that fit predicted duration', async () => {
      const slots = [
        { id: 'slot1', startTime: '09:00', endTime: '09:30', duration: 30, available: true },
        { id: 'slot2', startTime: '09:30', endTime: '10:00', duration: 30, available: true }
      ];
      const predictions = new Map([
        ['slot1', 25], // fits in 30min
        ['slot2', 35]  // doesn't fit
      ]);

      const result = await service.optimizeSlotAllocation(slots, predictions);
      expect(result[0].fits).toBe(true);
      expect(result[1].fits).toBe(false);
    });

    it('calculates utilization correctly', async () => {
      const slots = [
        { id: 'slot1', startTime: '09:00', endTime: '09:30', duration: 30, available: true }
      ];
      const predictions = new Map([['slot1', 20]]);

      const result = await service.optimizeSlotAllocation(slots, predictions);
      expect(result[0].utilization).toBeCloseTo(0.667, 2); // 20/30
    });
  });

  describe('trainModel', () => {
    it('processes historical data and logs statistics', async () => {
      const history: AppointmentHistory[] = [
        { visitType: 'consulta', actualDuration: 35, patientId: 'p1', date: '2026-01-01' },
        { visitType: 'consulta', actualDuration: 28, patientId: 'p2', date: '2026-01-02' },
        { visitType: 'exame', actualDuration: 50, patientId: 'p1', date: '2026-01-03' }
      ];

      // Should not throw
      await expect(service.trainModel(history)).resolves.not.toThrow();
    });
  });
});