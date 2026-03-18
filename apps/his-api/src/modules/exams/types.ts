import {
  createExamOrderBodySchema, updateExamOrderBodySchema, examOrderIdParamSchema, examOrderResponseSchema, listExamOrdersQuerySchema,
  createExamResultBodySchema, updateExamResultBodySchema, examResultIdParamSchema, examResultResponseSchema, listExamResultsQuerySchema,
  type CreateExamOrderBody, type UpdateExamOrderBody, type ExamOrderIdParam, type ExamOrderResponse, type ListExamOrdersQuery,
  type CreateExamResultBody, type UpdateExamResultBody, type ExamResultIdParam, type ExamResultResponse, type ListExamResultsQuery
} from '@cvg-his/contracts';

export {
  createExamOrderBodySchema, updateExamOrderBodySchema, examOrderIdParamSchema, examOrderResponseSchema, listExamOrdersQuerySchema,
  createExamResultBodySchema, updateExamResultBodySchema, examResultIdParamSchema, examResultResponseSchema, listExamResultsQuerySchema
};

export type {
  CreateExamOrderBody, UpdateExamOrderBody, ExamOrderIdParam, ExamOrderResponse, ListExamOrdersQuery,
  CreateExamResultBody, UpdateExamResultBody, ExamResultIdParam, ExamResultResponse, ListExamResultsQuery
};

export type ExamOrderRecord = {
  id: string; accountId: string; patientId: string; encounterId: string | null;
  requestedByUserId: string; category: string; examName: string; examCode: string | null;
  priority: string; status: string; notes: string | null;
  requestedAt: Date; completedAt: Date | null; createdAt: Date; updatedAt: Date;
};

export type ExamResultRecord = {
  id: string; accountId: string; patientId: string; examOrderId: string;
  category: string; examName: string; examCode: string | null; requestedAt: Date;
  status: string; findings: string | null; interpretation: string | null;
  resultValues: string | null; normalRange: string | null;
  performedByUserId: string | null; performedAt: Date | null;
  reviewedByUserId: string | null; reviewedAt: Date | null; releasedAt: Date | null;
  notes: string | null; createdAt: Date; updatedAt: Date;
};
