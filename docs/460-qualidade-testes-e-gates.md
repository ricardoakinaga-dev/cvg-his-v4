# 460 - Qualidade, Testes e Gates

**Status:** vivo
**Data de validacao:** 2026-08-12
**Ultima atualizacao:** 2026-08-12 — P1 fechado; audit zero, RLS de sessões 98/98, cobertura e regressões completa/ampliada validados

## Objetivo

Consolidar a politica minima de qualidade para a fase final de construcao enterprise.

## Gates do repositorio

- `pnpm typecheck`
- `pnpm build`
- `pnpm test`
- `pnpm test:critical`
- `REQUIRE_TEST_DB=1 pnpm test:integration`
- `pnpm validate:rls`
- `pnpm security:enterprise`
- `pnpm test:e2e`
- `pnpm release:check`

## CI Pipeline

O pipeline CI em `.github/workflows/ci.yml` executa automaticamente em pushes e PRs para `main` e `develop`:

| Job                | O que faz                              | Depende de |
| ------------------ | -------------------------------------- | ---------- |
| `typecheck`        | `pnpm typecheck`                       | —          |
| `build`            | `pnpm build`                           | typecheck  |
| `test-unit`        | `pnpm test`                            | typecheck  |
| `test-integration` | `pnpm test:critical` com PostgreSQL 16 | typecheck  |

O job `test-integration` provisiona um servico PostgreSQL 16 via GitHub Actions services na porta 5433.

### O que roda em CI vs ambiente assistido

| Gate            | CI                          | Assistido        |
| --------------- | --------------------------- | ---------------- |
| `typecheck`     | ✅                          | —                |
| `build`         | ✅                          | —                |
| `test` (unit)   | ✅                          | —                |
| `test:critical` | ✅ (com PostgreSQL service) | —                |
| `test:e2e`      | ❌ (requer browser)         | ✅ local/staging |
| `release:check` | ❌ (agregacao manual)       | ✅               |

## Setup do banco de teste

### Pre-requisitos

- Docker e Docker Compose instalados
- PostgreSQL 16 disponivel via container

### Passo a passo

```bash
# 1. Subir banco de teste (porta 5433)
pnpm test:db:start

# 2. Executar suite critica (migration + seed + testes)
DATABASE_URL_TEST="<test-database-url>" \
DATABASE_URL="<test-database-url>" \
pnpm test:critical

# 3. Parar banco de teste
pnpm test:db:stop
```

### Fluxo automatico recomendado

Para execucao completa com bootstrap automatico (migration + seed + testes):

```bash
# Com banco de teste rodando
pnpm test:db:start
DATABASE_URL_TEST="<test-database-url>" \
pnpm test:critical:bootstrap
pnpm test:db:stop
```

O script `test:critical:bootstrap` valida conectividade, cria/reseta o banco, aplica migration, aplica seed e roda os testes criticos em uma unica execucao.

### Configuracao

- `DATABASE_URL_TEST` — URL percent-encoded do banco isolado de teste
- `tests/setup/env.ts` — carregamento de variaveis
- `tests/db/db-admin.ts` — conexao admin para reset do banco
- `tests/setup/global-setup.ts` — bootstrap automatico (reset + migrate + seed)
- `docker-compose.test.yml` — compose do banco de teste

### O que o globalSetup faz

1. Cria/reseta o banco `cvg_his_v2_test`
2. Aplica a migration Drizzle `0000_vengeful_pet_avengers.sql`
3. Executa o seed Drizzle (`packages/db/src/seed.ts`)
4. Verifica integridade do schema (tables, enums, FKs)

## Leitura correta do estado atual

- o repositorio possui testes em `apps/api`, `packages/modules`, `tests/integration` e `e2e/tests`
- a trilha de validacao existe e e executavel com banco configurado
- `pnpm test:critical` executa 171 testes (DB + integrações fundacionais)
- modulos `staff`, `users` e `scheduling` agora possuem suites dedicadas acionadas pelos proprios `package.json`
- `apps/web` agora possui regressao guiada minima para shell HTML, rotas principais, labels funcionais e servidor instanciavel sem depender de bind local
- `apps/api` agora possui cobertura HTTP dedicada para queue lifecycle e update de triage
- `apps/api/src/server.test.ts` foi endurecido para validar sem `listen()` real, o que deixa a suite reproduzivel em sandbox e CI restrito
- o bootstrap production-like falha sem PostgreSQL saudável e os catálogos não fazem fallback silencioso para memória
- a migration `0057_auth_sessions.sql` habilita persistência de sessões no repositório canônico
- a migration `0058_auth_sessions_rls.sql` isola sessões por conta; o gate estático cobre 98/98 tabelas tenant

## Suites dedicadas relevantes

| Area       | Comando                                            | Valor atual                                                      |
| ---------- | -------------------------------------------------- | ---------------------------------------------------------------- |
| Staff      | `pnpm --filter @cvg-his-v2/module-staff test`      | create/update/toggle/list por conta/hydrate                      |
| Users      | `pnpm --filter @cvg-his-v2/module-users test`      | hashing, verifyPassword, seed legacy, create/update, hydrate     |
| Scheduling | `pnpm --filter @cvg-his-v2/module-scheduling test` | appointments, queue ordering, check-in, attachEncounter, hydrate |
| SPA        | `pnpm --filter @cvg-his-v2/spa test`               | testes de páginas, navegação e fluxos operacionais do frontend canônico |
| API HTTP   | `pnpm --filter @cvg-his-v2/api test`               | health, rotas, autenticação, adapters, runtime e fluxo HTTP sem bind real |

### Última evidência reproduzida

Em 12/08/2026, a API passou em **233/233** testes, a suíte crítica em **4 arquivos e 171/171**, a SPA em **165 arquivos e 969/969**, a integração ampliada em **131 arquivos e 1.682/1.682**, e a suíte completa do monorepo foi executada sem falhas. A cobertura formal passou com **85,60% statements/lines, 88,97% functions e 80,96% branches**; o threshold global de 80% permanece enforceado. `validate:rls` passou com **98/98 tabelas tenant protegidas**. O gate `pnpm security:enterprise` passou com secret scan limpo e `pnpm audit --audit-level=low` sem vulnerabilidades conhecidas; qualquer advisory de severidade baixa ou superior agora bloqueia o gate.

## Criterio de qualidade para nota 85

- gates executaveis com pre-requisitos claros
- fluxos criticos conhecidos e priorizados
- diagnostico de falha objetivo
- documentacao de teste curta e aderente

## Cobertura de testes

### Configuracao

A cobertura de testes esta configurada no `vitest.config.ts` usando o provider `v8`:

```typescript
coverage: {
  provider: 'v8',
  reporter: ['text', 'json', 'html'],
  include: ['apps/api/src/**/*.ts', 'packages/modules/**/*.ts', 'packages/shared/**/*.ts'],
  exclude: ['**/*.test.ts', '**/*.d.ts', '**/dist/**', '**/node_modules/**']
}
```

### Comandos

| Comando              | Descricao                              |
| -------------------- | -------------------------------------- |
| `pnpm test:coverage` | Executa todos os testes com cobertura  |
| `pnpm test`          | Executa testes unitarios sem cobertura |
| `pnpm test:critical` | Executa testes criticos de integracao  |
| `pnpm test:integration` | Executa a matriz ampliada com PostgreSQL |
| `pnpm validate:rls` | Valida cobertura estática das políticas tenant |

### Relatorios

Os relatorios sao gerados em 3 formatos:

- **text** — saida no terminal
- **json** — `coverage/coverage-final.json`
- **html** — `coverage/index.html` (abrir no browser)

### Meta de cobertura

A configuração atual aplica threshold global de **80%** para lines, functions, branches e statements em `vitest.config.ts`. A cobertura é enforceada pelo comando `pnpm test:coverage`; ela deve ser interpretada junto da lista de exclusões documentada no próprio config.
