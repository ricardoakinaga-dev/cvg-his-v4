# Handoff — webhook delivery durável — 2026-08-24

## Reconciliado com o runtime atual

Este documento substitui o diagnóstico inicial que dizia que a fila, leases e
executor ainda não existiam. O diagnóstico foi ultrapassado pela implementação
publicada no HEAD atual.

O caminho real hoje é:

- `packages/modules/event-consumers/src/webhooks.consumer.ts` enfileira a
  entrega durante o processamento do evento;
- `packages/modules/webhooks/src/index.ts` separa enqueue de entrega HTTP,
  valida SSRF/DNS/HMAC/timeout/tamanho de resposta e processa claims duráveis;
- `packages/modules/webhooks/src/repositories/database-webhook.repository.ts`
  usa `FOR UPDATE SKIP LOCKED`, escopo por conta, lease owner/token/version,
  takeover de lease expirada e transições CAS-fenced;
- `packages/db/migrations/0125_webhook_delivery_leases.sql` persiste estados de
  retry/processamento/DLQ, tentativas, erro e leases com índices e FORCE RLS;
- `apps/worker/src/index.ts` executa o tick de webhooks por conta;
- `apps/worker/src/run-once.ts` também executa o tick one-shot, depois do
  reparo de contexto tenant aplicado nesta rodada.

## Evidência existente

- `tests/integration/database/worker-event-consumers-postgres.test.ts` — 5/5:
  consumidores, claim único, retry, takeover de lease expirada, fencing,
  rollback de settlement e rejeição de conclusão inválida;
- `tests/integration/process/webhook-delivery-sigkill.test.ts` — 1/1:
  receptor HTTP local, processo real, SIGKILL antes da conclusão durável,
  retry após restart e deduplicação por chave idempotente;
- `packages/modules/webhooks/src/webhooks.test.ts` — 22/22 unitários.

Esses resultados comprovam um sender at-least-once com deduplicação no receptor
do teste; não comprovam exatamente-once no provider externo.

## Limites ainda abertos

Persistem os limites de provider/cluster/Secrets, observabilidade operacional,
Redis, DR/RPO, deploy/cutover e os gates globais de ERP/paridade Vetus. A prova
one-shot de relatórios está registrada separadamente em
[`2026-08-24-handoff-reports-run-once.md`](2026-08-24-handoff-reports-run-once.md).

Artefato de continuidade: `.agent/artifacts/CVG-002C6-reports-run-once-2026-08-24.md`
para a nova fatia; as evidências webhook estão nos testes e no handoff PIX
runtime-role que antecedeu esta reconciliação.
