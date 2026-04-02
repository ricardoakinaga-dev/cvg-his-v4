# 460 - Qualidade, Testes e Gates

**Status:** vivo
**Data de validacao:** 2026-03-31
**Ultima atualizacao:** 2026-03-31 — Ciclo 1: CI pipeline adicionado, gates documentados

## Objetivo

Consolidar a politica minima de qualidade para a fase final de construcao enterprise.

## Gates do repositorio

- `pnpm typecheck`
- `pnpm build`
- `pnpm test`
- `pnpm test:critical`
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
DATABASE_URL_TEST=postgres://postgres:postgres@localhost:5433/cvg_his_v2_test \
DATABASE_URL=postgres://postgres:postgres@localhost:5433/cvg_his_v2_test \
pnpm test:critical

# 3. Parar banco de teste
pnpm test:db:stop
```

### Fluxo automatico recomendado

Para execucao completa com bootstrap automatico (migration + seed + testes):

```bash
# Com banco de teste rodando
pnpm test:db:start
DATABASE_URL_TEST=postgres://postgres:postgres@localhost:5433/cvg_his_v2_test \
pnpm test:critical:bootstrap
pnpm test:db:stop
```

O script `test:critical:bootstrap` valida conectividade, cria/reseta o banco, aplica migration, aplica seed e roda os testes criticos em uma unica execucao.

### Configuracao

- `DATABASE_URL_TEST` — URL do banco de teste (default: `postgres://postgres:postgres@localhost:5433/cvg_his_v2_test`)
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
- `pnpm test:critical` executa 162 testes (DB + integracoes fundacionais)
- modulos `staff`, `users` e `scheduling` agora possuem suites dedicadas acionadas pelos proprios `package.json`
- `apps/web` agora possui regressao guiada minima para shell HTML, rotas principais, labels funcionais e servidor instanciavel sem depender de bind local
- `apps/api` agora possui cobertura HTTP dedicada para queue lifecycle e update de triage
- `apps/api/src/server.test.ts` foi endurecido para validar sem `listen()` real, o que deixa a suite reproduzivel em sandbox e CI restrito

## Suites dedicadas relevantes

| Area       | Comando                                            | Valor atual                                                      |
| ---------- | -------------------------------------------------- | ---------------------------------------------------------------- |
| Staff      | `pnpm --filter @cvg-his-v2/module-staff test`      | create/update/toggle/list por conta/hydrate                      |
| Users      | `pnpm --filter @cvg-his-v2/module-users test`      | hashing, verifyPassword, seed legacy, create/update, hydrate     |
| Scheduling | `pnpm --filter @cvg-his-v2/module-scheduling test` | appointments, queue ordering, check-in, attachEncounter, hydrate |
| Web        | `pnpm --filter @cvg-his-v2/web test`               | regressao guiada de shell HTML, rotas, labels e servidor instanciavel |
| API HTTP   | `pnpm --filter @cvg-his-v2/api test`               | health, runtime e fluxo HTTP sem bind real de socket             |

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

### Relatorios

Os relatorios sao gerados em 3 formatos:

- **text** — saida no terminal
- **json** — `coverage/coverage-final.json`
- **html** — `coverage/index.html` (abrir no browser)

### Meta de cobertura

A meta atual e **ter leitura objetiva de cobertura**. Nao ha threshold minimo enforceado no CI, mas os relatorios devem ser consultados regularmente para identificar areas nao testadas.
