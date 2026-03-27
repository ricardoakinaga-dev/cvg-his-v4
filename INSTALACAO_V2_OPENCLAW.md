# Instalacao Canonica do CVG-HIS V2

Este arquivo existe na raiz do repositório para evitar ambiguidade durante deploy, bootstrap e uso do OpenClaw.

## Fonte da verdade

Use apenas a trilha canônica do V2:

- `apps/api`
- `apps/web`
- `apps/worker`

Nao use nenhuma trilha `apps/his-*`.

## Banco e migrations

As migrations oficiais do V2 estao em:

- `packages/shared/database/src/migrations/001_initial_schema.sql`
- `packages/shared/database/src/migrations/002_entry_revisions.sql`
- `packages/shared/database/src/migrations/003_advanced_care_persistence.sql`
- `packages/shared/database/src/migrations/004_clinical_entry_governance.sql`

Se o OpenClaw precisar aplicar schema manualmente, execute nesta ordem:

```bash
psql "$DATABASE_URL" -f packages/shared/database/src/migrations/001_initial_schema.sql
psql "$DATABASE_URL" -f packages/shared/database/src/migrations/002_entry_revisions.sql
psql "$DATABASE_URL" -f packages/shared/database/src/migrations/003_advanced_care_persistence.sql
psql "$DATABASE_URL" -f packages/shared/database/src/migrations/004_clinical_entry_governance.sql
```

## Bootstrap local canonico

Para infraestrutura local minima do V2:

```bash
docker compose -f docker-compose.dev.yml up -d postgres redis
```

Esse compose de desenvolvimento agora contem apenas:

- `postgres`
- `redis`

Ele nao sobe nenhuma stack legada.

## Deploy real do V2

Para publicar o V2 real:

- compose principal: `docker-compose.v2.yml`
- env principal: `.env.v2`
- cutover assistido: `infra/scripts/cutover-v2.sh`

Comandos base:

```bash
docker compose --env-file .env.v2 -f docker-compose.v2.yml up -d --build
infra/scripts/cutover-v2.sh
```

## Validacoes minimas

API:

```bash
curl http://127.0.0.1:3001/health
curl http://127.0.0.1:3001/ready
```

Web:

```bash
curl -I http://127.0.0.1:3000/
```

## Docs operacionais

- `OPENCLAW_DEPLOY_DIRETRIZES.md`
- `docs/130-instalacao-publicacao-cvg-his-v2-real.md`
- `docs/131-checklist-cutover-servidor.md`

## Regra operacional

Se houver divergencia entre artefatos antigos e estes arquivos:

1. considere `apps/api`, `apps/web`, `apps/worker` como canonicos
2. considere `docker-compose.v2.yml` como deploy real
3. considere `docker-compose.dev.yml` como bootstrap local de infra
4. considere as migrations em `packages/shared/database/src/migrations` como fonte oficial do schema
