-- PROD-004-R1/CP-01: forward-only completion of the event-envelope backfill.
--
-- 0170 missed rows without an object _meta (NULL WHERE); 0171 repaired rows
-- lacking an eventId key but still accepts partial envelopes that the consumer
-- parser (readEventEnvelopeMetadata) rejects: null eventId, missing/invalid
-- actor, or other missing/invalid required fields. Those rows can never be
-- consumed (the consumer throws before dispatch) and a re-run repairs nothing.
--
-- This migration selects every row whose envelope is not FULLY valid per the
-- consumer contract plus the row-column equalities asserted at consumption,
-- and rebuilds the protected identity fields from the authoritative row
-- columns. Valid optional fields (actor, schemaVersion, occurredAt,
-- causationId) and arbitrary legacy extras are preserved; fully valid rows are
-- not selected and stay byte-identical. 0170/0171 are preserved byte-for-byte;
-- applied checksums are untouched. Single UPDATE (atomic), safely re-runnable.
--
-- occurredAt uses the same ISO-shaped subset enforced by the consumer parser.
-- Timezone-less ISO values are valid parser inputs and are preserved verbatim;
-- implementation-dependent legacy formats are rebuilt from authoritative
-- created_at, avoiding locale-dependent migration output.
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
                    'schemaVersion',
                      CASE WHEN jsonb_typeof(payload -> '_meta' -> 'schemaVersion') = 'number'
                           THEN CASE WHEN (payload -> '_meta' ->> 'schemaVersion')::numeric BETWEEN 1 AND 1000
                                           AND (payload -> '_meta' ->> 'schemaVersion')::numeric
                                             = FLOOR((payload -> '_meta' ->> 'schemaVersion')::numeric)
                                      THEN (payload -> '_meta' ->> 'schemaVersion')::integer
                                      ELSE 1
                                END
                           ELSE 1
                      END,
                   'occurredAt',
                     CASE WHEN jsonb_typeof(payload -> '_meta' -> 'occurredAt') = 'string'
                                AND (payload -> '_meta' ->> 'occurredAt') ~
                                   '^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])([T ]([01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9](\.[0-9]+)?)?(Z|[+-]([01][0-9]|2[0-3]):?[0-5][0-9])?)?$'
                          THEN payload -> '_meta' ->> 'occurredAt'
                          ELSE to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
                     END,
                   'accountId', account_id,
                   'sourceModule', module_name,
                   'actor',
                     CASE WHEN jsonb_typeof(payload -> '_meta' -> 'actor') = 'object'
                               AND (payload -> '_meta' -> 'actor' ->> 'type') IN ('user', 'service', 'system')
                               AND jsonb_typeof(payload -> '_meta' -> 'actor' -> 'id') = 'string'
                                AND char_length(payload -> '_meta' -> 'actor' ->> 'id') BETWEEN 1 AND 255
                                AND (payload -> '_meta' -> 'actor' ->> 'id') ~ '[^[:space:]]'
                          THEN payload -> '_meta' -> 'actor'
                          ELSE jsonb_build_object('type', 'system', 'id', 'legacy-outbox')
                     END,
                   'correlationId', correlation_id,
                   'causationId',
                     CASE WHEN jsonb_typeof(payload -> '_meta' -> 'causationId') = 'string'
                                AND char_length(payload -> '_meta' ->> 'causationId') BETWEEN 1 AND 255
                                AND (payload -> '_meta' ->> 'causationId') ~ '[^[:space:]]'
                          THEN payload -> '_meta' -> 'causationId'
                          ELSE NULL
                     END
                 )
          )
-- NULL-safety: any comparison on a missing key yields SQL NULL, which would
-- silently skip the row (the exact 0170 defect). The outer COALESCE forces
-- unknown validity to be repaired rather than skipped.
 WHERE NOT (
   COALESCE(
    jsonb_typeof(payload) = 'object'
    AND jsonb_typeof(payload -> 'accountId') = 'string'
    AND char_length(payload ->> 'accountId') BETWEEN 1 AND 255
    AND (payload ->> 'accountId') ~ '[^[:space:]]'
    AND (payload ->> 'accountId') = account_id::text
    AND jsonb_typeof(payload -> '_meta') = 'object'
    AND jsonb_typeof(payload -> '_meta' -> 'eventId') = 'string'
    AND char_length(payload -> '_meta' ->> 'eventId') BETWEEN 1 AND 255
    AND (payload -> '_meta' ->> 'eventId') ~ '[^[:space:]]'
   AND (payload -> '_meta' ->> 'eventId') = id
   AND jsonb_typeof(payload -> '_meta' -> 'eventType') = 'string'
    AND char_length(payload -> '_meta' ->> 'eventType') BETWEEN 1 AND 255
    AND (payload -> '_meta' ->> 'eventType') ~ '[^[:space:]]'
   AND (payload -> '_meta' ->> 'eventType') ~ '^[a-z][a-z0-9]*([._-][a-z0-9]+)*$'
   AND (payload -> '_meta' ->> 'eventType') = event_type
    AND jsonb_typeof(payload -> '_meta' -> 'accountId') = 'string'
    AND char_length(payload -> '_meta' ->> 'accountId') BETWEEN 1 AND 255
    AND (payload -> '_meta' ->> 'accountId') ~ '[^[:space:]]'
    AND (payload -> '_meta' ->> 'accountId') = account_id::text
    AND jsonb_typeof(payload -> '_meta' -> 'sourceModule') = 'string'
    AND char_length(payload -> '_meta' ->> 'sourceModule') BETWEEN 1 AND 255
    AND (payload -> '_meta' ->> 'sourceModule') ~ '[^[:space:]]'
    AND (payload -> '_meta' ->> 'sourceModule') = module_name
    AND jsonb_typeof(payload -> '_meta' -> 'correlationId') = 'string'
    AND char_length(payload -> '_meta' ->> 'correlationId') BETWEEN 1 AND 255
    AND (payload -> '_meta' ->> 'correlationId') ~ '[^[:space:]]'
    AND (payload -> '_meta' ->> 'correlationId') = correlation_id
   AND jsonb_typeof(payload -> '_meta' -> 'actor') = 'object'
   AND (payload -> '_meta' -> 'actor' ->> 'type') IN ('user', 'service', 'system')
   AND jsonb_typeof(payload -> '_meta' -> 'actor' -> 'id') = 'string'
    AND char_length(payload -> '_meta' -> 'actor' ->> 'id') BETWEEN 1 AND 255
    AND (payload -> '_meta' -> 'actor' ->> 'id') ~ '[^[:space:]]'
   AND (
      NOT (payload -> '_meta' ? 'schemaVersion')
      OR CASE WHEN jsonb_typeof(payload -> '_meta' -> 'schemaVersion') = 'number'
              THEN (payload -> '_meta' ->> 'schemaVersion')::numeric BETWEEN 1 AND 1000
                   AND (payload -> '_meta' ->> 'schemaVersion')::numeric
                     = FLOOR((payload -> '_meta' ->> 'schemaVersion')::numeric)
              ELSE FALSE
         END
   )
   AND (
     NOT (payload -> '_meta' ? 'occurredAt')
     OR (
       jsonb_typeof(payload -> '_meta' -> 'occurredAt') = 'string'
        AND (payload -> '_meta' ->> 'occurredAt') ~
           '^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])([T ]([01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9](\.[0-9]+)?)?(Z|[+-]([01][0-9]|2[0-3]):?[0-5][0-9])?)?$'
     )
   )
   AND (
     NOT (payload -> '_meta' ? 'causationId')
     OR jsonb_typeof(payload -> '_meta' -> 'causationId') = 'null'
     OR (
       jsonb_typeof(payload -> '_meta' -> 'causationId') = 'string'
        AND char_length(payload -> '_meta' ->> 'causationId') BETWEEN 1 AND 255
        AND (payload -> '_meta' ->> 'causationId') ~ '[^[:space:]]'
     )
   )
   , FALSE)
  )
   ;

COMMENT ON COLUMN outbox_events.payload IS
  'JSON payload with a protected _meta event envelope. Legacy rows are backfilled by migration 0170, its forward-only correction 0171 (PROD-004/A01) and the full-validity completion 0172 (PROD-004-R1/CP-01).';
