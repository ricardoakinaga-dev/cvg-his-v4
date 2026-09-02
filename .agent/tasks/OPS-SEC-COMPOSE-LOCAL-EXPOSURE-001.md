# OPS-SEC — Canonical Compose local exposure and health contracts

**Status:** COMPLETE_BOUNDED / PASS_BOUNDED  
**Priority:** P1  
**Owner:** root integrator  
**Date opened:** 2026-08-31

## Objective

Harden the repository's canonical local `docker-compose.v2.yml` surface so
host-published services are loopback-only by default, observability cannot
start with the Grafana `admin/admin` fallback, the worker has an explicit
readiness healthcheck, cutover waits for an actually healthy worker, and
Prometheus scrapes the canonical Compose service DNS/ports.

## Authorized scope

- Bind the published local Compose ports for PostgreSQL, Redis, OTEL,
  Prometheus, Grafana, API and SPA to `127.0.0.1` while preserving their host
  port numbers and existing Caddy host contract.
- Require `GRAFANA_ADMIN_PASSWORD` in the canonical Compose service, keep the
  example value blank, and make CI inject only a run-scoped synthetic value for
  configuration validation.
- Add the worker `/ready` healthcheck and make the local cutover helper require
  `healthy` for services with declared healthchecks, including the worker.
- Point the Compose Prometheus configuration at `cvg-his-v2-api:3001` and
  `cvg-his-v2-worker:3002`; synchronize the active observability README.
- Keep the documented observability startup command executable by specifying
  both `.env.v2` and `docker-compose.v2.yml` explicitly.
- Add focused static/config contract tests and preserve existing service,
  image, port-number, restart, readiness and observability semantics.

CI configuration validation is in scope only to supply the synthetic value
needed by the fail-closed Grafana interpolation; it does not create or rotate
any real credential.

## Explicit exclusions

- No Helm, target cluster, production host, firewall, DNS, Caddy deployment or
  external infrastructure changes.
- No credential generation, rotation, provider, database schema, migration,
  RLS, API business logic or worker processing changes.
- No changes to `docker-compose.dev.yml`, archived `docs/docs2`, real `.env`
  files (none are present), external systems or release promotion.
- No claim that a local Compose contract proves production exposure,
  distributed observability, backup/restore, RTO/RPO or global ERP readiness.

## Quality bar

Close only as `COMPLETE_BOUNDED` / `PASS_BOUNDED` after intentional TDD RED,
focused GREEN, real Compose rendering with an explicitly supplied ephemeral
Grafana secret, fail-closed rendering with the blank example secret, shell
syntax validation, infra regression tests, deploy-surface/readiness checks,
security/static controls, independent read-only review and control-plane
reconciliation. Declarative YAML and shell contracts are covered by exhaustive
focused assertions; the global ERP remains `IN_PROGRESS/PARTIAL` and promotion
remains `BLOCKED`.

## Scout evidence — 2026-08-31

Local read-only inspection confirmed the following bounded findings:

- `docker-compose.v2.yml:29,44,100,112,124,174,228` publish host ports without
  an explicit loopback host address.
- `docker-compose.v2.yml:121-122` falls back to `admin/admin` for Grafana,
  and `.env.v2.example:115-116` repeats that weak default.
- `docker-compose.v2.yml:182-210` has no worker healthcheck even though the
  worker exposes `/ready` and `/metrics` from `apps/worker/src/index.ts`.
- `infra/scripts/cutover-v2.sh:135-149` accepts `running` as sufficient for
  every service, and `:245-250` skips worker HTTP health by default.
- `infra/observability/prometheus.yml:12,20` targets host ports that do not
  match the canonical Compose network: API is internal `3001` and the worker
  has no published host port.
- `infra/observability/README.md:138-157` documents stale host-based targets.

The delegated scout did not return after repeated bounded waits and was shut
down; no independent approval is inferred. This task therefore relies on the
fresh local evidence above and requires a later independent review before
closure.

Evidence: `.agent/verification.jsonl#VFY-SCOUT-OPS-SEC-COMPOSE-LOCAL-EXPOSURE-001`.

## RED evidence — 2026-08-31

The new focused contract file was run before implementation and failed `5/5`:

- published canonical service ports were not loopback-bound;
- Grafana still resolved `GRAFANA_ADMIN_PASSWORD` with `:-admin` and the
  example still contained `admin`;
- the worker had no Compose readiness healthcheck;
- cutover still accepted `running` and skipped worker HTTP health by default;
- Prometheus and the active README still used host-based/stale targets.

The Vitest setup database was ephemeral and was dropped during teardown. The
exact pre-implementation result is recorded at
`.agent/verification.jsonl#VFY-OPS-SEC-COMPOSE-LOCAL-EXPOSURE-RED-001`.

## Review-remediation RED evidence — 2026-08-31

Two follow-up RED checks were intentionally added during review remediation:

- the CI contract initially failed `5/6` because the new blank example had no
  synthetic password in the Compose validation step;
- the documentation contract initially failed `5/6` because the corrected
  command still omitted the explicit `-f docker-compose.v2.yml` selector.
- the final security review exposed the unnecessary Prometheus
  `host.docker.internal` gateway mapping; its removal was covered by a final
  focused RED/GREEN cycle.

Both were corrected and are covered by the final focused and infra regression
runs.

## Final verification — 2026-08-31

- Focused Compose/security contracts: `6/6`.
- Final infrastructure regression (`compose-local-security`,
  `runtime-lifecycle`, `runtime-role-grants`, `ci-contract`): `31/31`.
- Compose with a synthetic Grafana password renders successfully; the blank
  example fails closed with the required-variable error.
- Worker probe accepts HTTP 200 and rejects HTTP 503; cutover requires only
  `healthy`.
- Workspace typecheck, lint and build pass for `70/71` selected workspace
  projects; the root aggregator is excluded. Existing non-failing warnings and
  the unrelated `counterSales.ts` lint baseline remain outside this slice.
- Deploy readiness/surface, OpenAPI, namespaces, migration source, RLS,
  secret scan, backup/restore, formatting, shell syntax and diff checks pass.
- Fresh independent review returned `APPROVE_BOUNDED` with no actionable
  finding after remediation.

The child is closed as `COMPLETE_BOUNDED` / `PASS_BOUNDED`. No commit or push
was performed; the mixed dirty worktree was preserved.

## Residuals and non-promotion

The slice is local Compose/configuration hardening only. Target/production
firewalls and secrets, Helm parity, remote CI, real observability, provider
homologation, backup/restore, cutover acceptance, Vetus parity and global ERP
readiness remain outside scope and unresolved.
