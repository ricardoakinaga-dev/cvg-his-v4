// Encounter Feature - Public Exports

// Types
export * from './types';

// Queries (TanStack Query hooks)
export {
  encounterKeys,
  useEncounterTimeline,
  usePatientSummary,
  useSoapTemplates,
  useCreateClinicalNote,
  useUpdateClinicalNote,
  useVersionClinicalNote,
  useSignClinicalNote,
  useUploadDocument,
  useEncounterData,
} from './queries';

// Components
export { EncounterHeader } from './components/EncounterHeader';
export { EncounterTabs } from './components/EncounterTabs';
export { EncounterSoapTab } from './components/EncounterSoapTab';
export { EncounterTimelineTab } from './components/EncounterTimelineTab';
export { EncounterDocumentsTab } from './components/EncounterDocumentsTab';
export { EncounterSidebar } from './components/EncounterSidebar';
export { EncounterSummaryTab } from './components/EncounterSummaryTab';
export { EncounterMedsTab } from './components/EncounterMedsTab';

// New refactored components
export { SoapEditor } from './components/SoapEditor';
export type { AutosaveStatus } from './components/SoapEditor';
export { ClinicalTimeline } from './components/ClinicalTimeline';
export { DocumentsPanel } from './components/DocumentsPanel';

// Utils
export * from './utils/helpers';
