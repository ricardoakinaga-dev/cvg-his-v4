-- Bind inpatient inventory consumption references to the tenant and encounter
-- at the database boundary. This complements the HTTP validation so direct SQL,
-- workers and stale replicas cannot create orphan or cross-encounter charges.

CREATE OR REPLACE FUNCTION app.reject_inpatient_child_after_discharge()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  stay_id_text text;
  account_id_text text;
  encounter_id_text text;
  stay_encounter_id_text text;
  stay_status text;
  stay_discharged_at timestamptz;
BEGIN
  account_id_text := to_jsonb(NEW) ->> 'account_id';
  IF TG_TABLE_NAME = 'inventory_consumptions' THEN
    IF (to_jsonb(NEW) ->> 'source_entity_type') <> 'inpatient_stay' THEN
      RETURN NEW;
    END IF;
    stay_id_text := to_jsonb(NEW) ->> 'source_entity_id';
    encounter_id_text := to_jsonb(NEW) ->> 'encounter_id';
  ELSE
    stay_id_text := to_jsonb(NEW) ->> 'stay_id';
  END IF;

  SELECT status::text, discharged_at, encounter_id::text
    INTO stay_status, stay_discharged_at, stay_encounter_id_text
    FROM inpatient_stays
   WHERE account_id::text = account_id_text
     AND id::text = stay_id_text
   FOR SHARE;

  IF stay_status IS NULL THEN
    RAISE EXCEPTION 'Inpatient stay not found for child record'
      USING ERRCODE = '23503',
            DETAIL = format('account_id=%s stay_id=%s', account_id_text, stay_id_text);
  END IF;

  IF TG_TABLE_NAME = 'inventory_consumptions'
     AND stay_encounter_id_text IS DISTINCT FROM encounter_id_text THEN
    RAISE EXCEPTION 'Inventory consumption stay does not match encounter'
      USING ERRCODE = '23514',
            DETAIL = format(
              'stay_id=%s stay_encounter_id=%s encounter_id=%s',
              stay_id_text,
              stay_encounter_id_text,
              encounter_id_text
            );
  END IF;

  IF stay_status = 'discharged' OR stay_discharged_at IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot append inpatient data after discharge'
      USING ERRCODE = 'P0001',
            DETAIL = format('stay_id=%s', stay_id_text);
  END IF;

  RETURN NEW;
END;
$$;
