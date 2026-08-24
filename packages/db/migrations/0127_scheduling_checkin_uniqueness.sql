-- A check-in is a single active queue ownership decision for an appointment.
-- Refuse deployment when legacy data already violates that invariant so an
-- operator can reconcile the duplicates explicitly instead of losing history.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM scheduling_queue_entries
     WHERE appointment_id IS NOT NULL
       AND status NOT IN ('completed', 'cancelled')
     GROUP BY account_id, appointment_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Cannot create active appointment check-in uniqueness index: duplicate active queue entries exist';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS scheduling_queue_entries_active_appointment_unique
  ON scheduling_queue_entries (account_id, appointment_id)
 WHERE appointment_id IS NOT NULL
   AND status NOT IN ('completed', 'cancelled');
