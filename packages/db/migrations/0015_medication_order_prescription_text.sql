ALTER TABLE "medication_orders"
ADD COLUMN IF NOT EXISTS "prescription_text" text;
