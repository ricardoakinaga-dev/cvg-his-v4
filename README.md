# cvg-his

Monorepo base para o projeto HIS com `pnpm` workspaces, apps e packages em TypeScript strict.

## Stack da fase 0

- Node 22
- Fastify + TypeScript
- Drizzle + drizzle-kit + pg
- Zod
- Pino (via Fastify)
- BullMQ (fila `system` com job `ping`)

## Estrutura

- `apps/his-api`: API HTTP (placeholder Fastify)
- `apps/his-worker`: worker assíncrono (BullMQ)
- `apps/his-web`: placeholder para frontend
- `packages/config`: configurações compartilhadas (placeholder)
- `packages/db`: camada de banco (Drizzle ORM + migrations + seed RBAC)
- `packages/events`: contratos/eventos compartilhados (placeholder)

## Como rodar

### Instalar

```bash
pnpm -w install
```

### Desenvolvimento (API)

```bash
pnpm dev
```

### Desenvolvimento (Tudo com um comando)

```bash
pnpm dev:up
```

Esse comando sobe `postgres`, `redis`, `his-api`, `his-worker` e `his-web`.

### Desenvolvimento (Worker)

```bash
pnpm --filter @cvg-his/his-worker dev
```

### Lint

```bash
pnpm -w lint
```

### Testes

```bash
pnpm -w test
```

### Build

```bash
pnpm -w build
```

### Banco de dados (Drizzle)

Gerar migration SQL a partir do schema:

```bash
pnpm -w db:generate
```

Aplicar migrations:

```bash
pnpm -w db:migrate
```

Executar seed inicial (roles/permissões e admin opcional):

```bash
pnpm -w db:seed
```

## Observações

- `tsconfig.base.json` define `strict: true` para todos os workspaces TypeScript.
- Ainda não há aliases de path configurados nesta fase.
- Use apenas o `.env` da raiz do repositório como fonte de verdade para API/worker/db.
- Defina `DATABASE_URL` para um Postgres local antes de rodar scripts `db:*`.
- `ADMIN_EMAIL` e `ADMIN_PASSWORD` são opcionais para seed do usuário admin.
- `QUEUE_PREFIX` define o namespace das filas BullMQ (default: `cvg-his`).

## Fila `system` (BullMQ)

- Endpoint API: `POST /system/ping-job`
- Permissão necessária: `system.admin.test`
- Payload: sem body
- Resposta: `jobId` para rastreio

Exemplo local:

```bash
curl -X POST http://localhost:3000/system/ping-job \
  -H "x-account-id: acc_demo" \
  -H "x-role: admin"
```

O worker processa o job `ping` e loga `requestId`, `jobId` e `ts`, retornando `result: "pong"`.

## Docker (Fase 0)

- API: `apps/his-api/Dockerfile`
- Worker: `apps/his-worker/Dockerfile`
- Local opcional: `docker compose -f docker-compose.dev.yml up --build`

## Frontend Env (his-web)

- Variável pública canônica: `NEXT_PUBLIC_HIS_API_BASE_URL`
- Valor recomendado em produção: `/api/proxy`
- `NEXT_PUBLIC_*` é embutida no build do Next.js. Ao alterar `NEXT_PUBLIC_HIS_API_BASE_URL`, faça rebuild do `cvg-his-web`.
- O proxy do web usa `HIS_API_BASE_URL` (server-side) para alcançar o `his-api` internamente.
- O token de autenticação do web é persistido em cookie HttpOnly (`his_token`) por `POST /api/auth/session`.

## Deploy EasyPanel (passo a passo)

1. Crie o serviço `postgres` com volume persistente.
2. Crie o serviço `redis` com persistência habilitada.
3. Crie o serviço `cvg-his-api` usando `apps/his-api/Dockerfile`.
4. Configure env do `cvg-his-api`:
   `DATABASE_URL`, `REDIS_URL`, `QUEUE_PREFIX`, `JWT_SECRET`, `JWT_ISSUER`, `JWT_AUDIENCE`, `NODE_ENV=production`, `PORT=80`.
5. Configure healthcheck do `cvg-his-api`: `GET /health`.
6. Crie o serviço `cvg-his-worker` usando `apps/his-worker/Dockerfile`.
7. Configure env do `cvg-his-worker`:
   `DATABASE_URL`, `REDIS_URL`, `QUEUE_PREFIX`, `NODE_ENV=production`.
8. Não exponha porta pública para o worker.

### EasyPanel deployment checklist

- `DATABASE_URL` configurada no `cvg-his-api` e no `cvg-his-worker`.
- `REDIS_URL` configurada no `cvg-his-api` e no `cvg-his-worker`.
- `QUEUE_PREFIX` igual entre API e worker.
- `JWT_SECRET`, `JWT_ISSUER` e `JWT_AUDIENCE` configuradas no `cvg-his-api`.
- `cvg-his-worker` sem porta pública.
- Ao subir o worker sem `DATABASE_URL`, o processo deve encerrar com log fatal.
- `cvg-his-web` em HTTPS (em produção) para cookie de sessão `Secure`.
- Se usar subdomínios para web/api, configurar `HIS_AUTH_COOKIE_DOMAIN` no `cvg-his-web`.

## Smoke tests de produção

```bash
curl https://SEU_DOMINIO/health
```

```bash
curl -X POST https://SEU_DOMINIO/system/ping-job \
  -H "Authorization: Bearer <JWT_VALIDO_COM_system.admin.test>"
```

Valide no EasyPanel:
- `postgres`, `redis`, `cvg-his-api`, `cvg-his-worker` com status healthy.
- Logs do worker contendo processamento `system.ping` com `jobId` e `result: "pong"`.
