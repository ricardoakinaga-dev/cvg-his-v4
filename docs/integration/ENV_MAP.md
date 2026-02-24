# ENV / Deploy Map

## Legend

- `Build-time`: precisa estar disponível no build da imagem (especialmente `NEXT_PUBLIC_*`).
- `Runtime`: lida no start/request do serviço.
- `Required`: exigida para o serviço subir sem erro em produção.

## his-web (`apps/his-web`)

| Variable | Build-time | Runtime | Required (prod) | Used At | Notes |
|---|---|---|---|---|---|
| `NEXT_PUBLIC_HIS_API_BASE_URL` | Yes | Exposed client | Yes | `apps/his-web/src/lib/publicEnv.ts:75` | Deve ser `"/api/proxy"` em produção (`apps/his-web/src/lib/publicEnv.ts:78`). |
| `HIS_API_INTERNAL_URL` | No | Yes (server) | Yes | `apps/his-web/src/lib/publicEnv.ts:112`, `apps/his-web/src/app/api/proxy/[...path]/route.ts:99` | URL interna do `his-api` para o proxy same-origin. |
| `HIS_PROXY_TIMEOUT_MS` | No | Yes (server) | No | `apps/his-web/src/app/api/proxy/[...path]/route.ts:179` | Timeout do proxy (default 30s). |
| `HIS_AUTH_COOKIE_MAX_AGE_SECONDS` | No | Yes (server) | No | `apps/his-web/src/app/api/auth/session/route.ts:19` | TTL do cookie `his_token`. |
| `HIS_AUTH_COOKIE_DOMAIN` | No | Yes (server) | No | `apps/his-web/src/app/api/auth/session/route.ts:33` | Domínio do cookie; valores inválidos são ignorados. |
| `NEXT_PUBLIC_BUILD_ID` | Yes | Exposed client | No | `apps/his-web/next.config.js:13`, `apps/his-web/src/lib/buildStamp.ts:21` | Carimbo de build para rastreabilidade. |
| `NEXT_PUBLIC_GIT_SHA` | Yes | Exposed client | No | `apps/his-web/next.config.js:14`, `apps/his-web/src/lib/buildStamp.ts:22` | SHA do commit no frontend. |
| `NEXT_PUBLIC_BUILD_TIME` | Yes | Exposed client | No | `apps/his-web/next.config.js:15`, `apps/his-web/src/lib/buildStamp.ts:23` | Timestamp de build do frontend. |
| `NODE_ENV` | Yes | Yes | Yes | `apps/his-web/src/lib/publicEnv.ts:78`, `apps/his-web/src/app/api/auth/session/route.ts:85` | Controla validações e flags de segurança. |

### Env vars deprecated no his-web (ignorada por código)

- `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_HIS_API_URL`, `HIS_API_BASE_URL` (`apps/his-web/src/lib/publicEnv.ts:22`).
- Aviso explícito quando presentes (`apps/his-web/src/lib/publicEnv.ts:62`).

## his-api (`apps/his-api`)

### Carregadas e validadas por schema

Fonte: `apps/his-api/src/plugins/env.ts:23`

| Variable | Required | Default | Used At |
|---|---|---|---|
| `NODE_ENV` | Yes | `development` | `env plugin`, auth/dev route gate |
| `PORT` | Yes | `3000` | server bootstrap |
| `DATABASE_URL` | Yes | - | DB plugin/routes |
| `REDIS_URL` | Yes | - | queues/workers integration |
| `QUEUE_PREFIX` | Yes | `cvg-his` | queue namespacing |
| `LOG_LEVEL` | Yes | `info` | logger setup |
| `JWT_SECRET` | Yes | - | token sign/verify |
| `JWT_ISSUER` | Yes | - | token sign/verify |
| `JWT_AUDIENCE` | Yes | - | token sign/verify |
| `DEFAULT_TIMEZONE` | Yes | `America/Sao_Paulo` | medication scheduling |
| `MEDICATION_SCHEDULE_DEFAULT_TIMEZONE` | Yes | `America/Sao_Paulo` | medication scheduling |
| `MEDICATION_SCHEDULE_TIMEZONE_BY_ACCOUNT` | Yes | `{}` | medication scheduling |
| `MEDICATION_SCHEDULE_TIMEZONE_BY_WARD` | Yes | `{}` | medication scheduling |
| `QDRANT_URL` | No | - | protocol references |
| `QDRANT_COLLECTION` | Yes | `professor` | protocol references |
| `QDRANT_API_KEY` | No | - | protocol references |

### Lidas fora do schema (`process.env.*` direto)

| Variable | Required | Used At | Notes |
|---|---|---|---|
| `ADMIN_EMAIL` | Condicional | `apps/his-api/src/modules/auth/routes.ts:75` | Necessária para login por email. |
| `ADMIN_PASSWORD` | Condicional | `apps/his-api/src/modules/auth/routes.ts:76` | Necessária para login por email. |
| `ADMIN_ACCOUNT_ID` | No | `apps/his-api/src/modules/auth/routes.ts:53` | Define tenant bootstrap para login email/dev-key (fallback seguro). |
| `ADMIN_USER_ID` | No | `apps/his-api/src/modules/auth/routes.ts:54` | Define usuário bootstrap para login email/dev-key (fallback seguro). |
| `BUILD_ID` | No | `apps/his-api/src/modules/build/routes.ts:9` | Build metadata endpoint. |
| `GIT_SHA` | No | `apps/his-api/src/modules/build/routes.ts:9` | Build metadata endpoint. |
| `BUILD_TIME` | No | `apps/his-api/src/modules/build/routes.ts:11` | Build metadata endpoint. |

## his-worker (`apps/his-worker`)

Fonte: `apps/his-worker/src/index.ts:58`

| Variable | Required | Default | Used At |
|---|---|---|---|
| `NODE_ENV` | Yes | `development` | bootstrap behavior |
| `REDIS_URL` | Yes | - | BullMQ connection |
| `DATABASE_URL` | Yes | - | DB access (`apps/his-worker/src/index.ts:109`) |
| `QUEUE_PREFIX` | Yes | `cvg-his` | queue namespacing |
| `HANDOVER_STORAGE_DIR` | Yes | `/tmp/cvg-his-storage` | handover render/output |
| `DEFAULT_TIMEZONE` | Yes | `America/Sao_Paulo` | med timezone helper |
| `MEDICATION_SCHEDULE_DEFAULT_TIMEZONE` | Yes | `America/Sao_Paulo` | med timezone helper |
| `MEDICATION_SCHEDULE_TIMEZONE_BY_ACCOUNT` | Yes | `{}` | med timezone helper |
| `MEDICATION_SCHEDULE_TIMEZONE_BY_WARD` | Yes | `{}` | med timezone helper |
| `HEALTH_PORT` | Yes | `3100` | worker health server |
| `MEDICATION_OVERDUE_AUTO_SCAN` | Yes | `true` | auto scan cron |
| `MEDICATION_OVERDUE_SCAN_INTERVAL_MS` | Yes | `60000` | auto scan cron |
| `MEDICATION_OVERDUE_GRACE_MINUTES` | Yes | `30` | overdue window |
| `CRON_LEADER_LOCK_TTL_MS` | No | derived | leader lock tuning |

## Conflicting / Confusing Configurations Detected

1. `NEXT_PUBLIC_*` no `his-web` são variáveis de build-time; alterar valor sem rebuild mantém frontend antigo.
2. `HIS_API_INTERNAL_URL` é obrigatório em produção para o proxy same-origin funcionar (`apps/his-web/src/lib/publicEnv.ts:114`).
