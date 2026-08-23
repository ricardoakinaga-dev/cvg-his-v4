ALTER TABLE encounters
  ADD COLUMN IF NOT EXISTS close_reason text;

ALTER TABLE encounters
  DROP CONSTRAINT IF EXISTS encounters_close_reason_length_check;

ALTER TABLE encounters
  ADD CONSTRAINT encounters_close_reason_length_check
  CHECK (close_reason IS NULL OR char_length(close_reason) BETWEEN 1 AND 500);
