-- Medical record integrity hardening on the canonical migration rail.
-- Prevents cross-account linkage drift between V2 clinical tables.

CREATE OR REPLACE FUNCTION app.enforce_medical_record_integrity()
RETURNS trigger AS $$
DECLARE
  encounter_account_id uuid;
  encounter_patient_id uuid;
  patient_account_id uuid;
BEGIN
  SELECT account_id, patient_id
    INTO encounter_account_id, encounter_patient_id
    FROM encounters
   WHERE id = NEW.encounter_id;

  IF encounter_account_id IS NULL THEN
    RAISE EXCEPTION 'Encounter % not found for medical record %', NEW.encounter_id, NEW.id;
  END IF;

  SELECT account_id
    INTO patient_account_id
    FROM patients
   WHERE id = NEW.patient_id;

  IF patient_account_id IS NULL THEN
    RAISE EXCEPTION 'Patient % not found for medical record %', NEW.patient_id, NEW.id;
  END IF;

  IF NEW.account_id <> encounter_account_id THEN
    RAISE EXCEPTION 'Medical record % account mismatch with encounter %', NEW.id, NEW.encounter_id;
  END IF;

  IF NEW.account_id <> patient_account_id THEN
    RAISE EXCEPTION 'Medical record % account mismatch with patient %', NEW.id, NEW.patient_id;
  END IF;

  IF NEW.patient_id <> encounter_patient_id THEN
    RAISE EXCEPTION 'Medical record % patient mismatch with encounter %', NEW.id, NEW.encounter_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION app.enforce_clinical_entry_integrity()
RETURNS trigger AS $$
DECLARE
  record_account_id uuid;
  record_encounter_id uuid;
  record_patient_id uuid;
  encounter_account_id uuid;
  encounter_patient_id uuid;
  patient_account_id uuid;
BEGIN
  SELECT account_id, encounter_id, patient_id
    INTO record_account_id, record_encounter_id, record_patient_id
    FROM medical_records
   WHERE id = NEW.medical_record_id;

  IF record_account_id IS NULL THEN
    RAISE EXCEPTION 'Medical record % not found for clinical entry %', NEW.medical_record_id, NEW.id;
  END IF;

  SELECT account_id, patient_id
    INTO encounter_account_id, encounter_patient_id
    FROM encounters
   WHERE id = NEW.encounter_id;

  IF encounter_account_id IS NULL THEN
    RAISE EXCEPTION 'Encounter % not found for clinical entry %', NEW.encounter_id, NEW.id;
  END IF;

  SELECT account_id
    INTO patient_account_id
    FROM patients
   WHERE id = NEW.patient_id;

  IF patient_account_id IS NULL THEN
    RAISE EXCEPTION 'Patient % not found for clinical entry %', NEW.patient_id, NEW.id;
  END IF;

  IF NEW.account_id <> record_account_id
     OR NEW.account_id <> encounter_account_id
     OR NEW.account_id <> patient_account_id THEN
    RAISE EXCEPTION 'Clinical entry % account mismatch across linked records', NEW.id;
  END IF;

  IF NEW.encounter_id <> record_encounter_id THEN
    RAISE EXCEPTION 'Clinical entry % encounter mismatch with medical record %', NEW.id, NEW.medical_record_id;
  END IF;

  IF NEW.patient_id <> record_patient_id OR NEW.patient_id <> encounter_patient_id THEN
    RAISE EXCEPTION 'Clinical entry % patient mismatch across linked records', NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION app.enforce_clinical_timeline_integrity()
RETURNS trigger AS $$
DECLARE
  record_account_id uuid;
  record_encounter_id uuid;
  entry_account_id uuid;
  entry_record_id varchar(255);
BEGIN
  SELECT account_id, encounter_id
    INTO record_account_id, record_encounter_id
    FROM medical_records
   WHERE id = NEW.medical_record_id;

  IF record_account_id IS NULL THEN
    RAISE EXCEPTION 'Medical record % not found for timeline event %', NEW.medical_record_id, NEW.id;
  END IF;

  IF NEW.account_id <> record_account_id THEN
    RAISE EXCEPTION 'Timeline event % account mismatch with medical record %', NEW.id, NEW.medical_record_id;
  END IF;

  IF NEW.encounter_id <> record_encounter_id THEN
    RAISE EXCEPTION 'Timeline event % encounter mismatch with medical record %', NEW.id, NEW.medical_record_id;
  END IF;

  IF NEW.clinical_entry_id IS NOT NULL THEN
    SELECT account_id, medical_record_id
      INTO entry_account_id, entry_record_id
      FROM clinical_entries
     WHERE id = NEW.clinical_entry_id;

    IF entry_account_id IS NULL THEN
      RAISE EXCEPTION 'Clinical entry % not found for timeline event %', NEW.clinical_entry_id, NEW.id;
    END IF;

    IF entry_account_id <> NEW.account_id OR entry_record_id <> NEW.medical_record_id THEN
      RAISE EXCEPTION 'Timeline event % clinical entry mismatch across linked records', NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION app.enforce_entry_revision_integrity()
RETURNS trigger AS $$
DECLARE
  entry_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
      FROM clinical_entries
     WHERE id = NEW.entry_id
  )
    INTO entry_exists;

  IF NOT entry_exists THEN
    RAISE EXCEPTION 'Clinical entry % not found for revision %', NEW.entry_id, NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_medical_record_integrity ON medical_records;
CREATE TRIGGER trg_medical_record_integrity
  BEFORE INSERT OR UPDATE ON medical_records
  FOR EACH ROW
  EXECUTE FUNCTION app.enforce_medical_record_integrity();

DROP TRIGGER IF EXISTS trg_clinical_entry_integrity ON clinical_entries;
CREATE TRIGGER trg_clinical_entry_integrity
  BEFORE INSERT OR UPDATE ON clinical_entries
  FOR EACH ROW
  EXECUTE FUNCTION app.enforce_clinical_entry_integrity();

DROP TRIGGER IF EXISTS trg_clinical_timeline_integrity ON clinical_timeline;
CREATE TRIGGER trg_clinical_timeline_integrity
  BEFORE INSERT OR UPDATE ON clinical_timeline
  FOR EACH ROW
  EXECUTE FUNCTION app.enforce_clinical_timeline_integrity();

DROP TRIGGER IF EXISTS trg_entry_revision_integrity ON entry_revisions;
CREATE TRIGGER trg_entry_revision_integrity
  BEFORE INSERT OR UPDATE ON entry_revisions
  FOR EACH ROW
  EXECUTE FUNCTION app.enforce_entry_revision_integrity();
