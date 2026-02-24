import { type AppendAuditInput } from '@cvg-his/audit';
import type { RequestContext } from '../../plugins/requestContext.js';
import { type ProductsRepo } from './repo.js';
import type { ProductCreateInput, ProductRecord, ProductUpdateInput } from './types.js';
type DbClient = typeof import('@cvg-his/db').db;
type ServiceContext = {
    db: DbClient;
    requestContext: RequestContext;
};
type ServiceDependencies = {
    repo?: ProductsRepo;
    appendAudit?: (input: AppendAuditInput) => Promise<unknown>;
};
export type CreateProductResult = {
    kind: 'sku_conflict';
} | {
    kind: 'created';
    product: ProductRecord;
};
export type UpdateProductResult = {
    kind: 'product_not_found';
} | {
    kind: 'sku_conflict';
} | {
    kind: 'updated';
    product: ProductRecord;
};
export type DeleteProductResult = {
    kind: 'product_not_found';
} | {
    kind: 'deleted';
};
export declare function createProductsService(context: ServiceContext, dependencies?: ServiceDependencies): {
    list(params: {
        page: number;
        pageSize: number;
        q?: string;
        active?: boolean;
        category?: string;
    }): Promise<{
        items: ProductRecord[];
        total: number;
        page: number;
        pageSize: number;
    }>;
    getById(productId: string): Promise<ProductRecord | null>;
    create(input: ProductCreateInput): Promise<CreateProductResult>;
    update(productId: string, patch: ProductUpdateInput): Promise<UpdateProductResult>;
    delete(productId: string): Promise<DeleteProductResult>;
};
export {};
//# sourceMappingURL=service.d.ts.map