# 560 — Pacote Final de Prontidao para Publicacao

**Data:** 2026-04-01
**Base:** docs 585, 586, 600, 610 e validacao E0 de 2026-04-01
**Status:** Final

---

## 1. Estado Atual do Produto

### Superficie funcional

| Area               | Modulos                                         | Status                 |
| ------------------ | ----------------------------------------------- | ---------------------- |
| **Governanca**     | auth, access-control, users, staff, audit       | Operacional            |
| **Cadastro**       | owners, patients                                | Operacional            |
| **Atendimento**    | encounters, triage, scheduling                  | Operacional            |
| **Prontuario**     | medical-records, attachments                    | Operacional            |
| **Internacao**     | inpatient, sectors, beds                        | Operacional            |
| **Cirurgia**       | surgery                                         | Operacional            |
| **Exames**         | diagnostics                                     | Operacional            |
| **Administrativo** | billing, inventory, notifications               | Operacional com DB     |
| **Comercial**      | products, services, counter-sales, quotes, cash | Operacional enterprise |
| **Alta**           | discharges                                      | Operacional            |
| **Prescricao**     | prescription-executions                         | Operacional            |

**Total:** 25 modulos de dominio, 3 apps (api, worker, spa), 1 monorepo pnpm.

### Persistencia

- **Trilha oficial:** Drizzle ORM com migration unica `0000_vengeful_pet_avengers.sql`
- **Schema:** 46 tabelas, 28 ENUM types, 126 foreign keys
- **Seed:** Roles, permissions, account, unit populados com vocabulario unificado (AccessControlService)
- **Repositorios DB injetados:** 17+ repositorios wireados no runtime, incluindo `staff`, `notifications`, `cash`, `counter-sales` e `quotes`
- **Hydrate:** Servicos carregam dados existentes do DB no startup via `hydrateFromDatabase()`

### Autorizacao

- **RBAC:** Vocabulario unificado entre seed e AccessControlService
- **Roles:** `admin`, `veterinarian`, `nurse`, `reception`, `finance`, `inventory`, `auditor`
- **Permissoes:** 34 permissoes com convencao plural + `read`/`manage`
- **Dual RBAC:** Resolvido no Ciclo 1

---

## 2. Estado Atual dos Gates

### Gates tecnicos

| Gate             | Comando              | Status               | Observacao                           |
| ---------------- | -------------------- | -------------------- | ------------------------------------ |
| Typecheck        | `pnpm typecheck`     | ✅ Verde             | Revalidado em 2026-04-01             |
| Build            | `pnpm build`         | ✅ Verde             | Revalidado em 2026-04-01             |
| Testes unitarios | `pnpm test`          | ✅ Verde             | Revalidado em 2026-04-01             |
| Testes criticos  | `pnpm test:critical` | ⚠️ Requer PostgreSQL | Pipeline CI provisiona PostgreSQL 16 |
| E2E fluxos       | `pnpm test:e2e`      | ⚠️ Requer browser    | 11 fluxos em ambiente com Playwright |

### Gates operacionais

| Gate                | Status                | Observacao                                                 |
| ------------------- | --------------------- | ---------------------------------------------------------- |
| API `/health`       | ✅ Endpoint funcional | Retorna 200 com `ok: true`                                 |
| API `/ready`        | ✅ Endpoint funcional | Retorna 200 com `readiness.ready: true` quando DB saudavel |
| API `/live`         | ✅ Endpoint funcional | Retorna 200 com `liveness.live: true`                      |
| Worker bootstrap    | ✅ Graceful           | Conecta ao DB, processa notifications                      |
| SPA disponibilidade | ✅ Build estatico     | Serve assets e paginas                                     |

---

## 3. Estado Atual da Trilha de Deploy

### Docker Compose

- **Arquivo:** `docker-compose.v2.yml`
- **Servicos:** postgres, redis, `cvg-his-v2-api`, `cvg-his-v2-worker`, `cvg-his-v2-spa`
- **Portas:** API externa 3003 (interna 3001), SPA externa 3002 (interna 3002)
- **Healthchecks:** postgres (pg_isready), redis (redis-cli ping), api (/health)
- **Volumes:** postgres_data, redis_data, storage
- **Dependencias:** api espera postgres+redis; spa espera api; worker espera postgres+api
- **Regra operacional:** nao reutilizar imagens/containers legados `cvg-his-api`, `cvg-his-web`, `cvg-his-worker`

### Proxy Reverso

- **Arquivo:** `infra/docker/Caddyfile.v2`
- **Dominios:** `his.centroveterinarioguarapiranga.com` → SPA (3002), `his-api.centroveterinarioguarapiranga.com` → API (3003)
- **TLS:** Caddy gerencia automaticamente

### Systemd (bare-metal)

- **Servicos:** `cvg-his-v2-api.service`, `cvg-his-v2-spa.service`, `cvg-his-v2-worker.service`
- **Hardening:** EnvironmentFile, RestartPreventExitStatus, TimeoutStartSec, journal logging
- **Dependencias:** api apos postgresql+redis; spa e worker apos api

### Cutover

- **Script:** `infra/scripts/cutover-v2.sh`
- **Sequencia corrigida:** Schema aplicado ANTES do start da stack (corrigido no hardening)
- **Backup:** Snapshot de containers legacy, logs e banco antes do cutover
- **Rollback:** Preservacao de stack anterior, plano documentado

---

## 4. Estado Atual do CI

### Pipeline

- **Arquivo:** `.github/workflows/ci.yml`
- **Jobs:**
  - `typecheck` — `pnpm typecheck`
  - `build` — `pnpm build` (depende de typecheck)
  - `test-unit` — `pnpm test` (depende de typecheck)
  - `test-integration` — `pnpm test:critical` com PostgreSQL 16 service (depende de typecheck)
  - `coverage` — `pnpm test:coverage` com upload de artefato HTML
- **Infraestrutura:** Node.js 22, pnpm 10, PostgreSQL 16, cache de pnpm store
- **Trigger:** Push e PR para `main` e `develop`

### O que roda em CI vs ambiente assistido

| Gate            | CI                          | Assistido        |
| --------------- | --------------------------- | ---------------- |
| `typecheck`     | ✅                          | —                |
| `build`         | ✅                          | —                |
| `test` (unit)   | ✅                          | —                |
| `test:critical` | ✅ (com PostgreSQL service) | —                |
| `test:e2e`      | ❌ (requer browser)         | ✅ local/staging |
| `release:check` | ❌ (agregacao manual)       | ✅               |

---

## 5. Riscos Residuais que Exigem Supervisao

### Alto

| #   | Risco                                   | Impacto                             | Mitigacao                           |
| --- | --------------------------------------- | ----------------------------------- | ----------------------------------- |
| R1  | SPA ainda sem regressao visual profunda | Quebras visuais sutis podem escapar | Expandir regressao guiada/e2e focal |

### Medio

| #   | Risco                                | Impacto                                       | Mitigacao                   |
| --- | ------------------------------------ | --------------------------------------------- | --------------------------- |
| R3  | Scheduling sem validacao de conflito | Agendas ainda podem colidir                   | Endurecer regra operacional |
| R4  | Triage sem versionamento dedicado    | Update existe, mas sem diff clinico explicito | Evoluir trilha clinica      |
| R5  | PDF server-side ainda em HTML inline | Exportacao abaixo do ideal enterprise         | Fechar geracao PDF dedicada |
| R6  | SPA com regressao guiada minima      | Regressao visual profunda ainda pode escapar  | Expandir regressao guiada   |

### Baixo

| #   | Risco                                         | Impacto                   | Mitigacao                                    |
| --- | --------------------------------------------- | ------------------------- | -------------------------------------------- |
| R7  | scryptSync bloqueante                         | Performance sob carga     | ✅ Resolvido — scrypt async                  |
| R8  | 3 fluxos sem E2E (cirurgia, prescricao, alta) | Cobertura incompleta      | ✅ Resolvido — 11 fluxos E2E                 |
| R9  | `packages/rbac/` obsoleto                     | Confusao futura           | Remover no Ciclo 2                           |
| R10 | Sem monitoramento de producao                 | Sem visibilidade proativa | ✅ Resolvido — /metrics endpoint + checklist |

---

## 6. Criterios para Publicar

### Publicar quando:

- ✅ `pnpm typecheck` verde
- ✅ `pnpm build` verde
- ✅ `pnpm test:critical` verde com banco
- ✅ `persistenceMode` = `database`
- ✅ `productionReady` = `true`
- ✅ Migration aplica em banco limpo
- ✅ Seed executa sem erro
- ✅ Health/readiness/liveness respondem 200
- ✅ Rollback plano disponivel
- ✅ CI pipeline passou

### Nao publicar quando:

- ❌ Qualquer gate tecnico falhou
- ❌ `persistenceMode` = `in-memory` em producao
- ❌ `productionReady` = `false`
- ❌ Migration nao aplica
- ❌ Healthcheck `/ready` retorna 503 por mais de 5 minutos
- ❌ Worker nao conecta ao banco
- ❌ Rollback plano nao disponivel

---

## 7. Checklist de Publicacao Rapida

```bash
# 1. Validar gates locais
pnpm typecheck && pnpm build

# 2. Preparar banco
pnpm test:db:start
DATABASE_URL_TEST="<test-database-url>" \
DATABASE_URL="<test-database-url>" \
pnpm test:critical
pnpm test:db:stop

# 3. Deploy
# Via compose:
docker compose --env-file .env.v2 -f docker-compose.v2.yml down --remove-orphans
docker compose --env-file .env.v2 -f docker-compose.v2.yml build --no-cache cvg-his-v2-api cvg-his-v2-worker cvg-his-v2-spa
docker compose --env-file .env.v2 -f docker-compose.v2.yml up -d postgres redis cvg-his-v2-api cvg-his-v2-worker cvg-his-v2-spa

# Via cutover script:
ENV_FILE=/opt/cvg-his-v2/.env.v2 infra/scripts/cutover-v2.sh

# 4. Validar
curl http://127.0.0.1:3000/health
curl http://127.0.0.1:3000/ready
curl http://127.0.0.1:3000/live
curl -I http://127.0.0.1:3001/
```

---

## 8. Referencias

- Checklist de release: `docs/520-checklist-release-enterprise.md`
- Qualidade e gates: `docs/460-qualidade-testes-e-gates.md`
- Politica de deploy: `docs/470-politica-migracao-e-deploy.md`
- Guia de instalacao: `docs/130-instalacao-publicacao-cvg-his-v2-real.md`
- Checklist de cutover: `docs/131-checklist-cutover-servidor.md`
- Ciclo 1: `docs/550-ciclo-1-fechamento-gaps-final.md`
- Veredito operacional: `docs/561-veredito-operacional-final.md`
- Consolidacao global: `docs/590-consolidacao-global-produto.md`
- Score final global: `docs/591-score-final-global.md`
- Veredito global: `docs/592-veredito-global-operacional.md`
- Backlog residual: `docs/593-backlog-residual-pos-fechamento-global.md`
- Fechamento global: `docs/594-fechamento-global-validacao.md`
- Consolidacao global: `docs/590-consolidacao-global-produto.md`
- Score final global: `docs/591-score-final-global.md`
- Veredito global: `docs/592-veredito-global-operacional.md`
- Backlog residual: `docs/593-backlog-residual-pos-fechamento-global.md`
- Fechamento global: `docs/594-fechamento-global-validacao.md`
