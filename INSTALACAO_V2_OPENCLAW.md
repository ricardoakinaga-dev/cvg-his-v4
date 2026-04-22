# Instalacao Canonica do CVG-HIS V2

Guia rapido e sem ambiguidade para instalacao, atualizacao das imagens e deploy da stack atual.

## Regra principal

Para deploy real, use somente:

- `docker-compose.v2.yml`
- `.env.v2` a partir de `.env.v2.example`
- `packages/db/src/migrate.ts`
- `packages/db/src/seed.ts`

Nao use:

- qualquer `apps/his-*`
- qualquer imagem `cvg-his-api`, `cvg-his-web`, `cvg-his-worker`
- qualquer compose antigo
- `packages/shared/database/src/migrations/*.sql` como fluxo principal de deploy

## Servicos e portas reais

Servicos da stack:

- `postgres`
- `redis`
- `cvg-his-v2-api`
- `cvg-his-v2-worker`
- `cvg-his-v2-spa`

Portas externas do compose atual:

- API: `3003`
- SPA: `3002`
- Postgres: `5432`
- Redis: `6380`
- Worker: sem porta publicada

## Ordem obrigatoria

### 1. Preparar o arquivo de ambiente

```bash
cp .env.v2.example .env.v2
```

Preencher:

- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `AUTH_SECRET`
- `AUTH_ACCESS_TOKEN_TTL_SECONDS`
- `AUTH_REFRESH_TOKEN_TTL_SECONDS`
- `WORKER_INTERVAL_MS`

### 2. Validar o compose

```bash
docker compose --env-file .env.v2 -f docker-compose.v2.yml config
```

### 3. Derrubar stack anterior

```bash
docker compose --env-file .env.v2 -f docker-compose.v2.yml down --remove-orphans
```

### 4. Reconstruir as imagens corretas

```bash
docker compose --env-file .env.v2 -f docker-compose.v2.yml build --no-cache cvg-his-v2-api cvg-his-v2-worker cvg-his-v2-spa
```

### 5. Subir dependencias

```bash
docker compose --env-file .env.v2 -f docker-compose.v2.yml up -d postgres redis
```

### 6. Aplicar schema oficial

```bash
DATABASE_URL=postgres://$POSTGRES_USER:$POSTGRES_PASSWORD@127.0.0.1:5432/$POSTGRES_DB \
npx tsx packages/db/src/migrate.ts
```

### 7. Aplicar seed apenas se for intencional

```bash
DATABASE_URL=postgres://$POSTGRES_USER:$POSTGRES_PASSWORD@127.0.0.1:5432/$POSTGRES_DB \
ADMIN_EMAIL=admin@example.com \
ADMIN_PASSWORD=troque-esta-senha \
npx tsx packages/db/src/seed.ts
```

### 8. Subir aplicacao

```bash
docker compose --env-file .env.v2 -f docker-compose.v2.yml up -d cvg-his-v2-api cvg-his-v2-worker cvg-his-v2-spa
```

### 9. Validar

```bash
curl http://127.0.0.1:3003/health
curl http://127.0.0.1:3003/ready
curl -I http://127.0.0.1:3002/
docker compose --env-file .env.v2 -f docker-compose.v2.yml ps
docker compose --env-file .env.v2 -f docker-compose.v2.yml logs --tail=100 cvg-his-v2-api
docker compose --env-file .env.v2 -f docker-compose.v2.yml logs --tail=100 cvg-his-v2-worker
docker compose --env-file .env.v2 -f docker-compose.v2.yml logs --tail=100 cvg-his-v2-spa
```

## Atualizacao de imagens

Quando houver nova versao:

1. atualizar o codigo
2. validar o compose
3. derrubar a stack antiga
4. rebuildar as imagens do `docker-compose.v2.yml`
5. subir `postgres` e `redis`
6. rodar `packages/db/src/migrate.ts`
7. subir a aplicacao
8. validar health, ready e logs

## Observacao critica

O frontend oficial e unico do projeto e `apps/spa`. Nenhum passo operacional deve depender de `apps/web`.

Antes de qualquer publicacao:

- rode `pnpm deploy:check`
- confirme que o proxy principal aponta para `127.0.0.1:3002`
- confirme que a migration roda somente por `packages/db/src/migrate.ts`

## Referencias

- `README.md`
- `OPENCLAW_DEPLOY_DIRETRIZES.md`
- `docs/132-superficie-canonica-deploy-e-migracao.md`
- `docker-compose.v2.yml`
- `.env.v2.example`
