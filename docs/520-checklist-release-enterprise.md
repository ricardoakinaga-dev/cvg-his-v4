# 520 - Checklist de Release Enterprise

**Status:** vivo
**Data de criacao:** 2026-03-31
**Base:** docs/460-qualidade-testes-e-gates.md, docs/131-checklist-cutover-servidor.md, docs/470-politica-migracao-e-deploy.md

---

## 1. Pre-requisitos

### Ambiente

- [ ] Linux com Node.js >= 22
- [ ] pnpm 10+ instalado
- [ ] PostgreSQL 16+ acessivel
- [ ] Redis 7+ acessivel
- [ ] Docker e Docker Compose disponiveis (para compose-based deploy)
- [ ] Caddy ou proxy reverso configurado

### Repositorio

- [ ] Branch principal com codigo aprovado e revisado
- [ ] `pnpm install` executa sem erro
- [ ] `.env.v2` configurado com segredos (AUTH_SECRET, POSTGRES_PASSWORD, DATABASE_URL)

---

## 2. Gates Tecnicos

### Typecheck e Build

- [ ] `pnpm typecheck` — verde (0 erros de tipo)
- [ ] `pnpm build` — verde (todos os apps compilam)

### Testes

- [ ] `pnpm --filter @cvg-his-v2/module-staff test` — verde
- [ ] `pnpm --filter @cvg-his-v2/module-users test` — verde
- [ ] `pnpm --filter @cvg-his-v2/module-scheduling test` — verde
- [ ] `pnpm --filter @cvg-his-v2/web test` — verde
- [ ] `pnpm test:critical` — verde com banco de teste preparado
  - Pre-requisito: `pnpm test:db:start` (PostgreSQL 16 na porta 5433)
  - Execucao: `DATABASE_URL_TEST=postgres://postgres:postgres@localhost:5433/cvg_his_v2_test pnpm test:critical`
  - Meta: 100% dos testes passando (atual: 162 testes)
- [ ] `pnpm test:e2e` — verde com API rodando em localhost:3000
  - Pre-requisito: API rodando com DATABASE_URL configurado
  - Execucao: `npx playwright test e2e/tests/fluxos-criticos.spec.ts`
  - Meta: 8/8 fluxos passando

### Resultado esperado

```
Test Files  4 passed (4)
Tests       162 passed (162)
```

---

## 3. Gates Operacionais

### API — Readiness

- [ ] `GET /health` retorna 200 com `ok: true`
- [ ] `GET /ready` retorna 200 com `readiness.ready: true`
- [ ] `GET /live` retorna 200 com `liveness.live: true`
- [ ] `persistenceMode` = `database` (nao `in-memory`)
- [ ] `productionReady` = `true`
- [ ] `repositoryCount` >= 17
- [ ] `workerReady` = `true`

### Web — Disponibilidade

- [ ] `GET /` retorna 200 (homepage carrega)
- [ ] `GET /login` retorna 200 (pagina de login acessivel)
- [ ] Assets estaticos carregam (CSS, JS)

### Worker — Estabilidade

- [ ] Worker inicia sem erro no bootstrap
- [ ] `databaseHealthy` = `true` no log de inicializacao
- [ ] `persistenceMode` = `database` (notification repository disponivel)
- [ ] Worker executa ticks sem crash por pelo menos 5 minutos
- [ ] Graceful shutdown funciona (SIGTERM → `shutdownWorkerServices()`)

---

## 4. Validacoes de Banco

### Migration

- [ ] Migration Drizzle `0000_vengeful_pet_avengers.sql` aplica em banco limpo
- [ ] Comando: `DATABASE_URL=<url> tsx packages/db/src/migrate.ts`
- [ ] Resultado: 46 tabelas, 28 ENUM types, 126 foreign keys criadas

### Seed

- [ ] Seed Drizzle executa sem erro
- [ ] Comando: `DATABASE_URL=<url> ADMIN_EMAIL=<email> ADMIN_PASSWORD=<senha> tsx packages/db/src/seed.ts`
- [ ] Resultado: roles, permissions, account, unit populados

### Integridade

- [ ] FKs validas (sem referencias orfas)
- [ ] Constraints NOT NULL respeitadas
- [ ] Unique constraints funcionais (email, username, role name, permission key)

---

## 5. Validacoes de Deploy

### Docker Compose

- [ ] `docker compose -f docker-compose.v2.yml config` valida sem erro
- [ ] Todos os servicos sobem: postgres, redis, api, web, worker
- [ ] Healthchecks passam: postgres (pg_isready), redis (redis-cli ping), api (/health)

### Proxy Reverso (Caddy)

- [ ] `Caddyfile.v2` aponta para portas corretas:
  - `his.domain.com` → `127.0.0.1:3001` (Web)
  - `his-api.domain.com` → `127.0.0.1:3000` (API)
- [ ] `caddy validate --config Caddyfile.v2` passa
- [ ] HTTPS funciona (certificados TLS validos)

### Systemd (deploy bare-metal)

- [ ] `cvg-his-v2-api.service` ativo e healthy
- [ ] `cvg-his-v2-web.service` ativo e healthy
- [ ] `cvg-his-v2-worker.service` ativo e healthy
- [ ] Restart policies configuradas (`Restart=always`)

---

## 6. Validacoes de Health/Readiness

### API Endpoints

| Endpoint      | Status esperado | Criterio                                            |
| ------------- | --------------- | --------------------------------------------------- |
| `GET /health` | 200             | `ok: true`, `persistenceMode: "database"`           |
| `GET /ready`  | 200             | `readiness.ready: true`, `productionReady: true`    |
| `GET /live`   | 200             | `liveness.live: true`, `liveness.initialized: true` |

### Criterios de "API Pronta"

A API e considerada pronta quando:

1. `persistenceMode` = `database` (nao in-memory)
2. `databaseHealthy` = `true`
3. `repositoriesReady` = `true` (17+ repositorios wireados)
4. `workerReady` = `true` (notification repository disponivel)
5. `productionReady` = `true`

### Criterios de "Worker Pronto"

O worker e considerado pronto quando:

1. `DATABASE_URL` configurado
2. `databaseHealthy` = `true` no bootstrap
3. `notificationRepository` disponivel (DatabaseNotificationRepository injetado)
4. Loop de ticks executa sem erro por pelo menos 5 minutos

### Criterios de "Web Pronto"

O web e considerado pronto quando:

1. Servidor HTTP responde na porta configurada
2. Homepage (`/`) retorna 200
3. Pagina de login (`/login`) retorna 200
4. Assets estaticos carregam sem erro 404

---

## 7. Criterios de Cutover

### Pre-cutover

- [ ] Todos os gates tecnicos passaram
- [ ] Todos os gates operacionais passaram
- [ ] Backup do estado atual realizado
- [ ] Janela de manutencao comunicada
- [ ] Rollback plano revisado e disponivel

### Execucao

- [ ] `infra/scripts/cutover-v2.sh` executa sem erro
- [ ] Migration Drizzle aplicada com sucesso
- [ ] Seed executado com sucesso
- [ ] Stack V2 sobe via compose
- [ ] Healthchecks passam em todos os servicos
- [ ] Proxy reverso atualizado (se ENABLE_CADDY_SWITCH=true)

### Pos-cutover

- [ ] Validacao funcional minima passa (login, dashboard, tutor, paciente, atendimento)
- [ ] Logs iniciais sem erro critico
- [ ] Evidencias de cutover salvas

---

## 8. Criterios de Rollback

### Quando fazer rollback

- [ ] API nao atinge `productionReady` em 5 minutos apos subida
- [ ] Worker crasha repetidamente (3+ restarts em 5 minutos)
- [ ] Migration falha com erro nao recuperavel
- [ ] Healthcheck `/ready` retorna 503 por mais de 5 minutos
- [ ] Erro funcional critico reportado por usuarios

### Como fazer rollback

1. Parar stack V2: `docker compose -f docker-compose.v2.yml down`
2. Restaurar proxy para stack anterior (se cutover de proxy foi feito)
3. Restaurar banco de backup (se migration foi aplicada)
4. Reiniciar stack anterior
5. Validar que stack anterior esta funcional

### Pre-condicoes de rollback

- [ ] Backup de banco anterior ao cutover disponivel
- [ ] Stack anterior preservada (containers ou systemd services)
- [ ] Proxy reverso com configuracao anterior disponivel

---

## 9. Criterios para Aprovar ou Bloquear Release

### Aprovar release quando:

- ✅ Todos os gates tecnicos passaram
- ✅ Todos os gates operacionais passaram
- ✅ Validacoes de banco concluidas
- ✅ Validacoes de deploy concluidas
- ✅ Health/readiness/liveness validados
- ✅ Criterios de cutover satisfeitos
- ✅ Rollback plano disponivel e testado

### Bloquear release quando:

- ❌ Qualquer gate tecnico falhou
- ❌ `persistenceMode` = `in-memory` em producao
- ❌ `productionReady` = `false`
- ❌ Migration nao aplica em banco limpo
- ❌ Healthcheck `/ready` retorna 503
- ❌ Worker nao conecta ao banco
- ❌ Rollback plano nao disponivel

---

## 10. Referencias cruzadas

- Gates de qualidade: `docs/460-qualidade-testes-e-gates.md`
- Politica de migrations: `docs/470-politica-migracao-e-deploy.md`
- Checklist de cutover: `docs/131-checklist-cutover-servidor.md`
- Guia de instalacao: `docs/130-instalacao-publicacao-cvg-his-v2-real.md`
- Backlog de gaps: `docs/511-backlog-gaps-funcionais.md`
