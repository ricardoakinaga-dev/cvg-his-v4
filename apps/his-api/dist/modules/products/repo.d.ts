import { products } from '@cvg-his/db';
import type { ProductCreateInput, ProductUpdateInput } from './types.js';
type DbClient = typeof import('@cvg-his/db').db;
export type ProductsRepo = {
    list(params: {
        accountId: string;
        page: number;
        pageSize: number;
        q?: string;
        active?: boolean;
        category?: string;
    }): Promise<{
        items: typeof products.$inferSelect[];
        total: number;
    }>;
    findById(accountId: string, productId: string): Promise<typeof products.$inferSelect | null>;
    findBySku(accountId: string, sku: string): Promise<typeof products.$inferSelect | null>;
    create(input: {
        accountId: string;
    } & ProductCreateInput): Promise<typeof products.$inferSelect>;
    updateById(params: {
        accountId: string;
        productId: string;
        patch: ProductUpdateInput;
    }): Promise<typeof products.$inferSelect | null>;
    deleteById(accountId: string, productId: string): Promise<boolean>;
};
export declare function createProductsRepo(db: DbClient): ProductsRepo;
export {};
//# sourceMappingURL=repo.d.ts.map