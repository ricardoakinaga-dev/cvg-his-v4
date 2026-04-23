export interface ExamOrderRecord {
  id: string;
  accountId: string;
  patientId: string;
  encounterId: string;
  category: string;
  examName: string;
  examCode?: string | null;
  priority: string;
  status: 'requested' | 'collected' | 'completed' | 'cancelled';
  notes?: string | null;
  requestedAt: string;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExamResultRecord {
  id: string;
  accountId: string;
  patientId: string;
  examOrderId: string;
  category: string;
  examName: string;
  examCode?: string | null;
  requestedAt: string;
  status: 'draft' | 'released' | 'cancelled';
  findings?: string | null;
  interpretation?: string | null;
  performedByUserId?: string | null;
  performedAt?: string | null;
  releasedAt?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExamOrderListResponse {
  items: ExamOrderRecord[];
}

export interface ExamResultListResponse {
  items: ExamResultRecord[];
}
