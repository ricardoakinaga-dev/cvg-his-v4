# Triple-A — 07 Events and Audit

**Status:** POLICY + WORKFLOW EVENTS IMPLEMENTED / RUNTIME EVIDENCE OPEN

Governança de eventos, outbox/inbox, auditoria e idempotência estão descritas em [`EVENT_GOVERNANCE.md`](../architecture/EVENT_GOVERNANCE.md) e [`IDEMPOTENCY_MATRIX.md`](../architecture/IDEMPOTENCY_MATRIX.md). O unit of work mantém fatos transacionais de comando, outbox e auditoria no limite do tenant.

O control plane de workflows agora grava eventos append-only para criação,
claim, reconhecimento, conclusão, retry, DLQ, replay, cancelamento e
escalonamento, sempre com correlação/causação e ator quando disponível.
O produtor de alta usa chave determinística e sincroniza criação, alteração,
cancelamento e reabertura da pendência. Replay HTTP tem permissão dedicada,
chave estável por revisão e reautorização antes de qualquer resposta idempotente.
Persistência imutável, replay sob revogação, concorrência entre consumidores e
recuperação após falha ainda precisam de execução em banco/infra real.
