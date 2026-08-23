# Checkpoint de retomada — worker e estado publicado

**Data:** 23 de agosto de 2026, 15:37 BRT<br>
**Branch:** `agent/sync-v4-full-program`<br>
**Tarefa ativa:** `CVG-002C6`<br>
**Estado:** `BUILD / VERIFY`, `IN_PROGRESS / PARTIAL`<br>
**Próximo gate:** `VERIFIED`

Este documento é o ponto de entrada para a próxima sessão. Ele consolida o
estado efetivamente executado e os limites que continuam abertos. Não é uma
declaração de produção, paridade, certificação fiscal ou release.

## Retomada mínima

```bash
cd /home/ricardo/cvg-his-v4
git switch agent/sync-v4-full-program
git fetch origin agent/sync-v4-full-program
git status --short
git log -1 --oneline
python3 /home/ricardo/.codex/skills/engineering-framework/scripts/check_state.py "$PWD"
```

O `HEAD` local e `origin/agent/sync-v4-full-program` estavam em
`b0251c2229427be33e24a974ce4b8a1220d287c2` no momento deste registro. O único
caminho fora do commit é o cache gerado e pertencente ao usuário
`packages/design-system/tsconfig.vue.tsbuildinfo`; ele deve permanecer fora de
stage, commit, limpeza e reversão.

Fontes canônicas de estado:

- [`../.agent/state.json`](../.agent/state.json)
- [`../.agent/backlog.json`](../.agent/backlog.json)
- [`../.agent/execution-log.jsonl`](../.agent/execution-log.jsonl)
- [`../.agent/verification.jsonl`](../.agent/verification.jsonl)
- [`../.gauntlet/state.md`](../.gauntlet/state.md)
- [`2026-08-23-handoff-sessao-atual.md`](2026-08-23-handoff-sessao-atual.md)
- [`2026-08-23-checkpoint-continuacao.md`](2026-08-23-checkpoint-continuacao.md)

## Evidências bounded já publicadas

Os resultados abaixo são locais, reproduzíveis e limitados ao escopo de cada
teste; não promovem o ERP inteiro:

| Gate | Evidência |
| --- | ---: |
| Startup production-like API/worker com PostgreSQL descartável | 6/6 |
| Jornada clínica-financeira HTTP/PostgreSQL | 5/5 |
| Restart controlado, replay e reconciliação de receipt | 1/1 |
| Worker real: liveness, ticks, `SIGKILL`, restart na mesma porta e `SIGTERM` | 1/1 |
| Contrato de grants/revogações de runtime | 11/11 |
| Typecheck da camada DB, Prettier, shell syntax e `git diff --check` | PASS |
| Auditoria de dependências (`pnpm audit --audit-level=high`) | sem vulnerabilidades conhecidas |

Artefatos principais:

- [`CVG-001-runtime-bootstrap-harness-2026-08-23.md`](../.agent/artifacts/CVG-001-runtime-bootstrap-harness-2026-08-23.md)
- [`CVG-002C6-vertical-http-red-green-2026-08-23.md`](../.agent/artifacts/CVG-002C6-vertical-http-red-green-2026-08-23.md)
- [`CVG-002C6-runtime-role-restart-reconciliation-2026-08-23.md`](../.agent/artifacts/CVG-002C6-runtime-role-restart-reconciliation-2026-08-23.md)
- [`CVG-002C6-worker-runtime-acl-sigkill-2026-08-23.md`](../.agent/artifacts/CVG-002C6-worker-runtime-acl-sigkill-2026-08-23.md)

## O que foi implementado nesta onda

- O bootstrap production-like falha fechado quando há URL ausente, PostgreSQL
  indisponível, role insegura, schema de entrega incompleto, modo misto ou
  worker sem UoW durável.
- A vertical inpatient cobre, de forma bounded, admissão, handoff/ack,
  consumo de inventário, diária/billing, alta, close e receipt, com dois
  tenants, replay/conflito, concorrência, rollback, auditoria, outbox,
  journal balanceado e defesa contra shadowing de `search_path`.
- O processo real do worker executa ticks sob role LOGIN
  `NOSUPERUSER/NOBYPASSRLS`, sobrevive a `SIGKILL` e reinicia na mesma porta.
- A ACL do worker revoga `INSERT`, `UPDATE`, `DELETE` e `TRUNCATE` nas tabelas
  de instalação/governança; a mesma política está no reconciler, no init script
  e no template Helm.

## Limite atual do worker — não mascarar

O teste de processo é verde apenas para liveness, loop e recuperação. `/ready`
continua retornando `503` e health degradado porque o entrypoint real ainda não
registra os consumidores de produção `payments`, `billing` e `webhooks`.
Consumidores no-op ou uma alteração artificial do health não são aceitáveis.

O mapeamento arquitetural independente confirmou:

- `apps/worker/src/index.ts` inicializa bootstrap, notifications, event bus e
  reports, mas não chama `subscribe`.
- A API registra `payments → billing → webhooks` via
  `EventConsumerRegistry`; os handlers da API não devem ser importados
  diretamente pelo worker sem uma composição compartilhada e contratos claros.
- `PaymentsEventHandlers` depende de billing, encounter-financial, PIX e
  cartão; não há repositório SQL de cartão equivalente comprovado.
- `BillingEventHandlers` ainda contém efeitos placeholder (`console.debug`),
  portanto não pode ser usado para declarar processamento durável.
- `WebhooksEventHandlers` depende de `DatabaseWebhookRepository` e faz dispatch
  HTTP externo, exigindo decisão explícita sobre timeout, lease e fronteira
  transacional.
- O `EventBusService` exige nomes estáveis e o guard de UoW já oferece inbox e
  idempotência duráveis por `(consumer, event.id)` quando há consumidores reais.

## Próxima ação obrigatória

1. Criar uma composição própria do worker (ou pacote compartilhado) com
   dependências concretas e manifesto revisado; não registrar handlers no-op.
2. Definir e implementar efeitos verificáveis para billing, PIX e webhooks;
   resolver a persistência durável de cartão antes de prometer esse caminho.
3. Escrever REDs para nomes do manifesto, readiness, evento real por
   consumidor, replay/conflito, concorrência, inbox/outbox e execução sob role
   `NOBYPASSRLS`; depois implementar o mínimo GREEN.
4. Repetir SIGKILL/restart com eventos pendentes e verificar ausência de
   duplicatas, órfãos e vazamento entre tenants.
5. Só então executar a matriz completa de failpoints da jornada
   admissão → inventário → diária → alta → close → receipt e a equivalência
   Helm aplicada.

## Gates que permanecem abertos

WebAuthn durável, atribuição de `account_id` na auditoria, callback ghost,
hidratação cross-instance, RLS/FORCE RLS global, failover/clock-skew real do
Redis, providers, SPA, paridade Vetus, WCAG, cobertura mínima, operações,
deploy/restore e release continuam `IN_PROGRESS / PARTIAL`.

Não reabrir fatias PIX/DLQ, diária, alta ou close bounded sem regressão nova.
Não usar fallback em memória como evidência de durabilidade e não marcar
`CVG-002C6`, `CVG-002` ou o ERP como concluídos.

## Validação documental desta publicação

Passaram nesta reconciliação: parsing de `state.json` e `backlog.json`, parsing
das 190 linhas de `execution-log.jsonl` e das 122 linhas de
`verification.jsonl`, além de `git diff --check`. O checker canônico também
reproduziu falhas históricas já presentes no ledger: registros antigos usam
`evidence_kind`/`result` fora dos enums atuais (`REVIEW`, `SECURITY_REVIEW`,
`RED` e `PASS_BOUNDED`), além do warning conhecido de ownership paralelo. Esses
registros não foram reescritos, porque os ledgers são append-only; a
normalização deve ser uma tarefa própria antes de qualquer promoção de gate.

## Regra de publicação

Antes de encerrar a sessão, validar JSON/JSONL, `git diff --check`, status do
branch e igualdade com o remoto. Commitar somente os arquivos documentais
desta atualização; preservar o cache user-owned fora do stage.
