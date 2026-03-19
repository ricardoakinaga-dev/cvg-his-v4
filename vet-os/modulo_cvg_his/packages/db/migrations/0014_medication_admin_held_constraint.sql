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
