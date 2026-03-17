DO $$ BEGIN
 CREATE TYPE "public"."alert_type" AS ENUM('medication_delay');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."alert_severity" AS ENUM('low', 'medium', 'high');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE "alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"type" "alert_type" NOT NULL,
	"stay_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"scheduled_for" timestamp with time zone NOT NULL,
	"severity" "alert_severity" NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_stay_id_inpatient_stays_id_fk" FOREIGN KEY ("stay_id") REFERENCES "public"."inpatient_stays"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_order_id_medication_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."medication_orders"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_alerts_account_type_created" ON "alerts" USING btree ("account_id","type","created_at");
--> statement-breakpoint
CREATE INDEX "idx_alerts_account_stay_type_created" ON "alerts" USING btree ("account_id","stay_id","type","created_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "uq_alerts_order_slot_type" ON "alerts" USING btree ("order_id","scheduled_for","type");
