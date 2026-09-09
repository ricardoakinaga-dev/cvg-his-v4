-- Bind durable command replays to the principal that created the record.
-- Existing rows remain nullable so the migration is online; the application
-- fails closed for legacy completed rows until they are expired or rebuilt.
ALTER TABLE idempotency_requests
  ADD COLUMN IF NOT EXISTS actor_user_id varchar(255);

COMMENT ON COLUMN idempotency_requests.actor_user_id IS
  'Stable authenticated actor identity that created the command replay record';
