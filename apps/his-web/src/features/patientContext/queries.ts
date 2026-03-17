import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { getPatientContext, getPatientContextByStay, getPatientInfo, getStayInfo } from './api';
import type { PatientContextResponse, PatientContextInfo, StayContextInfo } from './types';

/**
 * Query keys for patient context
 */
export const patientContextKeys = {
  all: ['patient-context'] as const,
  byPatient: (patientId: string) => [...patientContextKeys.all, 'patient', patientId] as const,
  byStay: (stayId: string) => [...patientContextKeys.all, 'stay', stayId] as const,
  patientInfo: (patientId: string) => [...patientContextKeys.all, 'info', patientId] as const,
  stayInfo: (stayId: string) => [...patientContextKeys.all, 'stay-info', stayId] as const,
};

/**
 * Hook to get full patient context by patient ID
 */
export function usePatientContext(patientId: string | null | undefined) {
  return useQuery<PatientContextResponse | null>({
    queryKey: patientContextKeys.byPatient(patientId ?? ''),
    queryFn: () => getPatientContext(patientId!),
    enabled: !!patientId,
    staleTime: 30 * 1000, // 30 seconds
    placeholderData: keepPreviousData,
  });
}

/**
 * Hook to get full patient context by stay ID
 */
export function usePatientContextByStay(stayId: string | null | undefined) {
  return useQuery<PatientContextResponse | null>({
    queryKey: patientContextKeys.byStay(stayId ?? ''),
    queryFn: () => getPatientContextByStay(stayId!),
    enabled: !!stayId,
    staleTime: 30 * 1000, // 30 seconds
    placeholderData: keepPreviousData,
  });
}

/**
 * Hook to get just the patient info (lighter weight)
 */
export function usePatientInfo(patientId: string | null | undefined) {
  return useQuery<PatientContextInfo | null>({
    queryKey: patientContextKeys.patientInfo(patientId ?? ''),
    queryFn: () => getPatientInfo(patientId!),
    enabled: !!patientId,
    staleTime: 60 * 1000, // 1 minute
    placeholderData: keepPreviousData,
  });
}

/**
 * Hook to get stay info
 */
export function useStayInfo(stayId: string | null | undefined) {
  return useQuery<StayContextInfo | null>({
    queryKey: patientContextKeys.stayInfo(stayId ?? ''),
    queryFn: () => getStayInfo(stayId!),
    enabled: !!stayId,
    staleTime: 60 * 1000, // 1 minute
    placeholderData: keepPreviousData,
  });
}
