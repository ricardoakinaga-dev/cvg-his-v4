CREATE TYPE "public"."alert_severity" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."alert_type" AS ENUM('medication_delay', 'dose_refused_needs_review');--> statement-breakpoint
CREATE TYPE "public"."clinical_note_status" AS ENUM('draft', 'signed');--> statement-breakpoint
CREATE TYPE "public"."clinical_note_type" AS ENUM('SOAP');--> statement-breakpoint
CREATE TYPE "public"."encounter_status" AS ENUM('open', 'closed');--> statement-breakpoint
CREATE TYPE "public"."inpatient_stay_status" AS ENUM('active', 'discharged', 'transferred');--> statement-breakpoint
CREATE TYPE "public"."medication_administration_status" AS ENUM('administered', 'refused', 'delayed', 'held');--> statement-breakpoint
CREATE TYPE "public"."medication_order_schedule_type" AS ENUM('interval', 'fixed_times');--> statement-breakpoint
CREATE TYPE "public"."medication_order_status" AS ENUM('active', 'stopped');--> statement-breakpoint
CREATE TYPE "public"."shift_handover_build_status" AS ENUM('pending', 'building', 'ready', 'failed');--> statement-breakpoint
CREATE TYPE "public"."shift_handover_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TYPE "public"."shift_period" AS ENUM('day', 'night', 'custom');--> statement-breakpoint
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
CREATE TABLE "clinical_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"encounter_id" uuid NOT NULL,
	"type" "clinical_note_type" DEFAULT 'SOAP' NOT NULL,
	"status" "clinical_note_status" DEFAULT 'draft' NOT NULL,
	"version_number" integer DEFAULT 1 NOT NULL,
	"signed_at" timestamp with time zone,
	"signed_by_user_id" uuid,
	"created_by_user_id" uuid NOT NULL,
	"updated_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clinical_note_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"note_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"soap_json" jsonb NOT NULL,
	"reason" text,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"storage_key" text NOT NULL,
	"filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "encounter_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"encounter_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"attached_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "encounters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"status" "encounter_status" DEFAULT 'open' NOT NULL,
	"opened_by_user_id" uuid NOT NULL,
	"closed_by_user_id" uuid,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	"reason" text,
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
CREATE TABLE "medication_administrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"stay_id" uuid,
	"encounter_id" uuid,
	"scheduled_for" timestamp with time zone NOT NULL,
	"administered_at" timestamp with time zone,
	"effective_at" timestamp with time zone,
	"delayed_until" timestamp with time zone,
	"status" "medication_administration_status" NOT NULL,
	"reason" text,
	"administered_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "medication_administrations_reason_required_chk" CHECK ((
        ("medication_administrations"."status" = 'administered' and "medication_administrations"."reason" is null and "medication_administrations"."effective_at" is not null and "medication_administrations"."delayed_until" is null)
        or
        ("medication_administrations"."status" = 'delayed' and "medication_administrations"."reason" is not null and length(btrim("medication_administrations"."reason")) > 0 and "medication_administrations"."delayed_until" is not null and "medication_administrations"."effective_at" is null)
        or
        ("medication_administrations"."status" in ('refused', 'held') and "medication_administrations"."reason" is not null and length(btrim("medication_administrations"."reason")) > 0 and "medication_administrations"."delayed_until" is null and "medication_administrations"."effective_at" is null)
      ))
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
CREATE TABLE "patients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"unit_id" uuid,
	"owner_id" uuid NOT NULL,
	"name" text NOT NULL,
	"species" text NOT NULL,
	"breed" text,
	"sex" text,
	"birth_date" date,
	"weight_kg" numeric(10, 3),
	"microchip" text,
	"alerts_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "protocol_references" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"protocol_id" uuid NOT NULL,
	"ref_type" text NOT NULL,
	"title" text,
	"url" text,
	"source_id" text,
	"score" numeric(10, 6),
	"metadata_json" jsonb,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "protocol_references_ref_type_chk" CHECK ("protocol_references"."ref_type" in ('qdrant_chunk', 'url', 'pdf', 'doi', 'book'))
);
--> statement-breakpoint
CREATE TABLE "protocol_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"protocol_id" uuid NOT NULL,
	"version_id" uuid NOT NULL,
	"snapshot_json" jsonb NOT NULL,
	"snapshot_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "protocol_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"protocol_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"content_json" jsonb NOT NULL,
	"change_reason" text,
	"published_at" timestamp with time zone,
	"published_by_user_id" uuid,
	"build_error" text,
	"created_by_user_id" uuid NOT NULL,
	"updated_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "protocol_versions_status_chk" CHECK ("protocol_versions"."status" in ('draft', 'publishing', 'published', 'failed')),
	CONSTRAINT "protocol_versions_version_number_positive_chk" CHECK ("protocol_versions"."version_number" > 0)
);
--> statement-breakpoint
CREATE TABLE "protocols" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"domain" text,
	"specialty" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"current_published_version_id" uuid,
	"created_by_user_id" uuid NOT NULL,
	"updated_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "protocols_status_chk" CHECK ("protocols"."status" in ('draft', 'published'))
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
DROP INDEX "owners_account_document_unique";--> statement-breakpoint
DROP INDEX "owners_account_name_idx";--> statement-breakpoint
ALTER TABLE "owners" ALTER COLUMN "full_name" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "owners" ALTER COLUMN "document" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "owners" ALTER COLUMN "document" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "owners" ALTER COLUMN "email" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "audit_events" ADD COLUMN "account_id" uuid;--> statement-breakpoint
ALTER TABLE "owners" ADD COLUMN "unit_id" uuid;--> statement-breakpoint
ALTER TABLE "owners" ADD COLUMN "phone_main" text;--> statement-breakpoint
ALTER TABLE "owners" ADD COLUMN "phone_alt" text;--> statement-breakpoint
ALTER TABLE "owners" ADD COLUMN "address_json" jsonb;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_stay_id_inpatient_stays_id_fk" FOREIGN KEY ("stay_id") REFERENCES "public"."inpatient_stays"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_order_id_medication_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."medication_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beds" ADD CONSTRAINT "beds_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beds" ADD CONSTRAINT "beds_ward_id_wards_id_fk" FOREIGN KEY ("ward_id") REFERENCES "public"."wards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_signed_by_user_id_users_id_fk" FOREIGN KEY ("signed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_note_versions" ADD CONSTRAINT "clinical_note_versions_note_id_clinical_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."clinical_notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_note_versions" ADD CONSTRAINT "clinical_note_versions_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounter_documents" ADD CONSTRAINT "encounter_documents_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounter_documents" ADD CONSTRAINT "encounter_documents_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounter_documents" ADD CONSTRAINT "encounter_documents_attached_by_user_id_users_id_fk" FOREIGN KEY ("attached_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_owner_id_owners_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."owners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_opened_by_user_id_users_id_fk" FOREIGN KEY ("opened_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_closed_by_user_id_users_id_fk" FOREIGN KEY ("closed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inpatient_stays" ADD CONSTRAINT "inpatient_stays_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inpatient_stays" ADD CONSTRAINT "inpatient_stays_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inpatient_stays" ADD CONSTRAINT "inpatient_stays_owner_id_owners_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."owners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inpatient_stays" ADD CONSTRAINT "inpatient_stays_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inpatient_stays" ADD CONSTRAINT "inpatient_stays_ward_id_wards_id_fk" FOREIGN KEY ("ward_id") REFERENCES "public"."wards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inpatient_stays" ADD CONSTRAINT "inpatient_stays_bed_id_beds_id_fk" FOREIGN KEY ("bed_id") REFERENCES "public"."beds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inpatient_stays" ADD CONSTRAINT "inpatient_stays_admitted_by_user_id_users_id_fk" FOREIGN KEY ("admitted_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inpatient_stays" ADD CONSTRAINT "inpatient_stays_discharged_by_user_id_users_id_fk" FOREIGN KEY ("discharged_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_administrations" ADD CONSTRAINT "medication_administrations_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_administrations" ADD CONSTRAINT "medication_administrations_order_id_medication_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."medication_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_administrations" ADD CONSTRAINT "medication_administrations_stay_id_inpatient_stays_id_fk" FOREIGN KEY ("stay_id") REFERENCES "public"."inpatient_stays"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_administrations" ADD CONSTRAINT "medication_administrations_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_administrations" ADD CONSTRAINT "medication_administrations_administered_by_user_id_users_id_fk" FOREIGN KEY ("administered_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_order_schedules" ADD CONSTRAINT "medication_order_schedules_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_order_schedules" ADD CONSTRAINT "medication_order_schedules_order_id_medication_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."medication_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_orders" ADD CONSTRAINT "medication_orders_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_orders" ADD CONSTRAINT "medication_orders_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_orders" ADD CONSTRAINT "medication_orders_stay_id_inpatient_stays_id_fk" FOREIGN KEY ("stay_id") REFERENCES "public"."inpatient_stays"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_orders" ADD CONSTRAINT "medication_orders_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_orders" ADD CONSTRAINT "medication_orders_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_orders" ADD CONSTRAINT "medication_orders_stopped_by_user_id_users_id_fk" FOREIGN KEY ("stopped_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_owner_id_owners_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."owners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protocol_references" ADD CONSTRAINT "protocol_references_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protocol_references" ADD CONSTRAINT "protocol_references_protocol_id_protocols_id_fk" FOREIGN KEY ("protocol_id") REFERENCES "public"."protocols"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protocol_references" ADD CONSTRAINT "protocol_references_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protocol_snapshots" ADD CONSTRAINT "protocol_snapshots_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protocol_snapshots" ADD CONSTRAINT "protocol_snapshots_protocol_id_protocols_id_fk" FOREIGN KEY ("protocol_id") REFERENCES "public"."protocols"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protocol_snapshots" ADD CONSTRAINT "protocol_snapshots_version_id_protocol_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."protocol_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protocol_versions" ADD CONSTRAINT "protocol_versions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protocol_versions" ADD CONSTRAINT "protocol_versions_protocol_id_protocols_id_fk" FOREIGN KEY ("protocol_id") REFERENCES "public"."protocols"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protocol_versions" ADD CONSTRAINT "protocol_versions_published_by_user_id_users_id_fk" FOREIGN KEY ("published_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protocol_versions" ADD CONSTRAINT "protocol_versions_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protocol_versions" ADD CONSTRAINT "protocol_versions_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protocols" ADD CONSTRAINT "protocols_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protocols" ADD CONSTRAINT "protocols_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protocols" ADD CONSTRAINT "protocols_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_handover_items" ADD CONSTRAINT "shift_handover_items_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_handover_items" ADD CONSTRAINT "shift_handover_items_handover_id_shift_handovers_id_fk" FOREIGN KEY ("handover_id") REFERENCES "public"."shift_handovers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_handover_items" ADD CONSTRAINT "shift_handover_items_stay_id_inpatient_stays_id_fk" FOREIGN KEY ("stay_id") REFERENCES "public"."inpatient_stays"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_handovers" ADD CONSTRAINT "shift_handovers_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_handovers" ADD CONSTRAINT "shift_handovers_ward_id_wards_id_fk" FOREIGN KEY ("ward_id") REFERENCES "public"."wards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_handovers" ADD CONSTRAINT "shift_handovers_published_by_user_id_users_id_fk" FOREIGN KEY ("published_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_handovers" ADD CONSTRAINT "shift_handovers_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wards" ADD CONSTRAINT "wards_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_alerts_account_type_created" ON "alerts" USING btree ("account_id","type","created_at");--> statement-breakpoint
CREATE INDEX "idx_alerts_account_stay_type_created" ON "alerts" USING btree ("account_id","stay_id","type","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_alerts_order_slot_type" ON "alerts" USING btree ("order_id","scheduled_for","type");--> statement-breakpoint
CREATE INDEX "idx_beds_account_ward_active" ON "beds" USING btree ("account_id","ward_id","is_active");--> statement-breakpoint
CREATE INDEX "idx_clinical_notes_encounter_id" ON "clinical_notes" USING btree ("encounter_id");--> statement-breakpoint
CREATE INDEX "idx_clinical_note_versions_note_id" ON "clinical_note_versions" USING btree ("note_id");--> statement-breakpoint
CREATE UNIQUE INDEX "clinical_note_versions_note_version_unique" ON "clinical_note_versions" USING btree ("note_id","version_number");--> statement-breakpoint
CREATE INDEX "idx_documents_account_id" ON "documents" USING btree ("account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "documents_storage_key_unique" ON "documents" USING btree ("storage_key");--> statement-breakpoint
CREATE INDEX "idx_encounter_documents_encounter_id" ON "encounter_documents" USING btree ("encounter_id");--> statement-breakpoint
CREATE UNIQUE INDEX "encounter_documents_encounter_document_unique" ON "encounter_documents" USING btree ("encounter_id","document_id");--> statement-breakpoint
CREATE INDEX "idx_encounters_patient_id" ON "encounters" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "idx_encounters_account_status" ON "encounters" USING btree ("account_id","status");--> statement-breakpoint
CREATE INDEX "idx_inpatient_stays_account_ward_status" ON "inpatient_stays" USING btree ("account_id","ward_id","status");--> statement-breakpoint
CREATE INDEX "idx_inpatient_stays_account_bed_status" ON "inpatient_stays" USING btree ("account_id","bed_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "inpatient_stays_active_bed_unique" ON "inpatient_stays" USING btree ("bed_id") WHERE "inpatient_stays"."status" = 'active';--> statement-breakpoint
CREATE INDEX "idx_medication_administrations_order_scheduled" ON "medication_administrations" USING btree ("order_id","scheduled_for");--> statement-breakpoint
CREATE INDEX "idx_medication_administrations_account_stay_scheduled" ON "medication_administrations" USING btree ("account_id","stay_id","scheduled_for");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_medication_administrations_order_slot" ON "medication_administrations" USING btree ("order_id","scheduled_for");--> statement-breakpoint
CREATE INDEX "idx_medication_order_schedules_order_id" ON "medication_order_schedules" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_medication_order_schedules_next_due_at" ON "medication_order_schedules" USING btree ("next_due_at");--> statement-breakpoint
CREATE INDEX "idx_medication_orders_account_stay_status" ON "medication_orders" USING btree ("account_id","stay_id","status");--> statement-breakpoint
CREATE INDEX "idx_medication_orders_account_encounter_status" ON "medication_orders" USING btree ("account_id","encounter_id","status");--> statement-breakpoint
CREATE INDEX "idx_medication_orders_patient_status" ON "medication_orders" USING btree ("patient_id","status");--> statement-breakpoint
CREATE INDEX "idx_patients_account_name" ON "patients" USING btree ("account_id","name");--> statement-breakpoint
CREATE INDEX "idx_patients_account_microchip" ON "patients" USING btree ("account_id","microchip");--> statement-breakpoint
CREATE INDEX "idx_patients_owner_id" ON "patients" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "idx_protocol_references_protocol_id" ON "protocol_references" USING btree ("protocol_id");--> statement-breakpoint
CREATE INDEX "idx_protocol_snapshots_protocol_version" ON "protocol_snapshots" USING btree ("protocol_id","version_id");--> statement-breakpoint
CREATE INDEX "idx_protocol_versions_protocol_version" ON "protocol_versions" USING btree ("protocol_id","version_number");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_protocol_versions_protocol_version_number" ON "protocol_versions" USING btree ("protocol_id","version_number");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_protocols_account_slug" ON "protocols" USING btree ("account_id","slug");--> statement-breakpoint
CREATE INDEX "idx_protocols_account_status" ON "protocols" USING btree ("account_id","status");--> statement-breakpoint
CREATE INDEX "idx_protocols_account_domain_specialty" ON "protocols" USING btree ("account_id","domain","specialty");--> statement-breakpoint
CREATE INDEX "idx_shift_handover_items_handover_id" ON "shift_handover_items" USING btree ("handover_id");--> statement-breakpoint
CREATE INDEX "idx_shift_handovers_account_ward_shift" ON "shift_handovers" USING btree ("account_id","ward_id","shift_date","shift_period");--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "owners" ADD CONSTRAINT "owners_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_events_account_created_at_idx" ON "audit_events" USING btree ("account_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_owners_account_full_name" ON "owners" USING btree ("account_id","full_name");--> statement-breakpoint
CREATE INDEX "idx_owners_account_document" ON "owners" USING btree ("account_id","document");--> statement-breakpoint
CREATE INDEX "idx_owners_account_phone" ON "owners" USING btree ("account_id","phone_main");--> statement-breakpoint
ALTER TABLE "owners" DROP COLUMN "phone";--> statement-breakpoint
ALTER TABLE "owners" DROP COLUMN "notes";--> statement-breakpoint
ALTER TABLE "owners" DROP COLUMN "is_active";