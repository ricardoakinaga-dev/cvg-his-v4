-- Scope card idempotency to the owning account.
-- A provider/intent identifier is only authoritative inside its tenant; a
-- global primary key could silently discard the same identifier for another
-- account through the repository's idempotent INSERT.

ALTER TABLE card_transactions
  DROP CONSTRAINT IF EXISTS card_transactions_pkey;

ALTER TABLE card_transactions
  ADD CONSTRAINT card_transactions_pkey PRIMARY KEY (account_id, transaction_id);

DROP INDEX IF EXISTS idx_card_transactions_account_transaction_unique;
