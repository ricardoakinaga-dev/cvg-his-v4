-- AUD-006 persistence: advanced care schema expansion
-- Created: 2026-03-26

ALTER TABLE inpatient_stays ADD COLUMN IF NOT EXISTS discharged_at TIMESTAMP;
ALTER TABLE inpatient_stays ADD COLUMN IF NOT EXISTS discharge_reason VARCHAR(500);
ALTER TABLE inpatient_stays ADD COLUMN IF NOT EXISTS transfer_to_unit VARCHAR(100);
ALTER TABLE inpatient_stays ADD COLUMN IF NOT EXISTS transfer_to_ward VARCHAR(100);
ALTER TABLE inpatient_stays ADD COLUMN IF NOT EXISTS created_at TIMESTAMP;

ALTER TABLE inpatient_progress ADD COLUMN IF NOT EXISTS account_id VARCHAR(255);

ALTER TABLE surgery_cases ADD COLUMN IF NOT EXISTS surgeon_user_id VARCHAR(255);
ALTER TABLE surgery_cases ADD COLUMN IF NOT EXISTS surgical_team JSONB;
ALTER TABLE surgery_cases ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP;
ALTER TABLE surgery_cases ADD COLUMN IF NOT EXISTS started_at TIMESTAMP;
ALTER TABLE surgery_cases ADD COLUMN IF NOT EXISTS ended_at TIMESTAMP;

ALTER TABLE diagnostic_orders ADD COLUMN IF NOT EXISTS exam_catalog_id VARCHAR(255);
ALTER TABLE diagnostic_orders ADD COLUMN IF NOT EXISTS collected_at TIMESTAMP;
ALTER TABLE diagnostic_orders ADD COLUMN IF NOT EXISTS collected_by_user_id VARCHAR(255);
ALTER TABLE diagnostic_orders ADD COLUMN IF NOT EXISTS result_attachment_id VARCHAR(255);
