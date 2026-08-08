-- Reconcile the canonical inpatient table with the operational admission model.

DROP INDEX IF EXISTS inpatient_stays_active_bed_unique;

ALTER TABLE inpatient_stays
  ALTER COLUMN status DROP DEFAULT;

ALTER TABLE inpatient_stays
  ALTER COLUMN status TYPE varchar(50)
  USING CASE WHEN status::text = 'active' THEN 'admitted' ELSE status::text END;

ALTER TABLE inpatient_stays
  ALTER COLUMN status SET DEFAULT 'admitted',
  ALTER COLUMN ward_id DROP NOT NULL,
  ALTER COLUMN bed_id DROP NOT NULL;

ALTER TABLE inpatient_stays
  ADD COLUMN unit varchar(100),
  ADD COLUMN ward varchar(100),
  ADD COLUMN bed varchar(50),
  ADD COLUMN sector_id varchar(255),
  ADD COLUMN discharge_reason varchar(500),
  ADD COLUMN transfer_to_unit varchar(100),
  ADD COLUMN transfer_to_ward varchar(100),
  ADD COLUMN transfer_to_sector_id varchar(255),
  ADD COLUMN transfer_to_bed_id uuid;

UPDATE inpatient_stays AS stay
SET unit = COALESCE(stay.unit, 'Internacao'),
    ward = COALESCE(stay.ward, ward.name, 'Sem ala'),
    bed = COALESCE(stay.bed, bed.code, bed.name, 'Sem leito'),
    sector_id = COALESCE(stay.sector_id, bed.sector_id)
FROM beds AS bed
LEFT JOIN wards AS ward ON ward.id = bed.ward_id
WHERE stay.bed_id = bed.id;

UPDATE inpatient_stays
SET unit = COALESCE(unit, 'Internacao'),
    ward = COALESCE(ward, 'Sem ala'),
    bed = COALESCE(bed, 'Sem leito');

ALTER TABLE inpatient_stays
  ALTER COLUMN unit SET NOT NULL,
  ALTER COLUMN ward SET NOT NULL,
  ALTER COLUMN bed SET NOT NULL,
  ADD CONSTRAINT inpatient_stays_runtime_status_chk
    CHECK (status IN ('admitted', 'stable', 'transferred', 'discharged')),
  ADD CONSTRAINT inpatient_stays_runtime_labels_chk
    CHECK (
      length(btrim(unit)) > 0
      AND length(btrim(ward)) > 0
      AND length(btrim(bed)) > 0
    ),
  ADD CONSTRAINT inpatient_stays_transfer_bed_fk
    FOREIGN KEY (transfer_to_bed_id) REFERENCES beds(id) ON DELETE SET NULL;

CREATE INDEX idx_inpatient_stays_account_patient_admitted
  ON inpatient_stays(account_id, patient_id, admitted_at DESC);

CREATE UNIQUE INDEX inpatient_stays_active_bed_unique
  ON inpatient_stays(bed_id)
  WHERE status IN ('admitted', 'stable');
