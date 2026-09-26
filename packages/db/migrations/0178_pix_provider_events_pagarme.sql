-- R2-PAY-01: encounter PIX attempts may be dispatched to Pagar.me. Provider
-- confirmations are only ingested after the API re-reads the charge from the
-- provider with its own credentials, so the receipt table now accepts the
-- external provider key next to the local synthetic one.
ALTER TABLE pix_provider_events
  DROP CONSTRAINT IF EXISTS pix_provider_events_provider_chk;
ALTER TABLE pix_provider_events
  ADD CONSTRAINT pix_provider_events_provider_chk
  CHECK (provider IN ('local-pix', 'pagarme'));
