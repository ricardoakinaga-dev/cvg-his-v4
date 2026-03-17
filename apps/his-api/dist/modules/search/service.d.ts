import type { RequestContext } from '../../plugins/requestContext.js';
import type { GlobalSearchResult, SearchQuery } from './types.js';
type DbClient = typeof import('@cvg-his/db').db;
type ServiceContext = {
    db: DbClient;
    requestContext: RequestContext;
};
export declare function createSearchService(context: ServiceContext): {
    search(query: SearchQuery): Promise<GlobalSearchResult>;
};
export {};
//# sourceMappingURL=service.d.ts.map