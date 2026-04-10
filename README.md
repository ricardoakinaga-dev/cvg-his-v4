# CVG-HIS V2

Monorepo do sistema HIS veterinario V2.

Este README foi ajustado para que a instalacao, a atualizacao das imagens e o deploy nao usem artefatos errados, trilhas legadas ou sequencias ambiguas.

## Fonte de verdade para deploy

Para instalacao e publicacao da stack real, use apenas:

- `docker-compose.v2.yml`
- `.env.v2` gerado a partir de `.env.v2.example`
- `apps/api/Dockerfile`
- `apps/web/Dockerfile`
- `apps/worker/Dockerfile`
- `apps/spa/Dockerfile`
- `packages/db/src/migrate.ts`
- `packages/db/src/seed.ts`
- `OPENCLAW_DEPLOY_DIRETRIZES.md`
- `INSTALACAO_V2_OPENCLAW.md`

Para bootstrap local de infraestrutura, use apenas:

- `docker-compose.dev.yml`

## O que nao pode ser usado

Nao use:

- qualquer trilha `apps/his-*`
- qualquer imagem `cvg-his-api`, `cvg-his-web`, `cvg-his-worker`
- qualquer compose antigo para publicar API, Web, Worker ou SPA
- `packages/shared/database/src/migrations/*.sql` como trilha principal de deploy
- `npm install` isolado dentro de subpastas para publicacao da stack

Regra operacional: o deploy correto deve reconstruir as imagens a partir do codigo atual do repositorio e do `pnpm-lock.yaml` atual.

## Servicos canonicos da stack V2

Os servicos definidos hoje em [`docker-compose.v2.yml`](/root/.openclaw/workspace/cvg-his-v2/docker-compose.v2.yml) sao:

- `postgres`
- `redis`
- `cvg-his-v2-api`
- `cvg-his-v2-web`
- `cvg-his-v2-worker`
- `cvg-his-v2-spa`

Portas externas atuais:

- API: `127.0.0.1:3003 -> 3001`
- Web: `127.0.0.1:3004 -> 3000`
- SPA: `127.0.0.1:3002 -> 3002`
- Postgres: `127.0.0.1:5432 -> 5432`
- Redis: `127.0.0.1:6380 -> 6379`
- Worker: sem porta publicada no compose atual

Importante: o worker possui endpoints HTTP internos de health e ready, mas o `docker-compose.v2.yml` atual nao publica a porta dele. Portanto, a validacao do worker em deploy deve ser feita por `docker compose ps` e logs, a menos que a porta seja exposta explicitamente.

## Sequencia segura de instalacao e deploy

### 1. Preparar ambiente

```bash
cp .env.v2.example .env.v2
```

Preencha ao menos:

- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `AUTH_SECRET`
- `AUTH_ACCESS_TOKEN_TTL_SECONDS`
- `AUTH_REFRESH_TOKEN_TTL_SECONDS`
- `WORKER_INTERVAL_MS`

Regras:

- `POSTGRES_PASSWORD` nao pode ficar no placeholder
- `AUTH_SECRET` deve ter 32 ou mais caracteres reais
- use apenas `.env.v2` para a stack real

### 2. Validar o compose antes de subir

```bash
docker compose --env-file .env.v2 -f docker-compose.v2.yml config
```

### 3. Remover stack antiga do compose V2

```bash
docker compose --env-file .env.v2 -f docker-compose.v2.yml down --remove-orphans
```

### 4. Reconstruir imagens corretas

```bash
docker compose --env-file .env.v2 -f docker-compose.v2.yml build --no-cache cvg-his-v2-api cvg-his-v2-web cvg-his-v2-worker cvg-his-v2-spa
```

Se o objetivo tambem for atualizar as imagens base, prefira:

```bash
docker compose --env-file .env.v2 -f docker-compose.v2.yml build --pull --no-cache cvg-his-v2-api cvg-his-v2-web cvg-his-v2-worker cvg-his-v2-spa
```

### 5. Subir dependencias primeiro

```bash
docker compose --env-file .env.v2 -f docker-compose.v2.yml up -d postgres redis
```

### 6. Aplicar migrations oficiais

O caminho canonico de schema para deploy atual e Drizzle via [`packages/db/src/migrate.ts`](/root/.openclaw/workspace/cvg-his-v2/packages/db/src/migrate.ts).

```bash
DATABASE_URL=postgres://$POSTGRES_USER:$POSTGRES_PASSWORD@127.0.0.1:5432/$POSTGRES_DB \
npx tsx packages/db/src/migrate.ts
```

Opcionalmente, para seed inicial de admin:

```bash
DATABASE_URL=postgres://$POSTGRES_USER:$POSTGRES_PASSWORD@127.0.0.1:5432/$POSTGRES_DB \
ADMIN_EMAIL=admin@example.com \
ADMIN_PASSWORD=troque-esta-senha \
npx tsx packages/db/src/seed.ts
```

Regra importante: nao aplique ao mesmo tempo o fluxo de `packages/db` e os SQLs de `packages/shared/database`. Para deploy atual, use somente `packages/db`.

### 7. Subir a aplicacao

```bash
docker compose --env-file .env.v2 -f docker-compose.v2.yml up -d cvg-his-v2-api cvg-his-v2-web cvg-his-v2-worker cvg-his-v2-spa
```

### 8. Validar o stack

```bash
curl http://127.0.0.1:3003/health
curl http://127.0.0.1:3003/ready
curl -I http://127.0.0.1:3004/
curl -I http://127.0.0.1:3002/
docker compose --env-file .env.v2 -f docker-compose.v2.yml ps
docker compose --env-file .env.v2 -f docker-compose.v2.yml logs --tail=100 cvg-his-v2-api
docker compose --env-file .env.v2 -f docker-compose.v2.yml logs --tail=100 cvg-his-v2-web
docker compose --env-file .env.v2 -f docker-compose.v2.yml logs --tail=100 cvg-his-v2-worker
docker compose --env-file .env.v2 -f docker-compose.v2.yml logs --tail=100 cvg-his-v2-spa
```

## Atualizacao de imagens sem ambiguidade

Quando houver nova versao do codigo:

1. atualize o repositorio
2. valide `docker compose ... config`
3. derrube a stack V2 do compose atual
4. reconstrua as imagens com `build --no-cache` ou `build --pull --no-cache`
5. suba `postgres` e `redis`
6. rode `packages/db/src/migrate.ts`
7. suba `api`, `web`, `worker` e `spa`
8. valide health, ready, logs e rotas basicas

Nao faca:

- `docker pull` de imagem legada para reaproveitar deploy antigo
- `npm install` em app isolado para publicar a stack
- execucao de migrations por caminho diferente do padrao atual

## Observacao importante sobre cutover e proxy

Os arquivos [`infra/scripts/cutover-v2.sh`](/root/.openclaw/workspace/cvg-his-v2/infra/scripts/cutover-v2.sh) e [`infra/docker/Caddyfile.v2`](/root/.openclaw/workspace/cvg-his-v2/infra/docker/Caddyfile.v2) ainda carregam defaults historicos de portas `3000` e `3001` que nao batem com o `docker-compose.v2.yml` atual.

Portanto:

- nao use esses defaults cegamente
- se usar `cutover-v2.sh`, sobrescreva as URLs para os ports reais do compose atual
- se usar `Caddyfile.v2`, alinhe os `reverse_proxy` para as portas externas corretas antes de publicar trafego

Exemplo seguro para o script:

```bash
API_HEALTH_URL=http://127.0.0.1:3003/health \
API_READY_URL=http://127.0.0.1:3003/ready \
API_METRICS_URL=http://127.0.0.1:3003/metrics \
WEB_URL=http://127.0.0.1:3004/ \
infra/scripts/cutover-v2.sh
```

## Desenvolvimento local

Infra minima local:

```bash
docker compose -f docker-compose.dev.yml up -d postgres redis
```

Instalacao de dependencias do monorepo:

```bash
pnpm install
```

Comandos comuns:

```bash
pnpm dev
pnpm build
pnpm typecheck
pnpm test
```

## Documentacao operacional

- [OPENCLAW_DEPLOY_DIRETRIZES.md](/root/.openclaw/workspace/cvg-his-v2/OPENCLAW_DEPLOY_DIRETRIZES.md)
- [INSTALACAO_V2_OPENCLAW.md](/root/.openclaw/workspace/cvg-his-v2/INSTALACAO_V2_OPENCLAW.md)
- [docker-compose.v2.yml](/root/.openclaw/workspace/cvg-his-v2/docker-compose.v2.yml)
- [.env.v2.example](/root/.openclaw/workspace/cvg-his-v2/.env.v2.example)
- [infra/scripts/cutover-v2.sh](/root/.openclaw/workspace/cvg-his-v2/infra/scripts/cutover-v2.sh)
- [infra/docker/Caddyfile.v2](/root/.openclaw/workspace/cvg-his-v2/infra/docker/Caddyfile.v2)
