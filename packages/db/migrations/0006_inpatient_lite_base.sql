DO $$ BEGIN
 CREATE TYPE "public"."inpatient_stay_status" AS ENUM('active', 'discharged', 'transferred');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."shift_handover_status" AS ENUM('draft', 'published');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."shift_period" AS ENUM('day', 'night', 'custom');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."shift_handover_build_status" AS ENUM('pending', 'building', 'ready', 'failed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE "wards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "beds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"ward_id" uuid NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inpatient_stays" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"encounter_id" uuid,
	"ward_id" uuid NOT NULL,
	"bed_id" uuid NOT NULL,
	"status" "inpatient_stay_status" DEFAULT 'active' NOT NULL,
	"admitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"discharged_at" timestamp with time zone,
	"admitted_by_user_id" uuid NOT NULL,
	"discharged_by_user_id" uuid,
	"chief_complaint" text,
	"reason" text,
	"plan_summary" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shift_handovers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"ward_id" uuid NOT NULL,
	"status" "shift_handover_status" DEFAULT 'draft' NOT NULL,
	"shift_date" date NOT NULL,
	"shift_period" "shift_period" DEFAULT 'day' NOT NULL,
	"published_at" timestamp with time zone,
	"published_by_user_id" uuid,
	"build_status" "shift_handover_build_status" DEFAULT 'pending' NOT NULL,
	"build_error" text,
	"document_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shift_handover_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"handover_id" uuid NOT NULL,
	"stay_id" uuid NOT NULL,
	"patient_snapshot_json" jsonb NOT NULL,
	"problems_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"plan_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"critical_meds_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"alerts_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"pending_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"escalation_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "wards" ADD CONSTRAINT "wards_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "beds" ADD CONSTRAINT "beds_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "beds" ADD CONSTRAINT "beds_ward_id_wards_id_fk" FOREIGN KEY ("ward_id") REFERENCES "public"."wards"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "inpatient_stays" ADD CONSTRAINT "inpatient_stays_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "inpatient_stays" ADD CONSTRAINT "inpatient_stays_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "inpatient_stays" ADD CONSTRAINT "inpatient_stays_owner_id_owners_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."owners"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "inpatient_stays" ADD CONSTRAINT "inpatient_stays_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "inpatient_stays" ADD CONSTRAINT "inpatient_stays_ward_id_wards_id_fk" FOREIGN KEY ("ward_id") REFERENCES "public"."wards"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "inpatient_stays" ADD CONSTRAINT "inpatient_stays_bed_id_beds_id_fk" FOREIGN KEY ("bed_id") REFERENCES "public"."beds"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "inpatient_stays" ADD CONSTRAINT "inpatient_stays_admitted_by_user_id_users_id_fk" FOREIGN KEY ("admitted_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "inpatient_stays" ADD CONSTRAINT "inpatient_stays_discharged_by_user_id_users_id_fk" FOREIGN KEY ("discharged_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "shift_handovers" ADD CONSTRAINT "shift_handovers_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "shift_handovers" ADD CONSTRAINT "shift_handovers_ward_id_wards_id_fk" FOREIGN KEY ("ward_id") REFERENCES "public"."wards"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "shift_handovers" ADD CONSTRAINT "shift_handovers_published_by_user_id_users_id_fk" FOREIGN KEY ("published_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "shift_handovers" ADD CONSTRAINT "shift_handovers_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "shift_handover_items" ADD CONSTRAINT "shift_handover_items_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "shift_handover_items" ADD CONSTRAINT "shift_handover_items_handover_id_shift_handovers_id_fk" FOREIGN KEY ("handover_id") REFERENCES "public"."shift_handovers"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "shift_handover_items" ADD CONSTRAINT "shift_handover_items_stay_id_inpatient_stays_id_fk" FOREIGN KEY ("stay_id") REFERENCES "public"."inpatient_stays"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_beds_account_ward_active" ON "beds" USING btree ("account_id","ward_id","is_active");
--> statement-breakpoint
CREATE INDEX "idx_inpatient_stays_account_ward_status" ON "inpatient_stays" USING btree ("account_id","ward_id","status");
--> statement-breakpoint
CREATE INDEX "idx_inpatient_stays_account_bed_status" ON "inpatient_stays" USING btree ("account_id","bed_id","status");
--> statement-breakpoint
CREATE INDEX "idx_shift_handovers_account_ward_shift" ON "shift_handovers" USING btree ("account_id","ward_id","shift_date","shift_period");
--> statement-breakpoint
CREATE INDEX "idx_shift_handover_items_handover_id" ON "shift_handover_items" USING btree ("handover_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "inpatient_stays_active_bed_unique" ON "inpatient_stays" USING btree ("bed_id") WHERE "status" = 'active';
