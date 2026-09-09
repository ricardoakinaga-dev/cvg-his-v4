# Triple-A — 07 Events and Audit

**Status:** POLICY READY / RUNTIME EVIDENCE OPEN

Governança de eventos, outbox/inbox, auditoria e idempotência estão descritas em [`EVENT_GOVERNANCE.md`](../architecture/EVENT_GOVERNANCE.md) e [`IDEMPOTENCY_MATRIX.md`](../architecture/IDEMPOTENCY_MATRIX.md). O unit of work mantém fatos transacionais de comando, outbox e auditoria no limite do tenant.

Persistência imutável, replay sob revogação, concorrência entre consumidores e recuperação após falha precisam de execução em banco/infra real.
