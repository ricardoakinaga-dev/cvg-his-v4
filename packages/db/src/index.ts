import { type InferInsertModel } from 'drizzle-orm';

import { db } from './connection.js';
import { auditEvents } from './schema/index.js';

export * from './connection.js';
export * from './schema/index.js';

export type AuditEventInsert = Omit<InferInsertModel<typeof auditEvents>, 'id' | 'createdAt'>;

export async function insertAuditEvent(event: AuditEventInsert): Promise<void> {
  await db.insert(auditEvents).values(event);
}
