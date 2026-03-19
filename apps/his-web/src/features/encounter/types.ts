import { EncounterTimelineResponse, EncounterTimelineEvent, SoapPayload } from '@/lib/api';

export type SoapFormState = {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
};

export const EMPTY_SOAP: SoapFormState = {
    subjective: '',
    objective: '',
    assessment: '',
    plan: ''
};


export const EncounterTabKeys = ['summary', 'soap', 'meds', 'exams', 'billing', 'documents', 'timeline'] as const;
export type EncounterTabKey = typeof EncounterTabKeys[number];

export type EncounterData = EncounterTimelineResponse;
