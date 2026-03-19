CREATE TYPE "public"."alert_status" AS ENUM('active', 'acknowledged', 'resolved');--> statement-breakpoint
CREATE TYPE "public"."billing_item_type" AS ENUM('service', 'product');--> statement-breakpoint
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
DROP INDEX "uq_alerts_order_slot_type";--> statement-breakpoint
ALTER TABLE "alerts" ADD COLUMN "status" "alert_status" DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "alerts" ADD COLUMN "acknowledged_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "alerts" ADD COLUMN "acknowledged_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "alerts" ADD COLUMN "resolved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "alerts" ADD COLUMN "resolved_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "alerts" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "encounter_billing_items" ADD CONSTRAINT "encounter_billing_items_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounter_billing_items" ADD CONSTRAINT "encounter_billing_items_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounter_billing_items" ADD CONSTRAINT "encounter_billing_items_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounter_billing_items" ADD CONSTRAINT "encounter_billing_items_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_ebi_account_encounter" ON "encounter_billing_items" USING btree ("account_id","encounter_id");--> statement-breakpoint
CREATE INDEX "idx_ebi_account_type" ON "encounter_billing_items" USING btree ("account_id","item_type");--> statement-breakpoint
CREATE INDEX "idx_products_account_name" ON "products" USING btree ("account_id","name");--> statement-breakpoint
CREATE INDEX "idx_products_account_active" ON "products" USING btree ("account_id","active");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_products_account_code" ON "products" USING btree ("account_id","code") WHERE "products"."code" is not null;--> statement-breakpoint
CREATE INDEX "idx_services_account_name" ON "services" USING btree ("account_id","name");--> statement-breakpoint
CREATE INDEX "idx_services_account_active" ON "services" USING btree ("account_id","active");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_services_account_code" ON "services" USING btree ("account_id","code") WHERE "services"."code" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_alerts_order_slot_type_active" ON "alerts" USING btree ("order_id","scheduled_for","type") WHERE "alerts"."status" != 'resolved';