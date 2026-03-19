// Patient Context Feature Module
// Provides unified patient information across MAR, Notes, and Orders modules

// Context and hooks
export {
  PatientContextProvider,
  usePatientContextValue,
  useCurrentPatient,
  useCurrentStay,
  usePatientNavigation,
  usePatientAllergies,
  usePatientAggressive,
  usePatientWeight,
  usePatientAnesthesiaRisk,
} from './PatientContext';

// Query hooks
export {
  usePatientContext,
  usePatientContextByStay,
  usePatientInfo,
  useStayInfo,
  patientContextKeys,
} from './queries';

// API functions
export {
  getPatientContext,
  getPatientContextByStay,
  getPatientInfo,
  getStayInfo,
} from './api';

// Components
export {
  // Main container components
  PatientContextPanel,
  PatientContextCompact,
  PatientContextSidebar,
  
  // Individual components
  PatientBanner,
  PatientBannerCompact,
  AllergyAlert,
  AllergyBadge,
  AllergyWarningBanner,
  WeightDisplay,
  WeightBadge,
  WeightWithDoseCalc,
  RiskStatus,
  RiskBadge,
  RiskSummary,
  QuickNavigation,
  QuickNavigationVertical,
  QuickNavigationTabs,
} from './components';

// Integrations
export {
  // MAR integration
  MarWithPatientContext,
  MarHeaderWithPatientContext,
  MarPageWrapper,
  
  // Notes integration
  NotesWithPatientContext,
  NotesPageWrapper,
  NotesHeaderWithPatientContext,
  
  // Orders integration
  OrdersWithPatientContext,
  OrdersPageWrapper,
  OrdersHeaderWithPatientContext,
  OrderFormWithPatientContext,
} from './integrations';

// Types
export type {
  PatientContextResponse,
  PatientContextInfo,
  StayContextInfo,
  EncounterContextInfo,
  QuickNavItem,
  PatientAlerts,
  HighlightedAlerts,
  AnesthesiaRisk,
} from './types';
