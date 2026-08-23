# CVG-001 — startup fail-closed em ambientes production-like

**Data:** 23 de agosto de 2026 (BRT)
**Escopo:** API e worker, somente bootstrap local; sem credenciais, deploy ou mutação em ambiente alvo.

## Problema reproduzido (RED)

A configuração compartilhada já classificava `production`, `prod`, `staging` e
`stage` como production-like, mas os bootstraps da API e do worker usavam
predicados mais estreitos. Com banco ausente ou indisponível, a API podia
retornar repositórios `Map` e escutar; o worker podia retornar estado degradado
e continuar o loop. Schema parcial também podia formar um conjunto misto de
repositórios.

RED executado antes da implementação:

- API: 8 casos novos falharam porque `bootstrapServices()` resolvia com
  fallback em memória nos quatro aliases sem banco e com PostgreSQL indisponível.
- Worker: 2 casos novos falharam porque `bootstrapWorkerServices()` retornava
  estado degradado nos aliases sem banco e em `staging` com PostgreSQL
  indisponível.

## Implementação GREEN

- `packages/shared/config/src/index.ts` exporta o classificador único,
  normalizado por trim/lowercase, para `production`, `prod`, `staging` e `stage`.
- `apps/api/src/bootstrap.ts` aplica a política monotônica: tanto
  `process.env.NODE_ENV` quanto `BootstrapOptions.environment` podem elevar a
  exigência, nunca rebaixá-la; `DATABASE_REQUIRE_RLS_ROLE=1` e
  `DATABASE_REQUIRE_SCHEMA=1` também elevam a política. Em production-like,
  URL ausente, DB indisponível, erro de schema/role, repositório incompatível,
  `unitOfWork` ausente ou modo misto lançam antes do retorno do bootstrap.
- `apps/api/src/index.ts` passa o ambiente efetivo do config ao bootstrap e usa
  o mesmo classificador para decisões production-like.
- `apps/worker/src/bootstrap.ts` aplica a mesma política monotônica, exige
  `DATABASE_URL`, role segura, schema de delivery guarantees e contas
  persistidas em production-like; não retorna estado degradado nem engole erro.

## Evidência GREEN

| Comando | Resultado |
| --- | ---: |
| `pnpm exec vitest run tests/unit/api/bootstrap.test.ts --config vitest.unit.config.ts` | **18/18** |
| `pnpm --filter @cvg-his-v2/shared-config test` | **40/40** |
| `pnpm --filter @cvg-his-v2/worker test` | **62 testes**, cinco suites, todos PASS |
| `pnpm --filter @cvg-his-v2/api test` | **331/331** |
| typecheck/build API, worker e shared-config | **PASS** (incluídos nos scripts acima) |
| `git diff --check` | **PASS** |

Os testes cobrem os quatro aliases, URL ausente, conexão recusada, ambas as
flags de política e o downgrade explícito `NODE_ENV=production/staging` com
`environment=development`. A API só cria/listens depois do bootstrap; como o
bootstrap lança nesses casos, o entrypoint não chega ao servidor. O worker não
entra no loop sem o resultado durável.

## Limitações e próximo gate

Esta evidência não certifica um banco alvo real. Ainda falta um harness de
schema parcial/role insegura executando contra PostgreSQL descartável para
confirmar a falha antes de qualquer repositório misto, além da matriz
process-level de listen/loop. WebAuthn durável, auditoria sem `account_id` nulo,
RLS comportamental sob `NOBYPASSRLS`, jornada clínica-financeira única,
failpoints/restart/reconciliação, SPA, providers, Redis, WCAG, paridade Vetus,
coverage, operações, deploy/restore e release permanecem
`IN_PROGRESS/PARTIAL`.

Não promover `CVG-001`, `CVG-002C6` nem o ERP global com esta fatia isolada.
