-- Keep responsible-person roles explicit in the master registry. Existing rows remain valid;
-- the new role is additive and does not change the one-primary-per-patient invariant.
ALTER TABLE owner_patient_links
  DROP CONSTRAINT IF EXISTS owner_patient_links_relationship_chk;

ALTER TABLE owner_patient_links
  ADD CONSTRAINT owner_patient_links_relationship_chk
  CHECK (relationship IN ('primary', 'secondary', 'financial', 'authorized', 'spouse'));

-- Reassert the invariant after replacing the relationship check constraint.
ALTER TABLE owner_patient_links
  DROP CONSTRAINT IF EXISTS owner_patient_links_primary_consistency_chk;

ALTER TABLE owner_patient_links
  ADD CONSTRAINT owner_patient_links_primary_consistency_chk
  CHECK (is_primary = (relationship = 'primary'));

ALTER TABLE owner_patient_links FORCE ROW LEVEL SECURITY;
