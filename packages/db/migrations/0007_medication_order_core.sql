DO $$ BEGIN
 CREATE TYPE "public"."medication_order_status" AS ENUM('active', 'stopped');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."medication_order_schedule_type" AS ENUM('interval', 'fixed_times');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
CREATE TYPE "public"."medication_administration_status" AS ENUM('administered', 'refused', 'delayed', 'held');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE "medication_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"encounter_id" uuid,
	"stay_id" uuid,
	"patient_id" uuid NOT NULL,
	"medication_name" text NOT NULL,
	"dose_value" numeric(12, 4) NOT NULL,
	"dose_unit" text NOT NULL,
	"route" text NOT NULL,
	"frequency_type" text NOT NULL,
	"duration_value" integer,
	"duration_unit" text,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone,
	"status" "medication_order_status" DEFAULT 'active' NOT NULL,
	"stop_reason" text,
	"created_by_user_id" uuid NOT NULL,
	"stopped_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "medication_order_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"schedule_type" "medication_order_schedule_type" NOT NULL,
	"interval_minutes" integer,
	"times_json" jsonb,
	"next_due_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "medication_administrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"stay_id" uuid,
	"encounter_id" uuid,
	"scheduled_for" timestamp with time zone NOT NULL,
	"administered_at" timestamp with time zone,
	"status" "medication_administration_status" NOT NULL,
	"reason" text,
	"administered_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "medication_administrations_reason_required_chk" CHECK (
		(
			"status" = 'administered'
			and "reason" is null
		)
		or (
			"status" in ('refused', 'delayed')
			and "reason" is not null
			and length(btrim("reason")) > 0
		)
	)
);
--> statement-breakpoint
ALTER TABLE "medication_orders" ADD CONSTRAINT "medication_orders_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "medication_orders" ADD CONSTRAINT "medication_orders_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "medication_orders" ADD CONSTRAINT "medication_orders_stay_id_inpatient_stays_id_fk" FOREIGN KEY ("stay_id") REFERENCES "public"."inpatient_stays"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "medication_orders" ADD CONSTRAINT "medication_orders_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "medication_orders" ADD CONSTRAINT "medication_orders_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "medication_orders" ADD CONSTRAINT "medication_orders_stopped_by_user_id_users_id_fk" FOREIGN KEY ("stopped_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "medication_order_schedules" ADD CONSTRAINT "medication_order_schedules_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "medication_order_schedules" ADD CONSTRAINT "medication_order_schedules_order_id_medication_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."medication_orders"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "medication_administrations" ADD CONSTRAINT "medication_administrations_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "medication_administrations" ADD CONSTRAINT "medication_administrations_order_id_medication_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."medication_orders"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "medication_administrations" ADD CONSTRAINT "medication_administrations_stay_id_inpatient_stays_id_fk" FOREIGN KEY ("stay_id") REFERENCES "public"."inpatient_stays"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "medication_administrations" ADD CONSTRAINT "medication_administrations_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "medication_administrations" ADD CONSTRAINT "medication_administrations_administered_by_user_id_users_id_fk" FOREIGN KEY ("administered_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_medication_orders_account_stay_status" ON "medication_orders" USING btree ("account_id","stay_id","status");
--> statement-breakpoint
CREATE INDEX "idx_medication_orders_account_encounter_status" ON "medication_orders" USING btree ("account_id","encounter_id","status");
--> statement-breakpoint
CREATE INDEX "idx_medication_orders_patient_status" ON "medication_orders" USING btree ("patient_id","status");
--> statement-breakpoint
CREATE INDEX "idx_medication_order_schedules_order_id" ON "medication_order_schedules" USING btree ("order_id");
--> statement-breakpoint
CREATE INDEX "idx_medication_order_schedules_next_due_at" ON "medication_order_schedules" USING btree ("next_due_at");
--> statement-breakpoint
CREATE INDEX "idx_medication_administrations_order_scheduled" ON "medication_administrations" USING btree ("order_id","scheduled_for");
--> statement-breakpoint
CREATE INDEX "idx_medication_administrations_account_stay_scheduled" ON "medication_administrations" USING btree ("account_id","stay_id","scheduled_for");
--> statement-breakpoint
CREATE UNIQUE INDEX "uq_medication_administrations_order_slot" ON "medication_administrations" USING btree ("order_id","scheduled_for");
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "public"."enforce_active_medication_order_for_administration"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_status text;
  v_account_id uuid;
BEGIN
  SELECT mo.status::text, mo.account_id
  INTO v_status, v_account_id
  FROM medication_orders mo
  WHERE mo.id = NEW.order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Medication order % not found', NEW.order_id USING ERRCODE = '23503';
  END IF;

  IF v_account_id <> NEW.account_id THEN
    RAISE EXCEPTION 'Medication order/account mismatch for order %', NEW.order_id USING ERRCODE = '23514';
  END IF;

  IF v_status <> 'active' THEN
    RAISE EXCEPTION 'Cannot administer medication for non-active order %', NEW.order_id USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS "trg_medication_administrations_require_active_order" ON "medication_administrations";
--> statement-breakpoint
CREATE TRIGGER "trg_medication_administrations_require_active_order"
BEFORE INSERT ON "medication_administrations"
FOR EACH ROW
EXECUTE FUNCTION "public"."enforce_active_medication_order_for_administration"();

