# Handoff — auditoria de persistência de webhooks e fila HTTP durável — 2026-08-24

## Estado para a próxima sessão

Objetivo atual: implementar o próximo gate de webhook delivery (queue/janela de retry/DLQ/lease fencing/SIGKILL takeover) com base no padrão já usado no outbox.

Execução já confirmada:

- O fluxo de eventos persiste webhook delivery no banco durante processamento de outbox (`WebhooksEventHandlers` chama `webhooks.enqueue` quando disponível).
- O caminho atual de entrega HTTP não é realmente assíncrono/robusto: `dispatch()` faz `createDelivery` e chama `#deliverWithRetry` no mesmo fluxo (sincrono).
- A execução por worker ainda não tem loop dedicado para reprocessar `webhook_deliveries` pendentes.

## Evidência rastreada (caminho real)

- Arquivos centrais:
  - `packages/modules/event-consumers/src/webhooks.consumer.ts` (switch por `eventType`, usa `enqueue ?? dispatch`).
  - `packages/modules/webhooks/src/index.ts` (`dispatch`, `enqueue`, `#deliverWithRetry`, `#attemptDelivery`, `retestDelivery`).
  - `packages/modules/webhooks/src/repositories/webhook-repository.interface.ts` (`findPendingDeliveries` apenas, sem claim/lease).
  - `packages/modules/webhooks/src/repositories/database-webhook.repository.ts` (`findPendingDeliveries` sem claim/locking/lease).
  - `packages/db/migrations/0009_webhook_tables.sql` + `0065_tenant_isolation_auth_webhook_clinical_links.sql`.
  - `apps/worker/src/index.ts` + `apps/worker/src/runner.ts` (ticks de worker: notificações, event bus, relatórios; sem tick de webhook).
  - `apps/api/src/runtime-repositories.ts` e `apps/api/src/bootstrap.ts` (repositório in-memory também não tem claim/lease).
  - `packages/shared/database/src/schemas/index.ts` (colunas atuais de `webhook_deliveries` em Drizzle).
  - `packages/shared/types/src/index.ts` (status de delivery: `pending | delivered | failed`).
  - Testes:
    - `tests/integration/webhook-persistence.test.ts`
    - `tests/integration/database/worker-event-consumers-postgres.test.ts`
    - `packages/modules/webhooks/src/webhooks.test.ts`

## O que foi encontrado (gaps)

1) Fila de entrega durável:
- `worker` já registra e processa outbox, mas não há consumidor dedicado a `webhook_deliveries`; entrega fica somente na persistência.
- `dispatch()` processa inline e pode travar pipeline se houver falha de rede.

2) Claims/leases/tenant scoping insuficientes para entrega concorrente:
- Não há campos de lease em `webhook_deliveries`.
- `findPendingDeliveries` é leitura simples, sem `FOR UPDATE SKIP LOCKED` e sem fencing.
- Sem controle por `lease_owner/lease_token/lease_version`.

3) Retry/DLQ inconsistentes:
- `#deliverWithRetry` atualiza `next_retry_at`, mas continua o loop imediatamente (sem respeitar atraso real no agendador).
- Status não modela `retrying`/`processing`; só existe `pending`, `delivered`, `failed`.
- Não há transição explícita para `failed` como DLQ com erro final persistido.

4) Retest / concorrência:
- `retestDelivery` reseta e chama `#deliverWithRetry` via `void`, sem claim/lease; pode haver dupla entrega sob concorrência.

5) RLS e integridade:
- `0065_tenant_isolation_auth_webhook_clinical_links.sql` já adiciona `account_id`, FK e política tenant, mas não cobre concorrência de worker.

## Invariantes mínimas recomendadas para produção (next gate)

- **tenant-scoped estrito**: nenhuma linha de entrega é processada por worker sem `account_id` no escopo atual.
- **claim com fencing**: cada tentativa processada por `claim` exclusivo com `lease_owner`, `lease_token`, `lease_version`, `lease_expires_at`.
- **retry real**: `scheduled/nextRetryAt` respeitado por consulta em ticks (`due <= now()`), com backoff exponencial.
- **DLQ explícita**: terminal com `failed` + código de erro persistido e metadados de falha.
- **takeover por SIGKILL**: se lease expira, outro worker deve assumir entrega sem duplicidade.

## Direção de desenho (mínima alteração, alinhado ao outbox pattern)

1) Schema/migration:
- Criar migration incremental em `webhook_deliveries` para adicionar:
  `lease_owner`, `lease_token`, `lease_version`, `lease_expires_at`, `response_error`, `last_retry_error_at`, `max_attempts`.
- Ajustar checks/índices para estado de lease (similar a `0077_outbox_delivery_leases.sql`) e incluir status `processing`/`retrying` no modelo.

2) Domínio e persistência:
- Expandir `WebhookDeliverySummary` para conter campos de lease e, se necessário, `responseError` e `maxAttempts`.
- Expandir `WebhookRepository` com interface de claim:
  - `claimPending(accountId, limit, leaseOwner, leaseMs)`
  - `renewClaim(claim, leaseMs)`
  - `completeClaim(claim, processedAt)`
  - `retryClaim(claim, input)`
  - `failClaim(claim, error)`
  - `findFailed(limit?)` (inspeção DLQ).

3) Worker:
- Adicionar no tick (`apps/worker/src/runner.ts`) um novo processamento de webhook deliveries por account.
- Criar classe/serviço de executor HTTP semelhante ao `EventBusService` com heartbeat de lease.
- `enqueue` dos eventos de domínio deve apenas persistir; o envio fica exclusivamente no worker.

4) Retry e takeover:
- `nextRetryAt`/`scheduledAt` governado por consulta SQL; processar apenas elegíveis (`status in pending/retrying && due` ou `processing && lease_expired`).
- Ao atingir limite, marcar `failed` com erro final em campo dedicado.

5) Observabilidade:
- Incluir contadores/timings (`pending/retrying/processing/failed`), metadados de lease e causa de falha.

## Plano de teste (próxima sessão)

- Unit:
  - claim sem sobreposição entre dois "workers".
  - takeover após expiry com novo `lease_owner`.
  - retry agendado e `nextRetryAt` respeitado.
  - reprocessamento somente por claim ativo.
- Integração (Postgres):
  - `worker-event-consumers-postgres` continua verificando `delivery` fica `pending` no evento.
  - novo teste de worker webhook executor: processar `pending` para `delivered`, validar `webhook_deliveries` por account.
  - simular SIGKILL/reinício e garantir retomada sem perda de idempotência.

## Observação para continuação

- Esta documentação foi gerada para preservar o estado de investigação atual.
- O cache `packages/design-system/tsconfig.vue.tsbuildinfo` não pertence a este gate e pode ficar sem stage.
