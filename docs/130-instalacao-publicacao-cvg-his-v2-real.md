# 130 - Instalacao e Publicacao do CVG-HIS V2

**Status:** vivo
**Data de validacao:** 2026-03-31
**Ultima atualizacao:** 2026-03-31 — B001: trilha Drizzle oficial

## Escopo

Este documento descreve a trilha oficial para instalar e publicar o stack canonico do V2:

- `apps/api`
- `apps/web`
- `apps/worker`

## Regra central

Nao usar trilhas `apps/his-*` como deploy oficial.

Nao reutilizar imagens, containers ou nomes de servico legados do programa antigo.

## Stack oficial obrigatoria

O deploy oficial do projeto atual usa exclusivamente:

- `docker-compose.v2.yml`
- `apps/api/Dockerfile`
- `apps/web/Dockerfile`
- `apps/worker/Dockerfile`

Os nomes de servico validos da stack atual sao:

- `cvg-his-v2-api`
- `cvg-his-v2-web`
- `cvg-his-v2-worker`

Nao usar como runtime oficial:

- `cvg-his-api`
- `cvg-his-web`
- `cvg-his-worker`
- qualquer trilha `apps/his-*`
- qualquer imagem antiga reaproveitada de build anterior

## Requisitos minimos

- Linux
- Node.js `22+`
- `pnpm` `10`
- PostgreSQL `16+`
- Redis `7+`
- diretorio de storage com escrita para anexos

## Variaveis de ambiente principais

### API

- `NODE_ENV=production`
- `HOST=0.0.0.0`
- `PORT=3001`
- `DATABASE_URL=postgres://USER:PASS@HOST:5432/cvg_his_v2`
- `REDIS_URL=redis://HOST:6379`
- `AUTH_SECRET=<segredo forte>`
- `FILE_STORAGE_PATH=/srv/cvg-his-v2/storage`

### Web

- `NODE_ENV=production`
- `HOST=0.0.0.0`
- `PORT=3000`
- `API_BASE_URL=http://127.0.0.1:3001`

### Worker

- `NODE_ENV=production`
- `DATABASE_URL=postgres://USER:PASS@HOST:5432/cvg_his_v2`
- `WORKER_INTERVAL_MS=5000`

## Build e validacao local

```bash
pnpm install
pnpm typecheck
pnpm build
pnpm test
```

## Politica de migrations

### Trilha oficial: Drizzle ORM

A trilha oficial de persistencia e migracao do CVG-HIS V2 e o Drizzle ORM.

- **Migrations:** `packages/db/migrations/`
- **Schema:** `packages/db/src/schema/`
- **Seed:** `packages/db/src/seed.ts`
- **Runner:** `tsx packages/db/src/migrate.ts`

A migration atual e `0000_vengeful_pet_avengers.sql` — uma unica migration que contem o schema completo: 46 tabelas, 28 ENUM types, 126 foreign keys.

### Aplicacao em producao

```bash
# Aplicar migration Drizzle
DATABASE_URL=postgres://USER:PASS@HOST:5432/cvg_his_v2 \
  tsx packages/db/src/migrate.ts

# Executar seed (requer ADMIN_EMAIL e ADMIN_PASSWORD)
DATABASE_URL=postgres://USER:PASS@HOST:5432/cvg_his_v2 \
  ADMIN_EMAIL=admin@cvg.local ADMIN_PASSWORD=Admin123! \
  tsx packages/db/src/seed.ts
```

### Trilha SQL legacy (deprecada)

Os arquivos em `packages/shared/database/src/migrations/001-016` sao classificados como **legados/deprecados**. Nao usar para novos deploys.

## Docker Compose

Arquivo:

- `docker-compose.v2.yml`

### Sequencia operacional recomendada

Para evitar reaproveitamento acidental de imagem antiga, usar a sequencia abaixo:

```bash
docker compose --env-file .env.v2 -f docker-compose.v2.yml down --remove-orphans
docker compose --env-file .env.v2 -f docker-compose.v2.yml build --no-cache cvg-his-v2-api cvg-his-v2-web cvg-his-v2-worker
docker compose --env-file .env.v2 -f docker-compose.v2.yml up -d postgres redis cvg-his-v2-api cvg-his-v2-web cvg-his-v2-worker
```

Essa e a trilha recomendada para garantir que o agente construa a stack atual do V2 e nao uma imagem residual do legado.

### Portas publicadas

| Servico    | Porta interna | Porta externa | Acesso             |
| ---------- | ------------- | ------------- | ------------------ |
| API        | 3001          | 3000          | `http://host:3000` |
| Web        | 3000          | 3001          | `http://host:3001` |
| PostgreSQL | 5432          | 5432          | `host:5432`        |
| Redis      | 6379          | 6379          | `host:6379`        |

Ou seja:

- porta externa `3000` chega na API
- porta externa `3001` chega no Web

O proxy reverso (Caddy) aponta:

- `his.centroveterinarioguarapiranga.com` → `127.0.0.1:3001` (Web)
- `his-api.centroveterinarioguarapiranga.com` → `127.0.0.1:3000` (API)

## Artefatos operacionais oficiais

- `docker-compose.v2.yml`
- `.env.v2.example`
- `infra/docker/Caddyfile.v2`
- `infra/systemd/cvg-his-v2-api.service`
- `infra/systemd/cvg-his-v2-web.service`
- `infra/systemd/cvg-his-v2-worker.service`
- `infra/scripts/cutover-v2.sh`

## Validacoes minimas pos-subida

```bash
# API health checks (porta externa 3000)
curl http://127.0.0.1:3000/health
curl http://127.0.0.1:3000/ready
curl http://127.0.0.1:3000/live

# Web availability (porta externa 3001)
curl -I http://127.0.0.1:3001/
```

## Readiness operacional

### API pronta

A API e considerada pronta quando `/ready` retorna 200 com:

- `persistenceMode` = `database`
- `databaseHealthy` = `true`
- `repositoriesReady` = `true` (17+ repositorios)
- `workerReady` = `true`
- `productionReady` = `true`

### Worker pronto

O worker e considerado pronto quando:

- `DATABASE_URL` configurado
- `databaseHealthy` = `true` no bootstrap
- `notificationRepository` disponivel
- Loop de ticks executa sem erro por 5+ minutos

### Web pronto

O web e considerado pronto quando:

- Servidor HTTP responde na porta configurada
- Homepage (`/`) retorna 200
- Pagina de login (`/login`) retorna 200

Para o checklist completo de release enterprise, ver `520-checklist-release-enterprise.md`.

## Regra de seguranca operacional

- nao considerar deploy valido se banco, compose e documentacao estiverem divergentes
- nao executar cutover com migrations parciais
- nao misturar frontend legado com API V2
- nao usar fallback in-memory como base de producao

## Fonte complementar

Para a politica consolidada de banco, deploy e convergencia de trilhas, ver `470-politica-migracao-e-deploy.md`.
