---
document_status: current
document_kind: operations-policy
effective_date: 2026-09-09
owner: Backend e Operações
review_cycle: a cada alteração nos consumidores ou nas transições de retry/DLQ
---

# Política de retry e DLQ dos jobs do worker

Esta é a política operacional da implementação atual de `apps/worker`. Ela
descreve o comportamento efetivo do código, não uma garantia de entrega além
dos limites indicados. O worker executa uma conta por vez, em ordem
determinística, e cada conta recebe seu próprio contexto de tenant. O intervalo
entre ticks é `WORKER_INTERVAL_MS` (padrão: 5 segundos), contado após o tick
anterior terminar.

## Isolamento por conta e por job

O entrypoint contínuo executa os jobs de cada conta em sequência. Cada etapa é
isolada por nome (`pix_payment_dispatch`, `pix_provider_settlement`,
`notifications`, `event_bus`, `webhook_deliveries` e `scheduled_reports`). Uma
exceção é registrada com `accountId` e nome do job e não impede as etapas
seguintes nem as demais contas do mesmo tick. O wrapper de isolamento não cria
retry nem DLQ e não altera o estado persistido do job que falhou; a recuperação
depende da fila/estado daquele job no próximo tick ou de redrive administrativo.

Esse isolamento não transforma um job lento em execução concorrente: uma
operação que não retorna continua ocupando o tick. Limites de lote permanecem
os atuais: notificações, event-bus e webhooks processam no máximo 25 itens por
conta por chamada do runner.

## Política por tipo

| Job | Estado inicial e limite | Falha transitória | Exaustão / DLQ | Redrive |
|---|---|---|---|---|
| Notificações internas | `notification_jobs.status = queued`; seleciona os mais antigos por `scheduled_at`, até 25 por conta | Não há retry automático implementado. No caminho de sucesso, o job é marcado `processed` e `attempts` é incrementado; uma exceção de persistência/hook pode deixar estado parcial e é apenas isolada no worker | Não há estado `failed` operado pelo worker e não há DLQ de notificações | Não há operação de redrive específica implementada |
| Event-bus / outbox | `outbox_events` elegíveis (`pending`/`retrying`) são reivindicados com lease de 60 s; padrão de `maxAttempts`: 3 | Retry com backoff exponencial: 1 s, 2 s, 4 s ... limitado a 60 s. O claim incrementa `attempts`; handlers são executados com consumidor nomeado e, quando configurado, guard durável/inbox | Após `attempts >= maxAttempts`, estado `failed` e erro com marcador `[DLQ]`; lease expirado na tentativa final também vai para `failed` | `EventBusService.reprocessEvent(accountId, eventId)` reseta a tentativa para `pending`. Deve ser executado no contexto administrativo da conta e com investigação do erro |
| Webhooks | `webhook_deliveries` elegíveis (`pending`/`retrying`, ou lease expirado) são reivindicados com lease de 60 s; padrão de `maxAttempts`: 4 | Uma tentativa de rede por claim, com timeout de 10 s; atrasos fixos de 5 s, 30 s e 90 s. A entrega usa `Idempotency-Key = delivery.id` | Após a quarta tentativa sem sucesso, estado `failed`, `dead_lettered_at` preenchido e `next_retry_at` nulo | `WebhooksService.requeueDelivery(accountId, deliveryId)` reseta a tentativa para `pending`; requer análise do destino e do payload antes do redrive |

`failed` do outbox e `dead_lettered_at` de webhook são estados terminais de
quarentena, não descarte silencioso. O contrato de entrega continua sendo
at-least-once: um timeout ou crash depois do efeito externo e antes da
transição durável pode produzir nova tentativa; consumidores externos devem
usar a identidade estável da entrega quando disponível.

## Contenção e operação

1. Verifique primeiro a conta afetada e o `correlationId`; não redrive uma
   conta diferente.
2. Para outbox, inspecione o evento `failed`, os consumidores nomeados e o
   último erro antes de chamar `reprocessEvent`.
3. Para webhook, confirme URL, assinatura, resposta HTTP e motivo de
   `dead_lettered_at` antes de `requeueDelivery`.
4. Não conte uma exceção do wrapper do worker como retry bem-sucedido: ela
   prova somente que a conta/job seguinte não foi starved e que o trabalho
   persistido permanece sujeito à política acima.
5. Monitore backlog por conta, idade do item mais antigo, tentativas e estados
   terminais. O endpoint `/health` informa apenas o estado do processo; não é
   prova de que todos os jobs foram processados.

## Fontes de implementação

- [entrypoint contínuo](../../apps/worker/src/index.ts)
- [isolamento por conta/job](../../apps/worker/src/account-job-runner.ts)
- [runners do worker](../../apps/worker/src/runner.ts)
- [retry/DLQ do event-bus](../../packages/modules/event-bus/src/event-bus.service.ts)
- [retry/DLQ de webhooks](../../packages/modules/webhooks/src/index.ts)
- [processamento de notificações](../../packages/modules/notifications/src/index.ts)
