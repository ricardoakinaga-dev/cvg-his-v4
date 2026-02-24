DROP INDEX IF EXISTS "owners_account_document_unique";
--> statement-breakpoint
DROP INDEX IF EXISTS "owners_account_name_idx";
--> statement-breakpoint
ALTER TABLE "owners" ADD COLUMN "unit_id" uuid;
--> statement-breakpoint
ALTER TABLE "owners" RENAME COLUMN "phone" TO "phone_main";
--> statement-breakpoint
ALTER TABLE "owners" ADD COLUMN "phone_alt" text;
--> statement-breakpoint
ALTER TABLE "owners" ADD COLUMN "address_json" jsonb;
--> statement-breakpoint
ALTER TABLE "owners" ALTER COLUMN "full_name" TYPE text;
--> statement-breakpoint
ALTER TABLE "owners" ALTER COLUMN "document" TYPE text;
--> statement-breakpoint
ALTER TABLE "owners" ALTER COLUMN "document" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "owners" ALTER COLUMN "email" TYPE text;
--> statement-breakpoint
ALTER TABLE "owners" ALTER COLUMN "phone_main" TYPE text;
--> statement-breakpoint
ALTER TABLE "owners" DROP COLUMN "notes";
--> statement-breakpoint
ALTER TABLE "owners" DROP COLUMN "is_active";
--> statement-breakpoint
ALTER TABLE "owners" ADD CONSTRAINT "owners_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_owners_account_full_name" ON "owners" USING btree ("account_id","full_name");
--> statement-breakpoint
CREATE INDEX "idx_owners_account_document" ON "owners" USING btree ("account_id","document");
--> statement-breakpoint
CREATE INDEX "idx_owners_account_phone" ON "owners" USING btree ("account_id","phone_main");
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
ALTER TABLE "patients" ADD CONSTRAINT "patients_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_owner_id_owners_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."owners"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_patients_account_name" ON "patients" USING btree ("account_id","name");
--> statement-breakpoint
CREATE INDEX "idx_patients_account_microchip" ON "patients" USING btree ("account_id","microchip");
--> statement-breakpoint
CREATE INDEX "idx_patients_owner_id" ON "patients" USING btree ("owner_id");
