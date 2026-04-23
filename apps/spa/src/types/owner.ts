export interface OwnerContact {
  label: string;
  value: string;
  type: 'phone' | 'email' | 'whatsapp';
  primary: boolean;
}

export interface OwnerSummary {
  id: string;
  accountId: string;
  fullName: string;
  documentId?: string;
  contacts: OwnerContact[];
  financialResponsible: boolean;
  administrativeNotes?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface CreateOwnerRequest {
  fullName: string;
  documentId?: string;
  contacts: {
    label: string;
    value: string;
    type: 'phone' | 'email' | 'whatsapp';
    primary?: boolean;
  }[];
  financialResponsible: boolean;
  administrativeNotes?: string;
}

export interface UpdateOwnerRequest {
  fullName?: string;
  documentId?: string;
  contacts?: {
    label: string;
    value: string;
    type: 'phone' | 'email' | 'whatsapp';
    primary?: boolean;
  }[];
  financialResponsible?: boolean;
  administrativeNotes?: string;
  status?: 'active' | 'inactive';
}

export interface OwnersListResponse {
  items: OwnerSummary[];
  total?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
}

export interface OwnerListFilters {
  search?: string;
  status?: 'active' | 'inactive' | 'all';
  financialResponsible?: boolean;
  page?: number;
  pageSize?: number;
}

export interface OwnerSummaryResponse {
  owner: OwnerSummary;
  patients: Array<{
    id: string;
    name: string;
    species: string;
    breed?: string | null;
  }>;
  stats: {
    totalPatients: number;
    totalEncounters: number;
  };
}
