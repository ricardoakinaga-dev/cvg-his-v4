# CVG-002C6 — worker consumers, card persistence e composição compartilhada

**Data:** 23 de agosto de 2026, 16:25 BRT<br>
**Estado:** GREEN bounded / `IN_PROGRESS` global<br>
**Escopo:** fechar a composição mínima do worker e a persistência necessária para
`payments`, `billing` e `webhooks`, sem promover readiness do ERP inteiro.

## Entrega executada

- `packages/modules/event-consumers/` concentra os handlers e o registro estável
  dos consumidores `payments → billing → webhooks`.
- `apps/worker/src/consumer-composition.ts` compõe uma única graph de serviços,
  registra os três consumidores e hidrata owners, patients, encounters e billing
  sob `runWithTenantContext`.
- O bootstrap production-like do worker exige o schema clínico-financeiro,
  PIX/cartão, webhooks e tabelas de inbox/outbox antes de declarar a graph pronta.
- `packages/db/migrations/0121_card_transactions.sql` cria persistência de
  cartão com FK composta por tenant, `ENABLE/FORCE ROW LEVEL SECURITY`, política
  tenant-scoped, checks de BRL/parcelas/valor/last4 e índices operacionais.
- `packages/modules/payments/` fornece repositórios PostgreSQL e em memória para
  PIX e cartão; a API e o worker passam a usar o mesmo contrato.
- `BillingEventHandlers` faz hidratação e leitura autoritativa do billing antes
  de aceitar os eventos; ainda não é uma projeção assíncrona completa.
- `WebhooksEventHandlers` usa `enqueue` para persistir `webhook_deliveries`
  pendentes dentro da unidade de trabalho. A entrega HTTP com lease/retry/DLQ
  ainda não está implementada neste slice.
- `card.completed` agora exige intent persistido e valida conta, vínculo do
  billing, moeda e valor antes de qualquer settlement/pagamento; eventos
  desconhecidos ou divergentes falham e entram na política de retry.

## Evidência executada

| Prova | Resultado |
| --- | ---: |
| Consumer composition unit tests | 2/2 |
| API payments consumer (PIX + cartão + negativos autoritativos) | 9/9 |
| Card repository database contract (mock SQL parametrizado) | 3/3 |
| Worker package tests | todos os grupos verdes |
| API package test | 331/331 |
| Worker child-process sob PostgreSQL `LOGIN NOSUPERUSER NOBYPASSRLS` | 1/1 |
| RLS coverage validator | 154/155 tabelas protegidas; 1 exceção documentada |
| DB, payments e event-consumers typecheck/build | PASS |

O teste de processo comprova `/live`, ticks reais, `/ready` verde quando o
schema completo está presente, ACL sem DML proibido, `SIGKILL`, restart na mesma
porta e `SIGTERM` limpo. Ele ainda não injeta um evento clínico-financeiro real
nem reconcilia delivery/replay de domínio.

## Revisão independente e riscos remanescentes

A revisão encontrou e a correção fechou um risco `HIGH` de `card.completed`
liquidar uma cobrança com intent desconhecido e valor zero. Depois da correção,
não há `Critical`/`High` no escopo bounded.

Permanecem `Medium`/gates abertos:

1. `card_transactions.transaction_id` ainda é chave global; a unicidade por
   provider/tenant deve ser decidida antes de aceitar colisões entre contas.
2. Faltam testes PostgreSQL com duas contas e role `NOBYPASSRLS` para colisão,
   leitura/escrita cross-tenant e replay de cartão.
3. Faltam testes do worker que provem evento → delivery pendente, rollback sem
   delivery e retry/inbox sem duplicação.
4. A composição compartilhada ainda depende de serviços concretos; ports/adapters
   e um contrato de domínio mais estreito continuam como refatoração posterior.

## Próximo maior gap

Executar uma prova de domínio real sob a role restrita: publicar fixtures de
`payment`, `billing` e `webhook`, rodar o tick do worker, verificar inbox/outbox,
settlement, delivery pendente, replay/concurrency e isolamento A/B. Em seguida,
fechar a matriz de failpoints e a equivalência Helm aplicada. Manter fora deste
escopo WebAuthn, Redis/provider failover, SPA, paridade Vetus, WCAG, cobertura,
operações, deploy/restore e release.
