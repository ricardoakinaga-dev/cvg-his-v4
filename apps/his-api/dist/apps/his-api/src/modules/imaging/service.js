import { append } from '@cvg-his/audit';
import { createImagingRepo } from './repo.js';
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
export function createImagingModalitiesService(context, deps = {}) {
    const repo = deps.repo ?? createImagingRepo(context.db);
    const appendAuditFn = deps.appendAudit ?? append;
    return {
        async list(params) {
            const actor = ensureAccountActor(context.requestContext);
            const { items, total } = await repo.modalities.list({ accountId: actor.accountId, ...params });
            return { items, total, page: params.page, pageSize: params.pageSize };
        },
        async getById(modalityId) {
            const actor = ensureAccountActor(context.requestContext);
            return repo.modalities.findById(actor.accountId, modalityId);
        },
        async create(input) {
            const actor = ensureWriteActor(context.requestContext);
            let modality;
            try {
                modality = await repo.modalities.create({ accountId: actor.accountId, ...input });
            }
            catch (error) {
                if (isDuplicateCodeError(error, 'imaging_modalities_account_code_unique'))
                    return { kind: 'code_conflict' };
                throw error;
            }
            await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'ImagingModalityCreated', entityType: 'imaging_modality', entityId: modality.id, beforeJson: null, afterJson: modality, requestId: context.requestContext.requestId });
            return { kind: 'created', modality };
        },
        async update(modalityId, patch) {
            const actor = ensureWriteActor(context.requestContext);
            const before = await repo.modalities.findById(actor.accountId, modalityId);
            if (!before)
                return { kind: 'modality_not_found' };
            let after;
            try {
                after = await repo.modalities.update({ accountId: actor.accountId, modalityId, patch });
            }
            catch (error) {
                if (isDuplicateCodeError(error, 'imaging_modalities_account_code_unique'))
                    return { kind: 'code_conflict' };
                throw error;
            }
            if (!after)
                return { kind: 'modality_not_found' };
            await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'ImagingModalityUpdated', entityType: 'imaging_modality', entityId: after.id, beforeJson: before, afterJson: after, requestId: context.requestContext.requestId });
            return { kind: 'updated', modality: after };
        },
        async delete(modalityId) {
            const actor = ensureWriteActor(context.requestContext);
            const before = await repo.modalities.findById(actor.accountId, modalityId);
            if (!before)
                return { kind: 'modality_not_found' };
            await repo.modalities.delete(actor.accountId, modalityId);
            await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'ImagingModalityDeleted', entityType: 'imaging_modality', entityId: modalityId, beforeJson: before, afterJson: null, requestId: context.requestContext.requestId });
            return { kind: 'deleted' };
        }
    };
}
export function createImagingTemplatesService(context, deps = {}) {
    const repo = deps.repo ?? createImagingRepo(context.db);
    const appendAuditFn = deps.appendAudit ?? append;
    return {
        async list(params) {
            const actor = ensureAccountActor(context.requestContext);
            const { items, total } = await repo.templates.list({ accountId: actor.accountId, ...params });
            return { items, total, page: params.page, pageSize: params.pageSize };
        },
        async getById(templateId) {
            const actor = ensureAccountActor(context.requestContext);
            return repo.templates.findById(actor.accountId, templateId);
        },
        async create(input) {
            const actor = ensureWriteActor(context.requestContext);
            const template = await repo.templates.create({ accountId: actor.accountId, ...input });
            await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'ImagingTemplateCreated', entityType: 'imaging_template', entityId: template.id, beforeJson: null, afterJson: template, requestId: context.requestContext.requestId });
            return { kind: 'created', template };
        },
        async update(templateId, patch) {
            const actor = ensureWriteActor(context.requestContext);
            const before = await repo.templates.findById(actor.accountId, templateId);
            if (!before)
                return { kind: 'template_not_found' };
            const after = await repo.templates.update({ accountId: actor.accountId, templateId, patch });
            if (!after)
                return { kind: 'template_not_found' };
            await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'ImagingTemplateUpdated', entityType: 'imaging_template', entityId: after.id, beforeJson: before, afterJson: after, requestId: context.requestContext.requestId });
            return { kind: 'updated', template: after };
        },
        async delete(templateId) {
            const actor = ensureWriteActor(context.requestContext);
            const before = await repo.templates.findById(actor.accountId, templateId);
            if (!before)
                return { kind: 'template_not_found' };
            await repo.templates.delete(actor.accountId, templateId);
            await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'ImagingTemplateDeleted', entityType: 'imaging_template', entityId: templateId, beforeJson: before, afterJson: null, requestId: context.requestContext.requestId });
            return { kind: 'deleted' };
        }
    };
}
export function createImagingOrdersService(context, deps = {}) {
    const repo = deps.repo ?? createImagingRepo(context.db);
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
            const orderNumber = await context.db.execute(`SELECT imaging_next_order_number('${actor.accountId}'::uuid)`).then(r => r.rows[0]?.imaging_next_order_number ?? `IMG-${Date.now()}`);
            const order = await repo.orders.create({ accountId: actor.accountId, orderNumber, input, createdByUserId: actor.userId });
            await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'ImagingOrderCreated', entityType: 'imaging_order', entityId: order.id, beforeJson: null, afterJson: order, requestId: context.requestContext.requestId });
            return { kind: 'created', order };
        },
        async update(orderId, patch) {
            const actor = ensureWriteActor(context.requestContext);
            const before = await repo.orders.findById(actor.accountId, orderId);
            if (!before)
                return { kind: 'order_not_found' };
            const after = await repo.orders.update({ accountId: actor.accountId, orderId, patch });
            if (!after)
                return { kind: 'order_not_found' };
            await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'ImagingOrderUpdated', entityType: 'imaging_order', entityId: after.id, beforeJson: before, afterJson: after, requestId: context.requestContext.requestId });
            return { kind: 'updated', order: after };
        },
        async schedule(orderId, scheduledAt) {
            const actor = ensureWriteActor(context.requestContext);
            const before = await repo.orders.findById(actor.accountId, orderId);
            if (!before)
                return { kind: 'order_not_found' };
            if (!['pending', 'scheduled'].includes(before.status))
                return { kind: 'invalid_status' };
            const after = await repo.orders.updateStatus({ accountId: actor.accountId, orderId, status: 'scheduled', scheduledAt });
            if (!after)
                return { kind: 'order_not_found' };
            await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'ImagingOrderScheduled', entityType: 'imaging_order', entityId: after.id, beforeJson: before, afterJson: after, requestId: context.requestContext.requestId });
            return { kind: 'scheduled', order: after };
        },
        async start(orderId) {
            const actor = ensureWriteActor(context.requestContext);
            const before = await repo.orders.findById(actor.accountId, orderId);
            if (!before)
                return { kind: 'order_not_found' };
            if (!['pending', 'scheduled'].includes(before.status))
                return { kind: 'invalid_status' };
            const after = await repo.orders.updateStatus({ accountId: actor.accountId, orderId, status: 'in_progress', performedAt: new Date() });
            if (!after)
                return { kind: 'order_not_found' };
            await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'ImagingOrderStarted', entityType: 'imaging_order', entityId: after.id, beforeJson: before, afterJson: after, requestId: context.requestContext.requestId });
            return { kind: 'scheduled', order: after };
        },
        async complete(orderId) {
            const actor = ensureWriteActor(context.requestContext);
            const before = await repo.orders.findById(actor.accountId, orderId);
            if (!before)
                return { kind: 'order_not_found' };
            if (before.status !== 'in_progress')
                return { kind: 'invalid_status' };
            const after = await repo.orders.updateStatus({ accountId: actor.accountId, orderId, status: 'completed', completedAt: new Date() });
            if (!after)
                return { kind: 'order_not_found' };
            await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'ImagingOrderCompleted', entityType: 'imaging_order', entityId: after.id, beforeJson: before, afterJson: after, requestId: context.requestContext.requestId });
            return { kind: 'scheduled', order: after };
        },
        async cancel(orderId, reason) {
            const actor = ensureWriteActor(context.requestContext);
            const before = await repo.orders.findById(actor.accountId, orderId);
            if (!before)
                return { kind: 'order_not_found' };
            if (!['pending', 'scheduled'].includes(before.status))
                return { kind: 'invalid_status' };
            const after = await repo.orders.updateStatus({ accountId: actor.accountId, orderId, status: 'cancelled', cancelledAt: new Date(), cancelledReason: reason });
            if (!after)
                return { kind: 'order_not_found' };
            await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'ImagingOrderCancelled', entityType: 'imaging_order', entityId: after.id, beforeJson: before, afterJson: after, requestId: context.requestContext.requestId });
            return { kind: 'cancelled', order: after };
        }
    };
}
export function createImagingStudiesService(context, deps = {}) {
    const repo = deps.repo ?? createImagingRepo(context.db);
    const appendAuditFn = deps.appendAudit ?? append;
    return {
        async list(params) {
            const actor = ensureAccountActor(context.requestContext);
            const { items, total } = await repo.studies.list({ accountId: actor.accountId, ...params });
            return { items, total, page: params.page, pageSize: params.pageSize };
        },
        async getById(studyId) {
            const actor = ensureAccountActor(context.requestContext);
            return repo.studies.findById(actor.accountId, studyId);
        },
        async getByIdWithDocuments(studyId) {
            const actor = ensureAccountActor(context.requestContext);
            return repo.studies.findByIdWithDocuments(actor.accountId, studyId);
        },
        async create(input) {
            const actor = ensureWriteActor(context.requestContext);
            const order = await repo.orders.findById(actor.accountId, input.orderId);
            if (!order)
                return { kind: 'order_not_found' };
            const studyNumber = await context.db.execute(`SELECT imaging_next_study_number('${actor.accountId}'::uuid)`).then(r => r.rows[0]?.imaging_next_study_number ?? `STD-${Date.now()}`);
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
        async update(studyId, patch) {
            const actor = ensureWriteActor(context.requestContext);
            const before = await repo.studies.findById(actor.accountId, studyId);
            if (!before)
                return { kind: 'study_not_found' };
            const after = await repo.studies.update({ accountId: actor.accountId, studyId, patch });
            if (!after)
                return { kind: 'study_not_found' };
            await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'ImagingStudyUpdated', entityType: 'imaging_study', entityId: after.id, beforeJson: before, afterJson: after, requestId: context.requestContext.requestId });
            return { kind: 'updated', study: after };
        },
        async complete(studyId) {
            const actor = ensureWriteActor(context.requestContext);
            const before = await repo.studies.findById(actor.accountId, studyId);
            if (!before)
                return { kind: 'study_not_found' };
            const after = await repo.studies.updateStatus({ accountId: actor.accountId, studyId, status: 'completed' });
            if (!after)
                return { kind: 'study_not_found' };
            await repo.orders.updateStatus({ accountId: actor.accountId, orderId: before.orderId, status: 'completed', completedAt: new Date() });
            await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'ImagingStudyCompleted', entityType: 'imaging_study', entityId: after.id, beforeJson: before, afterJson: after, requestId: context.requestContext.requestId });
            return { kind: 'updated', study: after };
        },
        async attachDocument(studyId, documentId, attachmentType, displayOrder) {
            const actor = ensureWriteActor(context.requestContext);
            const study = await repo.studies.findById(actor.accountId, studyId);
            if (!study)
                return { kind: 'study_not_found' };
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
        async detachDocument(studyId, documentId) {
            const actor = ensureWriteActor(context.requestContext);
            await repo.studies.detachDocument(actor.accountId, studyId, documentId);
            await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'ImagingStudyDocumentDetached', entityType: 'imaging_study', entityId: studyId, beforeJson: { documentId }, afterJson: null, requestId: context.requestContext.requestId });
        }
    };
}
export function createImagingReportsService(context, deps = {}) {
    const repo = deps.repo ?? createImagingRepo(context.db);
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
        async getByIdWithDocuments(reportId) {
            const actor = ensureAccountActor(context.requestContext);
            return repo.reports.findByIdWithDocuments(actor.accountId, reportId);
        },
        async create(input) {
            const actor = ensureWriteActor(context.requestContext);
            const order = await repo.orders.findById(actor.accountId, input.orderId);
            if (!order)
                return { kind: 'order_not_found' };
            const reportNumber = await context.db.execute(`SELECT imaging_next_report_number('${actor.accountId}'::uuid)`).then(r => r.rows[0]?.imaging_next_report_number ?? `LAU-${Date.now()}`);
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
            await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'ImagingReportUpdated', entityType: 'imaging_report', entityId: after.id, beforeJson: before, afterJson: after, requestId: context.requestContext.requestId });
            return { kind: 'updated', report: after };
        },
        async finalize(reportId) {
            const actor = ensureWriteActor(context.requestContext);
            const before = await repo.reports.findById(actor.accountId, reportId);
            if (!before)
                return { kind: 'report_not_found' };
            if (!['draft', 'pending_review'].includes(before.status))
                return { kind: 'invalid_status' };
            const after = await repo.reports.updateStatus({
                accountId: actor.accountId,
                reportId,
                status: 'finalized',
                finalizedAt: new Date(),
                finalizedByUserId: actor.userId
            });
            if (!after)
                return { kind: 'report_not_found' };
            await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'ImagingReportFinalized', entityType: 'imaging_report', entityId: after.id, beforeJson: before, afterJson: after, requestId: context.requestContext.requestId });
            return { kind: 'finalized', report: after };
        },
        async sign(reportId, _pin) {
            const actor = ensureWriteActor(context.requestContext);
            const before = await repo.reports.findById(actor.accountId, reportId);
            if (!before)
                return { kind: 'report_not_found' };
            if (before.status !== 'finalized')
                return { kind: 'invalid_status' };
            const signatureHash = `${reportId}-${actor.userId}-${Date.now()}`;
            const after = await repo.reports.updateStatus({
                accountId: actor.accountId,
                reportId,
                status: 'signed',
                signedAt: new Date(),
                signedByUserId: actor.userId,
                signatureHash
            });
            if (!after)
                return { kind: 'report_not_found' };
            await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'ImagingReportSigned', entityType: 'imaging_report', entityId: after.id, beforeJson: before, afterJson: after, requestId: context.requestContext.requestId });
            return { kind: 'signed', report: after };
        },
        async attachDocument(reportId, documentId, attachmentType, displayOrder) {
            const actor = ensureWriteActor(context.requestContext);
            const report = await repo.reports.findById(actor.accountId, reportId);
            if (!report)
                return { kind: 'report_not_found' };
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
        async detachDocument(reportId, documentId) {
            const actor = ensureWriteActor(context.requestContext);
            await repo.reports.detachDocument(actor.accountId, reportId, documentId);
            await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'ImagingReportDocumentDetached', entityType: 'imaging_report', entityId: reportId, beforeJson: { documentId }, afterJson: null, requestId: context.requestContext.requestId });
        }
    };
}
export function createImagingScheduleService(context, deps = {}) {
    const repo = deps.repo ?? createImagingRepo(context.db);
    const appendAuditFn = deps.appendAudit ?? append;
    return {
        async list(params) {
            const actor = ensureAccountActor(context.requestContext);
            return repo.schedule.list({ accountId: actor.accountId, ...params });
        },
        async getById(slotId) {
            const actor = ensureAccountActor(context.requestContext);
            return repo.schedule.findById(actor.accountId, slotId);
        },
        async create(input) {
            const actor = ensureWriteActor(context.requestContext);
            const slot = await repo.schedule.create({ accountId: actor.accountId, input });
            await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'ImagingScheduleSlotCreated', entityType: 'imaging_schedule_slot', entityId: slot.id, beforeJson: null, afterJson: slot, requestId: context.requestContext.requestId });
            return { kind: 'created', slot };
        },
        async update(slotId, patch) {
            const actor = ensureWriteActor(context.requestContext);
            const before = await repo.schedule.findById(actor.accountId, slotId);
            if (!before)
                return { kind: 'slot_not_found' };
            const after = await repo.schedule.update({ accountId: actor.accountId, slotId, patch });
            if (!after)
                return { kind: 'slot_not_found' };
            await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'ImagingScheduleSlotUpdated', entityType: 'imaging_schedule_slot', entityId: after.id, beforeJson: before, afterJson: after, requestId: context.requestContext.requestId });
            return { kind: 'updated', slot: after };
        },
        async book(slotId, orderId) {
            const actor = ensureWriteActor(context.requestContext);
            const before = await repo.schedule.findById(actor.accountId, slotId);
            if (!before)
                return { kind: 'slot_not_found' };
            if (!before.isAvailable)
                return { kind: 'slot_not_available' };
            const after = await repo.schedule.bookSlot({ accountId: actor.accountId, slotId, orderId });
            if (!after)
                return { kind: 'slot_not_available' };
            await repo.orders.updateStatus({ accountId: actor.accountId, orderId, status: 'scheduled', scheduledAt: new Date(`${before.slotDate}T${before.slotStartTime}`) });
            await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'ImagingScheduleSlotBooked', entityType: 'imaging_schedule_slot', entityId: after.id, beforeJson: before, afterJson: after, requestId: context.requestContext.requestId });
            return { kind: 'booked', slot: after };
        },
        async release(slotId) {
            const actor = ensureWriteActor(context.requestContext);
            const before = await repo.schedule.findById(actor.accountId, slotId);
            if (!before)
                return { kind: 'slot_not_found' };
            const after = await repo.schedule.releaseSlot(actor.accountId, slotId);
            if (!after)
                return { kind: 'slot_not_found' };
            await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'ImagingScheduleSlotReleased', entityType: 'imaging_schedule_slot', entityId: after.id, beforeJson: before, afterJson: after, requestId: context.requestContext.requestId });
            return { kind: 'updated', slot: after };
        },
        async delete(slotId) {
            const actor = ensureWriteActor(context.requestContext);
            const before = await repo.schedule.findById(actor.accountId, slotId);
            if (!before)
                return { kind: 'slot_not_found' };
            await repo.schedule.delete(actor.accountId, slotId);
            await appendAuditFn({ accountId: actor.accountId, actorUserId: actor.userId, roles: actor.roles, action: 'ImagingScheduleSlotDeleted', entityType: 'imaging_schedule_slot', entityId: slotId, beforeJson: before, afterJson: null, requestId: context.requestContext.requestId });
            return { kind: 'deleted' };
        }
    };
}
//# sourceMappingURL=service.js.map