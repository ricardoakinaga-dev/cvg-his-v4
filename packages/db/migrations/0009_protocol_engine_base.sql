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
	CONSTRAINT "protocols_status_chk" CHECK ("status" in ('draft', 'published'))
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
	CONSTRAINT "protocol_versions_status_chk" CHECK ("status" in ('draft', 'publishing', 'published', 'failed')),
	CONSTRAINT "protocol_versions_version_number_positive_chk" CHECK ("version_number" > 0)
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
	CONSTRAINT "protocol_references_ref_type_chk" CHECK ("ref_type" in ('qdrant_chunk', 'url', 'pdf', 'doi', 'book'))
);
--> statement-breakpoint
ALTER TABLE "protocols" ADD CONSTRAINT "protocols_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "protocols" ADD CONSTRAINT "protocols_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "protocols" ADD CONSTRAINT "protocols_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "protocol_versions" ADD CONSTRAINT "protocol_versions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "protocol_versions" ADD CONSTRAINT "protocol_versions_protocol_id_protocols_id_fk" FOREIGN KEY ("protocol_id") REFERENCES "public"."protocols"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "protocol_versions" ADD CONSTRAINT "protocol_versions_published_by_user_id_users_id_fk" FOREIGN KEY ("published_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "protocol_versions" ADD CONSTRAINT "protocol_versions_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "protocol_versions" ADD CONSTRAINT "protocol_versions_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "protocol_snapshots" ADD CONSTRAINT "protocol_snapshots_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "protocol_snapshots" ADD CONSTRAINT "protocol_snapshots_protocol_id_protocols_id_fk" FOREIGN KEY ("protocol_id") REFERENCES "public"."protocols"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "protocol_snapshots" ADD CONSTRAINT "protocol_snapshots_version_id_protocol_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."protocol_versions"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "protocol_references" ADD CONSTRAINT "protocol_references_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "protocol_references" ADD CONSTRAINT "protocol_references_protocol_id_protocols_id_fk" FOREIGN KEY ("protocol_id") REFERENCES "public"."protocols"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "protocol_references" ADD CONSTRAINT "protocol_references_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "protocols" ADD CONSTRAINT "protocols_current_published_version_id_protocol_versions_id_fk" FOREIGN KEY ("current_published_version_id") REFERENCES "public"."protocol_versions"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "uq_protocols_account_slug" ON "protocols" USING btree ("account_id","slug");
--> statement-breakpoint
CREATE INDEX "idx_protocols_account_status" ON "protocols" USING btree ("account_id","status");
--> statement-breakpoint
CREATE INDEX "idx_protocols_account_domain_specialty" ON "protocols" USING btree ("account_id","domain","specialty");
--> statement-breakpoint
CREATE INDEX "idx_protocol_versions_protocol_version" ON "protocol_versions" USING btree ("protocol_id","version_number");
--> statement-breakpoint
CREATE UNIQUE INDEX "uq_protocol_versions_protocol_version_number" ON "protocol_versions" USING btree ("protocol_id","version_number");
--> statement-breakpoint
CREATE INDEX "idx_protocol_snapshots_protocol_version" ON "protocol_snapshots" USING btree ("protocol_id","version_id");
--> statement-breakpoint
CREATE INDEX "idx_protocol_references_protocol_id" ON "protocol_references" USING btree ("protocol_id");
