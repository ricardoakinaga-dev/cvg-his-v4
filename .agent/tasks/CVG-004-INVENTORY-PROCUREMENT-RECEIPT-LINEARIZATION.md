# CVG-004 — inventory purchase-receipt linearization

**Status:** `COMPLETE_BOUNDED` — parent CVG-004/global ERP remains `IN_PROGRESS/PARTIAL`  
**Stage/activity:** `CLOSE` / `RECONCILED`  
**Priority:** `P1`  
**Owner:** root integrator with TDD and independent review  
**Parent:** CVG-004 inventory/procurement parity journey  
**Tier/risk/blast radius:** `T4_CRITICAL` / `HIGH` / `CROSS_INSTANCE_DATABASE`  
**Authority:** `.agent/authority.jsonl#AUTH-CVG-004-INVENTORY-PROCUREMENT-RECEIPT-LINEARIZATION-IR-001`

## Residual problem

The database-backed procurement receive flow validates and calculates against a
process-local `InventoryPurchaseSummary`. It credits each inventory item and
then persists the entire purchase snapshot by updating the header and deleting
and reinserting all purchase lines. There is no authoritative purchase reload
or row lock at the start of the receive operation.

The inventory repository already protects each individual item balance with a
compare-and-swap predicate. That is not an aggregate purchase lock: two
concurrent requests for different purchase lines can both credit stock, then
the later full-snapshot purchase save can erase the earlier line quantity,
status and `receivedAmount`. Existing sequential persistence tests do not
exercise this two-instance boundary.

## Frozen bounded contract

1. For a database-backed `receivePurchase`, the service obtains transaction
   ownership and reloads the authoritative purchase aggregate with a
   `FOR UPDATE` row lock before validating or calculating the receipt. The
   lock remains held through all inbound inventory writes and the purchase
   aggregate save.
2. Two concurrent receives for different lines of the same approved purchase
   converge without lost line progress: every successful inventory movement has
   matching persisted purchase-line quantity, `receivedAmount` and status.
   The existing inventory-item CAS, lot metadata, purchase amount checks and
   tenant context remain enforced.
3. A concurrent same-line over-receipt is rejected after the winning state is
   observed, with no additional purchase or stock mutation. Missing or
   cross-account purchases remain not-found/tenant-safe.
4. The public receive payload/response, invoice requirement, allowed status
   transitions, duplicate-line validation, quantity validation and audit/
   idempotency command seams remain compatible. In-memory procurement behavior
   remains compatible.
5. No migration or schema redesign is authorized unless implementation evidence
   proves the existing purchase row and constraints insufficient. Transfer,
   consumption, reservation, reports, providers, target, production,
   deployment, release and global ERP promotion remain outside scope.

## Bounded outcome

The database-backed receive path now owns/reuses a tenant transaction, locks and
reloads the authoritative purchase aggregate before validation, and holds that
lock through inventory CAS/lots/movements and aggregate persistence. The
intentional PostgreSQL race is green, the focused/module/API/workspace
regressions pass, and the quality/static gates pass within the documented
repository baseline.

The independent review was attempted through the configured and compatible
agent paths but was unavailable because of model/account rejection and timeouts.
No approval is inferred; the verified gate is therefore conditional, MEDIUM
confidence, and requires a fresh compatible review before higher-confidence use
or scope expansion.

## TDD and quality bar

### RED

- Add a disposable PostgreSQL concurrency test that hydrates two independent
  inventory/procurement service instances before starting two tenant
  transactions, then receives different lines of one purchase concurrently.
- The pre-fix assertion must fail because the persisted purchase aggregate loses
  one line even though both distinct inventory-item movements can commit.
- Preserve the existing sequential partial/full receive, invalid-transition,
  tenant and persistence tests. Record the intentional RED before production
  changes.

### GREEN

- Add the smallest repository/service seam needed to own the database
  transaction and obtain a fresh locked purchase aggregate.
- Use fresh immutable purchase/line objects; do not mutate cache values.
- Keep the database repository parameterized and account-scoped. Do not weaken
  the inventory balance CAS or convert a conflict into a silent retry.
- Run the focused module and PostgreSQL race tests, compiled API regression,
  workspace typecheck/build, official coverage and targeted static/security
  checks. Attempt a fresh independent read-only review; if unavailable, retain
  the explicit conditional limitation in the verified gate.

## Explicit non-claims

This task proves only the repository-local database-backed purchase receiving
aggregate race. It does not certify every inventory command, the full
clinical-financial journey, purchase fiscal/NF semantics, reports/exports,
cross-domain ledger/outbox behavior, target roles/RLS, external providers,
production, deployment, release, accessibility, Vetus parity or global ERP
readiness.

## Evidence plan

- `.agent/gates/implementation-ready-CVG-004-INVENTORY-PROCUREMENT-RECEIPT-LINEARIZATION.json`
- `.agent/gates/verified-CVG-004-inventory-procurement-receipt-linearization.json`
- `.agent/authority.jsonl#AUTH-CVG-004-INVENTORY-PROCUREMENT-RECEIPT-LINEARIZATION-IR-001`
- `.agent/verification.jsonl#VFY-SCOUT-CVG-004-INVENTORY-PROCUREMENT-RECEIPT-LINEARIZATION-001`
- `.agent/verification.jsonl#VFY-SCOUT-CVG-004-INVENTORY-PROCUREMENT-RECEIPT-LINEARIZATION-INDEPENDENT-001`
- `.agent/verification.jsonl#VFY-CVG-004-INVENTORY-PROCUREMENT-RECEIPT-LINEARIZATION-RED-001`
- `.agent/verification.jsonl#VFY-CVG-004-INVENTORY-PROCUREMENT-RECEIPT-LINEARIZATION-GREEN-001`
- `.agent/verification.jsonl#VFY-CVG-004-INVENTORY-PROCUREMENT-RECEIPT-LINEARIZATION-REGRESSION-001`
- `.agent/verification.jsonl#VFY-CVG-004-INVENTORY-PROCUREMENT-RECEIPT-LINEARIZATION-REGRESSION-002`
- `.agent/verification.jsonl#VFY-CVG-004-INVENTORY-PROCUREMENT-RECEIPT-LINEARIZATION-QUALITY-001`
- `.agent/verification.jsonl#VFY-CVG-004-INVENTORY-PROCUREMENT-RECEIPT-LINEARIZATION-REVIEW-UNAVAILABLE-001`
- `.agent/verification.jsonl#VFY-CVG-004-INVENTORY-PROCUREMENT-RECEIPT-LINEARIZATION-GLOBAL-NON-PROMOTION-001`
- `.agent/artifacts/CVG-004-INVENTORY-PROCUREMENT-RECEIPT-LINEARIZATION-2026-08-30.md`
- `packages/modules/inventory/src/procurement.ts`
- `packages/modules/inventory/src/repositories/database-inventory.repository.ts`
- `packages/db/migrations/0085_inventory_procurement.sql`
- `packages/modules/inventory/src/inventory.test.ts`
- `tests/integration/database/inventory-procurement-postgres.test.ts`
- `apps/api/src/routes/inventory-routes.ts`
- `apps/api/src/helpers/tenant-command.ts`

## Decision boundary

Only the database-backed purchase receive transaction seam, authoritative
purchase row lock/reload, and their bounded unit/PostgreSQL tests are
authorized. The bounded slice is reconciled as `PASS_BOUNDED`; obtain a fresh
compatible independent review before higher-confidence use. Stop and request
fresh authority before changing schema, purchase fiscal semantics, other
inventory commands, reports, providers, target operations,
production/deployment/release or global ERP behavior.
