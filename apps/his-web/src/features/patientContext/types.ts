/**
 * Patient Context Types for Frontend
 * 
 * Types for the Patient Context system that provides a unified view
 * of patient information across MAR, Notes, and Orders modules.
 */

// Risk levels for anesthesia
export type AnesthesiaRisk = 'low' | 'medium' | 'high';

// Patient alerts structure
export type PatientAlerts = {
  aggressive?: boolean;
  allergies?: string[];
  anesthesia_risk?: AnesthesiaRisk | null;
  chronic_conditions?: string[];
  notes?: string | null;
};

// Highlighted alerts for quick display
export type HighlightedAlerts = {
  aggressive: boolean;
  allergiesCount: number;
  anesthesiaRisk: AnesthesiaRisk | null;
  chronicConditionsCount: number;
  hasNotes: boolean;
};

// Patient basic info for context
export type PatientContextInfo = {
  id: string;
  ownerId: string;
  ownerName?: string;
  name: string;
  species: string;
  breed: string | null;
  sex: string | null;
  birthDate: string | null;
  ageMonths: number | null;
  weightKg: string | null;
  microchip: string | null;
  alerts: PatientAlerts;
  highlightedAlerts: HighlightedAlerts;
  createdAt: string;
  updatedAt: string;
};

// Inpatient stay context
export type StayContextInfo = {
  id: string;
  patientId: string;
  wardId: string;
  wardName: string;
  bedId: string;
  bedName: string;
  status: 'active' | 'discharged' | 'transferred';
  admittedAt: string;
  dischargedAt: string | null;
  chiefComplaint: string | null;
  reason: string | null;
  planSummary: string | null;
};

// Encounter context
export type EncounterContextInfo = {
  id: string;
  patientId: string;
  status: 'open' | 'closed';
  openedAt: string;
  closedAt: string | null;
  reason: string | null;
};

// Navigation items for quick access
export type QuickNavItem = {
  id: string;
  label: string;
  href: string;
  icon?: string;
  badge?: string;
  isActive?: boolean;
};

// Full patient context response
export type PatientContextResponse = {
  patient: PatientContextInfo;
  stay: StayContextInfo | null;
  encounter: EncounterContextInfo | null;
  navigation: {
    mar?: QuickNavItem;
    notes?: QuickNavItem;
    orders?: QuickNavItem;
    record?: QuickNavItem;
  };
};
