-- Migration 005: Add sectors, beds tables and update inpatient_stays

CREATE TABLE IF NOT EXISTS sectors (
  id VARCHAR(255) PRIMARY KEY,
  account_id VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  kind VARCHAR(50) NOT NULL DEFAULT 'other',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS beds (
  id VARCHAR(255) PRIMARY KEY,
  account_id VARCHAR(255) NOT NULL,
  sector_id VARCHAR(255) NOT NULL REFERENCES sectors(id),
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'available',
  supports_species VARCHAR(100),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

ALTER TABLE inpatient_stays
  ADD COLUMN IF NOT EXISTS sector_id VARCHAR(255);

ALTER TABLE inpatient_stays
  ADD COLUMN IF NOT EXISTS bed_id VARCHAR(255);

ALTER TABLE inpatient_stays
  ADD COLUMN IF NOT EXISTS transfer_to_sector_id VARCHAR(255);

ALTER TABLE inpatient_stays
  ADD COLUMN IF NOT EXISTS transfer_to_bed_id VARCHAR(255);
