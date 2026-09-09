-- Persist the per-account counter-sale number allocator.
--
-- The allocator is advanced in the same transaction as the sale insert. The
-- primary-key upsert therefore serializes independent API/worker replicas and
-- keeps number allocation independent from a potentially expensive MAX scan.
CREATE TABLE IF NOT EXISTS counter_sale_number_sequences (
  account_id uuid PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  next_number numeric(20, 0) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT counter_sale_number_sequences_next_number_chk
    CHECK (next_number >= 0 AND next_number <= 9007199254740991)
);

-- Seed existing accounts from the authoritative sale ledger before the new
-- allocator is used. Invalid/oversized legacy numbers fail the migration
-- closed instead of silently reusing an identifier.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM counter_sales
     WHERE number IS NULL
        OR CASE
             WHEN number ~ '^CS-[0-9]+$'
               THEN SUBSTRING(number FROM 4)::numeric > 9007199254740991
             ELSE true
           END
  ) THEN
    RAISE EXCEPTION
      'counter_sales contains a malformed or oversized legacy number; refusing to initialize durable sequence';
  END IF;
END $$;

INSERT INTO counter_sale_number_sequences (account_id, next_number)
SELECT account_id,
       COALESCE(
         MAX(
           SUBSTRING(number FROM 4)::numeric
         ),
         0
       )
  FROM counter_sales
 GROUP BY account_id
ON CONFLICT (account_id) DO UPDATE
  SET next_number = GREATEST(
    counter_sale_number_sequences.next_number,
    EXCLUDED.next_number
  ),
      updated_at = clock_timestamp();

ALTER TABLE counter_sale_number_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE counter_sale_number_sequences FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS counter_sale_number_sequences_tenant_isolation
  ON counter_sale_number_sequences;
CREATE POLICY counter_sale_number_sequences_tenant_isolation
  ON counter_sale_number_sequences
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

COMMENT ON TABLE counter_sale_number_sequences IS
  'Durable per-account counter-sale number allocator advanced atomically with the sale ledger';
