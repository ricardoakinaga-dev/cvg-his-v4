import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  PatientContextProvider,
  useCurrentPatient,
  usePatientAllergies,
  usePatientWeight,
  usePatientAnesthesiaRisk,
} from '../PatientContext';
import type { ReactNode } from 'react';

// Mock the API module
vi.mock('../api', () => ({
  getPatientContext: vi.fn(),
  getPatientContextByStay: vi.fn(),
  getPatientInfo: vi.fn(),
  getStayInfo: vi.fn(),
}));

// Test wrapper component
function TestWrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

// Test component to access context
function TestConsumer() {
  const patient = useCurrentPatient();
  const allergies = usePatientAllergies();
  const weight = usePatientWeight();
  const risk = usePatientAnesthesiaRisk();

  return (
    <div>
      <div data-testid="patient-name">{patient?.name ?? 'no-patient'}</div>
      <div data-testid="allergies-count">{allergies.length}</div>
      <div data-testid="weight">{weight ?? 'no-weight'}</div>
      <div data-testid="risk">{risk ?? 'no-risk'}</div>
    </div>
  );
}

describe('PatientContext', () => {
  describe('PatientContextProvider', () => {
    it('should provide null patient when no ID is provided', () => {
      render(
        <TestWrapper>
          <PatientContextProvider>
            <TestConsumer />
          </PatientContextProvider>
        </TestWrapper>
      );

      expect(screen.getByTestId('patient-name').textContent).toBe('no-patient');
    });
  });

  describe('usePatientAllergies', () => {
    it('should return empty array when no patient', () => {
      render(
        <TestWrapper>
          <PatientContextProvider>
            <TestConsumer />
          </PatientContextProvider>
        </TestWrapper>
      );

      expect(screen.getByTestId('allergies-count').textContent).toBe('0');
    });
  });

  describe('usePatientWeight', () => {
    it('should return null when no patient', () => {
      render(
        <TestWrapper>
          <PatientContextProvider>
            <TestConsumer />
          </PatientContextProvider>
        </TestWrapper>
      );

      expect(screen.getByTestId('weight').textContent).toBe('no-weight');
    });
  });

  describe('usePatientAnesthesiaRisk', () => {
    it('should return null when no patient', () => {
      render(
        <TestWrapper>
          <PatientContextProvider>
            <TestConsumer />
          </PatientContextProvider>
        </TestWrapper>
      );

      expect(screen.getByTestId('risk').textContent).toBe('no-risk');
    });
  });
});
