CREATE TYPE "public"."appointment_status" AS ENUM('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show');--> statement-breakpoint
CREATE TYPE "public"."appointment_type" AS ENUM('consultation', 'vaccination', 'surgery', 'exam', 'return', 'other');--> statement-breakpoint
CREATE TYPE "public"."alert_severity" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."alert_status" AS ENUM('active', 'acknowledged', 'resolved');--> statement-breakpoint
CREATE TYPE "public"."alert_type" AS ENUM('medication_delay', 'dose_refused_needs_review');--> statement-breakpoint
CREATE TYPE "public"."clinical_note_status" AS ENUM('draft', 'signed');--> statement-breakpoint
CREATE TYPE "public"."clinical_note_type" AS ENUM('SOAP');--> statement-breakpoint
CREATE TYPE "public"."billing_item_type" AS ENUM('service', 'product');--> statement-breakpoint
CREATE TYPE "public"."encounter_financial_status" AS ENUM('pending', 'partial', 'paid');--> statement-breakpoint
CREATE TYPE "public"."encounter_receivable_status" AS ENUM('open', 'settled');--> statement-breakpoint
CREATE TYPE "public"."encounter_status" AS ENUM('open', 'closed');--> statement-breakpoint
CREATE TYPE "public"."exam_category" AS ENUM('laboratory', 'imaging', 'other');--> statement-breakpoint
CREATE TYPE "public"."exam_order_priority" AS ENUM('routine', 'urgent', 'stat');--> statement-breakpoint
CREATE TYPE "public"."exam_order_status" AS ENUM('requested', 'collected', 'in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."exam_result_status" AS ENUM('draft', 'review_required', 'approved', 'released', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."inpatient_stay_status" AS ENUM('active', 'discharged', 'transferred');--> statement-breakpoint
CREATE TYPE "public"."medication_administration_status" AS ENUM('administered', 'refused', 'delayed', 'held');--> statement-breakpoint
CREATE TYPE "public"."medication_order_schedule_type" AS ENUM('interval', 'fixed_times');--> statement-breakpoint
CREATE TYPE "public"."medication_order_status" AS ENUM('active', 'stopped');--> statement-breakpoint
CREATE TYPE "public"."shift_handover_build_status" AS ENUM('pending', 'building', 'ready', 'failed');--> statement-breakpoint
CREATE TYPE "public"."shift_handover_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TYPE "public"."shift_period" AS ENUM('day', 'night', 'custom');--> statement-breakpoint
CREATE TYPE "public"."stock_lot_status" AS ENUM('active', 'expired', 'recalled', 'depleted');--> statement-breakpoint
CREATE TYPE "public"."stock_movement_type" AS ENUM('purchase', 'sale', 'adjustment_in', 'adjustment_out', 'transfer', 'return', 'loss', 'initial');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('cash', 'credit_card', 'debit_card', 'pix', 'bank_transfer', 'check', 'insurance', 'other');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'completed', 'refunded', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."cash_movement_type" AS ENUM('opening', 'closing', 'payment', 'supply', 'withdrawal', 'adjustment');--> statement-breakpoint
CREATE TYPE "public"."cash_register_status" AS ENUM('open', 'closed');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(64) NOT NULL,
	"name" varchar(255) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"professional_user_id" uuid NOT NULL,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"status" "appointment_status" DEFAULT 'scheduled' NOT NULL,
	"type" "appointment_type" DEFAULT 'consultation' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "appointment_type_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"default_duration_minutes" integer DEFAULT 30 NOT NULL,
	"color" text,
	"active" boolean DEFAULT true NOT NULL
);
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
	"status" "alert_status" DEFAULT 'active' NOT NULL,
	"acknowledged_at" timestamp with time zone,
	"acknowledged_by_user_id" uuid,
	"resolved_at" timestamp with time zone,
	"resolved_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"account_id" uuid,
	"actor_user_id" uuid,
	"actor_role" varchar(64),
	"actor_roles" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"entity_type" varchar(64) NOT NULL,
	"entity_id" varchar(128) NOT NULL,
	"action" varchar(64) NOT NULL,
	"before_json" jsonb,
	"after_json" jsonb,
	"reason" text,
	"request_id" varchar(128)
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
CREATE TABLE "encounter_billing_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"encounter_id" uuid NOT NULL,
	"item_type" "billing_item_type" NOT NULL,
	"catalog_item_id" uuid,
	"name_snapshot" text NOT NULL,
	"code_snapshot" text,
	"unit_price" numeric(12, 2) NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"discount_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"line_total" numeric(12, 2) NOT NULL,
	"notes" text,
	"created_by_user_id" uuid NOT NULL,
	"updated_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "encounter_financial_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"encounter_id" uuid NOT NULL,
	"financial_status" "encounter_financial_status" DEFAULT 'pending' NOT NULL,
	"subtotal_snapshot" numeric(12, 2) DEFAULT '0' NOT NULL,
	"discount_total_snapshot" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_snapshot" numeric(12, 2) DEFAULT '0' NOT NULL,
	"paid_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"balance_due" numeric(12, 2) DEFAULT '0' NOT NULL,
	"closed_by_user_id" uuid,
	"closed_at" timestamp with time zone,
	"notes" text,
	"snapshot_json" text DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "encounter_receivable_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"encounter_id" uuid NOT NULL,
	"financial_account_id" uuid NOT NULL,
	"receivable_id" uuid NOT NULL,
	"amount_paid" numeric(12, 2) NOT NULL,
	"paid_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_by_user_id" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "encounter_receivables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"encounter_id" uuid NOT NULL,
	"financial_account_id" uuid NOT NULL,
	"installment_number" integer DEFAULT 1 NOT NULL,
	"installment_label" text DEFAULT 'Parcela 1/1' NOT NULL,
	"due_at" timestamp with time zone,
	"status" "encounter_receivable_status" DEFAULT 'open' NOT NULL,
	"amount_original" numeric(12, 2) NOT NULL,
	"amount_paid" numeric(12, 2) DEFAULT '0' NOT NULL,
	"amount_outstanding" numeric(12, 2) NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"settled_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
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
CREATE TABLE "exam_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"encounter_id" uuid,
	"requested_by_user_id" uuid NOT NULL,
	"category" "exam_category" DEFAULT 'laboratory' NOT NULL,
	"exam_name" text NOT NULL,
	"exam_code" text,
	"priority" "exam_order_priority" DEFAULT 'routine' NOT NULL,
	"status" "exam_order_status" DEFAULT 'requested' NOT NULL,
	"notes" text,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exam_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"exam_order_id" uuid NOT NULL,
	"category" text NOT NULL,
	"exam_name" text NOT NULL,
	"exam_code" text,
	"requested_at" timestamp with time zone NOT NULL,
	"status" "exam_result_status" DEFAULT 'draft' NOT NULL,
	"findings" text,
	"interpretation" text,
	"result_values" text,
	"normal_range" text,
	"performed_by_user_id" uuid,
	"performed_at" timestamp with time zone,
	"reviewed_by_user_id" uuid,
	"reviewed_at" timestamp with time zone,
	"released_at" timestamp with time zone,
	"notes" text,
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
CREATE TABLE "owners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"unit_id" uuid,
	"full_name" text NOT NULL,
	"document" text,
	"email" text,
	"phone_main" text,
	"phone_alt" text,
	"address_json" jsonb,
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
CREATE TABLE "professional_availability" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"professional_user_id" uuid NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"slot_duration_minutes" integer DEFAULT 30 NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(100) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
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
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"description" text,
	"base_price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"description" text,
	"base_price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"role_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "role_permissions_pkey" PRIMARY KEY("role_id","permission_id")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(64) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
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
CREATE TABLE "stock_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"min_quantity" integer DEFAULT 0 NOT NULL,
	"max_quantity" integer,
	"location" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_lots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"lot_number" text NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"manufacture_date" timestamp with time zone,
	"expiry_date" timestamp with time zone,
	"supplier" text,
	"status" "stock_lot_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"lot_id" uuid,
	"movement_type" "stock_movement_type" NOT NULL,
	"quantity" integer NOT NULL,
	"previous_quantity" integer NOT NULL,
	"new_quantity" integer NOT NULL,
	"unit_cost" numeric(12, 2),
	"reference" text,
	"notes" text,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"code" varchar(64) NOT NULL,
	"name" varchar(255) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_roles_pkey" PRIMARY KEY("user_id","role_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"unit_id" uuid,
	"email" varchar(320) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
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
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"financial_account_id" uuid NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"method" "payment_method" NOT NULL,
	"status" "payment_status" DEFAULT 'completed' NOT NULL,
	"installments" integer DEFAULT 1 NOT NULL,
	"installment_number" integer DEFAULT 1 NOT NULL,
	"reference" text,
	"notes" text,
	"processed_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cash_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cash_register_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"movement_type" "cash_movement_type" NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"running_balance" numeric(12, 2) NOT NULL,
	"reference" text,
	"notes" text,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cash_registers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"opened_by_user_id" uuid NOT NULL,
	"closed_by_user_id" uuid,
	"opening_amount" numeric(12, 2) NOT NULL,
	"closing_amount" numeric(12, 2),
	"expected_closing_amount" numeric(12, 2),
	"difference" numeric(12, 2),
	"status" "cash_register_status" DEFAULT 'open' NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_owner_id_owners_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."owners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_professional_user_id_users_id_fk" FOREIGN KEY ("professional_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_type_configs" ADD CONSTRAINT "appointment_type_configs_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_stay_id_inpatient_stays_id_fk" FOREIGN KEY ("stay_id") REFERENCES "public"."inpatient_stays"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_order_id_medication_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."medication_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
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
ALTER TABLE "encounter_billing_items" ADD CONSTRAINT "encounter_billing_items_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounter_billing_items" ADD CONSTRAINT "encounter_billing_items_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounter_billing_items" ADD CONSTRAINT "encounter_billing_items_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounter_billing_items" ADD CONSTRAINT "encounter_billing_items_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounter_financial_accounts" ADD CONSTRAINT "encounter_financial_accounts_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounter_financial_accounts" ADD CONSTRAINT "encounter_financial_accounts_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounter_financial_accounts" ADD CONSTRAINT "encounter_financial_accounts_closed_by_user_id_users_id_fk" FOREIGN KEY ("closed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounter_receivable_payments" ADD CONSTRAINT "encounter_receivable_payments_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounter_receivable_payments" ADD CONSTRAINT "encounter_receivable_payments_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounter_receivable_payments" ADD CONSTRAINT "encounter_receivable_payments_financial_account_id_encounter_financial_accounts_id_fk" FOREIGN KEY ("financial_account_id") REFERENCES "public"."encounter_financial_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounter_receivable_payments" ADD CONSTRAINT "encounter_receivable_payments_receivable_id_encounter_receivables_id_fk" FOREIGN KEY ("receivable_id") REFERENCES "public"."encounter_receivables"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounter_receivable_payments" ADD CONSTRAINT "encounter_receivable_payments_paid_by_user_id_users_id_fk" FOREIGN KEY ("paid_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounter_receivables" ADD CONSTRAINT "encounter_receivables_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounter_receivables" ADD CONSTRAINT "encounter_receivables_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounter_receivables" ADD CONSTRAINT "encounter_receivables_financial_account_id_encounter_financial_accounts_id_fk" FOREIGN KEY ("financial_account_id") REFERENCES "public"."encounter_financial_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounter_documents" ADD CONSTRAINT "encounter_documents_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounter_documents" ADD CONSTRAINT "encounter_documents_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounter_documents" ADD CONSTRAINT "encounter_documents_attached_by_user_id_users_id_fk" FOREIGN KEY ("attached_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_owner_id_owners_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."owners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_opened_by_user_id_users_id_fk" FOREIGN KEY ("opened_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_closed_by_user_id_users_id_fk" FOREIGN KEY ("closed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_orders" ADD CONSTRAINT "exam_orders_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_orders" ADD CONSTRAINT "exam_orders_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_orders" ADD CONSTRAINT "exam_orders_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_orders" ADD CONSTRAINT "exam_orders_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_results" ADD CONSTRAINT "exam_results_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_results" ADD CONSTRAINT "exam_results_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_results" ADD CONSTRAINT "exam_results_exam_order_id_exam_orders_id_fk" FOREIGN KEY ("exam_order_id") REFERENCES "public"."exam_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_results" ADD CONSTRAINT "exam_results_performed_by_user_id_users_id_fk" FOREIGN KEY ("performed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_results" ADD CONSTRAINT "exam_results_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
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
ALTER TABLE "owners" ADD CONSTRAINT "owners_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "owners" ADD CONSTRAINT "owners_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_owner_id_owners_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."owners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_availability" ADD CONSTRAINT "professional_availability_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_availability" ADD CONSTRAINT "professional_availability_professional_user_id_users_id_fk" FOREIGN KEY ("professional_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
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
ALTER TABLE "products" ADD CONSTRAINT "products_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_handover_items" ADD CONSTRAINT "shift_handover_items_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_handover_items" ADD CONSTRAINT "shift_handover_items_handover_id_shift_handovers_id_fk" FOREIGN KEY ("handover_id") REFERENCES "public"."shift_handovers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_handover_items" ADD CONSTRAINT "shift_handover_items_stay_id_inpatient_stays_id_fk" FOREIGN KEY ("stay_id") REFERENCES "public"."inpatient_stays"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_handovers" ADD CONSTRAINT "shift_handovers_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_handovers" ADD CONSTRAINT "shift_handovers_ward_id_wards_id_fk" FOREIGN KEY ("ward_id") REFERENCES "public"."wards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_handovers" ADD CONSTRAINT "shift_handovers_published_by_user_id_users_id_fk" FOREIGN KEY ("published_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_handovers" ADD CONSTRAINT "shift_handovers_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_items" ADD CONSTRAINT "stock_items_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_items" ADD CONSTRAINT "stock_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_lots" ADD CONSTRAINT "stock_lots_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_lots" ADD CONSTRAINT "stock_lots_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_lot_id_stock_lots_id_fk" FOREIGN KEY ("lot_id") REFERENCES "public"."stock_lots"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "units" ADD CONSTRAINT "units_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wards" ADD CONSTRAINT "wards_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_financial_account_id_encounter_financial_accounts_id_fk" FOREIGN KEY ("financial_account_id") REFERENCES "public"."encounter_financial_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_cash_register_id_cash_registers_id_fk" FOREIGN KEY ("cash_register_id") REFERENCES "public"."cash_registers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_registers" ADD CONSTRAINT "cash_registers_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_registers" ADD CONSTRAINT "cash_registers_opened_by_user_id_users_id_fk" FOREIGN KEY ("opened_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_registers" ADD CONSTRAINT "cash_registers_closed_by_user_id_users_id_fk" FOREIGN KEY ("closed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_slug_unique" ON "accounts" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_appointments_account_start" ON "appointments" USING btree ("account_id","start_at");--> statement-breakpoint
CREATE INDEX "idx_appointments_account_professional" ON "appointments" USING btree ("account_id","professional_user_id","start_at");--> statement-breakpoint
CREATE INDEX "idx_appointments_account_patient" ON "appointments" USING btree ("account_id","patient_id");--> statement-breakpoint
CREATE INDEX "idx_appointments_account_status" ON "appointments" USING btree ("account_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_appt_type_config_account_code" ON "appointment_type_configs" USING btree ("account_id","code");--> statement-breakpoint
CREATE INDEX "idx_appt_type_config_account_name" ON "appointment_type_configs" USING btree ("account_id","name");--> statement-breakpoint
CREATE INDEX "idx_appt_type_config_account_active" ON "appointment_type_configs" USING btree ("account_id","active");--> statement-breakpoint
CREATE INDEX "idx_alerts_account_type_created" ON "alerts" USING btree ("account_id","type","created_at");--> statement-breakpoint
CREATE INDEX "idx_alerts_account_stay_type_created" ON "alerts" USING btree ("account_id","stay_id","type","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_alerts_order_slot_type_active" ON "alerts" USING btree ("order_id","scheduled_for","type") WHERE "alerts"."status" != 'resolved';--> statement-breakpoint
CREATE INDEX "audit_events_created_at_idx" ON "audit_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_events_entity_idx" ON "audit_events" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_events_account_created_at_idx" ON "audit_events" USING btree ("account_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_beds_account_ward_active" ON "beds" USING btree ("account_id","ward_id","is_active");--> statement-breakpoint
CREATE INDEX "idx_clinical_notes_encounter_id" ON "clinical_notes" USING btree ("encounter_id");--> statement-breakpoint
CREATE INDEX "idx_clinical_note_versions_note_id" ON "clinical_note_versions" USING btree ("note_id");--> statement-breakpoint
CREATE UNIQUE INDEX "clinical_note_versions_note_version_unique" ON "clinical_note_versions" USING btree ("note_id","version_number");--> statement-breakpoint
CREATE INDEX "idx_documents_account_id" ON "documents" USING btree ("account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "documents_storage_key_unique" ON "documents" USING btree ("storage_key");--> statement-breakpoint
CREATE INDEX "idx_ebi_account_encounter" ON "encounter_billing_items" USING btree ("account_id","encounter_id");--> statement-breakpoint
CREATE INDEX "idx_ebi_account_type" ON "encounter_billing_items" USING btree ("account_id","item_type");--> statement-breakpoint
CREATE UNIQUE INDEX "uidx_efa_encounter" ON "encounter_financial_accounts" USING btree ("encounter_id");--> statement-breakpoint
CREATE INDEX "idx_efa_account_status" ON "encounter_financial_accounts" USING btree ("account_id","financial_status");--> statement-breakpoint
CREATE INDEX "idx_erp_account_receivable_paid_at" ON "encounter_receivable_payments" USING btree ("account_id","receivable_id","paid_at");--> statement-breakpoint
CREATE INDEX "idx_erp_account_financial_paid_at" ON "encounter_receivable_payments" USING btree ("account_id","financial_account_id","paid_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uidx_er_financial_installment" ON "encounter_receivables" USING btree ("financial_account_id","installment_number");--> statement-breakpoint
CREATE INDEX "idx_er_account_status" ON "encounter_receivables" USING btree ("account_id","status");--> statement-breakpoint
CREATE INDEX "idx_er_account_encounter_status" ON "encounter_receivables" USING btree ("account_id","encounter_id","status");--> statement-breakpoint
CREATE INDEX "idx_er_account_due_at" ON "encounter_receivables" USING btree ("account_id","due_at");--> statement-breakpoint
CREATE INDEX "idx_encounter_documents_encounter_id" ON "encounter_documents" USING btree ("encounter_id");--> statement-breakpoint
CREATE UNIQUE INDEX "encounter_documents_encounter_document_unique" ON "encounter_documents" USING btree ("encounter_id","document_id");--> statement-breakpoint
CREATE INDEX "idx_encounters_patient_id" ON "encounters" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "idx_encounters_account_status" ON "encounters" USING btree ("account_id","status");--> statement-breakpoint
CREATE INDEX "idx_exam_orders_account_patient" ON "exam_orders" USING btree ("account_id","patient_id");--> statement-breakpoint
CREATE INDEX "idx_exam_orders_account_encounter" ON "exam_orders" USING btree ("account_id","encounter_id");--> statement-breakpoint
CREATE INDEX "idx_exam_orders_account_status" ON "exam_orders" USING btree ("account_id","status");--> statement-breakpoint
CREATE INDEX "idx_exam_orders_account_category" ON "exam_orders" USING btree ("account_id","category");--> statement-breakpoint
CREATE INDEX "idx_exam_results_account_patient" ON "exam_results" USING btree ("account_id","patient_id");--> statement-breakpoint
CREATE INDEX "idx_exam_results_account_exam_order" ON "exam_results" USING btree ("account_id","exam_order_id");--> statement-breakpoint
CREATE INDEX "idx_exam_results_account_category" ON "exam_results" USING btree ("account_id","category");--> statement-breakpoint
CREATE INDEX "idx_exam_results_account_status" ON "exam_results" USING btree ("account_id","status");--> statement-breakpoint
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
CREATE INDEX "idx_owners_account_full_name" ON "owners" USING btree ("account_id","full_name");--> statement-breakpoint
CREATE INDEX "idx_owners_account_document" ON "owners" USING btree ("account_id","document");--> statement-breakpoint
CREATE INDEX "idx_owners_account_phone" ON "owners" USING btree ("account_id","phone_main");--> statement-breakpoint
CREATE INDEX "idx_patients_account_name" ON "patients" USING btree ("account_id","name");--> statement-breakpoint
CREATE INDEX "idx_patients_account_microchip" ON "patients" USING btree ("account_id","microchip");--> statement-breakpoint
CREATE INDEX "idx_patients_owner_id" ON "patients" USING btree ("owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_prof_avail_account_prof_day" ON "professional_availability" USING btree ("account_id","professional_user_id","day_of_week");--> statement-breakpoint
CREATE INDEX "idx_prof_avail_account_prof" ON "professional_availability" USING btree ("account_id","professional_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "permissions_key_unique" ON "permissions" USING btree ("key");--> statement-breakpoint
CREATE INDEX "idx_protocol_references_protocol_id" ON "protocol_references" USING btree ("protocol_id");--> statement-breakpoint
CREATE INDEX "idx_protocol_snapshots_protocol_version" ON "protocol_snapshots" USING btree ("protocol_id","version_id");--> statement-breakpoint
CREATE INDEX "idx_protocol_versions_protocol_version" ON "protocol_versions" USING btree ("protocol_id","version_number");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_protocol_versions_protocol_version_number" ON "protocol_versions" USING btree ("protocol_id","version_number");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_protocols_account_slug" ON "protocols" USING btree ("account_id","slug");--> statement-breakpoint
CREATE INDEX "idx_protocols_account_status" ON "protocols" USING btree ("account_id","status");--> statement-breakpoint
CREATE INDEX "idx_protocols_account_domain_specialty" ON "protocols" USING btree ("account_id","domain","specialty");--> statement-breakpoint
CREATE INDEX "idx_products_account_name" ON "products" USING btree ("account_id","name");--> statement-breakpoint
CREATE INDEX "idx_products_account_active" ON "products" USING btree ("account_id","active");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_products_account_code" ON "products" USING btree ("account_id","code") WHERE "products"."code" is not null;--> statement-breakpoint
CREATE INDEX "idx_services_account_name" ON "services" USING btree ("account_id","name");--> statement-breakpoint
CREATE INDEX "idx_services_account_active" ON "services" USING btree ("account_id","active");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_services_account_code" ON "services" USING btree ("account_id","code") WHERE "services"."code" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "roles_name_unique" ON "roles" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_shift_handover_items_handover_id" ON "shift_handover_items" USING btree ("handover_id");--> statement-breakpoint
CREATE INDEX "idx_shift_handovers_account_ward_shift" ON "shift_handovers" USING btree ("account_id","ward_id","shift_date","shift_period");--> statement-breakpoint
CREATE INDEX "idx_stock_items_account_product" ON "stock_items" USING btree ("account_id","product_id");--> statement-breakpoint
CREATE INDEX "idx_stock_items_account_active" ON "stock_items" USING btree ("account_id","active");--> statement-breakpoint
CREATE INDEX "idx_stock_items_low_stock" ON "stock_items" USING btree ("account_id","quantity","min_quantity");--> statement-breakpoint
CREATE INDEX "idx_stock_lots_account_product" ON "stock_lots" USING btree ("account_id","product_id");--> statement-breakpoint
CREATE INDEX "idx_stock_lots_expiry" ON "stock_lots" USING btree ("account_id","expiry_date");--> statement-breakpoint
CREATE INDEX "idx_stock_lots_number" ON "stock_lots" USING btree ("account_id","lot_number");--> statement-breakpoint
CREATE INDEX "idx_stock_lots_status" ON "stock_lots" USING btree ("account_id","status");--> statement-breakpoint
CREATE INDEX "idx_stock_movements_account_product" ON "stock_movements" USING btree ("account_id","product_id");--> statement-breakpoint
CREATE INDEX "idx_stock_movements_account_type" ON "stock_movements" USING btree ("account_id","movement_type");--> statement-breakpoint
CREATE INDEX "idx_stock_movements_created_at" ON "stock_movements" USING btree ("account_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_stock_movements_lot" ON "stock_movements" USING btree ("lot_id");--> statement-breakpoint
CREATE UNIQUE INDEX "units_account_code_unique" ON "units" USING btree ("account_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "users_account_email_unique" ON "users" USING btree ("account_id","email");--> statement-breakpoint
CREATE INDEX "idx_payments_account" ON "payments" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_payments_financial_account" ON "payments" USING btree ("financial_account_id");--> statement-breakpoint
CREATE INDEX "idx_payments_method" ON "payments" USING btree ("account_id","method");--> statement-breakpoint
CREATE INDEX "idx_payments_status" ON "payments" USING btree ("account_id","status");--> statement-breakpoint
CREATE INDEX "idx_payments_created_at" ON "payments" USING btree ("account_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_cash_movements_register" ON "cash_movements" USING btree ("cash_register_id");--> statement-breakpoint
CREATE INDEX "idx_cash_movements_account_type" ON "cash_movements" USING btree ("account_id","movement_type");--> statement-breakpoint
CREATE INDEX "idx_cash_movements_created_at" ON "cash_movements" USING btree ("account_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_cash_registers_account_status" ON "cash_registers" USING btree ("account_id","status");--> statement-breakpoint
CREATE INDEX "idx_cash_registers_opened_at" ON "cash_registers" USING btree ("account_id","opened_at");--> statement-breakpoint
CREATE INDEX "idx_cash_registers_opened_by" ON "cash_registers" USING btree ("opened_by_user_id");--> statement-breakpoint
CREATE TABLE "staff" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"user_id" uuid,
	"employee_code" varchar(50) NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"department" varchar(100),
	"job_title" varchar(150),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"channel" varchar(50) DEFAULT 'internal' NOT NULL,
	"category" varchar(50) NOT NULL,
	"encounter_id" uuid,
	"patient_id" uuid,
	"recipient_role_code" varchar(100),
	"title" varchar(255) NOT NULL,
	"message" varchar(2000) NOT NULL,
	"severity" varchar(20) NOT NULL,
	"status" varchar(50) NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone
);--> statement-breakpoint
CREATE TABLE "notification_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"notification_id" uuid NOT NULL,
	"status" varchar(50) DEFAULT 'queued' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"scheduled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone
);--> statement-breakpoint
CREATE TABLE "scheduling_queue_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"patient_id" text NOT NULL,
	"owner_id" text NOT NULL,
	"appointment_id" text,
	"encounter_id" text,
	"reason" text NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"status" text DEFAULT 'waiting' NOT NULL,
	"checked_in_at" timestamp with time zone NOT NULL,
	"called_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "triage_records" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"encounter_id" text NOT NULL,
	"patient_id" text NOT NULL,
	"priority" text NOT NULL,
	"chief_complaint" text NOT NULL,
	"initial_notes" text,
	"alerts_json" text NOT NULL,
	"destination" text NOT NULL,
	"triaged_by" text NOT NULL,
	"triaged_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);--> statement-breakpoint
CREATE TABLE "triage_record_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"triage_id" text NOT NULL,
	"account_id" text NOT NULL,
	"encounter_id" text NOT NULL,
	"changed_fields_json" text NOT NULL,
	"previous_snapshot_json" text NOT NULL,
	"next_snapshot_json" text NOT NULL,
	"changed_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_jobs" ADD CONSTRAINT "notification_jobs_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_jobs" ADD CONSTRAINT "notification_jobs_notification_id_notifications_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_staff_code_unique" ON "staff" USING btree ("account_id","employee_code");--> statement-breakpoint
CREATE INDEX "idx_staff_account" ON "staff" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_staff_user" ON "staff" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_account" ON "notifications" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_status" ON "notifications" USING btree ("account_id","status");--> statement-breakpoint
CREATE INDEX "idx_notifications_patient" ON "notifications" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_created" ON "notifications" USING btree ("account_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_notif_jobs_status" ON "notification_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_notif_jobs_notification" ON "notification_jobs" USING btree ("notification_id");--> statement-breakpoint
CREATE INDEX "idx_notif_jobs_scheduled" ON "notification_jobs" USING btree ("scheduled_at","status");--> statement-breakpoint
CREATE INDEX "idx_scheduling_queue_account_checked_in" ON "scheduling_queue_entries" USING btree ("account_id","checked_in_at");--> statement-breakpoint
CREATE INDEX "idx_scheduling_queue_account_status" ON "scheduling_queue_entries" USING btree ("account_id","status");--> statement-breakpoint
CREATE INDEX "idx_scheduling_queue_account_priority" ON "scheduling_queue_entries" USING btree ("account_id","priority","checked_in_at");--> statement-breakpoint
CREATE INDEX "idx_scheduling_queue_encounter" ON "scheduling_queue_entries" USING btree ("encounter_id");--> statement-breakpoint
CREATE INDEX "idx_triage_records_account_created" ON "triage_records" USING btree ("account_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_triage_records_encounter" ON "triage_records" USING btree ("encounter_id");--> statement-breakpoint
CREATE INDEX "idx_triage_records_patient" ON "triage_records" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "idx_triage_versions_triage_created" ON "triage_record_versions" USING btree ("triage_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_triage_versions_account_created" ON "triage_record_versions" USING btree ("account_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_triage_versions_encounter" ON "triage_record_versions" USING btree ("encounter_id");

-- =====================
-- Staff table
-- =====================
CREATE TABLE IF NOT EXISTS "staff" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "account_id" uuid NOT NULL REFERENCES "accounts"("id") ON DELETE CASCADE,
  "user_id" uuid,
  "employee_code" varchar(50) NOT NULL,
  "full_name" varchar(255) NOT NULL,
  "department" varchar(100),
  "job_title" varchar(150),
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX "idx_staff_code_unique" ON "staff" USING btree ("account_id","employee_code");
CREATE INDEX "idx_staff_account" ON "staff" USING btree ("account_id");
CREATE INDEX "idx_staff_user" ON "staff" USING btree ("user_id");

-- =====================
-- Notification templates
-- =====================
CREATE TABLE IF NOT EXISTS "notification_templates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "account_id" uuid NOT NULL REFERENCES "accounts"("id") ON DELETE CASCADE,
  "name" varchar(200) NOT NULL,
  "type" notification_type NOT NULL,
  "channel" notification_channel NOT NULL,
  "subject" varchar(500),
  "body_html" text,
  "body_text" text NOT NULL,
  "variables" json DEFAULT '[]'::json,
  "active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX "idx_notif_templates_account" ON "notification_templates" USING btree ("account_id");
CREATE INDEX "idx_notif_templates_type" ON "notification_templates" USING btree ("account_id","type");
CREATE UNIQUE INDEX "idx_notif_templates_unique" ON "notification_templates" USING btree ("account_id","type","channel");

-- =====================
-- Notifications
-- =====================
CREATE TABLE IF NOT EXISTS "notifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "account_id" uuid NOT NULL REFERENCES "accounts"("id") ON DELETE CASCADE,
  "template_id" uuid REFERENCES "notification_templates"("id") ON DELETE SET NULL,
  "patient_id" uuid REFERENCES "patients"("id") ON DELETE SET NULL,
  "appointment_id" uuid REFERENCES "appointments"("id") ON DELETE SET NULL,
  "type" notification_type NOT NULL,
  "channel" notification_channel NOT NULL,
  "priority" notification_priority NOT NULL DEFAULT 'normal',
  "status" notification_status NOT NULL DEFAULT 'pending',
  "recipient" varchar(500) NOT NULL,
  "recipient_name" varchar(255),
  "subject" varchar(500),
  "body" text NOT NULL,
  "metadata" json DEFAULT '{}'::json,
  "scheduled_for" timestamp with time zone,
  "sent_at" timestamp with time zone,
  "delivered_at" timestamp with time zone,
  "failed_at" timestamp with time zone,
  "error_message" text,
  "retry_count" integer NOT NULL DEFAULT 0,
  "max_retries" integer NOT NULL DEFAULT 3,
  "created_by_user_id" uuid,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX "idx_notifications_account" ON "notifications" USING btree ("account_id");
CREATE INDEX "idx_notifications_status" ON "notifications" USING btree ("account_id","status");
CREATE INDEX "idx_notifications_scheduled" ON "notifications" USING btree ("scheduled_for","status");
CREATE INDEX "idx_notifications_patient" ON "notifications" USING btree ("patient_id");
CREATE INDEX "idx_notifications_appointment" ON "notifications" USING btree ("appointment_id");
CREATE INDEX "idx_notifications_created" ON "notifications" USING btree ("account_id","created_at");

-- =====================
-- Notification settings
-- =====================
CREATE TABLE IF NOT EXISTS "notification_settings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "account_id" uuid NOT NULL REFERENCES "accounts"("id") ON DELETE CASCADE,
  "sms_enabled" boolean NOT NULL DEFAULT false,
  "sms_provider" varchar(50),
  "sms_api_key" varchar(255),
  "sms_from" varchar(50),
  "whatsapp_enabled" boolean NOT NULL DEFAULT false,
  "whatsapp_provider" varchar(50),
  "whatsapp_api_key" varchar(255),
  "whatsapp_from" varchar(50),
  "email_enabled" boolean NOT NULL DEFAULT false,
  "email_provider" varchar(50),
  "email_api_key" varchar(255),
  "email_from" varchar(255),
  "email_from_name" varchar(255),
  "quiet_hours_enabled" boolean NOT NULL DEFAULT false,
  "quiet_hours_start" varchar(5),
  "quiet_hours_end" varchar(5),
  "max_retries" integer NOT NULL DEFAULT 3,
  "retry_interval_minutes" integer NOT NULL DEFAULT 5,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX "idx_notif_settings_account" ON "notification_settings" USING btree ("account_id");

-- =====================
-- Notification jobs
-- =====================
CREATE TABLE IF NOT EXISTS "notification_jobs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "account_id" uuid NOT NULL REFERENCES "accounts"("id") ON DELETE CASCADE,
  "notification_id" uuid NOT NULL REFERENCES "notifications"("id") ON DELETE CASCADE,
  "status" varchar(20) NOT NULL DEFAULT 'queued',
  "attempts" integer NOT NULL DEFAULT 0,
  "scheduled_at" timestamp with time zone NOT NULL DEFAULT now(),
  "processed_at" timestamp with time zone
);
CREATE INDEX "idx_notif_jobs_status" ON "notification_jobs" USING btree ("status");
CREATE INDEX "idx_notif_jobs_notification" ON "notification_jobs" USING btree ("notification_id");
CREATE INDEX "idx_notif_jobs_scheduled" ON "notification_jobs" USING btree ("scheduled_at","status");
