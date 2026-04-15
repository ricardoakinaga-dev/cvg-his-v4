-- Onda 3.10: referencia externa canonica para pagamentos de recebiveis

ALTER TABLE encounter_receivable_payments
  ADD COLUMN IF NOT EXISTS external_reference_type VARCHAR(64),
  ADD COLUMN IF NOT EXISTS external_reference_id VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_erp_account_external_reference
  ON encounter_receivable_payments (account_id, external_reference_type, external_reference_id);

COMMENT ON COLUMN encounter_receivable_payments.external_reference_type IS 'Tipo da referencia externa que originou ou conciliou o pagamento do recebivel';
COMMENT ON COLUMN encounter_receivable_payments.external_reference_id IS 'Identificador canonico da referencia externa, por exemplo pix_transactions.transaction_id';

UPDATE encounter_receivable_payments erp
SET
  external_reference_type = 'pix_transaction',
  external_reference_id = pt.transaction_id
FROM pix_transactions pt
WHERE erp.external_reference_id IS NULL
  AND erp.account_id = pt.account_id
  AND erp.notes = CONCAT('PIX settlement ', COALESCE(pt.provider_transaction_id, pt.transaction_id));
