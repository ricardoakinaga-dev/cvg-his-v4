# Idempotency Matrix

| Operation family | Key scope | Durable fact | Replay contract | Current evidence |
|---|---|---|---|---|
| Clinical command | account + operation + client key + actor binding | command result/idempotency record + audit | current actor binding and route permission revalidated before returning cached result; legacy rows fail closed | PARTIAL: implementation and unit coverage; HTTP/DB runtime evidence open |
| Prescription execution | account + execution operation + key | execution state and audit | same actor/permission and state transition rules | PARTIAL |
| Billing/receipt | account + operation + key | billing/receipt/settlement record | exact cents, intent/record linkage, no duplicate side effect | PARTIAL |
| PIX/provider webhook | account + provider event/intent identity | inbox/intent/settlement/reconciliation | same event cannot settle twice; divergence goes to reconciliation | PARTIAL |
| Outbox consumer | account + event ID + consumer name | inbox receipt + side effect | completed consumer is skipped only after current envelope/tenant validation | PARTIAL |
| Attachment upload | account + object/key/fingerprint | metadata/scan status | duplicate object is safe; changed content is rejected | PARTIAL |
| Worker scheduled report | account + schedule/execution ID | lease/checkpoint/delivery history | stale lease cannot finalize; retry preserves identity | PARTIAL |

No operation may use a tenant-scoped key as a substitute for current authentication or authorization. `idempotency_requests.actor_user_id` is populated for new records; completed rows without an actor binding are rejected until they expire or are rebuilt. Critical clinical route families repeat the current permission check before the lookup/replay. Generic unmapped route families remain an explicit evidence gap and cannot support a Triple-A claim without route-level contract coverage.
