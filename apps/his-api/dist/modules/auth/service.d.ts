import type { IncomingHttpHeaders } from 'node:http';
export type AuthActor = {
    accountId: string;
    userId?: string;
    unitId?: string;
    role?: string;
    roles: string[];
    permissions: string[];
};
export declare function resolveActorFromHeaders(headers: IncomingHttpHeaders): AuthActor | undefined;
//# sourceMappingURL=service.d.ts.map