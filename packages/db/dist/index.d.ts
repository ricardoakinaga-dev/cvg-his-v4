import { type InferInsertModel } from 'drizzle-orm';
import { auditEvents } from './schema/index.js';
export * from './connection.js';
export * from './schema/index.js';
export type AuditEventInsert = Omit<InferInsertModel<typeof auditEvents>, 'id' | 'createdAt'>;
export declare function insertAuditEvent(event: AuditEventInsert): Promise<void>;
//# sourceMappingURL=index.d.ts.map