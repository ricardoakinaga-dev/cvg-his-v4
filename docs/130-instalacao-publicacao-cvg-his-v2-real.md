# 130 - Instalacao e Publicacao do CVG-HIS V2

**Status:** vivo
**Data de validacao:** 2026-03-31
**Ultima atualizacao:** 2026-03-31 — B001: trilha Drizzle oficial

## Escopo

Este documento descreve a trilha oficial para instalar e publicar o stack canonico do V2:

- `apps/api`
- `apps/worker`
- `apps/spa` **— frontend canonico do sistema**

## Regra central

Nao usar trilhas `apps/his-*` como deploy oficial.

Nao reutilizar imagens, containers ou nomes de servico legados do programa antigo.

**O frontend canonico e `apps/spa`** — nao `apps/web`.

## Stack oficial obrigatoria

O deploy oficial do projeto atual usa exclusivamente:

- `docker-compose.v2.yml`
- `apps/api/Dockerfile`
- `apps/worker/Dockerfile`
- `apps/spa/Dockerfile`

Os nomes de servico validos da stack atual sao:

- `cvg-his-v2-api`
- `cvg-his-v2-worker`
- `cvg-his-v2-spa` **— frontend canonico (apps/spa)**

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

### Worker

- `NODE_ENV=production`
- `DATABASE_URL=postgres://USER:PASS@HOST:5432/cvg_his_v2`
- `WORKER_INTERVAL_MS=5000`

### SPA (frontend canonico)

- `NODE_ENV=production`
- `VITE_API_BASE_URL=http://localhost:3000/api`
- `VITE_APP_NAME=CVG HIS V2`

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
docker compose --env-file .env.v2 -f docker-compose.v2.yml build --no-cache cvg-his-v2-api cvg-his-v2-worker cvg-his-v2-spa
docker compose --env-file .env.v2 -f docker-compose.v2.yml up -d postgres redis
docker compose --env-file .env.v2 -f docker-compose.v2.yml up -d cvg-his-v2-api cvg-his-v2-worker cvg-his-v2-spa
```

Essa e a trilha recomendada para garantir que o agente construa a stack atual do V2 e nao uma imagem residual do legado.

### Portas publicadas

| Servico       | Porta interna | Porta externa | Acesso                      |
|---------------|--------------|--------------|----------------------------|
| SPA (canonico)| 3002         | 3002         | `http://host:3002`         |
| API           | 3001         | 3003         | `http://host:3003`         |
| PostgreSQL    | 5432         | 5432         | `host:5432`                 |
| Redis         | 6379         | 6380         | `host:6380`                 |

**Importante:**

- porta externa `3002` e a SPA (frontend canonico) — e o que o dominio principal publica
- porta externa `3003` e a API

O proxy reverso (Caddy) aponta:

- `his.centroveterinarioguarapiranga.com` → `127.0.0.1:3002` (SPA — frontend canonico)
- `his-api.centroveterinarioguarapiranga.com` → `127.0.0.1:3003` (API)

**Validacao pos-deploy da SPA (frontend canonico):**

```bash
# Verificar que o dominio entrega a SPA (apps/spa)
curl -s https://his.centroveterinarioguarapiranga.com/ | grep -o '<title>[^<]*</title>'
# Esperado: <title>CVG HIS V2</title>

# Verificar que a SPA contem as paginas novas (API Keys, MFA, etc.)
curl -s https://his.centroveterinarioguarapiranga.com/assets/ApiKeysPage*.js | head -c 100
# Esperado: conteudo JS do componente ApiKeysPage
```

## Artefatos operacionais oficiais

- `docker-compose.v2.yml`
- `.env.v2.example`
- `infra/docker/Caddyfile.v2`
- `infra/systemd/cvg-his-v2-api.service`
- `infra/systemd/cvg-his-v2-worker.service`
- `infra/systemd/cvg-his-v2-spa.service`
- `infra/scripts/cutover-v2.sh`

## Validacoes minimas pos-subida

```bash
# API health checks (porta externa 3003)
curl http://127.0.0.1:3003/health
curl http://127.0.0.1:3003/ready
curl http://127.0.0.1:3003/live

# SPA availability (porta externa 3002 — frontend canonico)
curl -I http://127.0.0.1:3002/
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

### SPA pronta

A SPA e considerada pronta quando:

- Servidor HTTP responde na porta configurada (3002)
- Homepage (`/`) retorna 200 com `index.html` da SPA (apps/spa)
- O bundle JS e o da SPA (apps/spa)

**Sinal de que a SPA correta esta sendo servida:**
```bash
curl -s http://127.0.0.1:3002/assets/ApiKeysPage*.js | head -c 200
# Deve retornar codigo JS do componente ApiKeysPage (presente apenas em apps/spa)
```

Para o checklist completo de release enterprise, ver `520-checklist-release-enterprise.md`.

## Regra de seguranca operacional

- nao considerar deploy valido se banco, compose e documentacao estiverem divergentes
- nao executar cutover com migrations parciais
- nao misturar frontend legado com API V2
- nao usar fallback in-memory como base de producao
- **o dominio principal DEVE servir a SPA (apps/spa)**

**Regra anti-regressao:**

Antes de validar o deploy, SEMPRE verificar:
1. `curl https://his.centroveterinarioguarapiranga.com/assets/ApiKeysPage*.js` — deve existir (SPA nova)
2. Se a chamada acima falhar, o dominio nao esta servindo a SPA correta (erro de roteamento)

## Fonte complementar

Para a politica consolidada de banco, deploy e convergencia de trilhas, ver `470-politica-migracao-e-deploy.md`.
