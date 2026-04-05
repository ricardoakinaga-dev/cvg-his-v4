import { describe, it, expect } from 'vitest';
import {
  speciesLabel,
  sexLabel,
  patientStatusLabel,
  patientSizeLabel,
  visitTypeLabel,
  encounterStatusLabel,
  encounterOriginLabel,
  encounterEventTypeLabel,
  appointmentStatusLabel,
  ownerStatusLabel,
  encounterAllowedTransitions,
  formatDate,
  formatDateTime,
  formatTime,
  truncate
} from '@/utils/labels';

describe('labels', () => {
  describe('speciesLabel', () => {
    it('returns correct label for known species', () => {
      expect(speciesLabel('canine')).toBe('🐕 Canino');
      expect(speciesLabel('feline')).toBe('🐈 Felino');
    });

    it('returns fallback for unknown species', () => {
      expect(speciesLabel('unknown')).toBe('unknown');
      expect(speciesLabel('')).toBe('—');
    });
  });

  describe('sexLabel', () => {
    it('returns correct label for known sexes', () => {
      expect(sexLabel('male')).toBe('♂ Macho');
      expect(sexLabel('female')).toBe('♀ Fêmea');
    });

    it('returns fallback for unknown sex', () => {
      expect(sexLabel('')).toBe('—');
    });
  });

  describe('patientStatusLabel', () => {
    it('returns correct label', () => {
      expect(patientStatusLabel('active')).toBe('Ativo');
      expect(patientStatusLabel('deceased')).toBe('Falecido');
    });
  });

  describe('visitTypeLabel', () => {
    it('returns correct label', () => {
      expect(visitTypeLabel('walk_in')).toBe('🚶 Walk-in');
      expect(visitTypeLabel('scheduled')).toBe('📅 Agendado');
    });
  });

  describe('encounterStatusLabel', () => {
    it('returns correct label', () => {
      expect(encounterStatusLabel('reception')).toBe('📋 Recepção');
      expect(encounterStatusLabel('closed')).toBe('✅ Finalizado');
    });
  });

  describe('encounterAllowedTransitions', () => {
    it('has correct transitions for reception', () => {
      expect(encounterAllowedTransitions['reception']).toEqual(['in_triage', 'in_care', 'closed']);
    });

    it('has no transitions for closed', () => {
      expect(encounterAllowedTransitions['closed']).toEqual([]);
    });
  });

  describe('appointmentStatusLabel', () => {
    it('returns correct label', () => {
      expect(appointmentStatusLabel('scheduled')).toBe('Agendado');
      expect(appointmentStatusLabel('cancelled')).toBe('Cancelado');
    });
  });

  describe('formatDate', () => {
    it('formats date correctly', () => {
      expect(formatDate('2024-01-15T10:00:00Z')).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    });

    it('returns original string on invalid date', () => {
      expect(formatDate('not-a-date')).toBe('not-a-date');
    });
  });

  describe('formatDateTime', () => {
    it('formats datetime correctly', () => {
      expect(formatDateTime('2024-01-15T10:30:00Z')).toMatch(/\d{2}\/\d{2}\/\d{4},? \d{2}:\d{2}/);
    });
  });

  describe('formatTime', () => {
    it('formats time correctly', () => {
      expect(formatTime('2024-01-15T10:30:00Z')).toMatch(/\d{2}:\d{2}/);
    });

    it('returns empty string on invalid date', () => {
      expect(formatTime('not-a-date')).toBe('');
    });
  });

  describe('truncate', () => {
    it('truncates long strings', () => {
      expect(truncate('Hello World', 5)).toBe('Hello...');
    });

    it('does not truncate short strings', () => {
      expect(truncate('Hi', 5)).toBe('Hi');
    });
  });
});
