import { requirePermission } from '../../middlewares/requirePermission.js';
import { createImagingModalitiesService, createImagingTemplatesService, createImagingOrdersService, createImagingStudiesService, createImagingReportsService, createImagingScheduleService } from './service.js';
import { listImagingModalitiesQuerySchema, imagingModalityIdParamSchema, imagingModalityCreateSchema, imagingModalityUpdateSchema, listImagingTemplatesQuerySchema, imagingTemplateIdParamSchema, imagingTemplateCreateSchema, imagingTemplateUpdateSchema, listImagingOrdersQuerySchema, imagingOrderIdParamSchema, imagingOrderCreateSchema, imagingOrderUpdateSchema, imagingOrderScheduleSchema, imagingOrderCancelSchema, listImagingStudiesQuerySchema, imagingStudyIdParamSchema, imagingStudyCreateSchema, imagingStudyUpdateSchema, imagingStudyAttachDocumentSchema, listImagingReportsQuerySchema, imagingReportIdParamSchema, imagingReportCreateSchema, imagingReportUpdateSchema, imagingReportSignSchema, imagingReportAttachDocumentSchema, listImagingScheduleQuerySchema, imagingScheduleSlotCreateSchema, imagingScheduleSlotUpdateSchema } from './types.js';
export const imagingRoutes = async (app) => {
    // ============================================
    // IMAGING MODALITIES CATALOG
    // ============================================
    app.get('/modalities', { preHandler: requirePermission('imagem.modalidades.read') }, async (request, reply) => {
        const query = listImagingModalitiesQuerySchema.parse(request.query);
        const service = createImagingModalitiesService({ db: app.db, requestContext: request.requestContext });
        const result = await service.list(query);
        return reply.send(result);
    });
    app.get('/modalities/:id', { preHandler: requirePermission('imagem.modalidades.read') }, async (request, reply) => {
        const params = imagingModalityIdParamSchema.parse(request.params);
        const service = createImagingModalitiesService({ db: app.db, requestContext: request.requestContext });
        const result = await service.getById(params.id);
        if (!result)
            return reply.status(404).send({ message: 'Imaging modality not found' });
        return reply.send(result);
    });
    app.post('/modalities', { preHandler: requirePermission('imagem.modalidades.create') }, async (request, reply) => {
        const body = imagingModalityCreateSchema.parse(request.body);
        const service = createImagingModalitiesService({ db: app.db, requestContext: request.requestContext });
        const result = await service.create(body);
        if (result.kind === 'code_conflict')
            return reply.status(409).send({ message: 'Imaging modality code already exists' });
        return reply.status(201).send(result.modality);
    });
    app.put('/modalities/:id', { preHandler: requirePermission('imagem.modalidades.update') }, async (request, reply) => {
        const params = imagingModalityIdParamSchema.parse(request.params);
        const body = imagingModalityUpdateSchema.parse(request.body);
        const service = createImagingModalitiesService({ db: app.db, requestContext: request.requestContext });
        const result = await service.update(params.id, body);
        if (result.kind === 'modality_not_found')
            return reply.status(404).send({ message: 'Imaging modality not found' });
        if (result.kind === 'code_conflict')
            return reply.status(409).send({ message: 'Imaging modality code already exists' });
        return reply.send(result.modality);
    });
    app.delete('/modalities/:id', { preHandler: requirePermission('imagem.modalidades.delete') }, async (request, reply) => {
        const params = imagingModalityIdParamSchema.parse(request.params);
        const service = createImagingModalitiesService({ db: app.db, requestContext: request.requestContext });
        const result = await service.delete(params.id);
        if (result.kind === 'modality_not_found')
            return reply.status(404).send({ message: 'Imaging modality not found' });
        return reply.status(204).send();
    });
    // ============================================
    // IMAGING TEMPLATES
    // ============================================
    app.get('/templates', { preHandler: requirePermission('imagem.templates.read') }, async (request, reply) => {
        const query = listImagingTemplatesQuerySchema.parse(request.query);
        const service = createImagingTemplatesService({ db: app.db, requestContext: request.requestContext });
        const result = await service.list(query);
        return reply.send(result);
    });
    app.get('/templates/:id', { preHandler: requirePermission('imagem.templates.read') }, async (request, reply) => {
        const params = imagingTemplateIdParamSchema.parse(request.params);
        const service = createImagingTemplatesService({ db: app.db, requestContext: request.requestContext });
        const result = await service.getById(params.id);
        if (!result)
            return reply.status(404).send({ message: 'Imaging template not found' });
        return reply.send(result);
    });
    app.post('/templates', { preHandler: requirePermission('imagem.templates.create') }, async (request, reply) => {
        const body = imagingTemplateCreateSchema.parse(request.body);
        const service = createImagingTemplatesService({ db: app.db, requestContext: request.requestContext });
        const result = await service.create(body);
        return reply.status(201).send(result.template);
    });
    app.put('/templates/:id', { preHandler: requirePermission('imagem.templates.update') }, async (request, reply) => {
        const params = imagingTemplateIdParamSchema.parse(request.params);
        const body = imagingTemplateUpdateSchema.parse(request.body);
        const service = createImagingTemplatesService({ db: app.db, requestContext: request.requestContext });
        const result = await service.update(params.id, body);
        if (result.kind === 'template_not_found')
            return reply.status(404).send({ message: 'Imaging template not found' });
        return reply.send(result.template);
    });
    app.delete('/templates/:id', { preHandler: requirePermission('imagem.templates.delete') }, async (request, reply) => {
        const params = imagingTemplateIdParamSchema.parse(request.params);
        const service = createImagingTemplatesService({ db: app.db, requestContext: request.requestContext });
        const result = await service.delete(params.id);
        if (result.kind === 'template_not_found')
            return reply.status(404).send({ message: 'Imaging template not found' });
        return reply.status(204).send();
    });
    // ============================================
    // IMAGING ORDERS
    // ============================================
    app.get('/orders', { preHandler: requirePermission('imagem.pedidos.read') }, async (request, reply) => {
        const query = listImagingOrdersQuerySchema.parse(request.query);
        const service = createImagingOrdersService({ db: app.db, requestContext: request.requestContext });
        const result = await service.list(query);
        return reply.send(result);
    });
    app.get('/orders/:id', { preHandler: requirePermission('imagem.pedidos.read') }, async (request, reply) => {
        const params = imagingOrderIdParamSchema.parse(request.params);
        const service = createImagingOrdersService({ db: app.db, requestContext: request.requestContext });
        const result = await service.getById(params.id);
        if (!result)
            return reply.status(404).send({ message: 'Imaging order not found' });
        return reply.send(result);
    });
    app.post('/orders', { preHandler: requirePermission('imagem.pedidos.create') }, async (request, reply) => {
        const body = imagingOrderCreateSchema.parse(request.body);
        const service = createImagingOrdersService({ db: app.db, requestContext: request.requestContext });
        const result = await service.create(body);
        return reply.status(201).send(result.order);
    });
    app.put('/orders/:id', { preHandler: requirePermission('imagem.pedidos.update') }, async (request, reply) => {
        const params = imagingOrderIdParamSchema.parse(request.params);
        const body = imagingOrderUpdateSchema.parse(request.body);
        const service = createImagingOrdersService({ db: app.db, requestContext: request.requestContext });
        const result = await service.update(params.id, body);
        if (result.kind === 'order_not_found')
            return reply.status(404).send({ message: 'Imaging order not found' });
        return reply.send(result.order);
    });
    app.post('/orders/:id/schedule', { preHandler: requirePermission('imagem.pedidos.schedule') }, async (request, reply) => {
        const params = imagingOrderIdParamSchema.parse(request.params);
        const body = imagingOrderScheduleSchema.parse(request.body);
        const service = createImagingOrdersService({ db: app.db, requestContext: request.requestContext });
        const result = await service.schedule(params.id, new Date(body.scheduledAt));
        if (result.kind === 'order_not_found')
            return reply.status(404).send({ message: 'Imaging order not found' });
        if (result.kind === 'invalid_status')
            return reply.status(400).send({ message: 'Cannot schedule order in current status' });
        return reply.send(result.order);
    });
    app.post('/orders/:id/start', { preHandler: requirePermission('imagem.estudos.create') }, async (request, reply) => {
        const params = imagingOrderIdParamSchema.parse(request.params);
        const service = createImagingOrdersService({ db: app.db, requestContext: request.requestContext });
        const result = await service.start(params.id);
        if (result.kind === 'order_not_found')
            return reply.status(404).send({ message: 'Imaging order not found' });
        if (result.kind === 'invalid_status')
            return reply.status(400).send({ message: 'Cannot start order in current status' });
        return reply.send(result.order);
    });
    app.post('/orders/:id/complete', { preHandler: requirePermission('imagem.estudos.update') }, async (request, reply) => {
        const params = imagingOrderIdParamSchema.parse(request.params);
        const service = createImagingOrdersService({ db: app.db, requestContext: request.requestContext });
        const result = await service.complete(params.id);
        if (result.kind === 'order_not_found')
            return reply.status(404).send({ message: 'Imaging order not found' });
        if (result.kind === 'invalid_status')
            return reply.status(400).send({ message: 'Cannot complete order in current status' });
        return reply.send(result.order);
    });
    app.post('/orders/:id/cancel', { preHandler: requirePermission('imagem.pedidos.cancel') }, async (request, reply) => {
        const params = imagingOrderIdParamSchema.parse(request.params);
        const body = imagingOrderCancelSchema.parse(request.body);
        const service = createImagingOrdersService({ db: app.db, requestContext: request.requestContext });
        const result = await service.cancel(params.id, body.reason);
        if (result.kind === 'order_not_found')
            return reply.status(404).send({ message: 'Imaging order not found' });
        if (result.kind === 'invalid_status')
            return reply.status(400).send({ message: 'Cannot cancel order in current status' });
        return reply.send(result.order);
    });
    // ============================================
    // IMAGING STUDIES
    // ============================================
    app.get('/studies', { preHandler: requirePermission('imagem.estudos.read') }, async (request, reply) => {
        const query = listImagingStudiesQuerySchema.parse(request.query);
        const service = createImagingStudiesService({ db: app.db, requestContext: request.requestContext });
        const result = await service.list(query);
        return reply.send(result);
    });
    app.get('/studies/:id', { preHandler: requirePermission('imagem.estudos.read') }, async (request, reply) => {
        const params = imagingStudyIdParamSchema.parse(request.params);
        const service = createImagingStudiesService({ db: app.db, requestContext: request.requestContext });
        const result = await service.getByIdWithDocuments(params.id);
        if (!result)
            return reply.status(404).send({ message: 'Imaging study not found' });
        return reply.send(result);
    });
    app.post('/studies', { preHandler: requirePermission('imagem.estudos.create') }, async (request, reply) => {
        const body = imagingStudyCreateSchema.parse(request.body);
        const service = createImagingStudiesService({ db: app.db, requestContext: request.requestContext });
        const result = await service.create(body);
        if (result.kind === 'order_not_found')
            return reply.status(404).send({ message: 'Imaging order not found' });
        return reply.status(201).send(result.study);
    });
    app.put('/studies/:id', { preHandler: requirePermission('imagem.estudos.update') }, async (request, reply) => {
        const params = imagingStudyIdParamSchema.parse(request.params);
        const body = imagingStudyUpdateSchema.parse(request.body);
        const service = createImagingStudiesService({ db: app.db, requestContext: request.requestContext });
        const result = await service.update(params.id, body);
        if (result.kind === 'study_not_found')
            return reply.status(404).send({ message: 'Imaging study not found' });
        return reply.send(result.study);
    });
    app.post('/studies/:id/complete', { preHandler: requirePermission('imagem.estudos.update') }, async (request, reply) => {
        const params = imagingStudyIdParamSchema.parse(request.params);
        const service = createImagingStudiesService({ db: app.db, requestContext: request.requestContext });
        const result = await service.complete(params.id);
        if (result.kind === 'study_not_found')
            return reply.status(404).send({ message: 'Imaging study not found' });
        return reply.send(result.study);
    });
    app.post('/studies/:id/documents', { preHandler: requirePermission('imagem.estudos.attach') }, async (request, reply) => {
        const params = imagingStudyIdParamSchema.parse(request.params);
        const body = imagingStudyAttachDocumentSchema.parse(request.body);
        const service = createImagingStudiesService({ db: app.db, requestContext: request.requestContext });
        const result = await service.attachDocument(params.id, body.documentId, body.attachmentType, body.displayOrder);
        if (result.kind === 'study_not_found')
            return reply.status(404).send({ message: 'Imaging study not found' });
        return reply.status(201).send(result.document);
    });
    app.delete('/studies/:id/documents/:documentId', { preHandler: requirePermission('imagem.estudos.attach') }, async (request, reply) => {
        const params = imagingStudyIdParamSchema.parse(request.params);
        const documentId = request.params.documentId;
        const service = createImagingStudiesService({ db: app.db, requestContext: request.requestContext });
        await service.detachDocument(params.id, documentId);
        return reply.status(204).send();
    });
    // ============================================
    // IMAGING REPORTS
    // ============================================
    app.get('/reports', { preHandler: requirePermission('imagem.laudos.read') }, async (request, reply) => {
        const query = listImagingReportsQuerySchema.parse(request.query);
        const service = createImagingReportsService({ db: app.db, requestContext: request.requestContext });
        const result = await service.list(query);
        return reply.send(result);
    });
    app.get('/reports/:id', { preHandler: requirePermission('imagem.laudos.read') }, async (request, reply) => {
        const params = imagingReportIdParamSchema.parse(request.params);
        const service = createImagingReportsService({ db: app.db, requestContext: request.requestContext });
        const result = await service.getByIdWithDocuments(params.id);
        if (!result)
            return reply.status(404).send({ message: 'Imaging report not found' });
        return reply.send(result);
    });
    app.post('/reports', { preHandler: requirePermission('imagem.laudos.create') }, async (request, reply) => {
        const body = imagingReportCreateSchema.parse(request.body);
        const service = createImagingReportsService({ db: app.db, requestContext: request.requestContext });
        const result = await service.create(body);
        if (result.kind === 'order_not_found')
            return reply.status(404).send({ message: 'Imaging order not found' });
        return reply.status(201).send(result.report);
    });
    app.put('/reports/:id', { preHandler: requirePermission('imagem.laudos.update') }, async (request, reply) => {
        const params = imagingReportIdParamSchema.parse(request.params);
        const body = imagingReportUpdateSchema.parse(request.body);
        const service = createImagingReportsService({ db: app.db, requestContext: request.requestContext });
        const result = await service.update(params.id, body);
        if (result.kind === 'report_not_found')
            return reply.status(404).send({ message: 'Imaging report not found' });
        if (result.kind === 'invalid_status')
            return reply.status(400).send({ message: 'Report cannot be updated in current status' });
        return reply.send(result.report);
    });
    app.post('/reports/:id/finalize', { preHandler: requirePermission('imagem.laudos.finalize') }, async (request, reply) => {
        const params = imagingReportIdParamSchema.parse(request.params);
        const service = createImagingReportsService({ db: app.db, requestContext: request.requestContext });
        const result = await service.finalize(params.id);
        if (result.kind === 'report_not_found')
            return reply.status(404).send({ message: 'Imaging report not found' });
        if (result.kind === 'invalid_status')
            return reply.status(400).send({ message: 'Report cannot be finalized in current status' });
        return reply.send(result.report);
    });
    app.post('/reports/:id/sign', { preHandler: requirePermission('imagem.laudos.sign') }, async (request, reply) => {
        const params = imagingReportIdParamSchema.parse(request.params);
        const body = imagingReportSignSchema.parse(request.body);
        const service = createImagingReportsService({ db: app.db, requestContext: request.requestContext });
        const result = await service.sign(params.id, body.pin);
        if (result.kind === 'report_not_found')
            return reply.status(404).send({ message: 'Imaging report not found' });
        if (result.kind === 'invalid_status')
            return reply.status(400).send({ message: 'Report cannot be signed in current status' });
        return reply.send(result.report);
    });
    app.post('/reports/:id/documents', { preHandler: requirePermission('imagem.laudos.update') }, async (request, reply) => {
        const params = imagingReportIdParamSchema.parse(request.params);
        const body = imagingReportAttachDocumentSchema.parse(request.body);
        const service = createImagingReportsService({ db: app.db, requestContext: request.requestContext });
        const result = await service.attachDocument(params.id, body.documentId, body.attachmentType, body.displayOrder);
        if (result.kind === 'report_not_found')
            return reply.status(404).send({ message: 'Imaging report not found' });
        return reply.status(201).send(result.document);
    });
    app.delete('/reports/:id/documents/:documentId', { preHandler: requirePermission('imagem.laudos.update') }, async (request, reply) => {
        const params = imagingReportIdParamSchema.parse(request.params);
        const documentId = request.params.documentId;
        const service = createImagingReportsService({ db: app.db, requestContext: request.requestContext });
        await service.detachDocument(params.id, documentId);
        return reply.status(204).send();
    });
    // ============================================
    // IMAGING SCHEDULE
    // ============================================
    app.get('/schedule', { preHandler: requirePermission('imagem.agenda.read') }, async (request, reply) => {
        const query = listImagingScheduleQuerySchema.parse(request.query);
        const service = createImagingScheduleService({ db: app.db, requestContext: request.requestContext });
        const result = await service.list(query);
        return reply.send(result);
    });
    app.post('/schedule', { preHandler: requirePermission('imagem.agenda.manage') }, async (request, reply) => {
        const body = imagingScheduleSlotCreateSchema.parse(request.body);
        const service = createImagingScheduleService({ db: app.db, requestContext: request.requestContext });
        const result = await service.create(body);
        return reply.status(201).send(result.slot);
    });
    app.put('/schedule/:id', { preHandler: requirePermission('imagem.agenda.manage') }, async (request, reply) => {
        const params = imagingOrderIdParamSchema.parse(request.params); // Reusing schema for id
        const body = imagingScheduleSlotUpdateSchema.parse(request.body);
        const service = createImagingScheduleService({ db: app.db, requestContext: request.requestContext });
        const result = await service.update(params.id, body);
        if (result.kind === 'slot_not_found')
            return reply.status(404).send({ message: 'Schedule slot not found' });
        return reply.send(result.slot);
    });
    app.post('/schedule/:id/book', { preHandler: requirePermission('imagem.pedidos.schedule') }, async (request, reply) => {
        const params = imagingOrderIdParamSchema.parse(request.params);
        const body = imagingOrderIdParamSchema.parse(request.body); // orderId to book
        const service = createImagingScheduleService({ db: app.db, requestContext: request.requestContext });
        const result = await service.book(params.id, body.id);
        if (result.kind === 'slot_not_found')
            return reply.status(404).send({ message: 'Schedule slot not found' });
        if (result.kind === 'slot_not_available')
            return reply.status(400).send({ message: 'Schedule slot is not available' });
        return reply.send(result.slot);
    });
    app.post('/schedule/:id/release', { preHandler: requirePermission('imagem.agenda.manage') }, async (request, reply) => {
        const params = imagingOrderIdParamSchema.parse(request.params);
        const service = createImagingScheduleService({ db: app.db, requestContext: request.requestContext });
        const result = await service.release(params.id);
        if (result.kind === 'slot_not_found')
            return reply.status(404).send({ message: 'Schedule slot not found' });
        return reply.send(result.slot);
    });
    app.delete('/schedule/:id', { preHandler: requirePermission('imagem.agenda.manage') }, async (request, reply) => {
        const params = imagingOrderIdParamSchema.parse(request.params);
        const service = createImagingScheduleService({ db: app.db, requestContext: request.requestContext });
        const result = await service.delete(params.id);
        if (result.kind === 'slot_not_found')
            return reply.status(404).send({ message: 'Schedule slot not found' });
        return reply.status(204).send();
    });
};
//# sourceMappingURL=routes.js.map