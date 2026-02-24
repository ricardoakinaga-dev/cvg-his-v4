# EasyPanel Checklist (his-api / his-web / his-worker)

## 1) Environment Variables por servico

### his-api

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://<user>:<pass>@<host>:5432/<db>
REDIS_URL=redis://:<pass>@<host>:6379/0
QUEUE_PREFIX=cvg-his-prod
LOG_LEVEL=info

JWT_SECRET=<strong-secret>
JWT_ISSUER=cvg-his
JWT_AUDIENCE=cvg-his-api

# Opcional bootstrap admin (PR-4)
ADMIN_EMAIL=<admin-email>
ADMIN_PASSWORD=<admin-password>
ADMIN_ACCOUNT_ID=<uuid>
ADMIN_USER_ID=<uuid>
```

### his-web

```env
NODE_ENV=production
PORT=3001

# Build-time (obrigam rebuild da imagem)
NEXT_PUBLIC_HIS_API_BASE_URL=/api/proxy
NEXT_PUBLIC_BUILD_ID=<build-id>
NEXT_PUBLIC_GIT_SHA=<git-sha>
NEXT_PUBLIC_BUILD_TIME=<iso-datetime>

# Runtime (nao exigem rebuild)
HIS_API_INTERNAL_URL=http://his-api:3000
HIS_PROXY_TIMEOUT_MS=30000
HIS_AUTH_COOKIE_DOMAIN=.seudominio.com
HIS_AUTH_COOKIE_MAX_AGE_SECONDS=28800
```

### his-worker

```env
NODE_ENV=production
DATABASE_URL=postgresql://<user>:<pass>@<host>:5432/<db>
REDIS_URL=redis://:<pass>@<host>:6379/0
QUEUE_PREFIX=cvg-his-prod
HEALTH_PORT=3100
HANDOVER_STORAGE_DIR=/data/handovers
```

## 2) Dominios recomendados

- `his-web`: `https://fluxo.seudominio.com`
- `his-api`: somente interno (`http://his-api:3000`) ou subdominio protegido (`https://api.seudominio.com`)
- `his-worker`: sem exposicao publica (apenas health interno)

## 3) Rebuild obrigatorio

- Sempre rebuild/deploy do `his-web` quando mudar qualquer `NEXT_PUBLIC_*`.
- `HIS_API_INTERNAL_URL` eh runtime no `his-web` (nao requer rebuild, apenas restart/redeploy).

## 4) Healthchecks

- `his-api`: `GET /health`
- `his-web`: `GET /api/build` e `GET /api/proxy/health`
- `his-worker`: `GET /health` (porta `HEALTH_PORT`)

## 5) Verificacao pos-deploy

1. API:
   - `curl -fsS https://<api-domain>/health`
2. Web build/proxy:
   - `curl -fsS https://<web-domain>/api/build`
   - `curl -fsS https://<web-domain>/api/proxy/health`
3. Auth:
   - Login em `/login` sem `PROXY_PATH_BLOCKED`
4. Fluxo UI:
   - `/owners` carrega lista
   - `/patients` carrega lista
   - `/encounters` carrega lista + busca
   - `/inpatient/mar` abre sem erro de bedmap shape

## 6) Rollback

1. Reverter imagem para tag anterior (`his-api`, `his-web`, `his-worker`).
2. Reaplicar env do release anterior.
3. Reiniciar servicos na ordem: `his-api` -> `his-worker` -> `his-web`.
4. Revalidar:
   - `curl /health`, `curl /api/build`, login, `/owners`, `/patients`, `/encounters`.
