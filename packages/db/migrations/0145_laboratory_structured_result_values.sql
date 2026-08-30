-- Structured analytical values complement the legacy free-text laboratory summary.
-- Both projections carry the same validated values so legacy and canonical reads
-- remain coherent during the transition.

ALTER TABLE diagnostic_orders
  ADD COLUMN IF NOT EXISTS result_values JSONB;

ALTER TABLE diagnostic_order_workflows
  ADD COLUMN IF NOT EXISTS result_values JSONB;

UPDATE diagnostic_order_workflows AS workflow
   SET result_values = orders.result_values
  FROM diagnostic_orders AS orders
 WHERE workflow.account_id = orders.account_id
   AND workflow.order_id = orders.id
   AND workflow.result_values IS NULL
   AND orders.result_values IS NOT NULL;

ALTER TABLE diagnostic_orders
  DROP CONSTRAINT IF EXISTS diagnostic_orders_result_values_array_chk;
ALTER TABLE diagnostic_orders
  ADD CONSTRAINT diagnostic_orders_result_values_array_chk
  CHECK (result_values IS NULL OR jsonb_typeof(result_values) = 'array');

ALTER TABLE diagnostic_order_workflows
  DROP CONSTRAINT IF EXISTS diagnostic_order_workflows_result_values_array_chk;
ALTER TABLE diagnostic_order_workflows
  ADD CONSTRAINT diagnostic_order_workflows_result_values_array_chk
  CHECK (result_values IS NULL OR jsonb_typeof(result_values) = 'array');

COMMENT ON COLUMN diagnostic_orders.result_values IS
  'Validated structured laboratory parameter values retained beside result_summary.';
COMMENT ON COLUMN diagnostic_order_workflows.result_values IS
  'Validated structured laboratory parameter values for the canonical workflow projection.';
