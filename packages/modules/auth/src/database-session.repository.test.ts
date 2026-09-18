import assert from 'node:assert/strict';
import { test } from 'vitest';

import type { AccountId, SessionId, UserId } from '@cvg-his-v2/shared-types';
import { DatabaseSessionRepository } from './repositories/database-session.repository.js';

const ACCOUNT_ID = '00000000-0000-4000-8000-000000000001' as AccountId;
const USER_ID = '00000000-0000-4000-8000-000000000002' as UserId;
const SESSION_ID = 'session-authoritative-1' as SessionId;

test('DatabaseSessionRepository maps the combined authoritative session projection', async () => {
  let executeCalls = 0;
  const repository = new DatabaseSessionRepository({
    execute: async () => {
      executeCalls += 1;
      return {
        rows: [
          {
            session_id: SESSION_ID,
            session_account_id: ACCOUNT_ID,
            session_user_id: USER_ID,
            session_auth_time: new Date('2026-01-01T00:00:00.000Z'),
            session_expires_at: new Date('2026-01-01T01:00:00.000Z'),
            session_refresh_expires_at: new Date('2026-01-02T00:00:00.000Z'),
            session_active: true,
            session_role_codes: ['admin'],
            session_refresh_nonce: 'nonce-1',
            session_revoked_at: null,
            session_created_at: new Date('2026-01-01T00:00:00.000Z'),
            session_updated_at: new Date('2026-01-01T00:00:00.000Z'),
            user_id: USER_ID,
            user_account_id: ACCOUNT_ID,
            user_username: 'admin',
            user_email: 'admin@example.test',
            user_password_hash: 'hash',
            user_full_name: 'Admin User',
            user_is_active: true,
            user_principal_kind: 'human',
            user_interactive_login_enabled: true,
            user_created_at: new Date('2026-01-01T00:00:00.000Z'),
            user_updated_at: new Date('2026-01-01T00:00:00.000Z'),
            user_role_codes: ['admin', 'auditor']
          }
        ]
      };
    }
  } as never);

  const lookup = await repository.findByIdWithUser(SESSION_ID, ACCOUNT_ID);

  assert.equal(executeCalls, 1);
  assert.equal(lookup?.session.sessionId, SESSION_ID);
  assert.deepEqual(lookup?.session.roleCodes, ['admin']);
  assert.equal(lookup?.user.id, USER_ID);
  assert.deepEqual(lookup?.user.roleCodes, ['admin', 'auditor']);
  assert.equal(lookup?.user.status, 'active');
});

test('DatabaseSessionRepository rejects a missing combined projection without extra reads', async () => {
  let executeCalls = 0;
  const repository = new DatabaseSessionRepository({
    execute: async () => {
      executeCalls += 1;
      return { rows: [] };
    }
  } as never);

  const lookup = await repository.findByIdWithUser(SESSION_ID, ACCOUNT_ID);

  assert.equal(lookup, null);
  assert.equal(executeCalls, 1);
});
