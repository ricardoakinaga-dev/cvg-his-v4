import { append, type AppendAuditInput } from '@cvg-his/audit';

import type { RequestContext } from '../../plugins/requestContext.js';
import { createImagingRepo, type ImagingRepo } from './repo.js';
import type {
  ImagingModalityCreateInput,
  ImagingModalityUpdateInput,
  ImagingModalityRecord,
  ImagingTemplateCreateInput,
  ImagingTemplateUpdateInput,
  ImagingTemplateRecord,
  ImagingOrderCreateInput,
  ImagingOrderUpdateInput,
  ImagingOrderRecord,
  ImagingStudyCreateInput,
  ImagingStudyUpdateInput,
  ImagingStudyRecord,
  ImagingStudyDocumentRecord,
  ImagingReportCreateInput,
  ImagingReportUpdateInput,
  ImagingReportRecord,
  ImagingReportDocumentRecord,
  ImagingScheduleSlotCreateInput,
  ImagingScheduleSlotUpdateInput,
  ImagingScheduleSlotRecord
} from './types.js';

type DbClient = typeof import('@cvg-his/db').db;

type ImagingContext = {
  db: DbClient;
  requestContext: RequestContext;
};

type ImagingDependencies = {
  repo?: ImagingRepo;
  appendAudit?: (input: AppendAuditInput) => Promise<unknown>;
};

type AccountActor = NonNullable<RequestContext['actor']> & { accountId: string };
type WriteActor = AccountActor & { userId: string };

function unauthorizedError(message: string): Error & { statusCode: 401; code: 'UNAUTHORIZED' } {
  const error = new Error(message) as Error & { statusCode: 401; code: 'UNAUTHORIZED' };
  error.statusCode = 401;
  error.code = 'UNAUTHORIZED';
  return error;
}

function ensureAccountActor(requestContext: RequestContext): AccountActor {
  const actor = requestContext.actor;
  if (!actor?.accountId) throw unauthorizedError('Missing actor context.');
  return actor as AccountActor;
}

function ensureWriteActor(requestContext: RequestContext): WriteActor {
  const actor = ensureAccountActor(requestContext);
  if (!actor.userId) throw unauthorizedError('Missing actor user context.');
  return actor as WriteActor;
}

function isDuplicateCodeError(error: unknown, constraintName: string): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const e = error as { code?: string; constraint?: string };
  return e.code === '23505' && e.constraint === constraintName;
}

// ============================================
// IMAGING MODALITIES SERVICE
// ============================================

export type CreateImagingModalityResult = { kind: 'code_conflict' } | { kind: 'created'; modality: ImagingModalityRecord };
export type UpdateImagingModalityResult = { kind: 'modality_not_found' } | { kind: 'code_conflict' } | { kind: 'updated'; modality: ImagingModalityRecord };
export type DeleteImagingModalityResult = { kind: 'modality_not_found' } | { kind: 'deleted' };

export function createImagingModalitiesService(context: ImagingContext, deps: ImagingDependencies = {}) {
  const repo = deps.repo ?? createImagingRepo(context.db);
  const appendAuditFn = deps.appendAudit ?? append;

  return {
    async list(params: { page: number; pageSize: number; q?: string; category?: string; active?: boolean }) {
      const actor = ensureAccountActor(context.requestContext);
      const { items, total } = await repo.modalities.list({ accountId: actor.accountId, ...params });
      return { items, total, page: params.page, pageSize: params.pageSize };
    },
    async getById(modalityId: string) {
      const actor = ensureAccountActor(context.requestContext);
      return repo.modalities.findById(actor.accountId, modalityId);
    },
    async create(input: ImagingModalityCreateInput): Promise<CreateImagingModalityResult> {
      const actor = ensureWriteActor(context.requestContext);
      let modality: ImagingModalityRecord;
      try {
        modality = await repo.modalities.create({ accountId: actor.accountId, ...input });
      } catch (error) {
        if (isDuplicateCodeError(error, 'imaging_modalities_account_code_unique')) return { kind: 'code_conflict' };
        throw error;
      }
      await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'ImagingModalityCreated', entityType: 'imaging_modality', entityId: modality.id, beforeJson: null, afterJson: modality, requestId: context.requestContext.requestId });
      return { kind: 'created', modality };
    },
    async update(modalityId: string, patch: ImagingModalityUpdateInput): Promise<UpdateImagingModalityResult> {
      const actor = ensureWriteActor(context.requestContext);
      const before = await repo.modalities.findById(actor.accountId, modalityId);
      if (!before) return { kind: 'modality_not_found' };
      let after: ImagingModalityRecord | null;
      try {
        after = await repo.modalities.update({ accountId: actor.accountId, modalityId, patch });
      } catch (error) {
        if (isDuplicateCodeError(error, 'imaging_modalities_account_code_unique')) return { kind: 'code_conflict' };
        throw error;
      }
      if (!after) return { kind: 'modality_not_found' };
      await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'ImagingModalityUpdated', entityType: 'imaging_modality', entityId: after.id, beforeJson: before, afterJson: after, requestId: context.requestContext.requestId });
      return { kind: 'updated', modality: after };
    },
    async delete(modalityId: string): Promise<DeleteImagingModalityResult> {
      const actor = ensureWriteActor(context.requestContext);
      const before = await repo.modalities.findById(actor.accountId, modalityId);
      if (!before) return { kind: 'modality_not_found' };
      await repo.modalities.delete(actor.accountId, modalityId);
      await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'ImagingModalityDeleted', entityType: 'imaging_modality', entityId: modalityId, beforeJson: before, afterJson: null, requestId: context.requestContext.requestId });
      return { kind: 'deleted' };
    }
  };
}

// ============================================
// IMAGING TEMPLATES SERVICE
// ============================================

export type CreateImagingTemplateResult = { kind: 'created'; template: ImagingTemplateRecord };
export type UpdateImagingTemplateResult = { kind: 'template_not_found' } | { kind: 'updated'; template: ImagingTemplateRecord };
export type DeleteImagingTemplateResult = { kind: 'template_not_found' } | { kind: 'deleted' };

export function createImagingTemplatesService(context: ImagingContext, deps: ImagingDependencies = {}) {
  const repo = deps.repo ?? createImagingRepo(context.db);
  const appendAuditFn = deps.appendAudit ?? append;

  return {
    async list(params: { page: number; pageSize: number; modalityId?: string; q?: string }) {
      const actor = ensureAccountActor(context.requestContext);
      const { items, total } = await repo.templates.list({ accountId: actor.accountId, ...params });
      return { items, total, page: params.page, pageSize: params.pageSize };
    },
    async getById(templateId: string) {
      const actor = ensureAccountActor(context.requestContext);
      return repo.templates.findById(actor.accountId, templateId);
    },
    async create(input: ImagingTemplateCreateInput): Promise<CreateImagingTemplateResult> {
      const actor = ensureWriteActor(context.requestContext);
      const template = await repo.templates.create({ accountId: actor.accountId, ...input });
      await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'ImagingTemplateCreated', entityType: 'imaging_template', entityId: template.id, beforeJson: null, afterJson: template, requestId: context.requestContext.requestId });
      return { kind: 'created', template };
    },
    async update(templateId: string, patch: ImagingTemplateUpdateInput): Promise<UpdateImagingTemplateResult> {
      const actor = ensureWriteActor(context.requestContext);
      const before = await repo.templates.findById(actor.accountId, templateId);
      if (!before) return { kind: 'template_not_found' };
      const after = await repo.templates.update({ accountId: actor.accountId, templateId, patch });
      if (!after) return { kind: 'template_not_found' };
      await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'ImagingTemplateUpdated', entityType: 'imaging_template', entityId: after.id, beforeJson: before, afterJson: after, requestId: context.requestContext.requestId });
      return { kind: 'updated', template: after };
    },
    async delete(templateId: string): Promise<DeleteImagingTemplateResult> {
      const actor = ensureWriteActor(context.requestContext);
      const before = await repo.templates.findById(actor.accountId, templateId);
      if (!before) return { kind: 'template_not_found' };
      await repo.templates.delete(actor.accountId, templateId);
      await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'ImagingTemplateDeleted', entityType: 'imaging_template', entityId: templateId, beforeJson: before, afterJson: null, requestId: context.requestContext.requestId });
      return { kind: 'deleted' };
    }
  };
}

// ============================================
// IMAGING ORDERS SERVICE
// ============================================

export type CreateImagingOrderResult = { kind: 'created'; order: ImagingOrderRecord };
export type UpdateImagingOrderResult = { kind: 'order_not_found' } | { kind: 'updated'; order: ImagingOrderRecord };
export type ScheduleImagingOrderResult = { kind: 'order_not_found' } | { kind: 'invalid_status' } | { kind: 'scheduled'; order: ImagingOrderRecord };
export type CancelImagingOrderResult = { kind: 'order_not_found' } | { kind: 'invalid_status' } | { kind: 'cancelled'; order: ImagingOrderRecord };

export function createImagingOrdersService(context: ImagingContext, deps: ImagingDependencies = {}) {
  const repo = deps.repo ?? createImagingRepo(context.db);
  const appendAuditFn = deps.appendAudit ?? append;

  return {
    async list(params: { page: number; pageSize: number; patientId?: string; encounterId?: string; modalityId?: string; status?: string; priority?: string; fromDate?: string; toDate?: string }) {
      const actor = ensureAccountActor(context.requestContext);
      const { items, total } = await repo.orders.list({ accountId: actor.accountId, ...params });
      return { items, total, page: params.page, pageSize: params.pageSize };
    },
    async getById(orderId: string) {
      const actor = ensureAccountActor(context.requestContext);
      return repo.orders.findById(actor.accountId, orderId);
    },
    async create(input: ImagingOrderCreateInput): Promise<CreateImagingOrderResult> {
      const actor = ensureWriteActor(context.requestContext);
      const orderNumber = await context.db.execute<{ imaging_next_order_number: string }>(`SELECT imaging_next_order_number('${actor.accountId}'::uuid)`).then(r => r.rows[0]?.imaging_next_order_number ?? `IMG-${Date.now()}`);
      const order = await repo.orders.create({ accountId: actor.accountId, orderNumber, input, createdByUserId: actor.userId });
      await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'ImagingOrderCreated', entityType: 'imaging_order', entityId: order.id, beforeJson: null, afterJson: order, requestId: context.requestContext.requestId });
      return { kind: 'created', order };
    },
    async update(orderId: string, patch: ImagingOrderUpdateInput): Promise<UpdateImagingOrderResult> {
      const actor = ensureWriteActor(context.requestContext);
      const before = await repo.orders.findById(actor.accountId, orderId);
      if (!before) return { kind: 'order_not_found' };
      const after = await repo.orders.update({ accountId: actor.accountId, orderId, patch });
      if (!after) return { kind: 'order_not_found' };
      await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'ImagingOrderUpdated', entityType: 'imaging_order', entityId: after.id, beforeJson: before, afterJson: after, requestId: context.requestContext.requestId });
      return { kind: 'updated', order: after };
    },
    async schedule(orderId: string, scheduledAt: Date): Promise<ScheduleImagingOrderResult> {
      const actor = ensureWriteActor(context.requestContext);
      const before = await repo.orders.findById(actor.accountId, orderId);
      if (!before) return { kind: 'order_not_found' };
      if (!['pending', 'scheduled'].includes(before.status)) return { kind: 'invalid_status' };
      const after = await repo.orders.updateStatus({ accountId: actor.accountId, orderId, status: 'scheduled', scheduledAt });
      if (!after) return { kind: 'order_not_found' };
      await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'ImagingOrderScheduled', entityType: 'imaging_order', entityId: after.id, beforeJson: before, afterJson: after, requestId: context.requestContext.requestId });
      return { kind: 'scheduled', order: after };
    },
    async start(orderId: string): Promise<ScheduleImagingOrderResult> {
      const actor = ensureWriteActor(context.requestContext);
      const before = await repo.orders.findById(actor.accountId, orderId);
      if (!before) return { kind: 'order_not_found' };
      if (!['pending', 'scheduled'].includes(before.status)) return { kind: 'invalid_status' };
      const after = await repo.orders.updateStatus({ accountId: actor.accountId, orderId, status: 'in_progress', performedAt: new Date() });
      if (!after) return { kind: 'order_not_found' };
      await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'ImagingOrderStarted', entityType: 'imaging_order', entityId: after.id, beforeJson: before, afterJson: after, requestId: context.requestContext.requestId });
      return { kind: 'scheduled', order: after };
    },
    async complete(orderId: string): Promise<ScheduleImagingOrderResult> {
      const actor = ensureWriteActor(context.requestContext);
      const before = await repo.orders.findById(actor.accountId, orderId);
      if (!before) return { kind: 'order_not_found' };
      if (before.status !== 'in_progress') return { kind: 'invalid_status' };
      const after = await repo.orders.updateStatus({ accountId: actor.accountId, orderId, status: 'completed', completedAt: new Date() });
      if (!after) return { kind: 'order_not_found' };
      await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'ImagingOrderCompleted', entityType: 'imaging_order', entityId: after.id, beforeJson: before, afterJson: after, requestId: context.requestContext.requestId });
      return { kind: 'scheduled', order: after };
    },
    async cancel(orderId: string, reason: string): Promise<CancelImagingOrderResult> {
      const actor = ensureWriteActor(context.requestContext);
      const before = await repo.orders.findById(actor.accountId, orderId);
      if (!before) return { kind: 'order_not_found' };
      if (!['pending', 'scheduled'].includes(before.status)) return { kind: 'invalid_status' };
      const after = await repo.orders.updateStatus({ accountId: actor.accountId, orderId, status: 'cancelled', cancelledAt: new Date(), cancelledReason: reason });
      if (!after) return { kind: 'order_not_found' };
      await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'ImagingOrderCancelled', entityType: 'imaging_order', entityId: after.id, beforeJson: before, afterJson: after, requestId: context.requestContext.requestId });
      return { kind: 'cancelled', order: after };
    }
  };
}

// ============================================
// IMAGING STUDIES SERVICE
// ============================================

export type CreateImagingStudyResult = { kind: 'order_not_found' } | { kind: 'created'; study: ImagingStudyRecord };
export type UpdateImagingStudyResult = { kind: 'study_not_found' } | { kind: 'updated'; study: ImagingStudyRecord };
export type AttachStudyDocumentResult = { kind: 'study_not_found' } | { kind: 'attached'; document: ImagingStudyDocumentRecord };

export function createImagingStudiesService(context: ImagingContext, deps: ImagingDependencies = {}) {
  const repo = deps.repo ?? createImagingRepo(context.db);
  const appendAuditFn = deps.appendAudit ?? append;

  return {
    async list(params: { page: number; pageSize: number; orderId?: string; patientId?: string; modalityId?: string; status?: string; fromDate?: string; toDate?: string }) {
      const actor = ensureAccountActor(context.requestContext);
      const { items, total } = await repo.studies.list({ accountId: actor.accountId, ...params });
      return { items, total, page: params.page, pageSize: params.pageSize };
    },
    async getById(studyId: string) {
      const actor = ensureAccountActor(context.requestContext);
      return repo.studies.findById(actor.accountId, studyId);
    },
    async getByIdWithDocuments(studyId: string) {
      const actor = ensureAccountActor(context.requestContext);
      return repo.studies.findByIdWithDocuments(actor.accountId, studyId);
    },
    async create(input: ImagingStudyCreateInput): Promise<CreateImagingStudyResult> {
      const actor = ensureWriteActor(context.requestContext);
      const order = await repo.orders.findById(actor.accountId, input.orderId);
      if (!order) return { kind: 'order_not_found' };
      
      const studyNumber = await context.db.execute<{ imaging_next_study_number: string }>(`SELECT imaging_next_study_number('${actor.accountId}'::uuid)`).then(r => r.rows[0]?.imaging_next_study_number ?? `STD-${Date.now()}`);
      
      const study = await repo.studies.create({
        accountId: actor.accountId,
        studyNumber,
        input,
        patientId: order.patientId,
        modalityId: order.modalityId,
        performedByUserId: actor.userId
      });
      
      if (order.status === 'pending' || order.status === 'scheduled') {
        await repo.orders.updateStatus({ accountId: actor.accountId, orderId: input.orderId, status: 'in_progress', performedAt: new Date() });
      }
      
      await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'ImagingStudyCreated', entityType: 'imaging_study', entityId: study.id, beforeJson: null, afterJson: study, requestId: context.requestContext.requestId });
      return { kind: 'created', study };
    },
    async update(studyId: string, patch: ImagingStudyUpdateInput): Promise<UpdateImagingStudyResult> {
      const actor = ensureWriteActor(context.requestContext);
      const before = await repo.studies.findById(actor.accountId, studyId);
      if (!before) return { kind: 'study_not_found' };
      const after = await repo.studies.update({ accountId: actor.accountId, studyId, patch });
      if (!after) return { kind: 'study_not_found' };
      await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'ImagingStudyUpdated', entityType: 'imaging_study', entityId: after.id, beforeJson: before, afterJson: after, requestId: context.requestContext.requestId });
      return { kind: 'updated', study: after };
    },
    async complete(studyId: string): Promise<UpdateImagingStudyResult> {
      const actor = ensureWriteActor(context.requestContext);
      const before = await repo.studies.findById(actor.accountId, studyId);
      if (!before) return { kind: 'study_not_found' };
      const after = await repo.studies.updateStatus({ accountId: actor.accountId, studyId, status: 'completed' });
      if (!after) return { kind: 'study_not_found' };
      await repo.orders.updateStatus({ accountId: actor.accountId, orderId: before.orderId, status: 'completed', completedAt: new Date() });
      await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'ImagingStudyCompleted', entityType: 'imaging_study', entityId: after.id, beforeJson: before, afterJson: after, requestId: context.requestContext.requestId });
      return { kind: 'updated', study: after };
    },
    async attachDocument(studyId: string, documentId: string, attachmentType: string, displayOrder: number): Promise<AttachStudyDocumentResult> {
      const actor = ensureWriteActor(context.requestContext);
      const study = await repo.studies.findById(actor.accountId, studyId);
      if (!study) return { kind: 'study_not_found' };
      const document = await repo.studies.attachDocument({
        accountId: actor.accountId,
        studyId,
        documentId,
        attachmentType,
        displayOrder,
        createdByUserId: actor.userId
      });
      await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'ImagingStudyDocumentAttached', entityType: 'imaging_study_document', entityId: document.id, beforeJson: null, afterJson: document, requestId: context.requestContext.requestId });
      return { kind: 'attached', document };
    },
    async detachDocument(studyId: string, documentId: string): Promise<void> {
      const actor = ensureWriteActor(context.requestContext);
      await repo.studies.detachDocument(actor.accountId, studyId, documentId);
      await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'ImagingStudyDocumentDetached', entityType: 'imaging_study', entityId: studyId, beforeJson: { documentId }, afterJson: null, requestId: context.requestContext.requestId });
    }
  };
}

// ============================================
// IMAGING REPORTS SERVICE
// ============================================

export type CreateImagingReportResult = { kind: 'order_not_found' } | { kind: 'created'; report: ImagingReportRecord };
export type UpdateImagingReportResult = { kind: 'report_not_found' } | { kind: 'invalid_status' } | { kind: 'updated'; report: ImagingReportRecord };
export type FinalizeImagingReportResult = { kind: 'report_not_found' } | { kind: 'invalid_status' } | { kind: 'finalized'; report: ImagingReportRecord };
export type SignImagingReportResult = { kind: 'report_not_found' } | { kind: 'invalid_status' } | { kind: 'signed'; report: ImagingReportRecord };
export type AttachReportDocumentResult = { kind: 'report_not_found' } | { kind: 'attached'; document: ImagingReportDocumentRecord };

export function createImagingReportsService(context: ImagingContext, deps: ImagingDependencies = {}) {
  const repo = deps.repo ?? createImagingRepo(context.db);
  const appendAuditFn = deps.appendAudit ?? append;

  return {
    async list(params: { page: number; pageSize: number; orderId?: string; studyId?: string; patientId?: string; modalityId?: string; status?: string; fromDate?: string; toDate?: string }) {
      const actor = ensureAccountActor(context.requestContext);
      const { items, total } = await repo.reports.list({ accountId: actor.accountId, ...params });
      return { items, total, page: params.page, pageSize: params.pageSize };
    },
    async getById(reportId: string) {
      const actor = ensureAccountActor(context.requestContext);
      return repo.reports.findById(actor.accountId, reportId);
    },
    async getByIdWithDocuments(reportId: string) {
      const actor = ensureAccountActor(context.requestContext);
      return repo.reports.findByIdWithDocuments(actor.accountId, reportId);
    },
    async create(input: ImagingReportCreateInput): Promise<CreateImagingReportResult> {
      const actor = ensureWriteActor(context.requestContext);
      const order = await repo.orders.findById(actor.accountId, input.orderId);
      if (!order) return { kind: 'order_not_found' };
      
      const reportNumber = await context.db.execute<{ imaging_next_report_number: string }>(`SELECT imaging_next_report_number('${actor.accountId}'::uuid)`).then(r => r.rows[0]?.imaging_next_report_number ?? `LAU-${Date.now()}`);
      
      const report = await repo.reports.create({
        accountId: actor.accountId,
        reportNumber,
        input,
        patientId: order.patientId,
        draftedByUserId: actor.userId
      });
      
      await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'ImagingReportCreated', entityType: 'imaging_report', entityId: report.id, beforeJson: null, afterJson: report, requestId: context.requestContext.requestId });
      return { kind: 'created', report };
    },
    async update(reportId: string, patch: ImagingReportUpdateInput): Promise<UpdateImagingReportResult> {
      const actor = ensureWriteActor(context.requestContext);
      const before = await repo.reports.findById(actor.accountId, reportId);
      if (!before) return { kind: 'report_not_found' };
      if (!['draft', 'pending_review'].includes(before.status)) return { kind: 'invalid_status' };
      const after = await repo.reports.update({ accountId: actor.accountId, reportId, patch });
      if (!after) return { kind: 'report_not_found' };
      await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'ImagingReportUpdated', entityType: 'imaging_report', entityId: after.id, beforeJson: before, afterJson: after, requestId: context.requestContext.requestId });
      return { kind: 'updated', report: after };
    },
    async finalize(reportId: string): Promise<FinalizeImagingReportResult> {
      const actor = ensureWriteActor(context.requestContext);
      const before = await repo.reports.findById(actor.accountId, reportId);
      if (!before) return { kind: 'report_not_found' };
      if (!['draft', 'pending_review'].includes(before.status)) return { kind: 'invalid_status' };
      const after = await repo.reports.updateStatus({
        accountId: actor.accountId,
        reportId,
        status: 'finalized',
        finalizedAt: new Date(),
        finalizedByUserId: actor.userId
      });
      if (!after) return { kind: 'report_not_found' };
      await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'ImagingReportFinalized', entityType: 'imaging_report', entityId: after.id, beforeJson: before, afterJson: after, requestId: context.requestContext.requestId });
      return { kind: 'finalized', report: after };
    },
    async sign(reportId: string, _pin?: string): Promise<SignImagingReportResult> {
      const actor = ensureWriteActor(context.requestContext);
      const before = await repo.reports.findById(actor.accountId, reportId);
      if (!before) return { kind: 'report_not_found' };
      if (before.status !== 'finalized') return { kind: 'invalid_status' };
      
      const signatureHash = `${reportId}-${actor.userId}-${Date.now()}`;
      
      const after = await repo.reports.updateStatus({
        accountId: actor.accountId,
        reportId,
        status: 'signed',
        signedAt: new Date(),
        signedByUserId: actor.userId,
        signatureHash
      });
      if (!after) return { kind: 'report_not_found' };
      await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'ImagingReportSigned', entityType: 'imaging_report', entityId: after.id, beforeJson: before, afterJson: after, requestId: context.requestContext.requestId });
      return { kind: 'signed', report: after };
    },
    async attachDocument(reportId: string, documentId: string, attachmentType: string, displayOrder: number): Promise<AttachReportDocumentResult> {
      const actor = ensureWriteActor(context.requestContext);
      const report = await repo.reports.findById(actor.accountId, reportId);
      if (!report) return { kind: 'report_not_found' };
      const document = await repo.reports.attachDocument({
        accountId: actor.accountId,
        reportId,
        documentId,
        attachmentType,
        displayOrder,
        createdByUserId: actor.userId
      });
      await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'ImagingReportDocumentAttached', entityType: 'imaging_report_document', entityId: document.id, beforeJson: null, afterJson: document, requestId: context.requestContext.requestId });
      return { kind: 'attached', document };
    },
    async detachDocument(reportId: string, documentId: string): Promise<void> {
      const actor = ensureWriteActor(context.requestContext);
      await repo.reports.detachDocument(actor.accountId, reportId, documentId);
      await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'ImagingReportDocumentDetached', entityType: 'imaging_report', entityId: reportId, beforeJson: { documentId }, afterJson: null, requestId: context.requestContext.requestId });
    }
  };
}

// ============================================
// IMAGING SCHEDULE SERVICE
// ============================================

export type CreateImagingScheduleSlotResult = { kind: 'created'; slot: ImagingScheduleSlotRecord };
export type UpdateImagingScheduleSlotResult = { kind: 'slot_not_found' } | { kind: 'updated'; slot: ImagingScheduleSlotRecord };
export type BookImagingScheduleSlotResult = { kind: 'slot_not_found' } | { kind: 'slot_not_available' } | { kind: 'booked'; slot: ImagingScheduleSlotRecord };

export function createImagingScheduleService(context: ImagingContext, deps: ImagingDependencies = {}) {
  const repo = deps.repo ?? createImagingRepo(context.db);
  const appendAuditFn = deps.appendAudit ?? append;

  return {
    async list(params: { fromDate?: string; toDate?: string; modalityId?: string }) {
      const actor = ensureAccountActor(context.requestContext);
      return repo.schedule.list({ accountId: actor.accountId, ...params });
    },
    async getById(slotId: string) {
      const actor = ensureAccountActor(context.requestContext);
      return repo.schedule.findById(actor.accountId, slotId);
    },
    async create(input: ImagingScheduleSlotCreateInput): Promise<CreateImagingScheduleSlotResult> {
      const actor = ensureWriteActor(context.requestContext);
      const slot = await repo.schedule.create({ accountId: actor.accountId, input });
      await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'ImagingScheduleSlotCreated', entityType: 'imaging_schedule_slot', entityId: slot.id, beforeJson: null, afterJson: slot, requestId: context.requestContext.requestId });
      return { kind: 'created', slot };
    },
    async update(slotId: string, patch: ImagingScheduleSlotUpdateInput): Promise<UpdateImagingScheduleSlotResult> {
      const actor = ensureWriteActor(context.requestContext);
      const before = await repo.schedule.findById(actor.accountId, slotId);
      if (!before) return { kind: 'slot_not_found' };
      const after = await repo.schedule.update({ accountId: actor.accountId, slotId, patch });
      if (!after) return { kind: 'slot_not_found' };
      await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'ImagingScheduleSlotUpdated', entityType: 'imaging_schedule_slot', entityId: after.id, beforeJson: before, afterJson: after, requestId: context.requestContext.requestId });
      return { kind: 'updated', slot: after };
    },
    async book(slotId: string, orderId: string): Promise<BookImagingScheduleSlotResult> {
      const actor = ensureWriteActor(context.requestContext);
      const before = await repo.schedule.findById(actor.accountId, slotId);
      if (!before) return { kind: 'slot_not_found' };
      if (!before.isAvailable) return { kind: 'slot_not_available' };
      const after = await repo.schedule.bookSlot({ accountId: actor.accountId, slotId, orderId });
      if (!after) return { kind: 'slot_not_available' };
      await repo.orders.updateStatus({ accountId: actor.accountId, orderId, status: 'scheduled', scheduledAt: new Date(`${before.slotDate}T${before.slotStartTime}`) });
      await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'ImagingScheduleSlotBooked', entityType: 'imaging_schedule_slot', entityId: after.id, beforeJson: before, afterJson: after, requestId: context.requestContext.requestId });
      return { kind: 'booked', slot: after };
    },
    async release(slotId: string): Promise<UpdateImagingScheduleSlotResult> {
      const actor = ensureWriteActor(context.requestContext);
      const before = await repo.schedule.findById(actor.accountId, slotId);
      if (!before) return { kind: 'slot_not_found' };
      const after = await repo.schedule.releaseSlot(actor.accountId, slotId);
      if (!after) return { kind: 'slot_not_found' };
      await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'ImagingScheduleSlotReleased', entityType: 'imaging_schedule_slot', entityId: after.id, beforeJson: before, afterJson: after, requestId: context.requestContext.requestId });
      return { kind: 'updated', slot: after };
    },
    async delete(slotId: string): Promise<{ kind: 'slot_not_found' } | { kind: 'deleted' }> {
      const actor = ensureWriteActor(context.requestContext);
      const before = await repo.schedule.findById(actor.accountId, slotId);
      if (!before) return { kind: 'slot_not_found' };
      await repo.schedule.delete(actor.accountId, slotId);
      await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'ImagingScheduleSlotDeleted', entityType: 'imaging_schedule_slot', entityId: slotId, beforeJson: before, afterJson: null, requestId: context.requestContext.requestId });
      return { kind: 'deleted' };
    }
  };
}
