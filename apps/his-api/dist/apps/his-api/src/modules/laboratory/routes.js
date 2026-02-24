import { requirePermission } from '../../middlewares/requirePermission.js';
import { createLabTestsService, createLabOrdersService, createLabSamplesService, createLabResultsService, createLabReportsService, createLabReferenceRangesService } from './service.js';
import { listLabTestsQuerySchema, labTestIdParamSchema, labTestCreateSchema, labTestUpdateSchema, listLabOrdersQuerySchema, labOrderIdParamSchema, labOrderCreateSchema, labOrderUpdateSchema, labOrderCancelSchema, listLabSamplesQuerySchema, labSampleIdParamSchema, labSampleCreateSchema, labSampleCollectSchema, labSampleRejectSchema, listLabResultsQuerySchema, labResultIdParamSchema, labResultCreateSchema, labResultUpdateSchema, listLabReportsQuerySchema, labReportIdParamSchema, labReportCreateSchema, labReportUpdateSchema, labReportSignSchema, listLabReferenceRangesQuerySchema, labReferenceRangeIdParamSchema, labReferenceRangeCreateSchema, labReferenceRangeUpdateSchema } from './types.js';
export const laboratoryRoutes = async (app) => {
    // ============================================
    // LAB TESTS CATALOG
    // ============================================
    app.get('/tests', { preHandler: requirePermission('laboratorio.catalogo.read') }, async (request, reply) => {
        const query = listLabTestsQuerySchema.parse(request.query);
        const service = createLabTestsService({ db: app.db, requestContext: request.requestContext });
        const result = await service.list(query);
        return reply.send(result);
    });
    app.get('/tests/:id', { preHandler: requirePermission('laboratorio.catalogo.read') }, async (request, reply) => {
        const params = labTestIdParamSchema.parse(request.params);
        const service = createLabTestsService({ db: app.db, requestContext: request.requestContext });
        const result = await service.getById(params.id);
        if (!result)
            return reply.status(404).send({ message: 'Lab test not found' });
        return reply.send(result);
    });
    app.post('/tests', { preHandler: requirePermission('laboratorio.catalogo.create') }, async (request, reply) => {
        const body = labTestCreateSchema.parse(request.body);
        const service = createLabTestsService({ db: app.db, requestContext: request.requestContext });
        const result = await service.create(body);
        if (result.kind === 'code_conflict')
            return reply.status(409).send({ message: 'Lab test code already exists' });
        return reply.status(201).send(result.test);
    });
    app.put('/tests/:id', { preHandler: requirePermission('laboratorio.catalogo.update') }, async (request, reply) => {
        const params = labTestIdParamSchema.parse(request.params);
        const body = labTestUpdateSchema.parse(request.body);
        const service = createLabTestsService({ db: app.db, requestContext: request.requestContext });
        const result = await service.update(params.id, body);
        if (result.kind === 'test_not_found')
            return reply.status(404).send({ message: 'Lab test not found' });
        if (result.kind === 'code_conflict')
            return reply.status(409).send({ message: 'Lab test code already exists' });
        return reply.send(result.test);
    });
    app.delete('/tests/:id', { preHandler: requirePermission('laboratorio.catalogo.delete') }, async (request, reply) => {
        const params = labTestIdParamSchema.parse(request.params);
        const service = createLabTestsService({ db: app.db, requestContext: request.requestContext });
        const result = await service.delete(params.id);
        if (result.kind === 'test_not_found')
            return reply.status(404).send({ message: 'Lab test not found' });
        return reply.status(204).send();
    });
    // ============================================
    // LAB ORDERS
    // ============================================
    app.get('/orders', { preHandler: requirePermission('laboratorio.pedidos.read') }, async (request, reply) => {
        const query = listLabOrdersQuerySchema.parse(request.query);
        const service = createLabOrdersService({ db: app.db, requestContext: request.requestContext });
        const result = await service.list(query);
        return reply.send(result);
    });
    app.get('/orders/:id', { preHandler: requirePermission('laboratorio.pedidos.read') }, async (request, reply) => {
        const params = labOrderIdParamSchema.parse(request.params);
        const service = createLabOrdersService({ db: app.db, requestContext: request.requestContext });
        const result = await service.getById(params.id);
        if (!result)
            return reply.status(404).send({ message: 'Lab order not found' });
        return reply.send(result);
    });
    app.post('/orders', { preHandler: requirePermission('laboratorio.pedidos.create') }, async (request, reply) => {
        const body = labOrderCreateSchema.parse(request.body);
        const service = createLabOrdersService({ db: app.db, requestContext: request.requestContext });
        const result = await service.create(body);
        return reply.status(201).send({ order: result.order, items: result.items });
    });
    app.put('/orders/:id', { preHandler: requirePermission('laboratorio.pedidos.update') }, async (request, reply) => {
        const params = labOrderIdParamSchema.parse(request.params);
        const body = labOrderUpdateSchema.parse(request.body);
        const service = createLabOrdersService({ db: app.db, requestContext: request.requestContext });
        const result = await service.update(params.id, body);
        if (result.kind === 'order_not_found')
            return reply.status(404).send({ message: 'Lab order not found' });
        return reply.send(result.order);
    });
    app.post('/orders/:id/cancel', { preHandler: requirePermission('laboratorio.pedidos.cancel') }, async (request, reply) => {
        const params = labOrderIdParamSchema.parse(request.params);
        const body = labOrderCancelSchema.parse(request.body);
        const service = createLabOrdersService({ db: app.db, requestContext: request.requestContext });
        const result = await service.cancel(params.id, body.reason);
        if (result.kind === 'order_not_found')
            return reply.status(404).send({ message: 'Lab order not found' });
        if (result.kind === 'invalid_status')
            return reply.status(400).send({ message: 'Cannot cancel order in current status' });
        return reply.send(result.order);
    });
    // ============================================
    // LAB SAMPLES
    // ============================================
    app.get('/samples', { preHandler: requirePermission('laboratorio.coleta.read') }, async (request, reply) => {
        const query = listLabSamplesQuerySchema.parse(request.query);
        const service = createLabSamplesService({ db: app.db, requestContext: request.requestContext });
        const result = await service.list(query);
        return reply.send(result);
    });
    app.get('/samples/:id', { preHandler: requirePermission('laboratorio.coleta.read') }, async (request, reply) => {
        const params = labSampleIdParamSchema.parse(request.params);
        const service = createLabSamplesService({ db: app.db, requestContext: request.requestContext });
        const result = await service.getById(params.id);
        if (!result)
            return reply.status(404).send({ message: 'Lab sample not found' });
        return reply.send(result);
    });
    app.post('/samples', { preHandler: requirePermission('laboratorio.coleta.create') }, async (request, reply) => {
        const body = labSampleCreateSchema.parse(request.body);
        const service = createLabSamplesService({ db: app.db, requestContext: request.requestContext });
        // Get patientId from order
        const orderService = createLabOrdersService({ db: app.db, requestContext: request.requestContext });
        const order = await orderService.getById(body.orderId);
        if (!order)
            return reply.status(404).send({ message: 'Lab order not found' });
        const result = await service.create({ ...body, patientId: order.patientId });
        return reply.status(201).send(result);
    });
    app.post('/samples/:id/collect', { preHandler: requirePermission('laboratorio.coleta.update') }, async (request, reply) => {
        const params = labSampleIdParamSchema.parse(request.params);
        const body = labSampleCollectSchema.parse(request.body);
        const service = createLabSamplesService({ db: app.db, requestContext: request.requestContext });
        const result = await service.collect(params.id);
        if (result.kind === 'sample_not_found')
            return reply.status(404).send({ message: 'Lab sample not found' });
        if (result.kind === 'invalid_status')
            return reply.status(400).send({ message: 'Sample cannot be collected in current status' });
        return reply.send(result.sample);
    });
    app.post('/samples/:id/receive', { preHandler: requirePermission('laboratorio.coleta.update') }, async (request, reply) => {
        const params = labSampleIdParamSchema.parse(request.params);
        const service = createLabSamplesService({ db: app.db, requestContext: request.requestContext });
        const result = await service.receive(params.id);
        if (result.kind === 'sample_not_found')
            return reply.status(404).send({ message: 'Lab sample not found' });
        if (result.kind === 'invalid_status')
            return reply.status(400).send({ message: 'Sample cannot be received in current status' });
        return reply.send(result.sample);
    });
    app.post('/samples/:id/reject', { preHandler: requirePermission('laboratorio.coleta.update') }, async (request, reply) => {
        const params = labSampleIdParamSchema.parse(request.params);
        const body = labSampleRejectSchema.parse(request.body);
        const service = createLabSamplesService({ db: app.db, requestContext: request.requestContext });
        const result = await service.reject(params.id, body.reason);
        if (result.kind === 'sample_not_found')
            return reply.status(404).send({ message: 'Lab sample not found' });
        if (result.kind === 'invalid_status')
            return reply.status(400).send({ message: 'Sample cannot be rejected in current status' });
        return reply.send(result.sample);
    });
    // ============================================
    // LAB RESULTS
    // ============================================
    app.get('/results', { preHandler: requirePermission('laboratorio.resultados.read') }, async (request, reply) => {
        const query = listLabResultsQuerySchema.parse(request.query);
        const service = createLabResultsService({ db: app.db, requestContext: request.requestContext });
        const result = await service.list(query);
        return reply.send(result);
    });
    app.get('/results/:id', { preHandler: requirePermission('laboratorio.resultados.read') }, async (request, reply) => {
        const params = labResultIdParamSchema.parse(request.params);
        const service = createLabResultsService({ db: app.db, requestContext: request.requestContext });
        const result = await service.getById(params.id);
        if (!result)
            return reply.status(404).send({ message: 'Lab result not found' });
        return reply.send(result);
    });
    app.post('/results', { preHandler: requirePermission('laboratorio.resultados.create') }, async (request, reply) => {
        const body = labResultCreateSchema.parse(request.body);
        const service = createLabResultsService({ db: app.db, requestContext: request.requestContext });
        const result = await service.create({
            orderItemId: body.orderItemId,
            sampleId: body.sampleId ?? null,
            testId: body.testId,
            patientId: body.patientId,
            resultValue: body.resultValue ?? null,
            resultNumeric: body.resultNumeric ?? null,
            unit: body.unit ?? null,
            referenceRange: body.referenceRange ?? null,
            referenceRangeId: body.referenceRangeId ?? null,
            flag: body.flag ?? null,
            notes: body.notes ?? null,
            interpretation: body.interpretation ?? null
        });
        return reply.status(201).send(result.result);
    });
    app.put('/results/:id', { preHandler: requirePermission('laboratorio.resultados.update') }, async (request, reply) => {
        const params = labResultIdParamSchema.parse(request.params);
        const body = labResultUpdateSchema.parse(request.body);
        const service = createLabResultsService({ db: app.db, requestContext: request.requestContext });
        const result = await service.update(params.id, body);
        if (result.kind === 'result_not_found')
            return reply.status(404).send({ message: 'Lab result not found' });
        return reply.send(result.result);
    });
    app.post('/results/:id/verify', { preHandler: requirePermission('laboratorio.resultados.verify') }, async (request, reply) => {
        const params = labResultIdParamSchema.parse(request.params);
        const service = createLabResultsService({ db: app.db, requestContext: request.requestContext });
        const result = await service.verify(params.id);
        if (result.kind === 'result_not_found')
            return reply.status(404).send({ message: 'Lab result not found' });
        if (result.kind === 'invalid_status')
            return reply.status(400).send({ message: 'Result cannot be verified in current status' });
        return reply.send(result.result);
    });
    // ============================================
    // LAB REPORTS
    // ============================================
    app.get('/reports', { preHandler: requirePermission('laboratorio.laudos.read') }, async (request, reply) => {
        const query = listLabReportsQuerySchema.parse(request.query);
        const service = createLabReportsService({ db: app.db, requestContext: request.requestContext });
        const result = await service.list(query);
        return reply.send(result);
    });
    app.get('/reports/:id', { preHandler: requirePermission('laboratorio.laudos.read') }, async (request, reply) => {
        const params = labReportIdParamSchema.parse(request.params);
        const service = createLabReportsService({ db: app.db, requestContext: request.requestContext });
        const result = await service.getById(params.id);
        if (!result)
            return reply.status(404).send({ message: 'Lab report not found' });
        return reply.send(result);
    });
    app.post('/reports', { preHandler: requirePermission('laboratorio.laudos.create') }, async (request, reply) => {
        const body = labReportCreateSchema.parse(request.body);
        const service = createLabReportsService({ db: app.db, requestContext: request.requestContext });
        // Get patientId from order
        const orderService = createLabOrdersService({ db: app.db, requestContext: request.requestContext });
        const order = await orderService.getById(body.orderId);
        if (!order)
            return reply.status(404).send({ message: 'Lab order not found' });
        const result = await service.create({ ...body, patientId: order.patientId });
        return reply.status(201).send(result.report);
    });
    app.put('/reports/:id', { preHandler: requirePermission('laboratorio.laudos.update') }, async (request, reply) => {
        const params = labReportIdParamSchema.parse(request.params);
        const body = labReportUpdateSchema.parse(request.body);
        const service = createLabReportsService({ db: app.db, requestContext: request.requestContext });
        const result = await service.update(params.id, body);
        if (result.kind === 'report_not_found')
            return reply.status(404).send({ message: 'Lab report not found' });
        if (result.kind === 'invalid_status')
            return reply.status(400).send({ message: 'Report cannot be updated in current status' });
        return reply.send(result.report);
    });
    app.post('/reports/:id/finalize', { preHandler: requirePermission('laboratorio.laudos.update') }, async (request, reply) => {
        const params = labReportIdParamSchema.parse(request.params);
        const service = createLabReportsService({ db: app.db, requestContext: request.requestContext });
        const result = await service.finalize(params.id);
        if (result.kind === 'report_not_found')
            return reply.status(404).send({ message: 'Lab report not found' });
        if (result.kind === 'invalid_status')
            return reply.status(400).send({ message: 'Report cannot be finalized in current status' });
        return reply.send(result.report);
    });
    app.post('/reports/:id/sign', { preHandler: requirePermission('laboratorio.laudos.sign') }, async (request, reply) => {
        const params = labReportIdParamSchema.parse(request.params);
        const body = labReportSignSchema.parse(request.body);
        const service = createLabReportsService({ db: app.db, requestContext: request.requestContext });
        const result = await service.sign(params.id, body.pin);
        if (result.kind === 'report_not_found')
            return reply.status(404).send({ message: 'Lab report not found' });
        if (result.kind === 'invalid_status')
            return reply.status(400).send({ message: 'Report cannot be signed in current status' });
        return reply.send(result.report);
    });
    // ============================================
    // LAB REFERENCE RANGES
    // ============================================
    app.get('/reference-ranges', { preHandler: requirePermission('laboratorio.referencia.read') }, async (request, reply) => {
        const query = listLabReferenceRangesQuerySchema.parse(request.query);
        const service = createLabReferenceRangesService({ db: app.db, requestContext: request.requestContext });
        const result = await service.list(query);
        return reply.send(result);
    });
    app.get('/reference-ranges/:id', { preHandler: requirePermission('laboratorio.referencia.read') }, async (request, reply) => {
        const params = labReferenceRangeIdParamSchema.parse(request.params);
        const service = createLabReferenceRangesService({ db: app.db, requestContext: request.requestContext });
        const result = await service.getById(params.id);
        if (!result)
            return reply.status(404).send({ message: 'Reference range not found' });
        return reply.send(result);
    });
    app.post('/reference-ranges', { preHandler: requirePermission('laboratorio.referencia.create') }, async (request, reply) => {
        const body = labReferenceRangeCreateSchema.parse(request.body);
        const service = createLabReferenceRangesService({ db: app.db, requestContext: request.requestContext });
        const result = await service.create(body);
        return reply.status(201).send(result.range);
    });
    app.put('/reference-ranges/:id', { preHandler: requirePermission('laboratorio.referencia.update') }, async (request, reply) => {
        const params = labReferenceRangeIdParamSchema.parse(request.params);
        const body = labReferenceRangeUpdateSchema.parse(request.body);
        const service = createLabReferenceRangesService({ db: app.db, requestContext: request.requestContext });
        const result = await service.update(params.id, body);
        if (result.kind === 'range_not_found')
            return reply.status(404).send({ message: 'Reference range not found' });
        return reply.send(result.range);
    });
    app.delete('/reference-ranges/:id', { preHandler: requirePermission('laboratorio.referencia.delete') }, async (request, reply) => {
        const params = labReferenceRangeIdParamSchema.parse(request.params);
        const service = createLabReferenceRangesService({ db: app.db, requestContext: request.requestContext });
        const result = await service.delete(params.id);
        if (result.kind === 'range_not_found')
            return reply.status(404).send({ message: 'Reference range not found' });
        return reply.status(204).send();
    });
};
//# sourceMappingURL=routes.js.map