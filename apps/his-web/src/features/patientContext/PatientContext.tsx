'use client';

import React, { createContext, useContext, useCallback, useMemo } from 'react';
import { usePatientContext, usePatientContextByStay } from './queries';
import type { PatientContextResponse, PatientContextInfo, StayContextInfo, QuickNavItem } from './types';

/**
 * Patient Context
 * 
 * Provides a unified view of patient information across MAR, Notes, and Orders modules.
 * Can be initialized with either a patientId or stayId.
 */

// Context value type
type PatientContextValue = {
  // Data
  patient: PatientContextInfo | null;
  stay: StayContextInfo | null;
  navigation: {
    mar?: QuickNavItem;
    notes?: QuickNavItem;
    orders?: QuickNavItem;
    record?: QuickNavItem;
  };
  
  // Loading states
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  
  // Refetch function
  refetch: () => void;
  
  // Source info
  sourceType: 'patient' | 'stay' | null;
  sourceId: string | null;
};

const PatientContext = createContext<PatientContextValue | null>(null);

/**
 * Hook to access the patient context
 */
export function usePatientContextValue(): PatientContextValue {
  const context = useContext(PatientContext);
  if (!context) {
    throw new Error('usePatientContextValue must be used within a PatientContextProvider');
  }
  return context;
}

/**
 * Hook to get just the patient info
 */
export function useCurrentPatient(): PatientContextInfo | null {
  const { patient } = usePatientContextValue();
  return patient;
}

/**
 * Hook to get just the stay info
 */
export function useCurrentStay(): StayContextInfo | null {
  const { stay } = usePatientContextValue();
  return stay;
}

/**
 * Hook to get navigation items
 */
export function usePatientNavigation() {
  const { navigation } = usePatientContextValue();
  return navigation;
}

/**
 * Hook to check if patient has allergies
 */
export function usePatientAllergies(): string[] {
  const patient = useCurrentPatient();
  return patient?.alerts?.allergies ?? [];
}

/**
 * Hook to check if patient is aggressive
 */
export function usePatientAggressive(): boolean {
  const patient = useCurrentPatient();
  return patient?.alerts?.aggressive ?? false;
}

/**
 * Hook to get patient weight
 */
export function usePatientWeight(): string | null {
  const patient = useCurrentPatient();
  return patient?.weightKg ?? null;
}

/**
 * Hook to get patient anesthesia risk
 */
export function usePatientAnesthesiaRisk(): 'low' | 'medium' | 'high' | null {
  const patient = useCurrentPatient();
  return patient?.alerts?.anesthesia_risk ?? null;
}

// Provider props
type PatientContextProviderProps = {
  patientId?: string | null;
  stayId?: string | null;
  children: React.ReactNode;
};

/**
 * Provider component for patient context
 */
export function PatientContextProvider({ patientId, stayId, children }: PatientContextProviderProps) {
  // Use the appropriate query based on what's provided
  const patientQuery = usePatientContext(patientId && !stayId ? patientId : null);
  const stayQuery = usePatientContextByStay(stayId);
  
  // Determine which query result to use
  const activeQuery = stayId ? stayQuery : patientQuery;
  const sourceType = stayId ? 'stay' : patientId ? 'patient' : null;
  const sourceId = stayId ?? patientId ?? null;
  
  // Extract data from query result
  const data = activeQuery.data;
  
  // Memoized context value
  const value = useMemo<PatientContextValue>(() => ({
    patient: data?.patient ?? null,
    stay: data?.stay ?? null,
    navigation: data?.navigation ?? {},
    isLoading: activeQuery.isLoading,
    isError: activeQuery.isError,
    error: activeQuery.error ?? null,
    refetch: useCallback(() => {
      activeQuery.refetch();
    }, [activeQuery]),
    sourceType,
    sourceId,
  }), [data, activeQuery, sourceType, sourceId]);
  
  return (
    <PatientContext.Provider value={value}>
      {children}
    </PatientContext.Provider>
  );
}

// Re-export types
export type { PatientContextResponse, PatientContextInfo, StayContextInfo, QuickNavItem };
