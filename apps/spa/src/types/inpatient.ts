export type InpatientStatus = 'admitted' | 'stable' | 'transferred' | 'discharged';

export interface InpatientStaySummary {
  id: string;
  accountId: string;
  encounterId: string;
  patientId: string;
  unit: string;
  ward: string;
  bed: string;
  sectorId?: string;
  bedId?: string;
  status: InpatientStatus;
  admittedAt: string;
  dischargedAt?: string;
  dischargeReason?: string;
  transferToUnit?: string;
  transferToWard?: string;
  transferToSectorId?: string;
  transferToBedId?: string;
  updatedAt: string;
}

export interface InpatientStayDetail extends InpatientStaySummary {
  progress?: InpatientProgressSummary[];
}

export interface InpatientProgressSummary {
  id: string;
  accountId: string;
  stayId: string;
  encounterId: string;
  note: string;
  authoredByUserId: string;
  createdAt: string;
}

export interface InpatientListResponse {
  items: InpatientStaySummary[];
}

export interface AssignBedRequest {
  sectorId: string;
  bedId: string;
}

export interface TransferBedRequest {
  sectorId: string;
  bedId: string;
}

export interface SectorSummary {
  id: string;
  accountId: string;
  code: string;
  name: string;
  kind: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BedSummary {
  id: string;
  accountId: string;
  sectorId: string;
  code: string;
  name: string;
  status: 'available' | 'occupied' | 'maintenance' | 'blocked';
  supportsSpecies?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BedMapSector {
  sectorId: string;
  sectorCode: string;
  sectorName: string;
  kind: string;
  beds: BedMapBed[];
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
}

export interface BedMapBed {
  id: string;
  code: string;
  name: string;
  status: string;
  supportsSpecies?: string;
  stayId?: string;
  patientId?: string;
  encounterId?: string;
  occupiedSince?: string;
}

export interface BedMapResponse {
  items: BedMapSector[];
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
}
