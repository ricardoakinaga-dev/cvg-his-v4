-- Let the tenant-scoped foreign keys report a missing patient before the
-- owner guard evaluates the relationship for an existing patient.

CREATE OR REPLACE FUNCTION app.enforce_encounter_patient_owner()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  patient_owner_id uuid;
BEGIN
  SELECT patient.owner_id
  INTO patient_owner_id
  FROM patients AS patient
  WHERE patient.account_id = NEW.account_id
    AND patient.id = NEW.patient_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  IF patient_owner_id IS DISTINCT FROM NEW.owner_id THEN
    RAISE EXCEPTION 'Encounter owner must be the current primary owner of the patient'
      USING ERRCODE = '23503';
  END IF;

  RETURN NEW;
END;
$$;
