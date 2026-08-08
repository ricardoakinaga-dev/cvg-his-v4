-- Preventive care parity: keep protocol, lot and next-dose metadata structured.

ALTER TABLE preventive_events
  ADD COLUMN IF NOT EXISTS protocol_code VARCHAR(120),
  ADD COLUMN IF NOT EXISTS lot_number VARCHAR(120),
  ADD COLUMN IF NOT EXISTS next_dose_date DATE;

ALTER TABLE preventive_events
  DROP CONSTRAINT IF EXISTS preventive_events_protocol_code_len_chk,
  ADD CONSTRAINT preventive_events_protocol_code_len_chk CHECK (
    protocol_code IS NULL OR char_length(protocol_code) <= 120
  ),
  DROP CONSTRAINT IF EXISTS preventive_events_lot_number_len_chk,
  ADD CONSTRAINT preventive_events_lot_number_len_chk CHECK (
    lot_number IS NULL OR char_length(lot_number) <= 120
  );

CREATE INDEX IF NOT EXISTS idx_preventive_events_account_protocol
  ON preventive_events (account_id, protocol_code);

COMMENT ON COLUMN preventive_events.protocol_code IS
  'Codigo do protocolo preventivo aplicado ou programado.';
COMMENT ON COLUMN preventive_events.lot_number IS
  'Lote informado para rastreabilidade da vacina ou produto preventivo.';
COMMENT ON COLUMN preventive_events.next_dose_date IS
  'Proxima dose definida no momento da execucao do evento.';
