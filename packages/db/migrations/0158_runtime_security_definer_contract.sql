-- Align the PIX redrive capability with the runtime role inspector.
-- Every object reference in the function is schema-qualified, so the app
-- schema does not need to participate in SECURITY DEFINER name resolution.

ALTER FUNCTION app.redrive_pix_provider_event_delivery(UUID, UUID, UUID, TEXT, TEXT)
  SET search_path = pg_catalog, public;
