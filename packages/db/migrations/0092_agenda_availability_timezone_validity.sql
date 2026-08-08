ALTER TABLE professional_availability
  ADD COLUMN IF NOT EXISTS timezone varchar(64) NOT NULL DEFAULT 'America/Sao_Paulo';

ALTER TABLE professional_availability
  ADD COLUMN IF NOT EXISTS effective_from date;

ALTER TABLE professional_availability
  ADD COLUMN IF NOT EXISTS effective_until date;

ALTER TABLE professional_availability
  DROP CONSTRAINT IF EXISTS professional_availability_validity_ck;

ALTER TABLE professional_availability
  ADD CONSTRAINT professional_availability_validity_ck
  CHECK (effective_until IS NULL OR effective_from IS NULL OR effective_until >= effective_from);

CREATE INDEX IF NOT EXISTS idx_prof_avail_account_validity
  ON professional_availability (account_id, effective_from, effective_until);
