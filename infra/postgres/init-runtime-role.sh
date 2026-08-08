#!/bin/sh
set -eu

: "${POSTGRES_USER:?POSTGRES_USER is required}"
: "${POSTGRES_DB:?POSTGRES_DB is required}"
: "${POSTGRES_RUNTIME_USER:=cvg_runtime}"
: "${POSTGRES_RUNTIME_PASSWORD:?POSTGRES_RUNTIME_PASSWORD is required}"

# API and worker must never share a login credential. The legacy runtime role
# remains provisioned for controlled migrations/rollback compatibility only.
POSTGRES_API_USER="${POSTGRES_API_USER:-cvg_api}"
POSTGRES_API_PASSWORD="${POSTGRES_API_PASSWORD:-$POSTGRES_RUNTIME_PASSWORD}"
POSTGRES_WORKER_USER="${POSTGRES_WORKER_USER:-cvg_worker}"
POSTGRES_WORKER_PASSWORD="${POSTGRES_WORKER_PASSWORD:-$POSTGRES_RUNTIME_PASSWORD}"

validate_role_name() {
  case "$1" in
    ''|*[!A-Za-z0-9_]*)
      echo "Invalid PostgreSQL role name: $1" >&2
      exit 1
      ;;
  esac
}

validate_role_name "$POSTGRES_RUNTIME_USER"
validate_role_name "$POSTGRES_API_USER"
validate_role_name "$POSTGRES_WORKER_USER"

if [ "$POSTGRES_API_USER" = "$POSTGRES_WORKER_USER" ]; then
  echo "POSTGRES_API_USER and POSTGRES_WORKER_USER must be different" >&2
  exit 1
fi

provision_role() {
  role_name="$1"
  role_password="$2"

  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
    --set=runtime_user="$role_name" \
    --set=runtime_password="$role_password" \
    --set=db_name="$POSTGRES_DB" <<'SQL'
SELECT format(
  'CREATE ROLE %I LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD %L',
  :'runtime_user',
  :'runtime_password'
)
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'runtime_user')
\gexec

ALTER ROLE :"runtime_user"
  LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS
  PASSWORD :'runtime_password';

SELECT format('REVOKE %I FROM %I', inherited.rolname, :'runtime_user')
FROM pg_auth_members membership
JOIN pg_roles member ON member.oid = membership.member
JOIN pg_roles inherited ON inherited.oid = membership.roleid
WHERE member.rolname = :'runtime_user'
\gexec

GRANT CONNECT ON DATABASE :"db_name" TO :"runtime_user";
GRANT USAGE ON SCHEMA public TO :"runtime_user";
SELECT format('GRANT USAGE ON SCHEMA %I TO %I', nspname, :'runtime_user')
FROM pg_namespace
WHERE nspname = 'app'
\gexec
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM :"runtime_user";
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM :"runtime_user";
SELECT format('REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA %I FROM %I', nspname, :'runtime_user')
FROM pg_namespace
WHERE nspname = 'app'
\gexec
SELECT format('REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA %I FROM PUBLIC', nspname)
FROM pg_namespace
WHERE nspname = 'app'
\gexec

SELECT format(
  'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO %I',
  class.relname,
  :'runtime_user'
)
FROM pg_class AS class
JOIN pg_namespace AS namespace ON namespace.oid = class.relnamespace
WHERE namespace.nspname = 'public'
  AND class.relkind IN ('r', 'p')
  AND class.relrowsecurity
\gexec

-- Audit is append-only for every runtime service role.
SELECT format('REVOKE UPDATE, DELETE, TRUNCATE ON TABLE public.%I FROM %I', class.relname, :'runtime_user')
FROM pg_class AS class
JOIN pg_namespace AS namespace ON namespace.oid = class.relnamespace
WHERE namespace.nspname = 'public' AND class.relname = 'audit_events';
\gexec

SELECT format('GRANT SELECT ON TABLE public.%I TO %I', candidate.table_name, :'runtime_user')
FROM (
  VALUES
    ('accounts'), ('tenants'), ('roles'), ('permissions'), ('role_permissions'),
    ('user_roles'), ('cfop_entries'), ('cofins_tables'), ('ibs_cbs_tables'),
    ('icms_rules'), ('icms_tables'), ('ipi_tables'), ('ncm_entries'),
    ('nfse_layouts'), ('pis_cofins_rules'), ('pis_tables')
) AS candidate(table_name)
JOIN pg_class AS class ON class.relname = candidate.table_name
JOIN pg_namespace AS namespace ON namespace.oid = class.relnamespace
WHERE namespace.nspname = 'public';
\gexec

SELECT format(
  'GRANT USAGE, SELECT ON SEQUENCE public.%I TO %I',
  class.relname,
  :'runtime_user'
)
FROM pg_class AS class
JOIN pg_namespace AS namespace ON namespace.oid = class.relnamespace
WHERE namespace.nspname = 'public' AND class.relkind = 'S'
\gexec

SELECT format('GRANT EXECUTE ON FUNCTION %I.%I() TO %I', namespace.nspname, procedure.proname, :'runtime_user')
FROM pg_proc AS procedure
JOIN pg_namespace AS namespace ON namespace.oid = procedure.pronamespace
WHERE namespace.nspname = 'app'
  AND procedure.proname IN ('current_account_id', 'has_account_context')
\gexec
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
SQL
}

provision_role "$POSTGRES_RUNTIME_USER" "$POSTGRES_RUNTIME_PASSWORD"
provision_role "$POSTGRES_API_USER" "$POSTGRES_API_PASSWORD"
provision_role "$POSTGRES_WORKER_USER" "$POSTGRES_WORKER_PASSWORD"
