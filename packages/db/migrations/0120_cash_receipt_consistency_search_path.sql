-- Pin the invoker settlement validator to canonical schemas.
-- Runtime roles intentionally receive EXECUTE on this helper because the
-- deferred receipt trigger calls it.  Its relation names must never resolve
-- through a caller-controlled pg_temp schema.

ALTER FUNCTION app.assert_encounter_cash_receipt_consistent(uuid, boolean)
  SET search_path = pg_catalog, public, app, pg_temp;
