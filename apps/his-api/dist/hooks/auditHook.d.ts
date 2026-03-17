import type { FastifyRequest } from 'fastify';
import { type AppendAuditInput, type AppendedAudit } from '@cvg-his/audit';
export declare function auditFromRequest(request: FastifyRequest): {
    append: (input: Omit<AppendAuditInput, "actorUserId" | "roles" | "requestId">) => Promise<AppendedAudit>;
};
//# sourceMappingURL=auditHook.d.ts.map