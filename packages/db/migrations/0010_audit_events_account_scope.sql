ALTER TABLE "audit_events"
ADD COLUMN IF NOT EXISTS "account_id" uuid;
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "audit_events"
 ADD CONSTRAINT "audit_events_account_id_accounts_id_fk"
 FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id")
 ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "audit_events_account_created_at_idx"
ON "audit_events" USING btree ("account_id","created_at");
