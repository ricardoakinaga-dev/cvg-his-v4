ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "username" varchar(64);
--> statement-breakpoint
ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "must_change_password" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "failed_login_attempts" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "locked_until" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "last_login_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "password_changed_at" timestamp with time zone;
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "users_account_username_unique"
ON "users" USING btree ("account_id","username");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "auth_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "account_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "unit_id" uuid,
  "auth_method" varchar(32) DEFAULT 'password' NOT NULL,
  "ip_address" varchar(64),
  "user_agent" varchar(512),
  "issued_at" timestamp with time zone DEFAULT now() NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
  "revoked_at" timestamp with time zone,
  "revoked_reason" varchar(255),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "auth_sessions"
 ADD CONSTRAINT "auth_sessions_account_id_accounts_id_fk"
 FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id")
 ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "auth_sessions"
 ADD CONSTRAINT "auth_sessions_user_id_users_id_fk"
 FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
 ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "auth_sessions"
 ADD CONSTRAINT "auth_sessions_unit_id_units_id_fk"
 FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id")
 ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "auth_sessions_account_idx"
ON "auth_sessions" USING btree ("account_id","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "auth_sessions_user_idx"
ON "auth_sessions" USING btree ("user_id","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "auth_sessions_active_idx"
ON "auth_sessions" USING btree ("user_id","revoked_at","expires_at");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "access_scopes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "account_id" uuid NOT NULL,
  "scope_type" varchar(32) NOT NULL,
  "scope_key" varchar(64) NOT NULL,
  "name" varchar(255) NOT NULL,
  "description" varchar(512),
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "access_scopes"
 ADD CONSTRAINT "access_scopes_account_id_accounts_id_fk"
 FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id")
 ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "access_scopes_account_type_key_unique"
ON "access_scopes" USING btree ("account_id","scope_type","scope_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "access_scopes_account_type_idx"
ON "access_scopes" USING btree ("account_id","scope_type");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "user_scope_assignments" (
  "user_id" uuid NOT NULL,
  "scope_id" uuid NOT NULL,
  "granted_by_user_id" uuid,
  "granted_at" timestamp with time zone DEFAULT now() NOT NULL,
  "expires_at" timestamp with time zone,
  CONSTRAINT "user_scope_assignments_pkey" PRIMARY KEY("user_id","scope_id")
);
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "user_scope_assignments"
 ADD CONSTRAINT "user_scope_assignments_user_id_users_id_fk"
 FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
 ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "user_scope_assignments"
 ADD CONSTRAINT "user_scope_assignments_scope_id_access_scopes_id_fk"
 FOREIGN KEY ("scope_id") REFERENCES "public"."access_scopes"("id")
 ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "user_scope_assignments"
 ADD CONSTRAINT "user_scope_assignments_granted_by_user_id_users_id_fk"
 FOREIGN KEY ("granted_by_user_id") REFERENCES "public"."users"("id")
 ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "user_scope_assignments_scope_idx"
ON "user_scope_assignments" USING btree ("scope_id","granted_at");
