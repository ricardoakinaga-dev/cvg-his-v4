/**
 * Smart Scheduling Service
 * F3-03: Smart Scheduling MVP - Predicts appointment duration
 */

import type { ModelRegistryService } from './model-registry.service.js';

export interface SchedulingRecommendation {
  appointmentId: string;
  predictedDuration: number; // minutes
  confidence: number; // 0-1
  factors: string[];
}

export interface DurationPrediction {
  predictedMinutes: number;
  confidence: number;
  historicalAvg: number;
  factors: string[];
}

export class SmartSchedulingService {
  private modelRegistry: ModelRegistryService;

  constructor(modelRegistry: ModelRegistryService) {
    this.modelRegistry = modelRegistry;
  }

  /**
   * Predict appointment duration based on visit type and patient history
   */
  async predictDuration(params: {
    visitType: string;
    patientId?: string;
    previousVisits?: number;
  }): Promise<DurationPrediction> {
    // Base durations by visit type (in minutes)
    const baseDurations: Record<string, number> = {
      'consulta': 30,
      'exame': 45,
      'procedimento': 60,
      'vacina': 15,
      'cirurgia': 120,
      'retorno': 20,
      'emergencia': 45,
      'triagem': 15
    };

    const baseDuration = baseDurations[params.visitType] ?? 30;
    let adjustment = 0;
    const factors: string[] = [`Base duration for ${params.visitType}: ${baseDuration}min`];

    // Patient history adjustments
    if (params.previousVisits !== undefined && params.previousVisits > 5) {
      adjustment -= 5; // Experienced patient, faster
      factors.push('Experienced patient: -5min');
    }

    // Emergency visits get longer
    if (params.visitType === 'emergencia') {
      adjustment += 15;
      factors.push('Emergency buffer: +15min');
    }

    // Surgeries get buffer
    if (params.visitType === 'cirurgia') {
      adjustment += 20;
      factors.push('Surgery buffer: +20min');
    }

    const predictedMinutes = Math.max(15, baseDuration + adjustment);
    const confidence = this.calculateConfidence(params);

    return {
      predictedMinutes,
      confidence,
      historicalAvg: baseDuration,
      factors
    };
  }

  /**
   * Get scheduling recommendation for an appointment
   */
  async getRecommendation(params: {
    appointmentId: string;
    visitType: string;
    patientId?: string;
    preferredTime?: string;
  }): Promise<SchedulingRecommendation> {
    const prediction = await this.predictDuration({
      visitType: params.visitType,
      patientId: params.patientId
    });

    return {
      appointmentId: params.appointmentId,
      predictedDuration: prediction.predictedMinutes,
      confidence: prediction.confidence,
      factors: prediction.factors
    };
  }

  /**
   * Optimize slot allocation based on predicted durations
   */
  async optimizeSlotAllocation(slots: TimeSlot[], predictions: Map<string, number>): Promise<TimeSlot[]> {
    return slots.map(slot => {
      const predicted = predictions.get(slot.id);
      if (predicted && slot.available) {
        const fits = predicted <= slot.duration;
        return { ...slot, fits, utilization: predicted / slot.duration };
      }
      return slot;
    });
  }

  /**
   * Calculate confidence score based on available data
   */
  private calculateConfidence(params: { visitType: string; patientId?: string; previousVisits?: number }): number {
    let confidence = 0.7; // Base confidence

    // Known visit type increases confidence
    const knownTypes = ['consulta', 'exame', 'procedimento', 'vacina', 'cirurgia', 'retorno', 'emergencia', 'triagem'];
    if (knownTypes.includes(params.visitType)) {
      confidence += 0.1;
    }

    // Patient history increases confidence
    if (params.previousVisits !== undefined) {
      confidence += Math.min(0.1, params.previousVisits * 0.02);
    }

    // Emergency is less predictable
    if (params.visitType === 'emergencia') {
      confidence -= 0.15;
    }

    return Math.max(0.3, Math.min(0.95, confidence));
  }

  /**
   * Train model on historical appointment data
   */
  async trainModel(historicalData: AppointmentHistory[]): Promise<void> {
    // Calculate averages by visit type
    const visitTypeStats = new Map<string, { total: number; count: number }>();

    for (const apt of historicalData) {
      const stats = visitTypeStats.get(apt.visitType) ?? { total: 0, count: 0 };
      stats.total += apt.actualDuration;
      stats.count += 1;
      visitTypeStats.set(apt.visitType, stats);
    }

    // Log statistics
    for (const [visitType, stats] of visitTypeStats) {
      const avg = stats.total / stats.count;
      console.log(`Visit type ${visitType}: avg ${avg.toFixed(0)}min (${stats.count} samples)`);
    }
  }
}

export interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  duration: number;
  available: boolean;
  fits?: boolean;
  utilization?: number;
}

export interface AppointmentHistory {
  visitType: string;
  actualDuration: number;
  patientId: string;
  date: string;
}