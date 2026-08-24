-- Pin the PIX non-cash receipt consistency helper to canonical schemas.
-- The deferred trigger executes while the worker role is active, so its
-- relation resolution must not depend on a caller-controlled search_path.

ALTER FUNCTION app.assert_encounter_non_cash_receipt_consistent(uuid)
  SET search_path = pg_catalog, public, app, pg_temp;
