import { apiFetch } from '../../lib/api';
import type { PatientContextResponse, PatientContextInfo, StayContextInfo } from './types';

/**
 * Get full patient context by patient ID
 */
export async function getPatientContext(patientId: string): Promise<PatientContextResponse> {
  return apiFetch<PatientContextResponse>(`/patient-context/by-patient/${patientId}`, {
    method: 'GET',
  });
}

/**
 * Get full patient context by inpatient stay ID
 */
export async function getPatientContextByStay(stayId: string): Promise<PatientContextResponse> {
  return apiFetch<PatientContextResponse>(`/patient-context/by-stay/${stayId}`, {
    method: 'GET',
  });
}

/**
 * Get just the patient info (lighter weight endpoint)
 */
export async function getPatientInfo(patientId: string): Promise<PatientContextInfo> {
  return apiFetch<PatientContextInfo>(`/patient-context/${patientId}/info`, {
    method: 'GET',
  });
}

/**
 * Get stay info by stay ID
 */
export async function getStayInfo(stayId: string): Promise<StayContextInfo> {
  return apiFetch<StayContextInfo>(`/patient-context/stay/${stayId}`, {
    method: 'GET',
  });
}
