# Instalacao Canonica do CVG-HIS V2

Este arquivo existe na raiz do repositório para evitar ambiguidade durante deploy, bootstrap e uso do OpenClaw.

## Fonte da verdade

Use apenas a trilha canônica do V2:

- `apps/api`
- `apps/web`
- `apps/worker`

Nao use nenhuma trilha `apps/his-*`.

## Imagem correta do projeto atual

Para eliminar o risco de o OpenClaw instalar a imagem antiga, considere obrigatorio:

- o deploy correto do projeto atual usa **somente** `docker-compose.v2.yml`
- a aplicacao atual **nao** deve ser instalada por imagem legada ou compose antigo
- os servicos corretos da stack atual sao:
  - `cvg-his-v2-api`
  - `cvg-his-v2-web`
  - `cvg-his-v2-worker`
- essas imagens devem ser construidas a partir dos Dockerfiles atuais do repositório:
  - `apps/api/Dockerfile`
  - `apps/web/Dockerfile`
  - `apps/worker/Dockerfile`

Nunca usar:

- `cvg-his-api`
- `cvg-his-web`
- `cvg-his-worker`
- qualquer stack `apps/his-*`
- qualquer compose antigo para API/Web/Worker

Se existir ambiguidade entre imagem atual e imagem antiga, a correta e sempre a imagem reconstruida localmente pelo compose V2.

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
docker compose --env-file .env.v2 -f docker-compose.v2.yml down --remove-orphans
docker compose --env-file .env.v2 -f docker-compose.v2.yml build --no-cache cvg-his-v2-api cvg-his-v2-web cvg-his-v2-worker
docker compose --env-file .env.v2 -f docker-compose.v2.yml up -d postgres redis cvg-his-v2-api cvg-his-v2-web cvg-his-v2-worker
infra/scripts/cutover-v2.sh
```

Interpretacao obrigatoria:

- `--no-cache` deve ser preferido quando houver historico de imagem antiga sendo reutilizada
- a subida correta deve citar os nomes dos servicos V2 explicitamente
- se o agente tentar subir nomes antigos de container/imagem, a execucao deve ser interrompida

## Validacoes minimas

API:

```bash
curl http://127.0.0.1:3000/health
curl http://127.0.0.1:3000/ready
```

Web:

```bash
curl -I http://127.0.0.1:3001/
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
5. considere `cvg-his-v2-api`, `cvg-his-v2-web` e `cvg-his-v2-worker` como os unicos servicos validos da aplicacao atual
