import { db } from './connection.js';
import { auditEvents } from './schema/index.js';
export * from './connection.js';
export * from './schema/index.js';
export async function insertAuditEvent(event) {
    await db.insert(auditEvents).values(event);
}
//# sourceMappingURL=index.js.map