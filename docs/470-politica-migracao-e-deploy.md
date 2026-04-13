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

A cadeia oficial vai de `0000_vengeful_pet_avengers.sql` ate `0012_audit_events_alignment.sql`.
O runner `packages/db/src/migrate.ts` e a unica fonte de verdade para aplicar essa sequencia.

### Trilha legacy: SQL incremental (deprecada)

A trilha `packages/shared/database/src/migrations/001-016` e classificada como **legada/deprecada**. Nao deve ser usada para novos deploys ou testes. Os arquivos permanecem no repositorio apenas como referencia historica durante a transicao.

## Regras operacionais

### Deploy de producao

1. Aplicar a cadeia Drizzle completa via `packages/db/src/migrate.ts`
2. Executar seed Drizzle (`packages/db/src/seed.ts`)
3. Subir stack oficial do V2 via `docker-compose.v2.yml`
4. Validar health/readiness/liveness

### Stack oficial obrigatoria

O deploy oficial do projeto atual deve usar exclusivamente:

- `docker-compose.v2.yml`
- `apps/api`, `apps/worker`, `apps/spa`
- servicos `cvg-his-v2-api`, `cvg-his-v2-worker`, `cvg-his-v2-spa`

`apps/web` e o servico `cvg-his-v2-web` seguem apenas como legado de transicao, fora da trilha canonica de runtime.

Nao usar como runtime oficial:

- `cvg-his-api`
- `cvg-his-web`
- `cvg-his-worker`
- qualquer trilha `apps/his-*`
- qualquer imagem antiga reaproveitada de build anterior

### Sequencia recomendada de subida limpa

```bash
docker compose --env-file .env.v2 -f docker-compose.v2.yml down --remove-orphans
docker compose --env-file .env.v2 -f docker-compose.v2.yml build --no-cache cvg-his-v2-api cvg-his-v2-worker cvg-his-v2-spa
docker compose --env-file .env.v2 -f docker-compose.v2.yml up -d postgres redis cvg-his-v2-api cvg-his-v2-worker cvg-his-v2-spa
```

Essa e a sequencia recomendada para evitar reaproveitamento acidental de imagem antiga ou container residual do legado.

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
- [x] `prepare-test-db.mjs` deve usar a mesma trilha canônica de migrations do deploy
