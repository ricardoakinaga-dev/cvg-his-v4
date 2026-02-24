import { append } from '@cvg-his/audit';
import { createLabRepo } from './repo.js';
function unauthorizedError(message) {
    const error = new Error(message);
    error.statusCode = 401;
    error.code = 'UNAUTHORIZED';
    return error;
}
function ensureAccountActor(requestContext) {
    const actor = requestContext.actor;
    if (!actor?.accountId)
        throw unauthorizedError('Missing actor context.');
    return actor;
}
function ensureWriteActor(requestContext) {
    const actor = ensureAccountActor(requestContext);
    if (!actor.userId)
        throw unauthorizedError('Missing actor user context.');
    return actor;
}
function isDuplicateCodeError(error, constraintName) {
    if (typeof error !== 'object' || error === null)
        return false;
    const e = error;
    return e.code === '23505' && e.constraint === constraintName;
}
export function createLabTestsService(context, deps = {}) {
    const repo = deps.repo ?? createLabRepo(context.db);
    const appendAuditFn = deps.appendAudit ?? append;
    return {
        async list(params) {
            const actor = ensureAccountActor(context.requestContext);
            const { items, total } = await repo.tests.list({ accountId: actor.accountId, ...params });
            return { items, total, page: params.page, pageSize: params.pageSize };
        },
        async getById(testId) {
            const actor = ensureAccountActor(context.requestContext);
            return repo.tests.findById(actor.accountId, testId);
        },
        async create(input) {
            const actor = ensureWriteActor(context.requestContext);
            let test;
            try {
                test = await repo.tests.create({ accountId: actor.accountId, ...input });
            }
            catch (error) {
                if (isDuplicateCodeError(error, 'lab_tests_account_code_unique'))
                    return { kind: 'code_conflict' };
                throw error;
            }
            await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'LabTestCreated', entityType: 'lab_test', entityId: test.id, beforeJson: null, afterJson: test, requestId: context.requestContext.requestId });
            return { kind: 'created', test };
        },
        async update(testId, patch) {
            const actor = ensureWriteActor(context.requestContext);
            const before = await repo.tests.findById(actor.accountId, testId);
            if (!before)
                return { kind: 'test_not_found' };
            let after;
            try {
                after = await repo.tests.update({ accountId: actor.accountId, testId, patch });
            }
            catch (error) {
                if (isDuplicateCodeError(error, 'lab_tests_account_code_unique'))
                    return { kind: 'code_conflict' };
                throw error;
            }
            if (!after)
                return { kind: 'test_not_found' };
            await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'LabTestUpdated', entityType: 'lab_test', entityId: after.id, beforeJson: before, afterJson: after, requestId: context.requestContext.requestId });
            return { kind: 'updated', test: after };
        },
        async delete(testId) {
            const actor = ensureWriteActor(context.requestContext);
            const before = await repo.tests.findById(actor.accountId, testId);
            if (!before)
                return { kind: 'test_not_found' };
            await repo.tests.delete(actor.accountId, testId);
            await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'LabTestDeleted', entityType: 'lab_test', entityId: testId, beforeJson: before, afterJson: null, requestId: context.requestContext.requestId });
            return { kind: 'deleted' };
        }
    };
}
export function createLabOrdersService(context, deps = {}) {
    const repo = deps.repo ?? createLabRepo(context.db);
    const appendAuditFn = deps.appendAudit ?? append;
    return {
        async list(params) {
            const actor = ensureAccountActor(context.requestContext);
            const { items, total } = await repo.orders.list({ accountId: actor.accountId, ...params });
            return { items, total, page: params.page, pageSize: params.pageSize };
        },
        async getById(orderId) {
            const actor = ensureAccountActor(context.requestContext);
            return repo.orders.findById(actor.accountId, orderId);
        },
        async create(input) {
            const actor = ensureWriteActor(context.requestContext);
            const orderNumber = await context.db.execute(`SELECT lab_next_order_number('${actor.accountId}'::uuid)`).then(r => r.rows[0]?.lab_next_order_number ?? `LAB-${Date.now()}`);
            const order = await repo.orders.create({ accountId: actor.accountId, orderNumber, input, createdByUserId: actor.userId });
            const items = await repo.orderItems.createBatch({ accountId: actor.accountId, orderId: order.id, testIds: input.testIds, panelIds: input.panelIds });
            await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'LabOrderCreated', entityType: 'lab_order', entityId: order.id, beforeJson: null, afterJson: { order, items }, requestId: context.requestContext.requestId });
            return { kind: 'created', order, items };
        },
        async update(orderId, patch) {
            const actor = ensureWriteActor(context.requestContext);
            const before = await repo.orders.findById(actor.accountId, orderId);
            if (!before)
                return { kind: 'order_not_found' };
            const after = await repo.orders.update({ accountId: actor.accountId, orderId, patch });
            if (!after)
                return { kind: 'order_not_found' };
            await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'LabOrderUpdated', entityType: 'lab_order', entityId: after.id, beforeJson: before, afterJson: after, requestId: context.requestContext.requestId });
            return { kind: 'updated', order: after };
        },
        async cancel(orderId, reason) {
            const actor = ensureWriteActor(context.requestContext);
            const before = await repo.orders.findById(actor.accountId, orderId);
            if (!before)
                return { kind: 'order_not_found' };
            if (!['pending', 'partial'].includes(before.status))
                return { kind: 'invalid_status' };
            const after = await repo.orders.updateStatus({ accountId: actor.accountId, orderId, status: 'cancelled', cancelledAt: new Date(), cancelledReason: reason });
            await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'LabOrderCancelled', entityType: 'lab_order', entityId: orderId, beforeJson: before, afterJson: after, requestId: context.requestContext.requestId });
            return { kind: 'cancelled', order: after };
        }
    };
}
export function createLabSamplesService(context, deps = {}) {
    const repo = deps.repo ?? createLabRepo(context.db);
    const appendAuditFn = deps.appendAudit ?? append;
    return {
        async list(params) {
            const actor = ensureAccountActor(context.requestContext);
            const { items, total } = await repo.samples.list({ accountId: actor.accountId, ...params });
            return { items, total, page: params.page, pageSize: params.pageSize };
        },
        async getById(sampleId) {
            const actor = ensureAccountActor(context.requestContext);
            return repo.samples.findById(actor.accountId, sampleId);
        },
        async create(input) {
            const actor = ensureWriteActor(context.requestContext);
            const sampleNumber = await context.db.execute(`SELECT lab_next_sample_number('${actor.accountId}'::uuid)`).then(r => r.rows[0]?.lab_next_sample_number ?? `SAM-${Date.now()}`);
            const sample = await repo.samples.create({ accountId: actor.accountId, sampleNumber, input, patientId: input.patientId });
            await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'LabSampleCreated', entityType: 'lab_sample', entityId: sample.id, beforeJson: null, afterJson: sample, requestId: context.requestContext.requestId });
            return sample;
        },
        async collect(sampleId) {
            const actor = ensureWriteActor(context.requestContext);
            const before = await repo.samples.findById(actor.accountId, sampleId);
            if (!before)
                return { kind: 'sample_not_found' };
            if (before.status !== 'pending')
                return { kind: 'invalid_status' };
            const after = await repo.samples.updateStatus({ accountId: actor.accountId, sampleId, status: 'collected', collectedAt: new Date(), collectedByUserId: actor.userId });
            await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'LabSampleCollected', entityType: 'lab_sample', entityId: sampleId, beforeJson: before, afterJson: after, requestId: context.requestContext.requestId });
            return { kind: 'collected', sample: after };
        },
        async receive(sampleId) {
            const actor = ensureWriteActor(context.requestContext);
            const before = await repo.samples.findById(actor.accountId, sampleId);
            if (!before)
                return { kind: 'sample_not_found' };
            if (before.status !== 'collected')
                return { kind: 'invalid_status' };
            const after = await repo.samples.updateStatus({ accountId: actor.accountId, sampleId, status: 'received', receivedAt: new Date(), receivedByUserId: actor.userId });
            await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'LabSampleReceived', entityType: 'lab_sample', entityId: sampleId, beforeJson: before, afterJson: after, requestId: context.requestContext.requestId });
            return { kind: 'received', sample: after };
        },
        async reject(sampleId, reason) {
            const actor = ensureWriteActor(context.requestContext);
            const before = await repo.samples.findById(actor.accountId, sampleId);
            if (!before)
                return { kind: 'sample_not_found' };
            if (!['pending', 'collected', 'received'].includes(before.status))
                return { kind: 'invalid_status' };
            const after = await repo.samples.updateStatus({ accountId: actor.accountId, sampleId, status: 'rejected', rejectedAt: new Date(), rejectionReason: reason });
            await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'LabSampleRejected', entityType: 'lab_sample', entityId: sampleId, beforeJson: before, afterJson: after, requestId: context.requestContext.requestId });
            return { kind: 'rejected', sample: after };
        }
    };
}
export function createLabResultsService(context, deps = {}) {
    const repo = deps.repo ?? createLabRepo(context.db);
    const appendAuditFn = deps.appendAudit ?? append;
    return {
        async list(params) {
            const actor = ensureAccountActor(context.requestContext);
            const { items, total } = await repo.results.list({ accountId: actor.accountId, ...params });
            return { items, total, page: params.page, pageSize: params.pageSize };
        },
        async getById(resultId) {
            const actor = ensureAccountActor(context.requestContext);
            return repo.results.findById(actor.accountId, resultId);
        },
        async create(input) {
            const actor = ensureWriteActor(context.requestContext);
            const result = await repo.results.create({ accountId: actor.accountId, input, testId: input.testId, patientId: input.patientId });
            await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'LabResultCreated', entityType: 'lab_result', entityId: result.id, beforeJson: null, afterJson: result, requestId: context.requestContext.requestId });
            return { kind: 'created', result };
        },
        async update(resultId, patch) {
            const actor = ensureWriteActor(context.requestContext);
            const before = await repo.results.findById(actor.accountId, resultId);
            if (!before)
                return { kind: 'result_not_found' };
            const after = await repo.results.update({ accountId: actor.accountId, resultId, patch });
            if (!after)
                return { kind: 'result_not_found' };
            await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'LabResultUpdated', entityType: 'lab_result', entityId: after.id, beforeJson: before, afterJson: after, requestId: context.requestContext.requestId });
            return { kind: 'updated', result: after };
        },
        async verify(resultId) {
            const actor = ensureWriteActor(context.requestContext);
            const before = await repo.results.findById(actor.accountId, resultId);
            if (!before)
                return { kind: 'result_not_found' };
            if (!['pending', 'preliminary'].includes(before.status))
                return { kind: 'invalid_status' };
            const after = await repo.results.updateStatus({ accountId: actor.accountId, resultId, status: 'final', verifiedAt: new Date(), verifiedByUserId: actor.userId });
            await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'LabResultVerified', entityType: 'lab_result', entityId: resultId, beforeJson: before, afterJson: after, requestId: context.requestContext.requestId });
            return { kind: 'verified', result: after };
        }
    };
}
export function createLabReportsService(context, deps = {}) {
    const repo = deps.repo ?? createLabRepo(context.db);
    const appendAuditFn = deps.appendAudit ?? append;
    return {
        async list(params) {
            const actor = ensureAccountActor(context.requestContext);
            const { items, total } = await repo.reports.list({ accountId: actor.accountId, ...params });
            return { items, total, page: params.page, pageSize: params.pageSize };
        },
        async getById(reportId) {
            const actor = ensureAccountActor(context.requestContext);
            return repo.reports.findById(actor.accountId, reportId);
        },
        async create(input) {
            const actor = ensureWriteActor(context.requestContext);
            const reportNumber = await context.db.execute(`SELECT lab_next_report_number('${actor.accountId}'::uuid)`).then(r => r.rows[0]?.lab_next_report_number ?? `LAU-${Date.now()}`);
            const report = await repo.reports.create({ accountId: actor.accountId, reportNumber, input, patientId: input.patientId, draftedByUserId: actor.userId });
            if (input.resultIds?.length)
                await repo.reports.addResults(report.id, input.resultIds);
            await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'LabReportCreated', entityType: 'lab_report', entityId: report.id, beforeJson: null, afterJson: report, requestId: context.requestContext.requestId });
            return { kind: 'created', report };
        },
        async update(reportId, patch) {
            const actor = ensureWriteActor(context.requestContext);
            const before = await repo.reports.findById(actor.accountId, reportId);
            if (!before)
                return { kind: 'report_not_found' };
            if (!['draft', 'pending_review'].includes(before.status))
                return { kind: 'invalid_status' };
            const after = await repo.reports.update({ accountId: actor.accountId, reportId, patch });
            if (!after)
                return { kind: 'report_not_found' };
            if (patch.resultIds?.length) {
                await context.db.execute(`DELETE FROM lab_report_results WHERE report_id = '${reportId}'`);
                await repo.reports.addResults(reportId, patch.resultIds);
            }
            await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'LabReportUpdated', entityType: 'lab_report', entityId: after.id, beforeJson: before, afterJson: after, requestId: context.requestContext.requestId });
            return { kind: 'updated', report: after };
        },
        async finalize(reportId) {
            const actor = ensureWriteActor(context.requestContext);
            const before = await repo.reports.findById(actor.accountId, reportId);
            if (!before)
                return { kind: 'report_not_found' };
            if (!['draft', 'pending_review'].includes(before.status))
                return { kind: 'invalid_status' };
            const after = await repo.reports.updateStatus({ accountId: actor.accountId, reportId, status: 'finalized', finalizedAt: new Date(), finalizedByUserId: actor.userId });
            await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'LabReportFinalized', entityType: 'lab_report', entityId: reportId, beforeJson: before, afterJson: after, requestId: context.requestContext.requestId });
            return { kind: 'updated', report: after };
        },
        async sign(reportId, pin) {
            const actor = ensureWriteActor(context.requestContext);
            const before = await repo.reports.findById(actor.accountId, reportId);
            if (!before)
                return { kind: 'report_not_found' };
            if (before.status !== 'finalized')
                return { kind: 'invalid_status' };
            const signatureHash = `${actor.userId}:${Date.now()}:${pin || 'nopin'}`;
            const after = await repo.reports.updateStatus({ accountId: actor.accountId, reportId, status: 'signed', signedAt: new Date(), signedByUserId: actor.userId, signatureHash });
            await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'LabReportSigned', entityType: 'lab_report', entityId: reportId, beforeJson: before, afterJson: after, requestId: context.requestContext.requestId });
            return { kind: 'signed', report: after };
        }
    };
}
export function createLabReferenceRangesService(context, deps = {}) {
    const repo = deps.repo ?? createLabRepo(context.db);
    const appendAuditFn = deps.appendAudit ?? append;
    return {
        async list(params) {
            const actor = ensureAccountActor(context.requestContext);
            const { items, total } = await repo.referenceRanges.list({ accountId: actor.accountId, ...params });
            return { items, total, page: params.page, pageSize: params.pageSize };
        },
        async getById(rangeId) {
            const actor = ensureAccountActor(context.requestContext);
            return repo.referenceRanges.findById(actor.accountId, rangeId);
        },
        async create(input) {
            const actor = ensureWriteActor(context.requestContext);
            const range = await repo.referenceRanges.create({ accountId: actor.accountId, input });
            await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'LabReferenceRangeCreated', entityType: 'lab_reference_range', entityId: range.id, beforeJson: null, afterJson: range, requestId: context.requestContext.requestId });
            return { kind: 'created', range };
        },
        async update(rangeId, patch) {
            const actor = ensureWriteActor(context.requestContext);
            const before = await repo.referenceRanges.findById(actor.accountId, rangeId);
            if (!before)
                return { kind: 'range_not_found' };
            const after = await repo.referenceRanges.update({ accountId: actor.accountId, rangeId, patch });
            if (!after)
                return { kind: 'range_not_found' };
            await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'LabReferenceRangeUpdated', entityType: 'lab_reference_range', entityId: after.id, beforeJson: before, afterJson: after, requestId: context.requestContext.requestId });
            return { kind: 'updated', range: after };
        },
        async delete(rangeId) {
            const actor = ensureWriteActor(context.requestContext);
            const before = await repo.referenceRanges.findById(actor.accountId, rangeId);
            if (!before)
                return { kind: 'range_not_found' };
            await repo.referenceRanges.delete(actor.accountId, rangeId);
            await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'LabReferenceRangeDeleted', entityType: 'lab_reference_range', entityId: rangeId, beforeJson: before, afterJson: null, requestId: context.requestContext.requestId });
            return { kind: 'deleted' };
        }
    };
}
//# sourceMappingURL=service.js.map