import { apiRequest } from './api';
import type {
  MasterSearchOwnerResult,
  PatientSummary,
  OwnerPatientLinkSummary
} from '@cvg-his-v2/shared-types';

export interface MasterSearchResponse {
  owners: MasterSearchOwnerResult[];
  patients: PatientSummary[];
  links: OwnerPatientLinkSummary[];
}

export const masterSearchService = {
  async search(query: string): Promise<MasterSearchResponse> {
    return apiRequest<MasterSearchResponse>(`/master-search?q=${encodeURIComponent(query)}`);
  }
};
