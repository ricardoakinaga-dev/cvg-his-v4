-- Enforce the clinical invariant that a patient has at most one non-closed
-- encounter within an account. Existing ambiguity must be remediated by an
-- explicitly approved operator before this index can be installed.

DO $$
DECLARE
  existing_index regclass;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.encounters
    WHERE status <> 'closed'
    GROUP BY account_id, patient_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Cannot enforce one active encounter per patient: historical duplicate active encounters exist';
  END IF;

  SELECT to_regclass('public.uidx_encounters_one_active_per_patient') INTO existing_index;
  IF existing_index IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM pg_index AS index_record
    INNER JOIN pg_class AS table_record
      ON table_record.oid = index_record.indrelid
    INNER JOIN pg_namespace AS table_namespace
      ON table_namespace.oid = table_record.relnamespace
    WHERE index_record.indexrelid = existing_index
      AND table_namespace.nspname = 'public'
      AND table_record.relname = 'encounters'
      AND index_record.indisunique
      AND index_record.indisvalid
      AND index_record.indisready
      AND index_record.indnkeyatts = 2
      AND index_record.indnatts = 2
      AND ARRAY(
        SELECT attribute_record.attname::text
        FROM unnest(index_record.indkey) WITH ORDINALITY AS key_column(attnum, ordinality)
        INNER JOIN pg_attribute AS attribute_record
          ON attribute_record.attrelid = index_record.indrelid
         AND attribute_record.attnum = key_column.attnum
        ORDER BY key_column.ordinality
      ) = ARRAY['account_id', 'patient_id']::text[]
      AND pg_get_expr(index_record.indpred, index_record.indrelid) =
        '(status <> ''closed''::encounter_status)'
  ) THEN
    RAISE EXCEPTION
      'Cannot reuse uidx_encounters_one_active_per_patient: existing index definition is incompatible';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uidx_encounters_one_active_per_patient
  ON public.encounters(account_id, patient_id)
  WHERE status <> 'closed';
