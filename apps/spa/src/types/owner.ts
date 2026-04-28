export interface OwnerContact {
  label: string;
  value: string;
  type: 'phone' | 'email' | 'whatsapp';
  primary: boolean;
}

export interface OwnerAddress {
  zipCode?: string;
  street?: string;
  number?: string;
  complement?: string;
  state?: string;
  city?: string;
  district?: string;
  reference?: string;
  cityCode?: string;
}

export interface OwnerProfile {
  birthDate?: string;
  sex?: 'female' | 'male' | 'other' | 'unknown';
  group?: string;
  receiveSms?: boolean;
  personType?: 'individual' | 'company';
  rg?: string;
}

export interface OwnerFinancialProfile {
  allowedDebtLimit?: number;
  creditBalance?: number;
  availablePoints?: number;
  blockedPoints?: number;
}

export interface OwnerSummary {
  id: string;
  accountId: string;
  fullName: string;
  documentId?: string;
  contacts: OwnerContact[];
  address?: OwnerAddress;
  profile?: OwnerProfile;
  financialProfile?: OwnerFinancialProfile;
  financialResponsible: boolean;
  administrativeNotes?: string;
  legacyVetusId?: string;
  originalCreatedAt?: string;
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
  address?: OwnerAddress;
  profile?: OwnerProfile;
  financialProfile?: OwnerFinancialProfile;
  financialResponsible: boolean;
  administrativeNotes?: string;
  legacyVetusId?: string;
  originalCreatedAt?: string;
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
  address?: OwnerAddress;
  profile?: OwnerProfile;
  financialProfile?: OwnerFinancialProfile;
  financialResponsible?: boolean;
  administrativeNotes?: string;
  legacyVetusId?: string;
  originalCreatedAt?: string;
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
