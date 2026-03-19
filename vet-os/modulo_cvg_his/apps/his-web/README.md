# his-web

UI base da Fase 1 com Next.js (App Router):

- `/login`: login por token (cookie HttpOnly via `/api/auth/session`)
- `/`: home protegida
- `middleware` para guard de rota
- `apiFetch` same-origin (`/api/proxy`) com tratamento de `401`

Env principal do cliente:
- `NEXT_PUBLIC_HIS_API_BASE_URL` (recomendado: `/api/proxy`)

Env server-side opcional (cookies):
- `HIS_AUTH_COOKIE_DOMAIN` (ex.: `.seu-dominio.com` para subdomínios)
- `HIS_AUTH_COOKIE_MAX_AGE_SECONDS` (default: `28800`)
