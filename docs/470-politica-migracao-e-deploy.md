# 470 - Politica de Migracao e Deploy

**Status:** vivo
**Data de validacao:** 2026-03-31
**Ultima atualizacao:** 2026-03-31 — B001: trilha oficial declarada

## Decisao oficial de trilha de migrations

### Trilha oficial: Drizzle ORM

A trilha oficial de persistencia e migracao do CVG-HIS V2 e:

- **Migrations:** `packages/db/migrations/` (Drizzle)
- **Schema:** `packages/db/src/schema/`
- **Seed:** `packages/db/src/seed.ts`
- **Runner:** `tsx packages/db/src/migrate.ts`
- **Config:** `packages/db/drizzle.config.ts`

A migration atual e `0000_vengeful_pet_avengers.sql` — uma unica migration que contem o schema completo: 46 tabelas, 28 ENUM types, 126 foreign keys.

### Trilha legacy: SQL incremental (deprecada)

A trilha `packages/shared/database/src/migrations/001-016` e classificada como **legada/deprecada**. Nao deve ser usada para novos deploys ou testes. Os arquivos permanecem no repositorio apenas como referencia historica durante a transicao.

## Regras operacionais

### Deploy de producao

1. Aplicar migration Drizzle `0000_` em banco limpo
2. Executar seed Drizzle (`packages/db/src/seed.ts`)
3. Subir stack via `docker-compose.v2.yml`
4. Validar health/readiness/liveness

### Ambiente de teste

1. Subir PostgreSQL via `docker-compose.test.yml` (porta 5433)
2. O `globalSetup` do vitest aplica automaticamente a migration Drizzle + seed
3. Banco e resetado a cada execucao da suite

### Cutover

- `infra/scripts/cutover-v2.sh` aplica a migration Drizzle oficial
- O script de cutover NAO usa mais a trilha SQL legacy

## Politica editorial

- Uma unica trilha de migrations: Drizzle
- Trilha SQL legacy classificada como deprecada
- Nenhum documento vivo deve referenciar a trilha SQL como oficial
- Scripts operacionais apontam para Drizzle

## Checklist de coerencia

- [x] docs e script aplicam o mesmo conjunto de migrations (Drizzle)
- [x] compose e guia textual contam a mesma historia sobre portas publicadas
- [x] proxy sabe para onde o trafego esta indo de fato
- [x] validacoes pos-deploy usam as portas e endpoints corretos
- [x] CI pipeline valida typecheck, build e testes com PostgreSQL
