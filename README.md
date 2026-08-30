# CVG-HIS V4

Monorepo do sistema HIS veterinário V4. Os nomes V2 ainda presentes em
packages, imagens e Compose são identificadores de compatibilidade governados
por [RELEASE_IDENTITY.md](docs/engineering/RELEASE_IDENTITY.md), não uma
segunda versão do produto.

Este README foi ajustado para que a instalacao, a atualizacao das imagens e o deploy nao usem artefatos errados, trilhas legadas ou sequencias ambiguas.

## Fonte de verdade para deploy

Para instalacao e publicacao da stack real, use apenas:

- `docker-compose.v2.yml`
- `.env.v2` gerado a partir de `.env.v2.example`
- `apps/api/Dockerfile`
- `apps/worker/Dockerfile`
- `apps/spa/Dockerfile`
- `packages/db/src/migrate.ts`
- `packages/db/src/seed.ts`
- `infra/helm/cvg-his-v2`
- `docs/engineering/RELEASE_IDENTITY.md`
- `OPENCLAW_DEPLOY_DIRETRIZES.md`
- `INSTALACAO_V2_OPENCLAW.md`

Para bootstrap local de infraestrutura, use apenas:

- `docker-compose.dev.yml`

## O que nao pode ser usado

Nao use:

- qualquer trilha `apps/his-*`
- qualquer imagem `cvg-his-api`, `cvg-his-web`, `cvg-his-worker` como runtime oficial
- qualquer dependencia operacional de `apps/web` como frontend canonico
- qualquer compose antigo para publicar API, Web, Worker ou SPA
- `packages/shared/database/src/migrations/*.sql` como trilha principal de deploy
- `npm install` isolado dentro de subpastas para publicacao da stack

Regra operacional: o deploy correto deve reconstruir as imagens a partir do codigo atual do repositorio e do `pnpm-lock.yaml` atual.

## Servicos canonicos da stack V2

Os serviços definidos hoje em [`docker-compose.v2.yml`](docker-compose.v2.yml) são:

- `postgres`
- `redis`
- `cvg-his-v2-api`
- `cvg-his-v2-worker`
- `cvg-his-v2-spa`

Portas externas atuais:

- API: `127.0.0.1:3003 -> 3001`
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
- `WHATSAPP_WEBHOOK_SECRET`
- `AUTH_ACCESS_TOKEN_TTL_SECONDS`
- `AUTH_REFRESH_TOKEN_TTL_SECONDS`
- `WORKER_INTERVAL_MS`

Regras:

- `POSTGRES_PASSWORD` nao pode ficar no placeholder
- `AUTH_SECRET` deve ter 32 ou mais caracteres reais
- `WHATSAPP_WEBHOOK_SECRET` deve ser independente e enviado pelo gateway no header `x-webhook-secret`
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
docker compose --env-file .env.v2 -f docker-compose.v2.yml build --no-cache cvg-his-v2-api cvg-his-v2-worker cvg-his-v2-spa
```

Se o objetivo tambem for atualizar as imagens base, prefira:

```bash
docker compose --env-file .env.v2 -f docker-compose.v2.yml build --pull --no-cache cvg-his-v2-api cvg-his-v2-worker cvg-his-v2-spa
```

### 5. Subir dependencias primeiro

```bash
docker compose --env-file .env.v2 -f docker-compose.v2.yml up -d postgres redis
```

### 6. Aplicar migrations oficiais

O caminho canônico de schema para deploy atual é Drizzle via [`packages/db/src/migrate.ts`](packages/db/src/migrate.ts).

```bash
DATABASE_URL=postgres://$POSTGRES_USER:$POSTGRES_PASSWORD@127.0.0.1:5432/$POSTGRES_DB \
npx tsx packages/db/src/migrate.ts
```

Para uma instalacao vazia, nao execute o seed. Configure um
`SETUP_BOOTSTRAP_TOKEN` de alta entropia, suba a aplicacao e conclua o assistente
de primeiro acesso em `/setup`. O procedimento canonico esta em
[`docs/2026-08-10-primeiro-acesso-super-admin.md`](docs/2026-08-10-primeiro-acesso-super-admin.md).

O seed fica restrito a ambientes locais descartaveis com dados sinteticos; ele
nao e o mecanismo de bootstrap de staging ou producao.

Regra importante: nao aplique ao mesmo tempo o fluxo de `packages/db` e os SQLs de `packages/shared/database`. Para deploy atual, use somente `packages/db`.

### 7. Subir a aplicacao

```bash
docker compose --env-file .env.v2 -f docker-compose.v2.yml up -d cvg-his-v2-api cvg-his-v2-worker cvg-his-v2-spa
```

### 8. Validar o stack

```bash
curl http://127.0.0.1:3003/health
curl http://127.0.0.1:3003/ready
curl -I http://127.0.0.1:3002/
docker compose --env-file .env.v2 -f docker-compose.v2.yml ps
docker compose --env-file .env.v2 -f docker-compose.v2.yml logs --tail=100 cvg-his-v2-api
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
7. suba `api`, `worker` e `spa`
8. valide health, ready, logs e rotas basicas

Nao faca:

- `docker pull` de imagem legada para reaproveitar deploy antigo
- `npm install` em app isolado para publicar a stack
- execucao de migrations por caminho diferente do padrao atual

## Cutover e proxy

Os artefatos vivos de cutover e proxy agora seguem a mesma topologia do compose atual:

- SPA em `127.0.0.1:3002`
- API em `127.0.0.1:3003`

Antes de publicar trafego, rode o guardrail documental e operacional:

```bash
pnpm validate:deploy-surface
pnpm deploy:check
pnpm validate:helm
```

No CI, o gate usa Helm v3.15.4 instalado com SHA-256 pinado e executa
`HELM_BIN=/usr/local/bin/helm REQUIRE_HELM=1 pnpm validate:helm`; localmente,
sem `REQUIRE_HELM=1`, a validação estática continua disponível quando o
binário não está instalado.

Exemplo seguro para o cutover:

```bash
API_HEALTH_URL=http://127.0.0.1:3003/health \
API_READY_URL=http://127.0.0.1:3003/ready \
API_METRICS_URL=http://127.0.0.1:3003/metrics \
SPA_URL=http://127.0.0.1:3002/ \
pnpm deploy:cutover:v2
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
pnpm deploy:check
```

Checks operacionais:

- `pnpm deploy:check` valida se compose, proxy, env example e docs vivas continuam alinhados a `apps/spa` e ao runner canonico de migrations
- `pnpm validate:deploy-surface` impede que CI ou automação ativa volte a usar o track Helm legado
- `pnpm test:smoke` executa a trilha funcional principal da SPA sem os cenarios visuais

## Documentacao operacional

- [OPENCLAW_DEPLOY_DIRETRIZES.md](OPENCLAW_DEPLOY_DIRETRIZES.md)
- [INSTALACAO_V2_OPENCLAW.md](INSTALACAO_V2_OPENCLAW.md)
- [docs/132-superficie-canonica-deploy-e-migracao.md](docs/132-superficie-canonica-deploy-e-migracao.md)
- [docker-compose.v2.yml](docker-compose.v2.yml)
- [.env.v2.example](.env.v2.example)
- [infra/scripts/cutover-v2.sh](infra/scripts/cutover-v2.sh)
- [infra/scripts/check-cutover-readiness.mjs](infra/scripts/check-cutover-readiness.mjs)
- [infra/docker/Caddyfile.v2](infra/docker/Caddyfile.v2)
