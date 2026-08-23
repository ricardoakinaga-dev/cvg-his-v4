# CVG-002C6 — worker events with PostgreSQL/RLS (2026-08-23)

## Escopo e barra congelada

Esta fatia prova somente o caminho durable do worker para eventos reais de
pagamento, billing e webhook em PostgreSQL descartável, usando uma role
`LOGIN NOSUPERUSER NOBYPASSRLS`. A barra foi congelada como:

- fixtures persistidas de `payment.card.intent.created`, `billing.record.created`
  e `patient.created` em dois accounts;
- claim do outbox e inbox idempotente para `payments`, `billing` e `webhooks`;
- captura de cartão autoritativa, settlement do billing, receivable e pagamento;
- enqueue de webhook pendente, sem chamada HTTP dentro da UoW;
- replay concorrente em dois event buses, sem duplicar inbox, delivery ou pagamento;
- rollback depois de mutar cartão/billing, preservando o estado anterior;
- evento desconhecido falhando fechado sem criar intenção, inbox ou efeito;
- mesmo `transaction_id` de cartão aceito em A e B por chave composta
  `(account_id, transaction_id)`, com leitura RLS correta em cada conta;
- isolamento A/B e inspeção positiva de `rolsuper=false`/`rolbypassrls=false`.

Isto é evidência `GREEN bounded`; não promove o ERP inteiro, produção,
paridade Vetus ou release.

## RED encontrado

O primeiro teste real foi executado com o código compilado resolvido pelo
package export. O settlement falhava com `current transaction is aborted` e
deixava o cartão em `authorized_pending_capture`. A instrumentação temporária
do tenant query encontrou a causa original:

```text
invalid input syntax for type uuid: "erp_mt68p9lw_2434217f595b6b71f2"
```

`EncounterFinancialService` gerava IDs prefixed via `createCorrelationId`
(`efa_*`, `er_*`, `erp_*`) para tabelas PostgreSQL cujas chaves são UUID.
O erro ocorria ao inserir o pagamento financeiro, depois da tentativa de
captura/settlement, e a UoW revertia os efeitos.

Também foi identificado que o alias de Vitest não cobria
`module-event-bus`, `module-event-consumers`, `module-financial` e
`module-payments`; sem esses aliases o teste podia exercitar `dist` antigo em
vez do código-fonte atual.

## Correção implementada

- `packages/modules/financial/src/index.ts` usa `randomUUID()` para contas
  financeiras, receivables e pagamentos persistidos em colunas UUID.
- `vitest.alias.ts` passa a resolver os quatro módulos worker diretamente para
  `src/index.ts`, evitando falso verde por artefato compilado obsoleto.
- `payments.consumer.ts` preserva a causa original de erro de settlement e
  adiciona contexto às falhas de lookup/marcação de captura; um marcador de
  falha não pode mascarar erro de uma transação PostgreSQL já abortada.
- `packages/db/migrations/0122_card_transactions_tenant_key.sql` e o schema
  Drizzle tornam a chave do cartão composta por conta + transaction id; o
  repositório SQL e o repositório em memória usam a mesma semântica sem
  descartar silenciosamente outro tenant.
- O cache user-owned
  `packages/design-system/tsconfig.vue.tsbuildinfo` permaneceu intocado e fora
  do stage.

## Evidência executada

Comando principal:

```bash
pnpm exec vitest run --config vitest.integration.config.ts \
  tests/integration/database/worker-event-consumers-postgres.test.ts \
  --reporter=verbose
```

Resultado final: **3/3 testes verdes** em banco descartável com todas as
migrations, duas contas e role runtime restrita.

As três provas são:

1. `payment → billing → webhook` completo: 3 inbox por evento, outbox
   concluído, cartão `captured/applied`, billing `settled`, financial account
   `paid`, receivable `settled` com `125.00/0.00`, exatamente um pagamento com
   `external_reference_type=other`, delivery pending, replay concorrente e A/B
   isolado.
2. Falha de settlement após mutação: outbox `failed`, inbox do evento `0`,
   cartão volta a `authorized_pending_capture`, billing volta a `open`,
   receivable e pagamento pré-existente permanecem consistentes.
3. Captura sem intent autoritativo: DLQ sem criar cartão ou inbox.
4. Após o processamento de B, A e B mantêm o mesmo `transaction_id` com duas
   linhas distintas; cada role tenant lê somente a própria linha.

Validações complementares frescas:

- `pnpm --filter @cvg-his-v2/module-financial build` — PASS;
- builds de `event-consumers`, `event-bus`, `payments` e `worker` — PASS;
- `packages/modules/financial/src/financial.test.ts` — **15/15**;
- `packages/modules/event-bus/src/event-bus.test.ts` — **23/23**;
- `pnpm audit --prod` — nenhum advisory conhecido;
- Prettier relevante e `git diff --check` — PASS.

## Limites e próximo gate

Este teste não prova que o child process publica/consome fixture de domínio
durante o cenário de `SIGKILL`, nem retry/DLQ de entrega HTTP de webhook,
fencing após lease expirada, hidratação assíncrona entre instâncias, matriz
completa de failpoints, equivalência Helm aplicada, WebAuthn, auditoria de
atribuição, RLS/FORCE RLS global, Redis/provider, SPA, paridade, WCAG,
coverage/operations/deploy/release ou a jornada clínica completa. O caminho
PIX também não é exercitado nesta fixture. A prova UUID de conta/receivable é
complementada pelo settlement, mas fixtures manuais ainda não cobrem todos os
retornos de `syncEncounter`/`closeEncounterFinancial`.

Próximo gate obrigatório: publicar fixture de domínio no child process com
SIGKILL/takeover, implementar retry/DLQ de webhook, exercitar PIX, ampliar
isolamento billing/financial/webhook e executar failpoints/restart cross-domain,
sem promover `CVG-002C6`, o ERP ou a Quality Bar global para concluído.

## Publicação

Implementação publicada em `67d47e2` (`test: stabilize tenant card collision assertions`),
sobre `ab08865233c4091edcb83cb7319c78b9f406645e` (`fix: harden worker event
persistence`) no branch
`agent/sync-v4-full-program`; `git fetch` confirmou igualdade com
`origin/agent/sync-v4-full-program`. O ponteiro documental será registrado no
commit de reconciliação seguinte. O cache user-owned
`packages/design-system/tsconfig.vue.tsbuildinfo` permaneceu fora do stage.
