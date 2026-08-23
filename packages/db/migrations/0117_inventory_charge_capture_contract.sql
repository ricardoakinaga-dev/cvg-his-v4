-- Keep inventory cost and patient-facing charge price as separate domain
-- values. Existing items remain explicitly unpriced until configured.

ALTER TABLE inventory_items
  ADD COLUMN charge_unit_price_amount NUMERIC(12, 2);

ALTER TABLE inventory_items
  ADD CONSTRAINT inventory_items_charge_unit_price_positive_chk
  CHECK (charge_unit_price_amount IS NULL OR charge_unit_price_amount > 0);

-- One inventory consumption is one logical billing source. Extending the
-- allowlist first keeps older writers compatible while enabling retry-safe
-- charge capture in the consuming application version.
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
      'inventory_consumption',
      'prescription'
    )
  );

CREATE UNIQUE INDEX IF NOT EXISTS billing_items_inventory_consumption_source_unique
  ON billing_items (account_id, source_entity_type, source_entity_id)
  WHERE source_entity_type = 'inventory_consumption'
    AND source_entity_id IS NOT NULL;
