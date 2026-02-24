ALTER TABLE "medication_administrations" ADD COLUMN IF NOT EXISTS "effective_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "medication_administrations" ADD COLUMN IF NOT EXISTS "delayed_until" timestamp with time zone;
--> statement-breakpoint
UPDATE "medication_administrations"
SET "effective_at" = "administered_at"
WHERE "status" = 'administered'
  AND "effective_at" IS NULL
  AND "administered_at" IS NOT NULL;
--> statement-breakpoint
UPDATE "medication_administrations"
SET "delayed_until" = "scheduled_for"
WHERE "status" = 'delayed'
  AND "delayed_until" IS NULL;
--> statement-breakpoint
ALTER TABLE "medication_administrations"
DROP CONSTRAINT IF EXISTS "medication_administrations_reason_required_chk";
--> statement-breakpoint
ALTER TABLE "medication_administrations"
ADD CONSTRAINT "medication_administrations_reason_required_chk" CHECK (
  (
    "status" = 'administered'
    AND "reason" IS NULL
    AND "effective_at" IS NOT NULL
    AND "delayed_until" IS NULL
  )
  OR (
    "status" = 'delayed'
    AND "reason" IS NOT NULL
    AND length(btrim("reason")) > 0
    AND "effective_at" IS NULL
    AND "delayed_until" IS NOT NULL
  )
  OR (
    "status" IN ('refused', 'held')
    AND "reason" IS NOT NULL
    AND length(btrim("reason")) > 0
    AND "effective_at" IS NULL
    AND "delayed_until" IS NULL
  )
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_medication_administrations_account_order_delayed_until"
  ON "medication_administrations" USING btree ("account_id", "order_id", "delayed_until");
