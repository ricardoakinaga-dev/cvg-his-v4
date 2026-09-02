import assert from 'node:assert/strict';
import type { DatabaseClient } from '@cvg-his-v2/shared-database';
import { attachments } from '@cvg-his-v2/shared-database';
import type { AccountId, AttachmentId } from '@cvg-his-v2/shared-types';
import { PgDialect } from 'drizzle-orm/pg-core';
import { test } from 'vitest';

import { DatabaseAttachmentRepository } from './attachment-repository.js';

const OWNER_ACCOUNT_ID = 'account-owner' as AccountId;
const FOREIGN_ACCOUNT_ID = 'account-foreign' as AccountId;
const ATTACHMENT_ID = 'attachment-shared' as AttachmentId;

interface StoredAttachment {
  readonly id: AttachmentId;
  readonly accountId: AccountId;
}

function createDatabaseWithAttachment() {
  let rows: readonly StoredAttachment[] = [{ id: ATTACHMENT_ID, accountId: OWNER_ACCOUNT_ID }];
  let lastDeleteQuery: { readonly sql: string; readonly params: readonly unknown[] } | undefined;
  const dialect = new PgDialect();

  const database = {
    delete(table: typeof attachments) {
      assert.equal(table, attachments);
      return {
        where(condition: unknown) {
          const query = dialect.sqlToQuery(
            dialect.buildDeleteQuery({
              table,
              where: condition as never,
              returning: undefined,
              withList: undefined
            })
          );
          lastDeleteQuery = query;

          const [accountId, attachmentId] = query.params;
          const matched = rows.some(
            (row) => row.accountId === accountId && row.id === attachmentId
          );
          if (matched) {
            rows = rows.filter((row) => row.id !== attachmentId || row.accountId !== accountId);
          }
          return Promise.resolve({ rowCount: matched ? 1 : 0 });
        }
      };
    }
  } as unknown as DatabaseClient;

  return {
    database,
    getRows: () => rows,
    getLastDeleteQuery: () => lastDeleteQuery
  };
}

test('DatabaseAttachmentRepository cannot delete an attachment through a foreign account scope', async () => {
  const { database, getRows, getLastDeleteQuery } = createDatabaseWithAttachment();
  const repository = new DatabaseAttachmentRepository(database);

  const deleted = await repository.deleteById(FOREIGN_ACCOUNT_ID, ATTACHMENT_ID);

  assert.equal(deleted, false);
  assert.deepEqual(getRows(), [{ id: ATTACHMENT_ID, accountId: OWNER_ACCOUNT_ID }]);
  const deleteQuery = getLastDeleteQuery();
  assert.deepEqual(deleteQuery && { sql: deleteQuery.sql, params: deleteQuery.params }, {
    sql: 'delete from "attachments" where ("attachments"."account_id" = $1 and "attachments"."id" = $2)',
    params: [FOREIGN_ACCOUNT_ID, ATTACHMENT_ID]
  });
});
