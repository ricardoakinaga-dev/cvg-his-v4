-- Aligns the clinical timeline attachment link with the active V2 attachments
-- table, whose IDs are varchar and are intentionally not UUIDs.

ALTER TABLE clinical_timeline
  DROP CONSTRAINT IF EXISTS clinical_timeline_attachment_id_fkey;

ALTER TABLE clinical_timeline
  ALTER COLUMN attachment_id TYPE VARCHAR(255)
  USING attachment_id::text;

COMMENT ON COLUMN clinical_timeline.attachment_id IS
  'ID polimorfico do anexo V2 ou documento legado; a autorizacao e validada no servico de anexos.';
