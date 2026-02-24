import { and, eq, ilike, desc, sql, gte, lte, } from 'drizzle-orm';
import { products, stockLots, stockMovements, users } from '@cvg-his/db';
export function createStockLotsRepo(db) {
    return {
        async list({ accountId, page, pageSize, productId, lotNumber, expiryWithinDays, includeExpired }) {
            const conditions = [eq(stockLots.accountId, accountId)];
            if (productId) {
                conditions.push(eq(stockLots.productId, productId));
            }
            if (lotNumber) {
                conditions.push(ilike(stockLots.lotNumber, `%${lotNumber}%`));
            }
            if (expiryWithinDays && !includeExpired) {
                const futureDate = new Date();
                futureDate.setDate(futureDate.getDate() + expiryWithinDays);
                conditions.push(sql `${stockLots.expiryDate} IS NOT NULL AND ${stockLots.expiryDate} <= ${futureDate.toISOString().split('T')[0]}`);
            }
            if (!includeExpired) {
                const today = new Date().toISOString().split('T')[0];
                conditions.push(sql `${stockLots.expiryDate} IS NULL OR ${stockLots.expiryDate} > ${today}`);
            }
            const whereClause = and(...conditions);
            // Get total count
            const [countResult] = await db
                .select({ count: sql `count(*)::int` })
                .from(stockLots)
                .where(whereClause);
            const total = countResult?.count ?? 0;
            // Get paginated items with product info
            const offset = (page - 1) * pageSize;
            const items = await db
                .select({
                id: stockLots.id,
                accountId: stockLots.accountId,
                productId: stockLots.productId,
                lotNumber: stockLots.lotNumber,
                expiryDate: stockLots.expiryDate,
                quantity: stockLots.quantity,
                cost: stockLots.cost,
                location: stockLots.location,
                supplier: stockLots.supplier,
                notes: stockLots.notes,
                active: stockLots.active,
                createdAt: stockLots.createdAt,
                updatedAt: stockLots.updatedAt,
                productName: products.name,
                productSku: products.sku
            })
                .from(stockLots)
                .innerJoin(products, eq(stockLots.productId, products.id))
                .where(whereClause)
                .orderBy(desc(stockLots.expiryDate), desc(stockLots.createdAt))
                .limit(pageSize)
                .offset(offset);
            return { items: items, total };
        },
        async findById(accountId, lotId) {
            const [lot] = await db
                .select({
                id: stockLots.id,
                accountId: stockLots.accountId,
                productId: stockLots.productId,
                lotNumber: stockLots.lotNumber,
                expiryDate: stockLots.expiryDate,
                quantity: stockLots.quantity,
                cost: stockLots.cost,
                location: stockLots.location,
                supplier: stockLots.supplier,
                notes: stockLots.notes,
                active: stockLots.active,
                createdAt: stockLots.createdAt,
                updatedAt: stockLots.updatedAt,
                productName: products.name,
                productSku: products.sku
            })
                .from(stockLots)
                .innerJoin(products, eq(stockLots.productId, products.id))
                .where(and(eq(stockLots.accountId, accountId), eq(stockLots.id, lotId)))
                .limit(1);
            return lot ?? null;
        },
        async findByProductAndLot(accountId, productId, lotNumber) {
            const [lot] = await db
                .select({
                id: stockLots.id,
                accountId: stockLots.accountId,
                productId: stockLots.productId,
                lotNumber: stockLots.lotNumber,
                expiryDate: stockLots.expiryDate,
                quantity: stockLots.quantity,
                cost: stockLots.cost,
                location: stockLots.location,
                supplier: stockLots.supplier,
                notes: stockLots.notes,
                active: stockLots.active,
                createdAt: stockLots.createdAt,
                updatedAt: stockLots.updatedAt,
                productName: products.name,
                productSku: products.sku
            })
                .from(stockLots)
                .innerJoin(products, eq(stockLots.productId, products.id))
                .where(and(eq(stockLots.accountId, accountId), eq(stockLots.productId, productId), eq(stockLots.lotNumber, lotNumber)))
                .limit(1);
            return lot ?? null;
        },
        async create(input) {
            const [lot] = await db
                .insert(stockLots)
                .values({
                accountId: input.accountId,
                productId: input.productId,
                lotNumber: input.lotNumber,
                expiryDate: input.expiryDate ?? null,
                quantity: input.quantity?.toString() ?? '0',
                cost: input.cost?.toString() ?? null,
                location: input.location ?? null,
                supplier: input.supplier ?? null,
                notes: input.notes ?? null,
                active: input.quantity?.toString() ?? '0'
            })
                .returning();
            // Fetch with product info
            const [withProduct] = await db
                .select({
                id: stockLots.id,
                accountId: stockLots.accountId,
                productId: stockLots.productId,
                lotNumber: stockLots.lotNumber,
                expiryDate: stockLots.expiryDate,
                quantity: stockLots.quantity,
                cost: stockLots.cost,
                location: stockLots.location,
                supplier: stockLots.supplier,
                notes: stockLots.notes,
                active: stockLots.active,
                createdAt: stockLots.createdAt,
                updatedAt: stockLots.updatedAt,
                productName: products.name,
                productSku: products.sku
            })
                .from(stockLots)
                .innerJoin(products, eq(stockLots.productId, products.id))
                .where(eq(stockLots.id, lot.id));
            return withProduct;
        },
        async updateById({ accountId, lotId, patch }) {
            const updateData = {
                updatedAt: new Date()
            };
            if (patch.lotNumber !== undefined)
                updateData.lotNumber = patch.lotNumber;
            if (patch.expiryDate !== undefined)
                updateData.expiryDate = patch.expiryDate;
            if (patch.quantity !== undefined)
                updateData.quantity = patch.quantity.toString();
            if (patch.cost !== undefined)
                updateData.cost = patch.cost?.toString() ?? null;
            if (patch.location !== undefined)
                updateData.location = patch.location;
            if (patch.supplier !== undefined)
                updateData.supplier = patch.supplier;
            if (patch.notes !== undefined)
                updateData.notes = patch.notes;
            if (patch.active !== undefined)
                updateData.active = patch.active.toString();
            const [lot] = await db
                .update(stockLots)
                .set(updateData)
                .where(and(eq(stockLots.accountId, accountId), eq(stockLots.id, lotId)))
                .returning();
            if (!lot)
                return null;
            const [withProduct] = await db
                .select({
                id: stockLots.id,
                accountId: stockLots.accountId,
                productId: stockLots.productId,
                lotNumber: stockLots.lotNumber,
                expiryDate: stockLots.expiryDate,
                quantity: stockLots.quantity,
                cost: stockLots.cost,
                location: stockLots.location,
                supplier: stockLots.supplier,
                notes: stockLots.notes,
                active: stockLots.active,
                createdAt: stockLots.createdAt,
                updatedAt: stockLots.updatedAt,
                productName: products.name,
                productSku: products.sku
            })
                .from(stockLots)
                .innerJoin(products, eq(stockLots.productId, products.id))
                .where(eq(stockLots.id, lot.id));
            return withProduct;
        },
        async deleteById(accountId, lotId) {
            const [deleted] = await db
                .delete(stockLots)
                .where(and(eq(stockLots.accountId, accountId), eq(stockLots.id, lotId)))
                .returning();
            return !!deleted;
        },
        async getProductBalance(accountId, productId) {
            const [result] = await db
                .select({
                totalQuantity: sql `COALESCE(SUM(${stockLots.quantity}), 0)`,
                totalActive: sql `COALESCE(SUM(${stockLots.active}), 0)`
            })
                .from(stockLots)
                .where(and(eq(stockLots.accountId, accountId), eq(stockLots.productId, productId)));
            return {
                totalQuantity: result?.totalQuantity ?? '0',
                totalActive: result?.totalActive ?? '0'
            };
        }
    };
}
export function createStockMovementsRepo(db) {
    return {
        async list({ accountId, page, pageSize, productId, lotId, movementType, encounterId, inpatientStayId, startDate, endDate }) {
            const conditions = [eq(stockMovements.accountId, accountId)];
            if (productId) {
                conditions.push(eq(stockMovements.productId, productId));
            }
            if (lotId) {
                conditions.push(eq(stockMovements.lotId, lotId));
            }
            if (movementType) {
                conditions.push(eq(stockMovements.movementType, movementType));
            }
            if (encounterId) {
                conditions.push(eq(stockMovements.encounterId, encounterId));
            }
            if (inpatientStayId) {
                conditions.push(eq(stockMovements.inpatientStayId, inpatientStayId));
            }
            if (startDate) {
                conditions.push(gte(stockMovements.createdAt, new Date(startDate)));
            }
            if (endDate) {
                const endDateTime = new Date(endDate);
                endDateTime.setHours(23, 59, 59, 999);
                conditions.push(lte(stockMovements.createdAt, endDateTime));
            }
            const whereClause = and(...conditions);
            // Get total count
            const [countResult] = await db
                .select({ count: sql `count(*)::int` })
                .from(stockMovements)
                .where(whereClause);
            const total = countResult?.count ?? 0;
            // Get paginated items with details
            const offset = (page - 1) * pageSize;
            const items = await db
                .select({
                id: stockMovements.id,
                accountId: stockMovements.accountId,
                productId: stockMovements.productId,
                lotId: stockMovements.lotId,
                movementType: stockMovements.movementType,
                quantity: stockMovements.quantity,
                unitCost: stockMovements.unitCost,
                totalCost: stockMovements.totalCost,
                balanceAfter: stockMovements.balanceAfter,
                lotBalanceAfter: stockMovements.lotBalanceAfter,
                encounterId: stockMovements.encounterId,
                inpatientStayId: stockMovements.inpatientStayId,
                performedByUserId: stockMovements.performedByUserId,
                reason: stockMovements.reason,
                notes: stockMovements.notes,
                documentRef: stockMovements.documentRef,
                createdAt: stockMovements.createdAt,
                productName: products.name,
                productSku: products.sku,
                lotNumber: stockLots.lotNumber,
                performedByName: sql `${users.fullName}`
            })
                .from(stockMovements)
                .innerJoin(products, eq(stockMovements.productId, products.id))
                .leftJoin(stockLots, eq(stockMovements.lotId, stockLots.id))
                .innerJoin(users, eq(stockMovements.performedByUserId, users.id))
                .where(whereClause)
                .orderBy(desc(stockMovements.createdAt))
                .limit(pageSize)
                .offset(offset);
            return { items: items, total };
        },
        async create(input) {
            const [movement] = await db
                .insert(stockMovements)
                .values({
                accountId: input.accountId,
                productId: input.productId,
                lotId: input.lotId ?? null,
                movementType: input.movementType,
                quantity: input.quantity.toString(),
                unitCost: input.unitCost?.toString() ?? null,
                totalCost: input.unitCost ? (Number(input.unitCost) * input.quantity).toString() : null,
                balanceAfter: input.balanceAfter,
                lotBalanceAfter: input.lotBalanceAfter ?? null,
                encounterId: input.encounterId ?? null,
                inpatientStayId: input.inpatientStayId ?? null,
                performedByUserId: input.performedByUserId,
                reason: input.reason ?? null,
                notes: input.notes ?? null,
                documentRef: input.documentRef ?? null
            })
                .returning();
            // Fetch with details
            const [withDetails] = await db
                .select({
                id: stockMovements.id,
                accountId: stockMovements.accountId,
                productId: stockMovements.productId,
                lotId: stockMovements.lotId,
                movementType: stockMovements.movementType,
                quantity: stockMovements.quantity,
                unitCost: stockMovements.unitCost,
                totalCost: stockMovements.totalCost,
                balanceAfter: stockMovements.balanceAfter,
                lotBalanceAfter: stockMovements.lotBalanceAfter,
                encounterId: stockMovements.encounterId,
                inpatientStayId: stockMovements.inpatientStayId,
                performedByUserId: stockMovements.performedByUserId,
                reason: stockMovements.reason,
                notes: stockMovements.notes,
                documentRef: stockMovements.documentRef,
                createdAt: stockMovements.createdAt,
                productName: products.name,
                productSku: products.sku,
                lotNumber: stockLots.lotNumber,
                performedByName: sql `${users.fullName}`
            })
                .from(stockMovements)
                .innerJoin(products, eq(stockMovements.productId, products.id))
                .leftJoin(stockLots, eq(stockMovements.lotId, stockLots.id))
                .innerJoin(users, eq(stockMovements.performedByUserId, users.id))
                .where(eq(stockMovements.id, movement.id));
            return withDetails;
        },
        async getKardex({ accountId, productId, startDate, endDate, page, pageSize }) {
            const conditions = [
                eq(stockMovements.accountId, accountId),
                eq(stockMovements.productId, productId)
            ];
            if (startDate) {
                conditions.push(gte(stockMovements.createdAt, new Date(startDate)));
            }
            if (endDate) {
                const endDateTime = new Date(endDate);
                endDateTime.setHours(23, 59, 59, 999);
                conditions.push(lte(stockMovements.createdAt, endDateTime));
            }
            const whereClause = and(...conditions);
            // Get total count
            const [countResult] = await db
                .select({ count: sql `count(*)::int` })
                .from(stockMovements)
                .where(whereClause);
            const total = countResult?.count ?? 0;
            // Get paginated items
            const offset = (page - 1) * pageSize;
            const items = await db
                .select({
                id: stockMovements.id,
                createdAt: stockMovements.createdAt,
                movementType: stockMovements.movementType,
                lotNumber: stockLots.lotNumber,
                quantity: stockMovements.quantity,
                balanceAfter: stockMovements.balanceAfter,
                unitCost: stockMovements.unitCost,
                totalCost: stockMovements.totalCost,
                reason: stockMovements.reason,
                documentRef: stockMovements.documentRef,
                performedByName: users.fullName
            })
                .from(stockMovements)
                .leftJoin(stockLots, eq(stockMovements.lotId, stockLots.id))
                .innerJoin(users, eq(stockMovements.performedByUserId, users.id))
                .where(whereClause)
                .orderBy(desc(stockMovements.createdAt))
                .limit(pageSize)
                .offset(offset);
            return { items: items, total };
        }
    };
}
//# sourceMappingURL=repo.js.map