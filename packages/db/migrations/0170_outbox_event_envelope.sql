-- Backfill the immutable event envelope for rows written before event
-- governance became executable. The outbox row identity is authoritative;
-- arbitrary legacy metadata is retained except for protected envelope fields.
UPDATE outbox_events
   SET payload = (COALESCE(payload, '{}'::jsonb) || jsonb_build_object('accountId', account_id))
       || jsonb_build_object(
            '_meta',
            COALESCE(payload -> '_meta', '{}'::jsonb)
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
   jsonb_typeof(payload -> '_meta') = 'object'
   AND payload -> '_meta' ? 'eventId'
 );

COMMENT ON COLUMN outbox_events.payload IS
  'JSON payload with a protected _meta event envelope. Legacy rows are backfilled by migration 0170.';
