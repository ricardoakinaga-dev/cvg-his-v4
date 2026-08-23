-- Freeze new inpatient clinical and billable actions at the database boundary.
-- The application service already rejects these writes from its in-memory state;
-- this trigger keeps direct SQL, workers and a stale API replica from reopening
-- the clinical/financial stream after discharge.

CREATE OR REPLACE FUNCTION app.reject_inpatient_child_after_discharge()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  stay_id_text text;
  account_id_text text;
  stay_status text;
  stay_discharged_at timestamptz;
BEGIN
  account_id_text := to_jsonb(NEW) ->> 'account_id';
  IF TG_TABLE_NAME = 'inventory_consumptions' THEN
    IF (to_jsonb(NEW) ->> 'source_entity_type') <> 'inpatient_stay' THEN
      RETURN NEW;
    END IF;
    stay_id_text := to_jsonb(NEW) ->> 'source_entity_id';
  ELSE
    stay_id_text := to_jsonb(NEW) ->> 'stay_id';
  END IF;

  SELECT status::text, discharged_at
    INTO stay_status, stay_discharged_at
   FROM inpatient_stays
   WHERE account_id::text = account_id_text
     AND id::text = stay_id_text
   FOR SHARE;

  IF stay_status = 'discharged' OR stay_discharged_at IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot append inpatient data after discharge'
      USING ERRCODE = 'P0001',
            DETAIL = format('stay_id=%s', stay_id_text);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS inpatient_progress_discharge_cutoff ON inpatient_progress;
CREATE TRIGGER inpatient_progress_discharge_cutoff
  BEFORE INSERT ON inpatient_progress
  FOR EACH ROW EXECUTE FUNCTION app.reject_inpatient_child_after_discharge();

DROP TRIGGER IF EXISTS inpatient_occurrences_discharge_cutoff ON inpatient_occurrences;
CREATE TRIGGER inpatient_occurrences_discharge_cutoff
  BEFORE INSERT ON inpatient_occurrences
  FOR EACH ROW EXECUTE FUNCTION app.reject_inpatient_child_after_discharge();

DROP TRIGGER IF EXISTS inpatient_daily_charges_discharge_cutoff ON inpatient_daily_charges;
CREATE TRIGGER inpatient_daily_charges_discharge_cutoff
  BEFORE INSERT ON inpatient_daily_charges
  FOR EACH ROW EXECUTE FUNCTION app.reject_inpatient_child_after_discharge();

DROP TRIGGER IF EXISTS inventory_consumptions_discharge_cutoff ON inventory_consumptions;
CREATE TRIGGER inventory_consumptions_discharge_cutoff
  BEFORE INSERT ON inventory_consumptions
  FOR EACH ROW EXECUTE FUNCTION app.reject_inpatient_child_after_discharge();
