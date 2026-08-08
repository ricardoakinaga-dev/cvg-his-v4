-- Prevent concurrent or out-of-band writes from creating overlapping active staff absences.

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE staff_time_off
  DROP CONSTRAINT IF EXISTS staff_time_off_scheduled_overlap_excl;

ALTER TABLE staff_time_off
  ADD CONSTRAINT staff_time_off_scheduled_overlap_excl
  EXCLUDE USING gist (
    account_id WITH =,
    staff_id WITH =,
    tstzrange(starts_at, ends_at, '[)') WITH &&
  )
  WHERE (status = 'scheduled');

COMMENT ON CONSTRAINT staff_time_off_scheduled_overlap_excl ON staff_time_off IS
  'A staff member cannot have two overlapping scheduled absences in the same tenant.';
