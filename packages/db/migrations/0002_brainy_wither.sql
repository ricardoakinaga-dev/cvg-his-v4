CREATE TABLE "owners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"document" varchar(40) NOT NULL,
	"phone" varchar(32) NOT NULL,
	"email" varchar(320),
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "owners" ADD CONSTRAINT "owners_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "owners_account_document_unique" ON "owners" USING btree ("account_id","document");--> statement-breakpoint
CREATE INDEX "owners_account_name_idx" ON "owners" USING btree ("account_id","full_name");