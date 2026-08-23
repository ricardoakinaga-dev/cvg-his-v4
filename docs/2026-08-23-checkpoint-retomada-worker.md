# Checkpoint de retomada — worker, consumidores e pagamentos

**Data:** 23 de agosto de 2026, 16:25 BRT<br>
**Branch:** `agent/sync-v4-full-program`<br>
**Tarefa ativa:** `CVG-002C6`<br>
**Estado:** `BUILD / VERIFY`, `IN_PROGRESS / PARTIAL`<br>
**Próximo gate:** `VERIFIED`

Este é o ponto de entrada da próxima sessão. Ele registra o que foi executado,
o que foi publicado anteriormente e os limites que continuam abertos. Não é uma
declaração de ERP completo, produção, paridade Vetus, certificação fiscal ou
release.

## Retomada mínima

```bash
cd /home/ricardo/cvg-his-v4
git switch agent/sync-v4-full-program
git fetch origin agent/sync-v4-full-program
git status --short
git log -3 --oneline
python3 /home/ricardo/.codex/skills/engineering-framework/scripts/check_state.py "$PWD"
```

O commit de implementação desta onda já está publicado em
`b4f93fd5a0d6e62f80739ecac1d9aa4d08a5bef6` (`feat: compose durable worker
consumers`). O checkpoint documental foi publicado em
`46490fa87cc5aea724a59a4cb071008bd0990c40` (`docs: save worker consumer
checkpoint`). O único caminho deliberadamente
fora de escopo é o cache gerado e pertencente ao usuário
`packages/design-system/tsconfig.vue.tsbuildinfo`; ele não deve ser stageado,
commitado, limpo ou revertido.

O branch remoto deve permanecer igual ao `HEAD` após o commit final desta
reconciliação; use `git log -1 --oneline` como ponteiro exato da sessão.

Fontes canônicas:

- [`../.agent/state.json`](../.agent/state.json)
- [`../.agent/backlog.json`](../.agent/backlog.json)
- [`../.agent/execution-log.jsonl`](../.agent/execution-log.jsonl)
- [`../.agent/verification.jsonl`](../.agent/verification.jsonl)
- [`../.gauntlet/state.md`](../.gauntlet/state.md)
- [`../.gauntlet/progress.md`](../.gauntlet/progress.md)
- [`CVG-002C6-worker-consumer-composition-2026-08-23.md`](../.agent/artifacts/CVG-002C6-worker-consumer-composition-2026-08-23.md)
- [`2026-08-23-pesquisa-mercado-erp-veterinario.md`](2026-08-23-pesquisa-mercado-erp-veterinario.md)

## Estado publicado que permanece válido

- A vertical clínica-financeira bounded passa `5/5` sob role API runtime
  `LOGIN NOSUPERUSER NOBYPASSRLS`; restart/replay controlado passa `1/1`.
- O bootstrap production-like passa `6/6`; o contrato de ACL/revogações do
  runtime passa `11/11`.
- O processo real do worker passa `1/1` contra PostgreSQL descartável: `/live`,
  ticks reais, ACL proibida vazia, `SIGKILL`, restart na mesma porta e `SIGTERM`.
- A validação de cobertura RLS passa com `154/155` tabelas tenant-scoped e uma
  exceção documentada.

Essas provas são bounded por teste. Elas não promovem a barra global de
qualidade nem certificam o produto inteiro.

## O que foi implementado nesta onda

1. `packages/modules/event-consumers/` virou o pacote compartilhado de
   `payments`, `billing`, `webhooks` e do `ConsumerRegistry`.
2. `apps/worker/src/consumer-composition.ts` compõe uma única graph de serviços,
   registra exatamente `payments → billing → webhooks` e hidrata o contexto de
   cada conta com `runWithTenantContext`.
3. O bootstrap do worker exige o schema completo de owners, patients,
   encounters, billing, financial, PIX/cartão, webhooks e inbox/outbox antes de
   considerar a graph pronta; `/ready` fica verde somente nessa condição.
4. `packages/db/migrations/0121_card_transactions.sql` adiciona cartão com FK
   composta por tenant, `ENABLE/FORCE ROW LEVEL SECURITY`, policy por
   `app.current_account_id()`, checks de BRL/parcelas/valor/last4 e índices.
5. `packages/modules/payments/` centraliza os repositórios PostgreSQL e em
   memória de PIX e cartão; a API e o worker usam o mesmo contrato.
6. O consumidor de billing faz hidratação e leitura autoritativa do registro;
   deixou de ser apenas `console.debug`, mas ainda não é uma projeção assíncrona
   completa.
7. O consumidor de webhooks usa `enqueue` para persistir deliveries pendentes
   dentro da unidade de trabalho. O dispatcher HTTP com lease/retry/DLQ ainda é
   um gate posterior.
8. `card.completed` exige intent persistido e valida conta, vínculo do billing,
   moeda e valor antes de settlement/pagamento. Intent desconhecido, conta
   divergente, billing divergente ou valor divergente falham antes da mutação.

## Evidência desta onda

| Gate                                                     |                       Resultado |
| -------------------------------------------------------- | ------------------------------: |
| Consumer composition                                     |                             2/2 |
| API payments consumer, incluindo negativos autoritativos |                             9/9 |
| Repositório de cartão com SQL parametrizado              |                             3/3 |
| Testes do worker                                         |          todos os grupos verdes |
| API package test                                         |                         331/331 |
| Worker child-process sob `LOGIN NOSUPERUSER NOBYPASSRLS` |                             1/1 |
| `validate-rls-coverage.ts`                               | 154/155 + 1 exceção documentada |
| DB/payments/event-consumers build e typecheck            |                            PASS |

O teste de processo ainda não publica uma fixture de evento de domínio. Ele
prova readiness/liveness, loop, ACL e recuperação; não prova settlement real,
delivery, inbox/outbox ou replay de evento sob SIGKILL.

## Revisão independente

A revisão vertical encontrou um risco `HIGH`: um `card.completed` desconhecido
poderia criar uma transação de valor zero e liquidar um billing válido. O fluxo
foi corrigido e os testes negativos foram adicionados; a segunda revisão não
encontrou `Critical` ou `High` remanescente nesse escopo.

Riscos `Medium` que permanecem explícitos:

- `card_transactions.transaction_id` é chave global; falta decidir e provar
  unicidade por provider/tenant para evitar colisões silenciosas entre contas.
- Faltam testes PostgreSQL com duas contas e role `NOBYPASSRLS` para colisão,
  leitura/escrita cross-tenant e replay de cartão.
- Faltam testes do worker para evento → delivery pendente, rollback sem delivery
  e retry/inbox sem duplicidade.
- A composição ainda depende de serviços concretos; ports/adapters ficam para
  uma refatoração posterior, sem reabrir o gate bounded atual.

## Próxima ação obrigatória

Publicar fixtures reais de `payment`, `billing` e `webhook` sob a role restrita,
rodar o tick do worker e reconciliar inbox/outbox, settlement, delivery
pendente, replay/concurrency e isolamento A/B. Depois executar a matriz completa
de failpoints e a equivalência Helm aplicada.

Manter separados e abertos: WebAuthn durável, atribuição de `account_id` na
auditoria, callback ghost, hidratação cross-instance, RLS/FORCE RLS global,
failover/clock-skew real do Redis, providers, SPA, paridade Vetus, WCAG,
cobertura mínima, operações, deploy/restore e release.

## Reconciliação documental

`state.json`, `backlog.json`, `execution-log.jsonl` e `verification.jsonl`
parseiam; os ledgers têm respectivamente `192` e `127` linhas. O checker
canônico reproduz `10` PASS, `1` warning de ownership paralelo e `13` falhas
históricas por enums antigos (`REVIEW`, `SECURITY_REVIEW`, `RED` e
`PASS_BOUNDED`). Os registros antigos são append-only e não foram reescritos;
essa normalização continua uma tarefa separada antes de qualquer promoção de
gate.

## Regra de continuidade

Não reabrir fatias PIX/DLQ, diária, alta ou close bounded sem regressão nova.
Não usar fallback em memória como evidência de durabilidade. Não marcar
`CVG-002C6`, `CVG-002` ou o ERP como concluídos. Ao publicar, atualizar neste
arquivo os SHAs exatos, as contagens dos ledgers e o estado remoto; preservar o
cache user-owned fora do stage.

## Iteração seguinte — eventos reais do worker em PostgreSQL/RLS (23/08/2026, 17:21 BRT)

O próximo RED foi executado com fixtures reais de cartão, billing e webhook em
dois accounts e role `LOGIN NOSUPERUSER NOBYPASSRLS`. A falha original era
`invalid input syntax for type uuid: "erp_*"`: o settlement financeiro usava
IDs prefixed para colunas PostgreSQL UUID. O erro abortava a UoW depois da
tentativa de captura e aparecia mascarado como `current transaction is aborted`.

A correção usa `randomUUID()` em contas financeiras, receivables e pagamentos
persistidos, e o Vitest passou a resolver os módulos de event bus, consumers,
financial e payments diretamente de `src`, evitando executar `dist` obsoleto.
O consumidor de pagamento também preserva a causa original ao registrar falha
de settlement.

O teste reproduzível
[`worker-event-consumers-postgres.test.ts`](../tests/integration/database/worker-event-consumers-postgres.test.ts)
passou **3/3** contra PostgreSQL descartável: (1) payment → billing → webhook
com cartão `captured/applied`, billing `settled`, receivable/payment único,
delivery pending, inbox/outbox, replay concorrente em dois buses e isolamento
A/B; (2) rollback depois de mutar cartão/billing, sem inbox ou pagamento novo;
(3) captura desconhecida falhando fechado sem intent ou inbox. A role foi
verificada com `rolsuper=false` e `rolbypassrls=false`.

Validações adicionais: financial `15/15`, event-bus `23/23`, builds de
financial/event-consumers/event-bus/payments/worker, `pnpm audit --prod` sem
advisories, Prettier e `git diff --check` verdes. Artefato detalhado:
[`CVG-002C6-worker-event-postgres-2026-08-23.md`](../.agent/artifacts/CVG-002C6-worker-event-postgres-2026-08-23.md).

Este é `GREEN bounded`, não readiness/produção global. Permanecem abertos a
fixture dentro do child process com SIGKILL, unicidade global ou composta de
`card_transactions.transaction_id`, cross-tenant card collision, retry/DLQ
HTTP de webhook, callback ghost, hidratação cross-instance, failpoints
cross-domain, Helm aplicado, RLS/FORCE RLS global, WebAuthn, auditoria,
Redis/providers, SPA, paridade, WCAG, coverage, operações, deploy/restore e
release. A próxima sessão deve atacar a decisão de identidade do cartão e a
matriz de retry/failpoint sem marcar `CVG-002C6`, o ERP ou a Quality Bar como
concluídos.

## Atualização de continuidade — RED/GREEN do worker real (23/08/2026, 17:26 BRT)

O RED encontrou IDs `efa_*`, `er_*` e `erp_*` sendo inseridos em colunas UUID
durante o settlement financeiro. `current transaction is aborted` era somente
o sintoma secundário da UoW abortada. O harness também recebeu aliases Vitest
para os módulos do worker, garantindo que o teste use `src` e não `dist`
obsoleto.

A correção bounded usa `randomUUID()` nos identificadores financeiros
persistidos em UUID e preserva a causa original quando o marcador de falha não
pode ser escrito na transação abortada. O teste
[`worker-event-consumers-postgres.test.ts`](../tests/integration/database/worker-event-consumers-postgres.test.ts)
passou **3/3** com duas contas, role `LOGIN NOSUPERUSER NOBYPASSRLS`, payment →
billing → webhook, inbox/outbox, settlement, delivery pendente, replay
concorrente, rollback pós-mutação, evento desconhecido e isolamento A/B.
Financial passou **15/15**, event-bus **23/23**, e builds, audit, Prettier e
diff check ficaram verdes.

Artefato:
[`CVG-002C6-worker-event-postgres-2026-08-23.md`](../.agent/artifacts/CVG-002C6-worker-event-postgres-2026-08-23.md).
É **GREEN bounded**: não promove `CVG-002C6`, readiness, ERP, produção ou a
Quality Bar global. Permanecem abertos child-process/SIGKILL com eventos de
domínio, failpoints completos, identidade/collision de cartão, retry/DLQ HTTP,
hidratação cross-instance, RLS/FORCE RLS global, WebAuthn, auditoria,
Redis/providers, SPA, paridade, WCAG, coverage, operations, deploy/restore e
release. Os SHAs exatos serão registrados após o commit/push; o cache
user-owned `packages/design-system/tsconfig.vue.tsbuildinfo` continua fora do
stage.

## Fechamento do residual de identidade do cartão (23/08/2026, 17:38 BRT)

A revisão independente apontou um risco alto de integridade: a PK global de
`card_transactions.transaction_id` combinada com `ON CONFLICT DO NOTHING`
poderia descartar silenciosamente o mesmo intent em outro account. O residual
foi fechado nesta fatia com a decisão explícita de chave composta
`(account_id, transaction_id)`:

- migration `0122_card_transactions_tenant_key.sql` troca a PK global pela PK
  composta e remove o índice redundante;
- schema Drizzle e `DatabaseCardTransactionRepository` refletem a mesma chave;
- o repositório em memória também usa chave composta e retorna `null` em lookup
  não escopado ambíguo, sem vazar ou sobrescrever outro account;
- a fixture usa o mesmo `transaction_id` em A e B, comprova duas linhas e
  confirma que cada contexto RLS lê somente sua própria linha.

A execução PostgreSQL permaneceu **3/3**, agora com asserções de
`financial_status=paid`, `paid_amount=125.00`, `balance_due=0.00`, receivable
`settled`, valores `125.00/0.00` e `external_reference_type=other`. Os testes
de handlers/gateway passaram **17/17** via `tsx --test`; financial/event-bus
passaram **15/15** e **23/23**; builds e audit continuam verdes.

Limitações ainda abertas, conforme a crítica: o teste não atravessa o
entrypoint child-process/SIGKILL, não cobre PIX PostgreSQL/RLS, retry/DLQ HTTP
ou fencing de lease, e ainda há fixtures manuais de UUID fora de todos os
retornos de `syncEncounter`/`closeEncounterFinancial`. Billing/financial/webhook
cross-tenant precisam de leitura restrita dedicada. Portanto o gate continua
`GREEN bounded`, `CVG-002C6` `IN_PROGRESS/PARTIAL`, sem promoção de ERP,
readiness ou produção.

Implementação publicada em `67d47e2` (`test: stabilize tenant card collision assertions`),
sobre `ab08865233c4091edcb83cb7319c78b9f406645e` (`fix: harden worker event
persistence`). O ponteiro documental desta sessão é
`16797efada1747fc2a6046d4dd7842dc6e7eea42` (`docs: publish worker event
continuity`); `git fetch` confirmou `HEAD == origin/agent/sync-v4-full-program`.

Os ledgers atuais parseiam: `execution-log.jsonl` **201** registros e
`verification.jsonl` **136** registros; `state.json` e `backlog.json` também
passam pelo parser JSON. O checker histórico `.agent/check_state.py` não está
presente nesta cópia do workspace, então nenhuma contagem de PASS/Warning
canônica foi inventada nesta sessão.
