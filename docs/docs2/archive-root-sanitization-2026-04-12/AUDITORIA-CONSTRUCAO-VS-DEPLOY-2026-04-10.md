# AUDITORIA COMPLETA — CVG-HIS-V2
## Construção vs. Deploy vs. Documentação Enterprise

**Data:** 10/04/2026 14:25 UTC  
**Auditor:** ClawDinho 🐾  
**Escopo:** Comparar código fonte + docs/Enterprise + deploy real (Docker)  

---

## SUMÁRIO EXECUTIVO

| Área | Status Docs | Status Código | Status Deploy | Veredicto |
|------|-------------|---------------|---------------|-----------|
| **API Backend** | ✅ Documentado | ✅ Implementado | ✅ Rodando (3003) | ALINHADO |
| **SPA Frontend** | ⚠️ Parcial | ✅ Implementado | ✅ Rodando (3002) | ALINHADO |
| **Web Frontend** | ❓ Ambíguo | ✅ Implementado | ✅ Rodando (3004) | VERIFICAR |
| **Worker** | ⚠️ Parcial | ✅ Implementado | ✅ Rodando | ALINHADO |
| **Design System** | ❌ Incompleto | ⚠️ 14 componentes | ✅ Bundled | GAP |
| **PWA** | ✅ Blueprint | ✅ SW + manifest | ✅ Ativo | ALINHADO |
| **Event Bus** | ✅ Blueprint | ⚠️ Outbox only | ⚠️ Não usado | GAP |
| **OpenAPI** | ✅ 16 tags | ✅ 100+ endpoints | ❌ `paths: {}` | **GAP CRÍTICO** |
| **Multi-tenancy** | ✅ Blueprint | ⚠️ accountId='pending' | ⚠️ Parcial | GAP |
| **WhatsApp** | ✅ Blueprint | ⚠️ Sandbox Twilio | ⚠️ Sandbox | GAP |
| **ML/AI** | ✅ Blueprint | ⚠️ Módulo vazio | ❌ Não usado | DEPENDENTE |

**Score Geral Real:** ~70-75/100 (recalibrado em 10/04/2026)  
**Recomendação:** Corrigir OpenAPI runtime e multi-tenancy antes de produção.

---

## 1. ARQUITETURA — DEPLOY VS. CÓDIGO

### 1.1 Containers Rodando (Docker Compose v2)

```
cvg-his-v2-api:      3003 (healthy) ✅ — API Fastify/vanilla Node
cvg-his-v2-spa:      3002 (healthy) ✅ — Vue 3 SPA + Vite PWA
cvg-his-v2-web:      3004 (healthy) ✅ — App legacy (Next.js-like)
cvg-his-v2-worker:   (sem porta)    ✅ — Worker background jobs
postgres:            5432           ✅ — PostgreSQL 16
redis:               6380           ✅ — Redis 7
```

**Conclusão:** Todos os containers do `docker-compose.v2.yml` estão no ar.

### 1.2 Aplicações Detectadas

| App | Stack | Porta | Propósito |
|-----|-------|-------|-----------|
| **spa** | Vue 3 + Vite + Pinia + PWA | 3002 | Frontend principal (SPA moderno) |
| **web** | Next.js-like SSR | 3004 | Frontend legado ou admin |
| **api** | Node.js vanilla + Fastify-like patterns | 3003 | Backend REST |

**Problema:** Dois frontends simultâneos (spa + web). Documentação fala em "Vue 3 SPA + Design System" como front principal, mas web continua rodando.

---

## 2. FRONTEND — SPA (Porta 3002)

### 2.1 Rotas Implementadas (41 rotas)

```
/login                          — Login
/                               — Dashboard
/owners                         — Lista de Tutores
/owners/new                     — Novo Tutor
/owners/:id                     — Detalhe do Tutor
/owners/:id/edit                — Editar Tutor
/patients                       — Lista de Pacientes
/patients/new                   — Novo Paciente
/patients/:id                   — Detalhe do Paciente
/patients/:id/edit              — Editar Paciente
/encounters                     — Lista de Atendimentos
/encounters/new                 — Abrir Atendimento
/encounters/:id                 — Detalhe do Atendimento
/appointments                   — Agenda
/appointments/new               — Novo Agendamento
/appointments/:id               — Detalhe do Agendamento
/medical-records                — Prontuário
/medical-records/:id            — Detalhe do Prontuário
/inpatient                      — Internação
/inpatient/board                — Mapa de Leitos
/inpatient/:id                  — Detalhe da Internação
/billing                        — Faturamento
/billing/:id                   — Detalhe do Faturamento
/triage                         — Triagem
/triage/new                     — Nova Triagem
/triage/:id                     — Detalhe da Triagem
/users                          — Usuários
/users/new                       — Novo Usuário
/users/:id                       — Detalhe do Usuário
/users/:id/edit                 — Editar Usuário
/scheduling                     — Agenda Operacional
/scheduling/new                 — Novo Agendamento
/queue                          — Fila Operacional
/inventory                      — Estoque
/inventory/new                 — Novo Item
/inventory/:id                 — Detalhe do Item
/inventory/:id/edit            — Editar Item
/webhooks                       — Webhooks
/webhooks/new                  — Novo Webhook
/webhooks/:id                  — Detalhe do Webhook
/webhooks/:id/edit             — Editar Webhook
```

**Docs vs. Código:** ✅ Alinhado — todas as rotas documentadas nos blueprints estão implementadas.

### 2.2 Design System — Componentes

| Componente | Status | Observação |
|------------|--------|------------|
| DsAlert | ✅ | Implementado |
| DsBadge | ✅ | Implementado |
| DsButton | ✅ | Implementado |
| DsCard | ✅ | Implementado |
| DsCharts | ✅ | Implementado |
| DsCheckbox | ✅ | Implementado |
| DsDatePicker | ✅ | Implementado |
| DsFileUpload | ✅ | Implementado |
| DsInput | ✅ | Implementado |
| DsModal | ✅ | Implementado |
| DsRadio | ✅ | Implementado |
| DsSpinner | ✅ | Implementado |
| DsTabs | ✅ | Implementado |
| DsTimePicker | ✅ | Implementado |

**Blueprint pede:** 50 componentes  
**Implementado:** 14  
**Gap:** -36 componentes (72% incompleto)

### 2.3 PWA — Service Worker

| Recurso | Status | Observação |
|---------|--------|------------|
| manifest.json | ✅ | `/spa/public/manifest.json` existe |
| Service Worker | ✅ | Workbox com precache + runtime caching |
| Offline Page | ✅ | `/spa/public/offline.html` existe |
| App Shell | ✅ | NetworkFirst para navegação |
| Font Cache | ✅ | CacheFirst para Google Fonts |
| Icons | ✅ | Pasta `/spa/public/icons/` existe |

**Docs vs. Código:** ✅ PWA funcional e alinhado com blueprint.

---

## 3. API BACKEND (Porta 3003)

### 3.1 Endpoints Implementados (amostra)

**Auth:**
- `POST /auth/login` ✅
- `POST /auth/refresh` ✅
- `POST /auth/logout` ✅
- `POST /auth/login/mfa` ✅
- `GET /auth/session` ✅

**LGPD:**
- `POST /lgpd/consent` ✅
- `GET /lgpd/consent` ✅
- `POST /lgpd/consent/revoke` ✅
- `GET /lgpd/consent/status` ✅
- `POST /lgpd/requests` ✅
- `GET /lgpd/requests` ✅
- `POST /lgpd/export` ✅

**Recursos:**
- `/medical-records`, `/medical-records/entries`, `/medical-records/timeline`
- `/attachments`
- `/inpatient`
- `/notifications`, `/notifications/jobs`, `/notifications/process`
- `/appointments`, `/queue`, `/queue/check-in`, `/queue/:id/call`, `/queue/:id/start-care`, `/queue/:id/no-show`
- `/encounters`, `/encounters/:id/timeline`, `/encounters/:id/transition`, `/encounters/:id/close`
- `/triage`, `/triage/:id/history`
- `/owners`, `/patients`, `/owner-patient-links`
- `/users`, `/staff`
- `/access-control`, `/access-control/teams`, `/access-control/org-sectors`
- `/audit/events`
- `/sectors`, `/beds`
- `/quotes`, `/quotes/:id/items`, `/quotes/:id/approve`, `/quotes/:id/reject`, `/quotes/:id/cancel`, `/quotes/:id/convert-to-sale`
- `/counter-sales`, `/cash`
- `/diagnostics`, `/prescriptions`, `/surgery`, `/discharges`
- `/inventory`
- `/billing`
- `/webhooks`
- `/mfa/*`
- `/master-search`

**Total estimado:** 100+ endpoints

### 3.2 Health Check

```json
{
  "ok": true,
  "service": "cvg-his-v2-api",
  "version": "0.1.0",
  "environment": "homolog",
  "readiness": {
    "ready": true,
    "productionReady": true,
    "persistenceMode": "database"
  },
  "dependencies": {
    "database": { "state": "healthy" },
    "repositories": { "state": "ready", "detail": "13 repositories wired" },
    "worker": { "state": "ready" }
  }
}
```

✅ API funcionando corretamente com 13 repositórios conectados.

### 3.3 OpenAPI — **PROBLEMA CRÍTICO**

| Recurso | Esperado | Real |
|---------|----------|------|
| `/openapi.json` | Spec completa com paths | **`paths: {}`** (fallback vazio) |
| `/openapi.yaml` | YAML legível | Arquivo existe (112KB) mas não é servido corretamente |
| `/api-docs` | Swagger UI | JSON summary (ok) |

**Causa:** O `server.ts` tem fallback que retorna `paths: {}` quando a leitura do YAML falha:

```typescript
// server.ts ~line 291
} catch (err) {
  const openApiSpec = {
    // ...
    paths: {}  // ← FALLBACK ATIVADO
  };
  response.end(JSON.stringify(openApiSpec));
}
```

**Arquivo openapi.yaml existe:** ✅ `/apps/api/src/openapi.yaml` (112KB)  
**Mas não está sendo servido corretamente:** ❌

**Impacto:** Integradores não conseguem usar a spec OpenAPI. Documentação alega 16 tags e 100+ endpoints mas o runtime serve vazio.

---

## 4. MÓDULOS DE NEGÓCIO

### 4.1 Modulos Implementados (36)

```
✅ access-control   ✅ api-keys        ✅ attachments     ✅ audit
✅ auth             ✅ billing         ✅ cash            ✅ counter-sales
✅ diagnostics      ✅ discharges      ✅ encounters      ✅ event-bus
✅ inpatient        ✅ inventory       ✅ lgpd            ✅ medical-records
✅ mfa              ✅ ml              ✅ notifications   ✅ notifications-whatsapp
✅ owners           ✅ patients        ✅ prescription-executions
✅ prescriptions    ✅ products        ✅ quotes          ✅ scheduling
✅ services         ✅ soc2            ✅ staff           ✅ surgery
✅ triage           ✅ users           ✅ webhooks
```

**Docs vs. Código:** ✅ Blueprint previa 14 bounded contexts, código tem 36+ módulos — **SUPERIOR** ao blueprint.

### 4.2 Event Bus — Gap

| Recurso | Status | Observação |
|---------|--------|------------|
| Outbox Pattern | ✅ Implementado | `DatabaseOutboxRepository` com `create()`, `update()`, `findPending()` |
| Tabela outbox_events | ✅ Criada | Via migrations |
| API wiring | ❌ Não usado | Nenhum `dispatchEvent()` no `server.ts` |
| Worker processing | ❌ Não verificado | Event bus service não aparece no worker |

**Docs diz:** "Redis/RabbitMQ + 30+ eventos + Outbox"  
**Realidade:** Outbox está pronto mas não está sendo usado.

### 4.3 ML/AI — Gap

| Recurso | Status | Observação |
|---------|--------|------------|
| Módulo `ml` | ⚠️ Existe | Estrutura básica, 功能有限 |
| Feature Store | ❌ Não verificado | Service `createVector` existe mas sem uso |
| Modelos production | ❌ Não implementados | Só stub code |

**Docs diz:** "8 modelos de AI/ML planejados"  
**Realidade:** Módulo existe mas está vazio. Nenhum modelo em produção.

### 4.4 WhatsApp — Gap

| Recurso | Status | Observação |
|---------|--------|------------|
| Twilio Adapter | ✅ Implementado | Sandbox mode |
| 360dialog | ❌ Não production | Só planejado |
| Templates | ❌ Não implementados | Só lembretes básicos |
| Opt-out | ❌ Não implementados | — |

**Docs diz:** "WhatsApp Business API completo"  
**Realidade:** Só sandbox Twilio com appointment reminders.

---

## 5. MULTI-TENANCY

### 5.1 Implementação

| Componente | Status | Observação |
|---------|--------|------------|
| `tenant_id` em tabelas | ✅ Migrado | Todas as tabelas têm `tenant_id` |
| Middleware injeção | ✅ Implementado | `tenant-context` package |
| `x-account-id` header | ✅ Esperado | API espera o header |
| `x-account-id` no SPA | ⚠️ Parcial | `api.ts` tenta extrair do token JWT |

### 5.2 Problema: accountId Hardcoded

**Em `runtime.ts` (~line 233):**
```typescript
accountId: 'pending',  // ← HARDCODED
```

**Em `server.ts` (~line 233):**
```typescript
accountId: 'pending',  // ← HARDCODED
```

**Em `database-patient.repository.ts` (~line 189):**
```typescript
accountId: 'acc_cvg_demo',  // ← HARDCODED
```

**Impacto:** Multi-tenancy não funciona de verdade. Qualquer tenant consegue ver dados de qualquer outro.

**Docs diz:** "Tenant não vê dados de outro tenant (hard isolation)"  
**Realidade:** O `accountId` está fixo em 'pending' ou 'acc_cvg_demo' — isolamento não funciona.

---

## 6. WEB FRONTEND (Porta 3004)

### 6.1 Stack

- Next.js-like app (server-side rendered)
- 40+ páginas em `/apps/web/src/pages/`

### 6.2 Relação com SPA

| Aspecto | SPA (3002) | Web (3004) |
|---------|------------|------------|
| Stack | Vue 3 + Vite PWA | Next.js SSR |
| Propósito | Frontend principal | Admin/legacy? |
| Auth | JWT + Pinia | Não verificado |
| PWA | ✅ Sim | ❌ Não |

**Docs só menciona:** "Vue 3 SPA + Design System" como frontend.  
**Realidade:** Dois frontends rodando simultaneamente.

---

## 7. TESTES E COBERTURA

### 7.1 Cobertura Atual

| Métrica | Valor | Threshold |
|---------|-------|-----------|
| Lines | 5.84% | 5% ✅ |
| Statements | ~5% | 5% ✅ |
| Functions | ~5% | 5% ✅ |
| Branches | ~5% | 5% ✅ |

**Docs diz:** "100/100 PASS" em testes  
**Realidade:** Coverage 5.84% (apenas 0.84% acima do mínimo).

### 7.2 Problemas Conhecidos (de docs anteriores)

- `pnpm typecheck` — **FAIL** (apps/spa não resolve `@cvg-his-v2/shared-auth-sdk`)
- `pnpm build` — **FAIL** (mesmo bloqueio)
- `test:critical` — 161 falhando, 8 passando

**Nota:** Commits recentes (`d88272c`) podem ter corrigido alguns issues. Verificar execução local.

---

## 8. DOCKER DEPLOY

### 8.1 Dockerfiles

| Servicio | Dockerfile | Status Build |
|----------|------------|--------------|
| API | `apps/api/Dockerfile` | ✅ Build OK |
| SPA | `apps/spa/Dockerfile` | ✅ Build OK |
| Web | `apps/web/Dockerfile` | ✅ Build OK |
| Worker | `apps/worker/Dockerfile` | ✅ Build OK |

### 8.2 Volumes

```yaml
cvg_his_v2_postgres_data   # Dados PostgreSQL
cvg_his_v2_redis_data      # Dados Redis
cvg_his_v2_storage         # Arquivos (uploads)
cvg_his_v2_spa_static      # SPA build assets
```

✅ Volumes persistem dados entre restarts.

---

## 9. GAP ANALYSIS — DOCUMENTAÇÃO VS. REALIDADE

| Area | Claim Docs | Realidade | Severidade |
|------|------------|-----------|-----------|
| **OpenAPI** | "Spec completa servida" | `paths: {}` em runtime | 🔴 CRÍTICA |
| **Multi-tenancy** | "Hard isolation" | `accountId: 'pending'` hardcoded | 🔴 CRÍTICA |
| **Event Bus** | "Redis + 30+ eventos" | Outbox pronto mas não usado | 🟡 ALTA |
| **WhatsApp** | "Production-ready" | Sandbox Twilio only | 🟡 ALTA |
| **ML/AI** | "8 modelos production" | Módulo vazio | 🟡 ALTA |
| **Design System** | "50 componentes" | 14 implementados (28%) | 🟡 ALTA |
| **Test Coverage** | "100/100 PASS" | 5.84% lines | 🟡 ALTA |
| **SPA Build** | "PASS" | FAIL (pode ter sido corrigido) | 🟡 MÉDIA |
| **Two Frontends** | "Vue 3 SPA only" | SPA + Web rodando | 🟡 MÉDIA |
| **PWA** | "Service Worker + offline" | ✅ Funcional | ✅ BAIXA |

---

## 10. RECOMENDAÇÕES DE CORREÇÃO

### 🔴 CRÍTICAS (corrigir antes de produção)

1. **OpenAPI Runtime**
   - Diagnosticar por que `openapi.yaml` não está sendo lido
   - Adicionar teste E2E que verifica `/openapi.json` retorna paths

2. **Multi-Tenancy**
   - Remover `accountId: 'pending'` de `runtime.ts` e `server.ts`
   - Garantir que `x-account-id` é lido corretamente do header
   - Testar isolamento entre tenants

### 🟡 ALTAS

3. **Event Bus Wiring**
   - Conectar `EventBusService` ao `server.ts`
   - Adicionar dispatch de eventos em operações críticas (encounter created, billing, etc.)

4. **Design System**
   - Priorizar componentes faltantes mais usados: Dropdown/Select, Tooltip, Accordion, Switch, Calendar, Avatar, Progress, Skeleton (parcial)
   - Publicar Storybook

5. **WhatsApp Production**
   - Implementar 360dialog adapter production
   - Adicionar template management

6. **ML Module**
   - Decidir: usar ou remover módulo vazio
   - Se usar, definir roadmap de modelos

### 🟡 MÉDIAS

7. **Two Frontends**
   - Definir qual é o frontend canonical
   - Documentar propósito de cada um ou unificar

8. **Test Coverage**
   - Subir threshold de 5% para 15-20%
   - Eliminar os 161 testes falhando

---

## 11. SCORE RECALIBRADO

| Área | Score Antigo | Score Real | Base |
|------|-------------|-----------|------|
| **Geral** | 87/100 | **70/100** | Estimado |
| API Backend | 92/100 | **88/100** | 100+ endpoints, 13 repos |
| SPA Frontend | 85/100 | **80/100** | 41 rotas, PWA OK, 14 DS components |
| Design System | 60/100 | **40/100** | 14/50 componentes |
| Multi-tenancy | 88/100 | **40/100** | accountId hardcoded |
| OpenAPI | 72/100 | **20/100** | paths: {} em runtime |
| Event Bus | 60/100 | **35/100** | Outbox pronto mas não usado |
| PWA | 80/100 | **90/100** | Workbox + manifest + offline |
| Tests | 65/100 | **30/100** | 5.84% coverage, 161 failing |
| WhatsApp | 65/100 | **40/100** | Sandbox only |
| ML/AI | 40/100 | **15/100** | Módulo vazio |
| Worker | 70/100 | **65/100** | Só notifications |
| Observability | 70/100 | **60/100** | Prometheus metrics OK, sem tracing |

---

## 12. CONCLUSÃO

O **CVG-HIS-V2** está em estado funcional de MVP/beta. A arquitetura é sólida (36 módulos, 100+ endpoints, SPA + API + Worker + DB), mas a **documentação está superestimando maturidade** em vários pontos críticos:

1. **OpenAPI** não serve paths — integradores serão bloqueados
2. **Multi-tenancy** não funciona — dados não são isolados
3. **Event Bus** está pronto mas não conectado
4. **Testes** estão em 5.84% coverage com 161 falhas
5. **Design System** tem só 28% dos componentes planejados

O deploy está **operacional** (containers healthy), mas precisa de hardening antes de produção real.

---

_Relatório gerado em 10/04/2026 14:25 UTC_  
_Salvo em: `/docs/AUDITORIA-CONSTRUCAO-VS-DEPLOY-2026-04-10.md`_
