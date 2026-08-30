# CVG-004 — persisted inventory-invoices status boundary — 2026-08-30

## Resultado

O resolver de relatórios agendados agora falha fechado para status persistido
`null`, vazio, whitespace, tipo errado e valores fora da allowlist. O slice é
`COMPLETE_BOUNDED` / `PASS_BOUNDED`, limitado ao worker local; o ERP global
continua `IN_PROGRESS/PARTIAL` e a promoção continua `BLOCKED`.

## Escopo implementado

`apps/worker/src/runner.ts` mantém `undefined` como ausência legítima de filtro,
mas rejeita explicitamente qualquer status definido que não seja uma string
não vazia após trim. Strings válidas continuam normalizadas por trim/lowercase
e restritas a `draft`, `approved`, `partially_received`, `received` e
`cancelled`. O parser compartilhado dos demais reports, a migração, o source
PostgreSQL, busca, datas, limite, rows, schedule, export e auditoria não foram
alterados.

## Evidência TDD e regressão

- RED: após inserir `null`, `''` e whitespace no teste do resolver, o comando
  oficial do worker compilou e falhou como esperado em `58/59`, com
  `Missing expected rejection`.
- GREEN: `pnpm --filter @cvg-his-v2/worker test` passou runner `59/59`,
  bootstrap `20/20`, account discovery `7/7`, composição `2/2`, identity
  `8/8`, scheduled-report jobs `11/11` e PIX consumer `17/17`.
- `pnpm --filter @cvg-his-v2/module-inventory test` passou `51/51`, com banco
  PostgreSQL efêmero removido.
- Worker typecheck/build e inventory typecheck passaram.
- Cobertura V8 de `apps/worker/dist/runner.js`: 89,59% linhas, 79,33%
  branches e 98,62% funções. A medição cobre o arquivo inteiro; os caminhos
  novos de status estão cobertos pelos casos inválidos e válidos.

## Qualidade e segurança

Enterprise security e secretlint passaram sem advisories críticos, altos ou
moderados. OpenAPI passou com 354 paths, 40 tags e 413 schemas; RLS passou com
165/166 tabelas tenant e uma exceção documentada; namespace, Prettier e diff
hygiene passaram. O lint global mantém somente o baseline não relacionado de
`packages/contracts/src/counterSales.ts:38,77` (`no-control-regex`).

## Revisão e limitações

A revisão adversarial local confirmou que a rejeição ocorre antes de
`sources.inventoryInvoices.list`, que `undefined`/status válido preservam a
compatibilidade e que nenhuma migração/backfill ou outra família de relatório
foi tocada.

Não foi possível obter reviewer independente nesta conta: o papel reviewer é
incompatível, o agente default anterior não retornou e o explorador atingiu o
limite de uso do modelo. Isso é registrado como `CONDITIONAL`, sem inferir
`APPROVE_BOUNDED`. A correção do status elimina o achado Medium do sidecar;
permanece como dívida Low separada apenas a precisão histórica de uma citação
de linhas em evidência anterior, sem alteração de comportamento.

Este artifact não certifica semântica fiscal/NF-e, schedules históricos,
backfill, outros reports, delivery providers, worker distribuído, target,
produção, deployment, parity, release ou prontidão global do ERP.
