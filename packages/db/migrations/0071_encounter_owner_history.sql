-- Validate ownership when an encounter is linked without coupling historical rows
-- to future changes of the patient's primary owner.

ALTER TABLE encounters
  DROP CONSTRAINT encounters_account_patient_owner_fk;

CREATE OR REPLACE FUNCTION app.enforce_encounter_patient_owner()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM patients AS patient
    WHERE patient.account_id = NEW.account_id
      AND patient.id = NEW.patient_id
      AND patient.owner_id = NEW.owner_id
  ) THEN
    RAISE EXCEPTION 'Encounter owner must be the current primary owner of the patient'
      USING ERRCODE = '23503';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS encounters_patient_owner_guard ON encounters;
CREATE TRIGGER encounters_patient_owner_guard
BEFORE INSERT OR UPDATE OF account_id, patient_id, owner_id
ON encounters
FOR EACH ROW
EXECUTE FUNCTION app.enforce_encounter_patient_owner();
