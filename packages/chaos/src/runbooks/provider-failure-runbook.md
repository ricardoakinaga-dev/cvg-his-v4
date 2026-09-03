# External Provider Failure Runbook

## Scope

This runbook covers required payment, fiscal, laboratory and messaging provider
unavailability. The in-process experiment degrades the aggregate external
provider signal and readiness without contacting a real vendor. Provider-specific
timeouts, rejection codes and reconciliation must still be exercised in each
approved sandbox before go-live.

## Detection

- `chaos_experiment_active{experiment="provider-failure"}` is `1`.
- `/chaos/experiments` reports `externalProvidersHealthy=false`.
- `/ready` returns `503` while the simulated required-provider outage is active.
- Vendor probes, delivery queues and reconciliation dashboards identify the
  affected provider in a target environment.

## Containment

1. Stop new provider-dependent mutations or place them in their durable pending
   state; never acknowledge a local-only success.
2. Preserve idempotency keys and raw provider references required for replay.
3. Keep clinical work available when safe, but communicate that fiscal,
   settlement, laboratory or messaging completion is delayed.
4. Do not switch silently to a mock or another tenant/provider credential.

## Recovery

1. Confirm vendor status and validate credentials through the secrets manager.
2. Stop the experiment and verify `/ready` returns `200`.
3. Replay pending work through the owned worker/DLQ procedure.
4. Reconcile local state against the provider and investigate duplicates,
   rejections and ambiguous timeouts.
5. Record timestamps, SHA, environment, provider, queue depth, reconciliation
   result, owner and approver without storing credentials or sensitive payloads.
