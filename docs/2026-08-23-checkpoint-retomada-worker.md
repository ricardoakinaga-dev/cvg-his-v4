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
