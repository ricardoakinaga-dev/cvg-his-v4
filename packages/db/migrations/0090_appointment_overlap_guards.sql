-- Guards de concorrência para reservas ativas de agenda.

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE appointments
  DROP CONSTRAINT IF EXISTS appointments_practitioner_overlap_excl,
  DROP CONSTRAINT IF EXISTS appointments_patient_overlap_excl,
  DROP CONSTRAINT IF EXISTS appointments_resource_overlap_excl;

ALTER TABLE appointments
  ADD CONSTRAINT appointments_practitioner_overlap_excl
  EXCLUDE USING gist (
    account_id WITH =,
    practitioner_staff_id WITH =,
    tstzrange(start_at, end_at, '[)') WITH &&
  )
  WHERE (
    practitioner_staff_id IS NOT NULL
    AND status NOT IN ('cancelled', 'completed')
  );

ALTER TABLE appointments
  ADD CONSTRAINT appointments_patient_overlap_excl
  EXCLUDE USING gist (
    account_id WITH =,
    patient_id WITH =,
    tstzrange(start_at, end_at, '[)') WITH &&
  )
  WHERE (status NOT IN ('cancelled', 'completed'));

ALTER TABLE appointments
  ADD CONSTRAINT appointments_resource_overlap_excl
  EXCLUDE USING gist (
    account_id WITH =,
    resource_label WITH =,
    tstzrange(start_at, end_at, '[)') WITH &&
  )
  WHERE (
    resource_label IS NOT NULL
    AND status NOT IN ('cancelled', 'completed')
  );

COMMENT ON CONSTRAINT appointments_practitioner_overlap_excl ON appointments IS
  'Prevents two active appointments from reserving the same practitioner interval.';
COMMENT ON CONSTRAINT appointments_patient_overlap_excl ON appointments IS
  'Prevents two active appointments from reserving the same patient interval.';
COMMENT ON CONSTRAINT appointments_resource_overlap_excl ON appointments IS
  'Prevents two active appointments from reserving the same named resource interval.';
