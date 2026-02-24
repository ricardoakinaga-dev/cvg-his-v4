import { append, type AppendAuditInput } from '@cvg-his/audit';

import type { RequestContext } from '../../plugins/requestContext.js';
import { createLabRepo, type LabRepo } from './repo.js';
import type {
  LabTestCreateInput,
  LabTestUpdateInput,
  LabTestRecord,
  LabOrderCreateInput,
  LabOrderUpdateInput,
  LabOrderRecord,
  LabOrderItemRecord,
  LabSampleCreateInput,
  LabSampleRecord,
  LabResultCreateInput,
  LabResultUpdateInput,
  LabResultRecord,
  LabReportCreateInput,
  LabReportUpdateInput,
  LabReportRecord,
  LabReferenceRangeCreateInput,
  LabReferenceRangeUpdateInput,
  LabReferenceRangeRecord
} from './types.js';

type DbClient = typeof import('@cvg-his/db').db;

type LabContext = {
  db: DbClient;
  requestContext: RequestContext;
};

type LabDependencies = {
  repo?: LabRepo;
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

// LAB TESTS SERVICE
export type CreateLabTestResult = { kind: 'code_conflict' } | { kind: 'created'; test: LabTestRecord };
export type UpdateLabTestResult = { kind: 'test_not_found' } | { kind: 'code_conflict' } | { kind: 'updated'; test: LabTestRecord };
export type DeleteLabTestResult = { kind: 'test_not_found' } | { kind: 'deleted' };

export function createLabTestsService(context: LabContext, deps: LabDependencies = {}) {
  const repo = deps.repo ?? createLabRepo(context.db);
  const appendAuditFn = deps.appendAudit ?? append;

  return {
    async list(params: { page: number; pageSize: number; q?: string; categoryId?: string; specimenType?: string; active?: boolean }) {
      const actor = ensureAccountActor(context.requestContext);
      const { items, total } = await repo.tests.list({ accountId: actor.accountId, ...params });
      return { items, total, page: params.page, pageSize: params.pageSize };
    },
    async getById(testId: string) {
      const actor = ensureAccountActor(context.requestContext);
      return repo.tests.findById(actor.accountId, testId);
    },
    async create(input: LabTestCreateInput): Promise<CreateLabTestResult> {
      const actor = ensureWriteActor(context.requestContext);
      let test: LabTestRecord;
      try {
        test = await repo.tests.create({ accountId: actor.accountId, ...input });
      } catch (error) {
        if (isDuplicateCodeError(error, 'lab_tests_account_code_unique')) return { kind: 'code_conflict' };
        throw error;
      }
      await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'LabTestCreated', entityType: 'lab_test', entityId: test.id, beforeJson: null, afterJson: test, requestId: context.requestContext.requestId });
      return { kind: 'created', test };
    },
    async update(testId: string, patch: LabTestUpdateInput): Promise<UpdateLabTestResult> {
      const actor = ensureWriteActor(context.requestContext);
      const before = await repo.tests.findById(actor.accountId, testId);
      if (!before) return { kind: 'test_not_found' };
      let after: LabTestRecord | null;
      try {
        after = await repo.tests.update({ accountId: actor.accountId, testId, patch });
      } catch (error) {
        if (isDuplicateCodeError(error, 'lab_tests_account_code_unique')) return { kind: 'code_conflict' };
        throw error;
      }
      if (!after) return { kind: 'test_not_found' };
      await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'LabTestUpdated', entityType: 'lab_test', entityId: after.id, beforeJson: before, afterJson: after, requestId: context.requestContext.requestId });
      return { kind: 'updated', test: after };
    },
    async delete(testId: string): Promise<DeleteLabTestResult> {
      const actor = ensureWriteActor(context.requestContext);
      const before = await repo.tests.findById(actor.accountId, testId);
      if (!before) return { kind: 'test_not_found' };
      await repo.tests.delete(actor.accountId, testId);
      await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'LabTestDeleted', entityType: 'lab_test', entityId: testId, beforeJson: before, afterJson: null, requestId: context.requestContext.requestId });
      return { kind: 'deleted' };
    }
  };
}

// LAB ORDERS SERVICE
export type CreateLabOrderResult = { kind: 'created'; order: LabOrderRecord; items: LabOrderItemRecord[] };
export type UpdateLabOrderResult = { kind: 'order_not_found' } | { kind: 'updated'; order: LabOrderRecord };
export type CancelLabOrderResult = { kind: 'order_not_found' } | { kind: 'invalid_status' } | { kind: 'cancelled'; order: LabOrderRecord };

export function createLabOrdersService(context: LabContext, deps: LabDependencies = {}) {
  const repo = deps.repo ?? createLabRepo(context.db);
  const appendAuditFn = deps.appendAudit ?? append;

  return {
    async list(params: { page: number; pageSize: number; patientId?: string; encounterId?: string; status?: string; priority?: string; fromDate?: string; toDate?: string }) {
      const actor = ensureAccountActor(context.requestContext);
      const { items, total } = await repo.orders.list({ accountId: actor.accountId, ...params });
      return { items, total, page: params.page, pageSize: params.pageSize };
    },
    async getById(orderId: string) {
      const actor = ensureAccountActor(context.requestContext);
      return repo.orders.findById(actor.accountId, orderId);
    },
    async create(input: LabOrderCreateInput): Promise<CreateLabOrderResult> {
      const actor = ensureWriteActor(context.requestContext);
      const orderNumber = await context.db.execute<{ lab_next_order_number: string }>(`SELECT lab_next_order_number('${actor.accountId}'::uuid)`).then(r => r.rows[0]?.lab_next_order_number ?? `LAB-${Date.now()}`);
      const order = await repo.orders.create({ accountId: actor.accountId, orderNumber, input, createdByUserId: actor.userId });
      const items = await repo.orderItems.createBatch({ accountId: actor.accountId, orderId: order.id, testIds: input.testIds, panelIds: input.panelIds });
      await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'LabOrderCreated', entityType: 'lab_order', entityId: order.id, beforeJson: null, afterJson: { order, items }, requestId: context.requestContext.requestId });
      return { kind: 'created', order, items };
    },
    async update(orderId: string, patch: LabOrderUpdateInput): Promise<UpdateLabOrderResult> {
      const actor = ensureWriteActor(context.requestContext);
      const before = await repo.orders.findById(actor.accountId, orderId);
      if (!before) return { kind: 'order_not_found' };
      const after = await repo.orders.update({ accountId: actor.accountId, orderId, patch });
      if (!after) return { kind: 'order_not_found' };
      await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'LabOrderUpdated', entityType: 'lab_order', entityId: after.id, beforeJson: before, afterJson: after, requestId: context.requestContext.requestId });
      return { kind: 'updated', order: after };
    },
    async cancel(orderId: string, reason: string): Promise<CancelLabOrderResult> {
      const actor = ensureWriteActor(context.requestContext);
      const before = await repo.orders.findById(actor.accountId, orderId);
      if (!before) return { kind: 'order_not_found' };
      if (!['pending', 'partial'].includes(before.status)) return { kind: 'invalid_status' };
      const after = await repo.orders.updateStatus({ accountId: actor.accountId, orderId, status: 'cancelled', cancelledAt: new Date(), cancelledReason: reason });
      await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'LabOrderCancelled', entityType: 'lab_order', entityId: orderId, beforeJson: before, afterJson: after, requestId: context.requestContext.requestId });
      return { kind: 'cancelled', order: after! };
    }
  };
}

// LAB SAMPLES SERVICE
export type CollectSampleResult = { kind: 'sample_not_found' } | { kind: 'invalid_status' } | { kind: 'collected'; sample: LabSampleRecord };
export type ReceiveSampleResult = { kind: 'sample_not_found' } | { kind: 'invalid_status' } | { kind: 'received'; sample: LabSampleRecord };
export type RejectSampleResult = { kind: 'sample_not_found' } | { kind: 'invalid_status' } | { kind: 'rejected'; sample: LabSampleRecord };

export function createLabSamplesService(context: LabContext, deps: LabDependencies = {}) {
  const repo = deps.repo ?? createLabRepo(context.db);
  const appendAuditFn = deps.appendAudit ?? append;

  return {
    async list(params: { page: number; pageSize: number; orderId?: string; patientId?: string; status?: string; sampleType?: string }) {
      const actor = ensureAccountActor(context.requestContext);
      const { items, total } = await repo.samples.list({ accountId: actor.accountId, ...params });
      return { items, total, page: params.page, pageSize: params.pageSize };
    },
    async getById(sampleId: string) {
      const actor = ensureAccountActor(context.requestContext);
      return repo.samples.findById(actor.accountId, sampleId);
    },
    async create(input: LabSampleCreateInput & { patientId: string }): Promise<LabSampleRecord> {
      const actor = ensureWriteActor(context.requestContext);
      const sampleNumber = await context.db.execute<{ lab_next_sample_number: string }>(`SELECT lab_next_sample_number('${actor.accountId}'::uuid)`).then(r => r.rows[0]?.lab_next_sample_number ?? `SAM-${Date.now()}`);
      const sample = await repo.samples.create({ accountId: actor.accountId, sampleNumber, input, patientId: input.patientId });
      await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'LabSampleCreated', entityType: 'lab_sample', entityId: sample.id, beforeJson: null, afterJson: sample, requestId: context.requestContext.requestId });
      return sample;
    },
    async collect(sampleId: string): Promise<CollectSampleResult> {
      const actor = ensureWriteActor(context.requestContext);
      const before = await repo.samples.findById(actor.accountId, sampleId);
      if (!before) return { kind: 'sample_not_found' };
      if (before.status !== 'pending') return { kind: 'invalid_status' };
      const after = await repo.samples.updateStatus({ accountId: actor.accountId, sampleId, status: 'collected', collectedAt: new Date(), collectedByUserId: actor.userId });
      await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'LabSampleCollected', entityType: 'lab_sample', entityId: sampleId, beforeJson: before, afterJson: after, requestId: context.requestContext.requestId });
      return { kind: 'collected', sample: after! };
    },
    async receive(sampleId: string): Promise<ReceiveSampleResult> {
      const actor = ensureWriteActor(context.requestContext);
      const before = await repo.samples.findById(actor.accountId, sampleId);
      if (!before) return { kind: 'sample_not_found' };
      if (before.status !== 'collected') return { kind: 'invalid_status' };
      const after = await repo.samples.updateStatus({ accountId: actor.accountId, sampleId, status: 'received', receivedAt: new Date(), receivedByUserId: actor.userId });
      await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'LabSampleReceived', entityType: 'lab_sample', entityId: sampleId, beforeJson: before, afterJson: after, requestId: context.requestContext.requestId });
      return { kind: 'received', sample: after! };
    },
    async reject(sampleId: string, reason: string): Promise<RejectSampleResult> {
      const actor = ensureWriteActor(context.requestContext);
      const before = await repo.samples.findById(actor.accountId, sampleId);
      if (!before) return { kind: 'sample_not_found' };
      if (!['pending', 'collected', 'received'].includes(before.status)) return { kind: 'invalid_status' };
      const after = await repo.samples.updateStatus({ accountId: actor.accountId, sampleId, status: 'rejected', rejectedAt: new Date(), rejectionReason: reason });
      await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'LabSampleRejected', entityType: 'lab_sample', entityId: sampleId, beforeJson: before, afterJson: after, requestId: context.requestContext.requestId });
      return { kind: 'rejected', sample: after! };
    }
  };
}

// LAB RESULTS SERVICE
export type CreateLabResultResult = { kind: 'created'; result: LabResultRecord };
export type UpdateLabResultResult = { kind: 'result_not_found' } | { kind: 'updated'; result: LabResultRecord };
export type VerifyLabResultResult = { kind: 'result_not_found' } | { kind: 'invalid_status' } | { kind: 'verified'; result: LabResultRecord };

export function createLabResultsService(context: LabContext, deps: LabDependencies = {}) {
  const repo = deps.repo ?? createLabRepo(context.db);
  const appendAuditFn = deps.appendAudit ?? append;

  return {
    async list(params: { page: number; pageSize: number; orderItemId?: string; orderId?: string; patientId?: string; status?: string; flag?: string }) {
      const actor = ensureAccountActor(context.requestContext);
      const { items, total } = await repo.results.list({ accountId: actor.accountId, ...params });
      return { items, total, page: params.page, pageSize: params.pageSize };
    },
    async getById(resultId: string) {
      const actor = ensureAccountActor(context.requestContext);
      return repo.results.findById(actor.accountId, resultId);
    },
    async create(input: LabResultCreateInput & { testId: string; patientId: string }): Promise<CreateLabResultResult> {
      const actor = ensureWriteActor(context.requestContext);
      const result = await repo.results.create({ accountId: actor.accountId, input, testId: input.testId, patientId: input.patientId });
      await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'LabResultCreated', entityType: 'lab_result', entityId: result.id, beforeJson: null, afterJson: result, requestId: context.requestContext.requestId });
      return { kind: 'created', result };
    },
    async update(resultId: string, patch: LabResultUpdateInput): Promise<UpdateLabResultResult> {
      const actor = ensureWriteActor(context.requestContext);
      const before = await repo.results.findById(actor.accountId, resultId);
      if (!before) return { kind: 'result_not_found' };
      const after = await repo.results.update({ accountId: actor.accountId, resultId, patch });
      if (!after) return { kind: 'result_not_found' };
      await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'LabResultUpdated', entityType: 'lab_result', entityId: after.id, beforeJson: before, afterJson: after, requestId: context.requestContext.requestId });
      return { kind: 'updated', result: after };
    },
    async verify(resultId: string): Promise<VerifyLabResultResult> {
      const actor = ensureWriteActor(context.requestContext);
      const before = await repo.results.findById(actor.accountId, resultId);
      if (!before) return { kind: 'result_not_found' };
      if (!['pending', 'preliminary'].includes(before.status)) return { kind: 'invalid_status' };
      const after = await repo.results.updateStatus({ accountId: actor.accountId, resultId, status: 'final', verifiedAt: new Date(), verifiedByUserId: actor.userId });
      await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'LabResultVerified', entityType: 'lab_result', entityId: resultId, beforeJson: before, afterJson: after, requestId: context.requestContext.requestId });
      return { kind: 'verified', result: after! };
    }
  };
}

// LAB REPORTS SERVICE
export type CreateLabReportResult = { kind: 'created'; report: LabReportRecord };
export type UpdateLabReportResult = { kind: 'report_not_found' } | { kind: 'invalid_status' } | { kind: 'updated'; report: LabReportRecord };
export type SignLabReportResult = { kind: 'report_not_found' } | { kind: 'invalid_status' } | { kind: 'signed'; report: LabReportRecord };

export function createLabReportsService(context: LabContext, deps: LabDependencies = {}) {
  const repo = deps.repo ?? createLabRepo(context.db);
  const appendAuditFn = deps.appendAudit ?? append;

  return {
    async list(params: { page: number; pageSize: number; orderId?: string; patientId?: string; status?: string }) {
      const actor = ensureAccountActor(context.requestContext);
      const { items, total } = await repo.reports.list({ accountId: actor.accountId, ...params });
      return { items, total, page: params.page, pageSize: params.pageSize };
    },
    async getById(reportId: string) {
      const actor = ensureAccountActor(context.requestContext);
      return repo.reports.findById(actor.accountId, reportId);
    },
    async create(input: LabReportCreateInput & { patientId: string }): Promise<CreateLabReportResult> {
      const actor = ensureWriteActor(context.requestContext);
      const reportNumber = await context.db.execute<{ lab_next_report_number: string }>(`SELECT lab_next_report_number('${actor.accountId}'::uuid)`).then(r => r.rows[0]?.lab_next_report_number ?? `LAU-${Date.now()}`);
      const report = await repo.reports.create({ accountId: actor.accountId, reportNumber, input, patientId: input.patientId, draftedByUserId: actor.userId });
      if (input.resultIds?.length) await repo.reports.addResults(report.id, input.resultIds);
      await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'LabReportCreated', entityType: 'lab_report', entityId: report.id, beforeJson: null, afterJson: report, requestId: context.requestContext.requestId });
      return { kind: 'created', report };
    },
    async update(reportId: string, patch: LabReportUpdateInput): Promise<UpdateLabReportResult> {
      const actor = ensureWriteActor(context.requestContext);
      const before = await repo.reports.findById(actor.accountId, reportId);
      if (!before) return { kind: 'report_not_found' };
      if (!['draft', 'pending_review'].includes(before.status)) return { kind: 'invalid_status' };
      const after = await repo.reports.update({ accountId: actor.accountId, reportId, patch });
      if (!after) return { kind: 'report_not_found' };
      if (patch.resultIds?.length) {
        await context.db.execute(`DELETE FROM lab_report_results WHERE report_id = '${reportId}'`);
        await repo.reports.addResults(reportId, patch.resultIds);
      }
      await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'LabReportUpdated', entityType: 'lab_report', entityId: after.id, beforeJson: before, afterJson: after, requestId: context.requestContext.requestId });
      return { kind: 'updated', report: after };
    },
    async finalize(reportId: string): Promise<UpdateLabReportResult> {
      const actor = ensureWriteActor(context.requestContext);
      const before = await repo.reports.findById(actor.accountId, reportId);
      if (!before) return { kind: 'report_not_found' };
      if (!['draft', 'pending_review'].includes(before.status)) return { kind: 'invalid_status' };
      const after = await repo.reports.updateStatus({ accountId: actor.accountId, reportId, status: 'finalized', finalizedAt: new Date(), finalizedByUserId: actor.userId });
      await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'LabReportFinalized', entityType: 'lab_report', entityId: reportId, beforeJson: before, afterJson: after, requestId: context.requestContext.requestId });
      return { kind: 'updated', report: after! };
    },
    async sign(reportId: string, pin?: string): Promise<SignLabReportResult> {
      const actor = ensureWriteActor(context.requestContext);
      const before = await repo.reports.findById(actor.accountId, reportId);
      if (!before) return { kind: 'report_not_found' };
      if (before.status !== 'finalized') return { kind: 'invalid_status' };
      const signatureHash = `${actor.userId}:${Date.now()}:${pin || 'nopin'}`;
      const after = await repo.reports.updateStatus({ accountId: actor.accountId, reportId, status: 'signed', signedAt: new Date(), signedByUserId: actor.userId, signatureHash });
      await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'LabReportSigned', entityType: 'lab_report', entityId: reportId, beforeJson: before, afterJson: after, requestId: context.requestContext.requestId });
      return { kind: 'signed', report: after! };
    }
  };
}

// LAB REFERENCE RANGES SERVICE
export type CreateLabReferenceRangeResult = { kind: 'created'; range: LabReferenceRangeRecord };
export type UpdateLabReferenceRangeResult = { kind: 'range_not_found' } | { kind: 'updated'; range: LabReferenceRangeRecord };
export type DeleteLabReferenceRangeResult = { kind: 'range_not_found' } | { kind: 'deleted' };

export function createLabReferenceRangesService(context: LabContext, deps: LabDependencies = {}) {
  const repo = deps.repo ?? createLabRepo(context.db);
  const appendAuditFn = deps.appendAudit ?? append;

  return {
    async list(params: { page: number; pageSize: number; testId?: string; species?: string; active?: boolean }) {
      const actor = ensureAccountActor(context.requestContext);
      const { items, total } = await repo.referenceRanges.list({ accountId: actor.accountId, ...params });
      return { items, total, page: params.page, pageSize: params.pageSize };
    },
    async getById(rangeId: string) {
      const actor = ensureAccountActor(context.requestContext);
      return repo.referenceRanges.findById(actor.accountId, rangeId);
    },
    async create(input: LabReferenceRangeCreateInput): Promise<CreateLabReferenceRangeResult> {
      const actor = ensureWriteActor(context.requestContext);
      const range = await repo.referenceRanges.create({ accountId: actor.accountId, input });
      await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'LabReferenceRangeCreated', entityType: 'lab_reference_range', entityId: range.id, beforeJson: null, afterJson: range, requestId: context.requestContext.requestId });
      return { kind: 'created', range };
    },
    async update(rangeId: string, patch: LabReferenceRangeUpdateInput): Promise<UpdateLabReferenceRangeResult> {
      const actor = ensureWriteActor(context.requestContext);
      const before = await repo.referenceRanges.findById(actor.accountId, rangeId);
      if (!before) return { kind: 'range_not_found' };
      const after = await repo.referenceRanges.update({ accountId: actor.accountId, rangeId, patch });
      if (!after) return { kind: 'range_not_found' };
      await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'LabReferenceRangeUpdated', entityType: 'lab_reference_range', entityId: after.id, beforeJson: before, afterJson: after, requestId: context.requestContext.requestId });
      return { kind: 'updated', range: after };
    },
    async delete(rangeId: string): Promise<DeleteLabReferenceRangeResult> {
      const actor = ensureWriteActor(context.requestContext);
      const before = await repo.referenceRanges.findById(actor.accountId, rangeId);
      if (!before) return { kind: 'range_not_found' };
      await repo.referenceRanges.delete(actor.accountId, rangeId);
      await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'LabReferenceRangeDeleted', entityType: 'lab_reference_range', entityId: rangeId, beforeJson: before, afterJson: null, requestId: context.requestContext.requestId });
      return { kind: 'deleted' };
    }
  };
}
