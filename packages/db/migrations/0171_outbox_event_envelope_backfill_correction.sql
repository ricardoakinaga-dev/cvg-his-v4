-- PROD-004/A01: forward-only correction for rows missed by 0170.
--
-- Defect: 0170's WHERE clause
--   WHERE NOT (jsonb_typeof(payload -> '_meta') = 'object' AND payload -> '_meta' ? 'eventId')
-- evaluates to SQL NULL (not TRUE) for payloads without an object _meta, so
-- legacy rows without any envelope were silently skipped instead of backfilled.
-- 0170 itself is preserved byte-for-byte; applied checksums are untouched.
--
-- This migration selects exactly the missed rows with NULL-safe logic and
-- applies the same envelope construction as 0170, hardened for NULL payloads,
-- non-object payloads and non-object _meta values. Protected envelope fields
-- (eventId, eventType, schemaVersion, occurredAt, accountId, sourceModule,
-- actor, correlationId, causationId) are always rebuilt from the authoritative
-- row columns; arbitrary legacy metadata is retained. Rows that already carry
-- a valid envelope (object _meta with eventId) are not selected and stay
-- byte-identical. The statement is a single UPDATE (atomic) and safely
-- re-runnable: a second execution selects zero rows.
UPDATE outbox_events
   SET payload = (
         CASE WHEN jsonb_typeof(COALESCE(payload, '{}'::jsonb)) = 'object'
              THEN COALESCE(payload, '{}'::jsonb)
              ELSE '{}'::jsonb
         END
         || jsonb_build_object('accountId', account_id)
       )
       || jsonb_build_object(
            '_meta',
            (
              CASE WHEN jsonb_typeof(payload -> '_meta') = 'object'
                   THEN payload -> '_meta'
                   ELSE '{}'::jsonb
              END
            )
              || jsonb_build_object(
                   'eventId', id,
                   'eventType', event_type,
                   'schemaVersion', 1,
                   'occurredAt', created_at,
                   'accountId', account_id,
                   'sourceModule', module_name,
                   'actor', jsonb_build_object('type', 'system', 'id', 'legacy-outbox'),
                   'correlationId', correlation_id,
                   'causationId', NULL
                 )
          )
 WHERE NOT (
   COALESCE(jsonb_typeof(payload -> '_meta'), '') = 'object'
   AND payload -> '_meta' ? 'eventId'
 );

COMMENT ON COLUMN outbox_events.payload IS
  'JSON payload with a protected _meta event envelope. Legacy rows are backfilled by migration 0170 and its forward-only correction 0171 (PROD-004/A01).';
