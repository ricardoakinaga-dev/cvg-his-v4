-- Make the inpatient -> billing boundary safe to retry.
-- A daily charge is one logical source item; replaying the billing request must
-- return the existing item instead of creating a second financial line.

ALTER TABLE billing_items
  DROP CONSTRAINT IF EXISTS billing_items_source_type_chk;

ALTER TABLE billing_items
  ADD CONSTRAINT billing_items_source_type_chk CHECK (
    source_entity_type IS NULL
    OR source_entity_type IN (
      'encounter',
      'diagnostic_order',
      'surgery_case',
      'inpatient_stay',
      'inpatient_daily_charge',
      'prescription'
    )
  );

CREATE UNIQUE INDEX IF NOT EXISTS billing_items_inpatient_daily_charge_source_unique
  ON billing_items (account_id, source_entity_type, source_entity_id)
  WHERE source_entity_type = 'inpatient_daily_charge'
    AND source_entity_id IS NOT NULL;
