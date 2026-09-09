# Event Governance

## Event contract

Every durable event has a versioned type, event ID, account/tenant identity, aggregate/entity reference, actor or service principal, correlation/causation, occurred-at timestamp, schema version, payload fingerprint and retry policy. Clinical and financial events must not carry secrets or unnecessary PHI.

## Ownership and compatibility

Producers own the event contract and migration notes; consumers declare supported versions and idempotency behavior. Breaking changes require a new version, dual-read/dual-write plan where needed, replay fixture and rollback path. Unknown versions fail closed into a visible quarantine/DLQ, not a silent success.

## Delivery

Outbox append, inbox claim/receipt, lease fencing, audit and consumer side effect must be observable and tenant-bound. A consumer may acknowledge only after durable completion. Replays use the same event identity but a new operational correlation and current authorization.

## Evidence

The event-bus source and tests cover retry, DLQ, lease and partial-consumer behavior. Production consumer composition and broad failure/replay evidence remain release inputs.
