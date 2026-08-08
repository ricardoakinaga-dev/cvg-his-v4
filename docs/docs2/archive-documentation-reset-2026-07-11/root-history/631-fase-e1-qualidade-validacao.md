# 631 — Fase E1: Qualidade e Validacao

**Data:** 2026-04-01
**Status:** Concluida e revalidada
**Escopo:** suites reais para `staff`, `users`, `scheduling` + automacao minima do `apps/web`

## 1. O que foi implementado

### E1.1 — Staff

- `packages/modules/staff/src/staff.test.ts` foi ampliado para cobrir:
  - `create`
  - `update`
  - `toggleActive`
  - `list(accountId)`
  - `getOrThrow` com escopo de conta
  - `hydrateFromDatabase()` com repositório stub
- `packages/modules/staff/package.json` deixou de usar placeholder e passou a executar suite real via `vitest`.

### E1.2 — Users

- `packages/modules/users/src/users.test.ts` agora cobre:
  - `create`
  - `update`
  - `verifyPassword`
  - `hashPassword`
  - `comparePassword`
  - compatibilidade com seed legacy
  - comportamento com repositório/hidratação
  - rejeição de username duplicado
- `packages/modules/users/package.json` agora executa suite real via `vitest`.

### E1.3 — Scheduling

- `packages/modules/scheduling/src/scheduling.test.ts` agora cobre:
  - `createAppointment`
  - `checkIn`
  - ordenação da fila
  - `callQueueEntry`
  - `attachEncounter`
  - transições principais
  - `hydrateFromDatabase`
  - persistência de appointments com repositório stub
- `packages/modules/scheduling/package.json` agora executa suite real via `vitest`.

### E1.4 — Automacao minima para apps/web

- `apps/web/src/index.ts` foi refatorado para exportar `routes`, `buildPage` e `createWebServer`, sem mudar o comportamento de runtime.
- `apps/web/src/web.test.ts` adiciona smoke útil para:
  - bootstrap HTML
  - servidor web instanciavel sem bind local
  - renderizacao das rotas principais
  - presença da navegação administrativa principal (`/staff`, `/users`, `/notifications`)
- `apps/web/package.json` deixou de usar placeholder e passou a executar a suite real via `vitest`.

### E1.4b — Endurecimento minimo inevitavel em `apps/api`

- `apps/api/src/server.test.ts` foi ajustado para validar o fluxo HTTP em memoria, sem depender de `server.listen(...)`.
- Isso protegeu o gate `pnpm test` agregado contra bloqueio de sandbox/rede local e manteve o valor do teste:
  - login
  - queue lifecycle over HTTP semantics
  - patch de triage over HTTP semantics

## 2. Arquivos alterados

- `packages/modules/staff/package.json`
- `packages/modules/staff/src/staff.test.ts`
- `packages/modules/staff/vitest.config.ts`
- `packages/modules/users/package.json`
- `packages/modules/users/src/users.test.ts`
- `packages/modules/users/vitest.config.ts`
- `packages/modules/scheduling/package.json`
- `packages/modules/scheduling/src/scheduling.test.ts`
- `packages/modules/scheduling/vitest.config.ts`
- `apps/web/package.json`
- `apps/web/src/index.ts`
- `apps/web/src/web.test.ts`
- `apps/web/vitest.config.ts`
- `apps/api/src/server.test.ts`
- `docs/460-qualidade-testes-e-gates.md`
- `docs/README.md`
- `docs/631-fase-e1-qualidade-validacao.md`

## 3. Módulos que deixaram de ter placeholder de teste

- `@cvg-his-v2/module-staff`
- `@cvg-his-v2/module-users`
- `@cvg-his-v2/module-scheduling`
- `@cvg-his-v2/web`

## 4. Como ficou a automacao minima do web

- abordagem: smoke test de servidor + rotas + shell HTML
- abordagem final: smoke test de shell + rotas + servidor instanciavel sem bind
- sem framework novo
- sem browser pesado
- executa no stack atual com `vitest` e `fetch` nativo do Node 22

## 5. Comandos executados

- `pnpm --filter @cvg-his-v2/module-staff test`
- `pnpm --filter @cvg-his-v2/module-users test`
- `pnpm --filter @cvg-his-v2/module-scheduling test`
- `pnpm --filter @cvg-his-v2/web test`
- `pnpm --filter @cvg-his-v2/api test`
- `pnpm typecheck`
- `pnpm build`
- `pnpm test`

## 6. Resultados dos testes

- `module-staff` — verde
- `module-users` — verde
- `module-scheduling` — verde
- `apps/web` — verde
- `apps/api` — verde
- `pnpm typecheck` — verde
- `pnpm build` — verde
- `pnpm test` — verde

## 7. Impacto na nota

- aumenta a confianca real de release no eixo de qualidade
- remove 4 placeholders relevantes de teste
- melhora a leitura operacional do backlog residual
- ganho confirmado: incremental, mas concreto, na faixa de qualidade enterprise, com melhoria real de confianca de release

## 8. Bloqueios remanescentes

- automacao web ainda e smoke minima, nao regressao funcional mais profunda
- o monorepo ainda possui varios pacotes fora do escopo E1 com placeholders de teste (`shared-*`, `worker skeleton`, alguns modulos antigos)
- cobertura ainda e desigual fora das areas atacadas nesta fase

## 9. Proximo passo natural

1. Expandir o smoke do `web` para regressao funcional guiada nas rotas mais sensiveis
2. Reforcar cobertura dos servicos/worker que ainda ficaram fora do bloco E1
3. Endurecer `scheduling` com cancelamento de appointment, conflito de horario e transicoes mais estritas
4. Recalibrar score e backlog residual com base no estado real agora validado
