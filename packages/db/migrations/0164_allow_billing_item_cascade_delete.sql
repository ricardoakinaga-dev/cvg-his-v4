-- 0164_allow_billing_item_cascade_delete.sql
-- Permit the billing-item child delete emitted by an ON DELETE CASCADE after
-- its billing-record parent has already been removed. Direct mutations remain
-- fail-closed when a reservation exists or when a non-delete mutation points
-- to a missing billing record.

CREATE OR REPLACE FUNCTION app.guard_reserved_billing_item_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  target_account_id UUID;
  target_billing_record_id TEXT;
  reserved_attempt_id UUID;
BEGIN
  target_account_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.account_id ELSE NEW.account_id END;
  target_billing_record_id := CASE
    WHEN TG_OP = 'DELETE' THEN OLD.billing_record_id
    ELSE NEW.billing_record_id
  END;

  SELECT active_payment_attempt_id
    INTO reserved_attempt_id
    FROM billing_records
   WHERE account_id = target_account_id
     AND id = target_billing_record_id
   FOR UPDATE;

  IF NOT FOUND THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'PIX_PAYMENT_RESERVATION_BILLING_MISMATCH';
  END IF;

  IF reserved_attempt_id IS NOT NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'BILLING_PAYMENT_RESERVED';
  END IF;

  IF TG_OP = 'UPDATE'
     AND (
       OLD.account_id IS DISTINCT FROM NEW.account_id
       OR OLD.billing_record_id IS DISTINCT FROM NEW.billing_record_id
     ) THEN
    SELECT active_payment_attempt_id
      INTO reserved_attempt_id
      FROM billing_records
     WHERE account_id = OLD.account_id
       AND id = OLD.billing_record_id
     FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'PIX_PAYMENT_RESERVATION_BILLING_MISMATCH';
    END IF;
    IF reserved_attempt_id IS NOT NULL THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'BILLING_PAYMENT_RESERVED';
    END IF;
  END IF;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;
