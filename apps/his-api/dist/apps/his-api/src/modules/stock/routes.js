import { requirePermission } from '../../middlewares/requirePermission.js';
import { createStockService } from './service.js';
import { listStockLotsQuerySchema, stockLotIdParamSchema, stockLotCreateSchema, stockLotUpdateSchema, listStockMovementsQuerySchema, stockMovementCreateSchema, kardexQuerySchema } from './types.js';
export const stockRoutes = async (app) => {
    // =====================
    // Stock Lots Routes
    // =====================
    // List stock lots
    app.get('/lots', {
        preHandler: requirePermission('estoque.lotes.read')
    }, async (request, reply) => {
        const query = listStockLotsQuerySchema.parse(request.query);
        const service = createStockService({ db: app.db, requestContext: request.requestContext });
        const result = await service.listLots({
            page: query.page,
            pageSize: query.pageSize,
            productId: query.productId,
            lotNumber: query.lotNumber,
            expiryWithinDays: query.expiryWithinDays,
            includeExpired: query.includeExpired
        });
        return reply.send(result);
    });
    // Get lot by ID
    app.get('/lots/:id', {
        preHandler: requirePermission('estoque.lotes.read')
    }, async (request, reply) => {
        const params = stockLotIdParamSchema.parse(request.params);
        const service = createStockService({ db: app.db, requestContext: request.requestContext });
        const lot = await service.getLotById(params.id);
        if (!lot) {
            return reply.status(404).send({ message: 'Stock lot not found' });
        }
        return reply.send(lot);
    });
    // Create stock lot
    app.post('/lots', {
        preHandler: requirePermission('estoque.lotes.create')
    }, async (request, reply) => {
        const body = stockLotCreateSchema.parse(request.body);
        const service = createStockService({ db: app.db, requestContext: request.requestContext });
        const result = await service.createLot(body);
        if (result.kind === 'lot_conflict') {
            return reply.status(409).send({ message: 'Stock lot already exists for this product' });
        }
        return reply.status(201).send(result.lot);
    });
    // Update stock lot
    app.put('/lots/:id', {
        preHandler: requirePermission('estoque.lotes.update')
    }, async (request, reply) => {
        const params = stockLotIdParamSchema.parse(request.params);
        const body = stockLotUpdateSchema.parse(request.body);
        const service = createStockService({ db: app.db, requestContext: request.requestContext });
        const result = await service.updateLot(params.id, body);
        if (result.kind === 'lot_not_found') {
            return reply.status(404).send({ message: 'Stock lot not found' });
        }
        if (result.kind === 'lot_conflict') {
            return reply.status(409).send({ message: 'Stock lot already exists for this product' });
        }
        return reply.send(result.lot);
    });
    // Delete stock lot
    app.delete('/lots/:id', {
        preHandler: requirePermission('estoque.lotes.delete')
    }, async (request, reply) => {
        const params = stockLotIdParamSchema.parse(request.params);
        const service = createStockService({ db: app.db, requestContext: request.requestContext });
        const result = await service.deleteLot(params.id);
        if (result.kind === 'lot_not_found') {
            return reply.status(404).send({ message: 'Stock lot not found' });
        }
        return reply.status(204).send();
    });
    // =====================
    // Stock Movements Routes
    // =====================
    // List stock movements
    app.get('/movements', {
        preHandler: requirePermission('estoque.movimentacoes.read')
    }, async (request, reply) => {
        const query = listStockMovementsQuerySchema.parse(request.query);
        const service = createStockService({ db: app.db, requestContext: request.requestContext });
        const result = await service.listMovements({
            page: query.page,
            pageSize: query.pageSize,
            productId: query.productId,
            lotId: query.lotId,
            movementType: query.movementType,
            encounterId: query.encounterId,
            inpatientStayId: query.inpatientStayId,
            startDate: query.startDate,
            endDate: query.endDate
        });
        return reply.send(result);
    });
    // Create stock movement
    app.post('/movements', {
        preHandler: requirePermission('estoque.movimentacoes.create')
    }, async (request, reply) => {
        const body = stockMovementCreateSchema.parse(request.body);
        const service = createStockService({ db: app.db, requestContext: request.requestContext });
        const result = await service.createMovement(body);
        if (result.kind === 'insufficient_stock') {
            return reply.status(400).send({ message: 'Insufficient stock for this operation' });
        }
        if (result.kind === 'lot_not_found') {
            return reply.status(404).send({ message: 'Stock lot not found' });
        }
        return reply.status(201).send(result.movement);
    });
    // =====================
    // Kardex Routes
    // =====================
    // Get Kardex for a product
    app.get('/kardex', {
        preHandler: requirePermission('estoque.kardex.read')
    }, async (request, reply) => {
        const query = kardexQuerySchema.parse(request.query);
        const service = createStockService({ db: app.db, requestContext: request.requestContext });
        const result = await service.getKardex({
            productId: query.productId,
            startDate: query.startDate,
            endDate: query.endDate,
            page: query.page,
            pageSize: query.pageSize
        });
        return reply.send(result);
    });
    // Get product balance with lots
    app.get('/balance/:productId', {
        preHandler: requirePermission('estoque.lotes.read')
    }, async (request, reply) => {
        const params = kardexQuerySchema.pick({ productId: true }).parse(request.params);
        const service = createStockService({ db: app.db, requestContext: request.requestContext });
        const result = await service.getProductBalance(params.productId);
        return reply.send(result);
    });
};
//# sourceMappingURL=routes.js.map