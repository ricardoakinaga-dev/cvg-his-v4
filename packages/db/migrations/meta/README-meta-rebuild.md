# Drizzle meta rebuild note

## Current status

The active migration line is intentionally capped at:
- `0017_r3_billing_discount.sql`

Artifacts generated from schema/meta drift were isolated and must **not** be applied:
- `packages/db/migrations/.isolated-drift/0018_outgoing_leopardon.sql`
- `packages/db/migrations/.isolated-drift/0018_snapshot.json`
- older generated drift backups in `.backup-meta-fix/`

## Why this exists

Drizzle `meta/_journal.json` had historical gaps/inconsistencies:
- `0012_normal_emma_frost` was missing from the journal
- `0015_r3_catalog_minimum`, `0016_r3_billing_items`, and `0017_r3_billing_discount` were also missing
- with that broken history, `drizzle-kit generate` started reintroducing already-existing schema as fake forward migrations

## Safe rule

Do **not** apply any generated migration after `0017` until the canonical meta line is rebuilt.

## Next canonical rebuild path

1. Keep SQL history `0000`..`0017` as the source of truth.
2. Reconstruct a canonical Drizzle `meta/` chain from a clean database replay of `0000`..`0017`.
3. Replace the ad-hoc journal/snapshot state with the rebuilt canonical artifacts.
4. Re-run `drizzle-kit generate` and confirm it does not emit phantom migrations.

## Local validation status

- Local Postgres already has `discount_amount` and related constraints applied.
- `his-web` and `his-api` were still responding after the billing discount changes.
