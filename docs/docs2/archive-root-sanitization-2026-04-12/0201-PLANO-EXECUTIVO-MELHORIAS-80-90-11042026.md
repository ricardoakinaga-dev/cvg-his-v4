# PLANO EXECUTIVO DE MELHORIAS — CVG-HIS-V2
## Roadmap para 80+ e 90/100

**Data:** 11/04/2026
**Versão:** 1.0
**Score Atual:** 72/100
**Meta Fase 1:** 80/100
**Meta Fase 2:** 90/100

---

## RESUMO EXECUTIVO

O programa CVG-HIS-V2 está em estado de construção avançada real (35 módulos, SPA funcional, design system), mas possui 15 achados que impedem atingir maturidade enterprise. Este plano organiza a correção em 3 ondas sequenciais, priorizando os bloqueios críticos que impedem o score de 80+.

### Achados por Prioridade

| Prioridade | Quantidade | Impacto Total |
|------------|------------|---------------|
| 🔴 CRÍTICO | 5 | Impede 80+ |
| 🟡 ALTO | 5 | Limita 80 |
| 🟢 MÉDIO | 5 | Impede 90+ |

### Timeline Alvo

```
Semana 1-2    Semana 3-4    Semana 5-6    Semana 7-8    Semana 9-12
│ ONDA M1    │ ONDA M2    │ ONDA M3    │ ONDA M4    │ ONDA M5    │
│ CRÍTICOS   │ ALTOS      │ MÉDIOS     │ CONSOLID. │ 90+        │
│ Score:     │ Score:     │ Score:     │ Score:     │ Score:     │
│ 72→80      │ 80→84      │ 84→87      │ 87→90      │ 90         │
```

---

## ONDA M1 — BLOQUEIOS CRÍTICOS (Semanas 1-2)
### Meta: 72 → 80/100

> Estes 5 itens são blockers absolutos. Nenhum outro trabalho deve iniciar enquanto estes não estiverem resolvidos.

### M1-T1: Fix PWA Service Worker Permission

**Problema:** `EACCES: permission denied` em `dist/sw.js.map` impede build da SPA
**Arquivo:** `apps/spa/dist/sw.js.map`
**Esforço:** 1h
**Responsável:** Platform

**Ações:**
- [ ] Identificar causa exata (ownership ou umask do dist/)
- [ ] Adicionar `chmod 755 apps/spa/dist` ao build script
- [ ] Ou: configurar `vite-plugin-pwa` para escrever em diretório com permissão
- [ ] Validar: `pnpm build` completa sem erro

**Verificação:**
```
pnpm build 2>&1 | grep -i "error\|fail" | grep -v "warn"
# deve retornar vazio
```

---

### M1-T2: Enforce CI Coverage Gate

**Problema:** CI com `continue-on-error: true` ignora coverage < 5%
**Arquivo:** `.github/workflows/ci.yml`
**Esforço:** 1h
**Responsável:** Platform

**Ações:**
- [ ] Remover `continue-on-error: true` do job `Coverage`
- [ ] Ajustar threshold de 5% para 8% (progresso incremental)
- [ ] Adicionar gate: coverage não pode cair mais de 2% entre PRs
- [ ] Validar: CI falha quando coverage < threshold

**Verificação:**
```
# O job "Coverage" deve falhar se coverage < 8%
```

---

### M1-T3: OpenAPI Runtime Real

**Problema:** `/openapi.json` serve `{ paths: {} }` mas spec documenta 107 paths
**Arquivos:** `apps/api/src/server.ts`
**Esforço:** 3h
**Responsável:** Backend

**Ações:**
- [ ] Identificar onde spec é gerada vs onde runtime serve
- [ ] Wire spec real ao endpoint `/openapi.json`
- [ ] Habilitar `/openapi.yaml` interativo via Swagger UI
- [ ] Validar: `curl localhost:3000/openapi.json | jq '.paths | length'` > 50

**Verificação:**
```
curl -s localhost:3000/openapi.json | jq '.info.title'
# deve retornar "CVG HIS V2 API"
curl -s localhost:3000/openapi.json | jq '.paths | keys | length'
# deve retornar > 80
```

---

### M1-T4: Corrigir Multi-Tenancy na Borda HTTP

**Problema:** API injeta `accountId: 'pending'` + `accountId` hardcoded `acc_cvg_demo`
**Arquivos:**
- `apps/api/src/server.ts` (linha 233)
- `packages/modules/patients/src/repositories/database-patient.repository.ts` (linha 189)

**Esforço:** 2h
**Responsável:** Backend

**Ações:**
- [ ] Remover fallback `accountId: 'pending'` — deve exigir header real
- [ ] Substituir `acc_cvg_demo` hardcoded por contexto do tenant real
- [ ] Adicionar middleware que rejeita requests sem `x-account-id` válido
- [ ] Adicionar teste de isolamento: tenant A não vê dados de tenant B

**Verificação:**
```
# Sem header x-account-id → 401
curl -s localhost:3000/api/v1/owners
# {"error": "account context required"}

# Com header inválido → 403
curl -s -H "x-account-id: invalid-uuid" localhost:3000/api/v1/owners
# {"error": "invalid account"}
```

---

### M1-T5: Resolver Imports auth-sdk e config

**Problema:** SPA não resolve `@cvg-his-v2/shared-auth-sdk` e `shared-config`
**Arquivos:**
- `apps/spa/src/services/api.ts`
- `packages/shared/auth-sdk/src/index.ts`
- `packages/shared/config/src/index.ts`

**Esforço:** 2h
**Responsável:** Frontend + Platform

**Ações:**
- [ ] Verificar se `auth-sdk` e `config` estão no `package.json` da SPA como dependência
- [ ] Se estão: verificar se o build do shared está rodando antes da SPA
- [ ] Se não estão: adicionar como devDependencies no workspace
- [ ] Ou:isk — substituir imports por valores inline temporários
- [ ] Validar: `pnpm build` completa E SPA renderiza login

**Verificação:**
```
pnpm build 2>&1 | grep -i "Cannot find module\|@cvg-his-v2/shared"
# deve retornar vazio
```

---

### Checklist M1 — Gate de Entrada M2

| Tarefa | Status | Evidência |
|--------|--------|-----------|
| M1-T1: PWA build OK | ⬜ | `pnpm build` sem erro PWA |
| M1-T2: CI coverage enforced | ⬜ | CI falha se coverage < 8% |
| M1-T3: OpenAPI real | ⬜ | `/openapi.json` com 80+ paths |
| M1-T4: Tenant context real | ⬜ | `accountId: 'pending'` removido |
| M1-T5: SPA imports resolved | ⬜ | SPA build completa |

---

## ONDA M2 — ACHADOS ALTOS (Semanas 3-4)
### Meta: 80 → 84/100

### M2-T6: WebSocket em QueuePage

**Problema:** Polling em QueuePage — impacto em performance e real-time
**Arquivos:** `apps/spa/src/pages/scheduling/QueuePage.vue`
**Esforço:** 3h
**Responsável:** Frontend

**Ações:**
- [ ] Criar composable `useWebSocket()` em `apps/spa/src/composables/`
- [ ] Implementar conexão WebSocket no QueuePage (substituir polling)
- [ ] Adicionar fallback: se WebSocket falhar, volta a polling
- [ ] Adicionar testes: reconnect, mensagem recebida, atualização de estado

**Verificação:**
```
# QueuePage atualiza em < 500ms após evento
# Não há setInterval/setTimeout na página
```

---

### M2-T7: Completar Event Bus Catalog (30 events)

**Problema:** 8 webhooks events vs 30+ blueprint events
**Arquivos:** `packages/modules/event-bus/src/`
**Esforço:** 5 dias
**Responsável:** Backend

**Ações:**
- [ ] Mapear os 22 eventos faltantes do blueprint:
  - `encounter.started`, `encounter.closed`
  - `command.finalized`, `command.cancelled`
  - `appointment.created`, `appointment.cancelled`
  - `inpatient.admitted`, `inpatient.discharged`
  - `stock.moved`, `stock.low`
  - `receivable.paid`, `payable.paid`
  - `notification.sent`
  - + 9 eventos de domínio adicionales
- [ ] Implementar `EventBusService.publish()` para cada evento
- [ ] Criar consumidores para eventos cross-módulo
- [ ] Documentar schema de cada evento
- [ ] Adicionar testes: publish, consume, retry, DLQ

**Verificação:**
```
# Event catalog deve listar 30+ eventos
curl -s localhost:3000/events/catalog | jq '.events | length'
# deve retornar >= 30
```

---

### M2-T8: Configurar Storybook

**Problema:** Design system sem documentação visual
**Arquivos:** `packages/design-system/`
**Esforço:** 3 dias
**Responsável:** Frontend + Design

**Ações:**
- [ ] Instalar e configurar Storybook 8.x
- [ ] Criar stories para 8 componentes Vue SFC existentes (DsButton, DsInput, DsCard, DsBadge, DsAlert, DsModal, DsTabs, DsSpinner)
- [ ] Configurar temas light/dark no Storybook
- [ ] Adicionar controles de knob para props
- [ ] Documentar tokens (cores, spacing, typography)
- [ ] Publicar em URL interna (storybook.internal)

**Verificação:**
```
# Storybook compila sem erro
# Todas as stories renderizam
# Componentes com controles de knob
```

---

### M2-T9: PWA Service Worker Funcional

**Problema:** manifest.json existe mas sw.js não é escrito
**Arquivos:** `apps/spa/public/manifest.json`, `apps/spa/vite.config.ts`
**Esforço:** 5 dias (inclui M1-T1)
**Responsável:** Frontend

**Ações:**
- [ ] Resolver M1-T1 primeiro (permissão)
- [ ] Configurar `vite-plugin-pwa` com workbox completo
- [ ] Implementar cache strategy:
  - Static assets: cache-first
  - API calls: network-first com fallback
  - Imagens: stale-while-revalidate
- [ ] Implementar offline mode para operações críticas (triagem, cadastro básico)
- [ ] Adicionar sync de dados quando conexão retorna
- [ ] Testar em Chrome DevTools > Application > Service Workers

**Verificação:**
```
# navigator.serviceWorker.controller exists
# Cache Storage contém assets da SPA
# Offline: SPA carrega e funciona para CRUD básico
```

---

### M2-T10: Worker Jobs Críticos (3-4 jobs)

**Problema:** Só notification processing implementado
**Arquivos:** `apps/worker/src/`
**Esforço:** 7 dias
**Responsável:** Backend

**Ações:**
1. **PIX Payment Processor**
   - [ ] Job `pix-payment-processor` — processa webhooks PIX
   - [ ] Job `pix-reconciliation` — reconcilia pagamentos
   - [ ] Implementar idempotência

2. **Stock Alerts**
   - [ ] Job `stock-low-alert` — detecta estoque baixo
   - [ ] Job `stock-reorder-suggestion` — sugere reposição
   - [ ] Integrar com notifications (email/WhatsApp)

3. **Commission Calculator**
   - [ ] Job `commission-calculation` — calcula comissões
   - [ ] Job `commission-distribution` — distribui para staff

**Verificação:**
```
# GET /worker/jobs lista jobs disponíveis
# Cada job tem health check em /worker/jobs/{name}/health
# Logs de execução em /worker/jobs/{name}/logs
```

---

### Checklist M2 — Gate de Entrada M3

| Tarefa | Status | Evidência |
|--------|--------|-----------|
| M2-T6: WebSocket OK | ⬜ | QueuePage atualiza em real-time |
| M2-T7: 30+ events catalog | ⬜ | Event catalog list 30+ |
| M2-T8: Storybook live | ⬜ | storybook.internal acessível |
| M2-T9: PWA offline OK | ⬜ | SPA funciona offline |
| M2-T10: 3+ Worker jobs | ⬜ | Jobs processando |

---

## ONDA M3 — ACHADOS MÉDIOS (Semanas 5-6)
### Meta: 84 → 87/100

### M3-T11: SSO/OIDC

**Problema:** Blueprint pede SSO mas backlog não contempla
**Esforço:** 5-7 dias
**Responsável:** Backend + Security

**Ações:**
- [ ] Selecionar provider OIDC (Keycloak ou Auth0)
- [ ] Implementar authorization code flow com PKCE
- [ ] Criar endpoints: `/auth/oidc/login`, `/auth/oidc/callback`
- [ ] Integrar com JWT existente (refresh token exchange)
- [ ] Adicionar testes de integração

---

### M3-T12: SOC2 Preparation

**Problema:** Módulo `soc2` existe mas vazio
**Esforço:** 5-7 dias
**Responsável:** Security + Platform

**Ações:**
- [ ] Mapear os 5 trust service criteria:
  - Security, Availability, Confidentiality, Processing Integrity, Privacy
- [ ] Implementar logging de auditoria para todos os eventos de segurança
- [ ] Criar controls inventory
- [ ] Implementar evidence collection automatizada
- [ ] Setup de monitoramento continuo

---

### M3-T13: Fiscal (NFe/NFS-e)

**Problema:** Motor fiscal paramétrico pendente
**Esforço:** 10-15 dias
**Responsável:** Backend

**Ações:**
- [ ] Implementar motor fiscal paramétrico (ICMS, IPI, PIS, COFINS)
- [ ] Criar tabela de CFOP
- [ ] Implementar emissão NFS-e (cidades-enabled)
- [ ] Criar schemas XML para NFe entrada
- [ ] Gerar relatórios fiscais

---

### M3-T14: WebAuthn MFA

**Problema:** Só TOTP implementado
**Esforço:** 5-7 dias
**Responsável:** Backend

**Ações:**
- [ ] Setup WebAuthn com `@simplewebauthn/server`
- [ ] Criar endpoints: `/auth/mfa/webauthn/setup`, `/auth/mfa/webauthn/verify`
- [ ] Implementar registration (biometria/chave USB)
- [ ] Integrar com fluxo MFA existente
- [ ] Adicionar testes

---

### M3-T15: Performance Benchmarks

**Problema:** Sem baseline de latência/throughput
**Esforço:** 5-7 dias
**Responsável:** Backend + Platform

**Ações:**
- [ ] Definir SLOs com valores-alvo:
  - API P95 < 200ms
  - SPA LCP < 1.5s
  - SPA FID < 100ms
  - SPA CLS < 0.1
- [ ] Configurar k6 para benchmark suite
- [ ] Executar baseline em staging
- [ ] Configurar alerting para SLO breach
- [ ] Dashboard Grafana com trends

---

### Checklist M3 — Gate de Entrada M4

| Tarefa | Status | Evidência |
|--------|--------|-----------|
| M3-T11: SSO OIDC | ⬜ | Login via provider externo funciona |
| M3-T12: SOC2 controls | ⬜ | 5 trust service criteria cobertos |
| M3-T13: Fiscal NFS-e | ⬜ | Emissão NFS-e funcional |
| M3-T14: WebAuthn | ⬜ | Biometria/Chave USB como MFA |
| M3-T15: Benchmarks | ⬜ | SLOs monitorados em Grafana |

---

## ONDA M4 — CONSOLIDAÇÃO (Semanas 7-8)
### Meta: 87 → 90/100

### M4-C1: Coverage Expansion → 15%+

**Ações:**
- [ ] Adicionar testes de integração para módulos sem cobertura:
  - billing, scheduling, inventory, encounters
- [ ] Setup testcontainers para PostgreSQL nos testes
- [ ] Coverage gate: 15% linhas, 20% funções
- [ ] Adicionar à CI: não merge se coverage cair > 5%

### M4-C2: API Key Management

**Ações:**
- [ ] Criar tabela `api_keys`
- [ ] CRUD de API keys via admin panel
- [ ] Rate limiting por API key
- [ ] Expor no OpenAPI spec

### M4-C3: WhatsApp Production (360dialog)

**Ações:**
- [ ] Implementar adapter 360dialog production
- [ ] Template management (HSM)
- [ ] Message status tracking
- [ ] Opt-out management

### M4-C4: Design System Componentes Faltantes

**Ações:**
- [ ] Implementar DatePicker
- [ ] Implementar TimePicker
- [ ] Implementar FileUpload (drag-and-drop)
- [ ] Implementar Charts (line, bar, pie)
- [ ] Implementar Tooltip
- [ ] Implementar Accordion

---

## ONDA M5 — 90+ (Semanas 9-12)

### M5-F1: PWA Offline Completo

- [ ] Service Worker com Background Sync
- [ ] Push Notifications (Chrome)
- [ ] Install prompt configurado

### M5-F2: AI/ML Readiness

- [ ] Feature store operacional
- [ ] Model registry com 2+ modelos
- [ ] Smart scheduling prototype
- [ ] Demand forecasting baseline

### M5-F3: Contract Testing (Pact)

- [ ] Pact broker setup
- [ ] Contract tests entre módulos
- [ ] Consumer-driven contracts

### M5-F4: OWASP ZAP Security Scan

- [ ] Integrate ZAP no CI
- [ ] Scan baseline
- [ ] Remediation de findings críticos
- [ ] Governance de vulnerabilidades

---

## BACKLOG CONSOLIDADO

| ID | Tarefa | Prioridade | Onda | Esforço | Score Impact |
|----|--------|------------|------|---------|-------------|
| M1-T1 | Fix PWA permission | 🔴 CRÍTICO | M1 | 1h | +3 |
| M1-T2 | Enforce CI coverage | 🔴 CRÍTICO | M1 | 1h | +5 |
| M1-T3 | OpenAPI runtime real | 🔴 CRÍTICO | M1 | 3h | +5 |
| M1-T4 | Tenant context real | 🔴 CRÍTICO | M1 | 2h | +5 |
| M1-T5 | SPA imports resolved | 🔴 CRÍTICO | M1 | 2h | +4 |
| M2-T6 | WebSocket QueuePage | 🟡 ALTO | M2 | 3h | +5 |
| M2-T7 | Event Bus 30 events | 🟡 ALTO | M2 | 5d | +8 |
| M2-T8 | Storybook | 🟡 ALTO | M2 | 3d | +4 |
| M2-T9 | PWA offline | 🟡 ALTO | M2 | 5d | +5 |
| M2-T10 | Worker jobs (3-4) | 🟡 ALTO | M2 | 7d | +7 |
| M3-T11 | SSO/OIDC | 🟢 MÉDIO | M3 | 5-7d | +3 |
| M3-T12 | SOC2 prep | 🟢 MÉDIO | M3 | 5-7d | +3 |
| M3-T13 | Fiscal NFS-e | 🟢 MÉDIO | M3 | 10-15d | +4 |
| M3-T14 | WebAuthn | 🟢 MÉDIO | M3 | 5-7d | +3 |
| M3-T15 | Performance benchmarks | 🟢 MÉDIO | M3 | 5-7d | +3 |
| M4-C1 | Coverage 15%+ | 🟡 ALTO | M4 | 10d | +10 |
| M4-C2 | API Key Management | 🟡 ALTO | M4 | 5d | +4 |
| M4-C3 | WhatsApp production | 🟢 MÉDIO | M4 | 5-7d | +3 |
| M4-C4 | DS componentes | 🟡 ALTO | M4 | 15-20d | +5 |
| M5-F1 | PWA offline complete | 🟢 MÉDIO | M5 | 7d | +3 |
| M5-F2 | AI/ML readiness | 🟢 MÉDIO | M5 | 15d | +3 |
| M5-F3 | Contract testing | 🟢 MÉDIO | M5 | 7d | +3 |
| M5-F4 | OWASP ZAP | 🟢 MÉDIO | M5 | 5d | +3 |

---

## ROADMAP VISUAL

```
SEMANA   1   2   3   4   5   6   7   8   9   10  11  12
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ONDA M1 [T1][T2][T3][T4][T5]        Score: 72 → 80
         ✓

ONDA M2      [T6][T7]     [T8][T9]  Score: 80 → 84
                  [T10]

ONDA M3           [T11]        [T13]  Score: 84 → 87
                 [T12][T14][T15]

ONDA M4                [C1][C2]        Score: 87 → 90
                     [C3][C4]

ONDA M5                           [F1-F4]  Score: 90+
```

---

## INVESTIMENTO ESTIMADO

| Fase | Esforço Total | Dias/Homem |
|------|-------------|------------|
| M1 (Críticos) | 9h | 1 dia |
| M2 (Altos) | 15d | 15 dias |
| M3 (Médios) | 35-50d | 35-50 dias |
| M4 (Consolidação) | 35-40d | 35-40 dias |
| M5 (90+) | 34d | 34 dias |
| **TOTAL** | **~130-140 dias** | **~130-140 dias/homem** |

---

## GATES E CHECKPOINTS

### Gate M1 → M2 (Fim Semana 2)
- [ ] `pnpm build` passa (SPA)
- [ ] CI coverage enforced
- [ ] `/openapi.json` com 80+ paths
- [ ] Tenant context sem 'pending'
- [ ] SPA importa auth-sdk sem erro

### Gate M2 → M3 (Fim Semana 4)
- [ ] WebSocket funcionando em QueuePage
- [ ] 30+ eventos no catalog
- [ ] Storybook acessível
- [ ] PWA offline funcional
- [ ] 3+ Worker jobs processando

### Gate M3 → M4 (Fim Semana 6)
- [ ] SSO/OIDC login funcional
- [ ] SOC2 controls inventory
- [ ] NFS-e emission baseline
- [ ] WebAuthn biometria OK
- [ ] SLO benchmarks documentados

### Gate M4 → M5 (Fim Semana 8)
- [ ] Coverage 15%+
- [ ] API Keys CRUD OK
- [ ] WhatsApp production OK
- [ ] DatePicker + Charts implementados

### Gate Final (Fim Semana 12)
- [ ] Score 90+
- [ ] Coverage 20%+
- [ ] PWA offline completo
- [ ] AI/ML readiness verificado
- [ ] OWASP ZAP sem high/critical

---

## RISCO E MITIGAÇÃO

| Risco | Probabilidade | Impacto | Mitigação |
|-------|-------------|---------|-----------|
| M1-T1 PWA permission não resolve | Média | Alto | Verificar ownership antes; usar docker volume mount |
| M2-T7 Event catalog 30 events | Alta | Alto | Priorizar eventos cross-módulo; 15 events já é bom |
| M2-T10 Worker jobs | Alta | Médio | Começar com 1 job PIX; expandir gradualmente |
| M3-T13 Fiscal NFS-e | Alta | Médio | NFC-e é mais complexo; focar NFS-e primeiro |
| M4-C1 Coverage expansion | Média | Alto | focar integração tests; unittests não elevam coverage |

---

## PRÓXIMOS PASSOS IMEDIATOS

1. **Agora (dia 1):** Atribuir M1-T1 a Platform — 1h
2. **Agora (dia 1):** Atribuir M1-T2 a Platform — 1h
3. **Semana 1:** Resolver M1-T1 + M1-T2 + M1-T3
4. **Semana 2:** Resolver M1-T4 + M1-T5 + iniciar M2

---

*Plano gerado por Claude Code — CVG-HIS-V2 Plano de Melhorias — 11/04/2026*
