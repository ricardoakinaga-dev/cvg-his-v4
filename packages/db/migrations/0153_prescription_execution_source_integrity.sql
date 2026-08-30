-- Bind prescription executions to their tenant-local clinical source.
-- The execution stores a historical snapshot, while this FK prevents the
-- source prescription from disappearing underneath an audit trail.

CREATE UNIQUE INDEX IF NOT EXISTS idx_clinical_entries_account_id_id
  ON public.clinical_entries (account_id, id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conrelid = 'public.prescription_executions'::regclass
       AND conname = 'prescription_executions_account_clinical_entry_fk'
  ) THEN
    ALTER TABLE public.prescription_executions
      ADD CONSTRAINT prescription_executions_account_clinical_entry_fk
      FOREIGN KEY (account_id, clinical_entry_id)
      REFERENCES public.clinical_entries (account_id, id)
      ON DELETE RESTRICT;
  END IF;
END
$$;

COMMENT ON CONSTRAINT prescription_executions_account_clinical_entry_fk
  ON public.prescription_executions IS
  'Prescription executions retain a tenant-local clinical source and cannot outlive it';
