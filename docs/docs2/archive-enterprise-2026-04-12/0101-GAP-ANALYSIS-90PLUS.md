# GAP ANALYSIS — CAMINHO PARA 90/100

## Data: 09/04/2026
## Score Atual: ~81/100
## Score Meta: 90/100
## Gap: -9 pontos

---

## RESUMO EXECUTIVO

O workspace está **estável** (typecheck/build/test passando). Os gaps para 90+ são:

| Área | Gap Score | Esforço Estimado | Prioridade |
|------|-----------|-------------------|------------|
| PWA/Offline | -8 | 3-5 dias | ALTA |
| Event Bus | -10 | 10-15 dias | ALTA |
| API Key Management | -5 | 3-5 dias | ALTA |
| Worker Jobs | -8 | 10-15 dias | MÉDIA |
| Design System (Storybook) | -5 | 2-3 dias | MÉDIA |
| Test Coverage | -10 | Contínuo | MÉDIA |
| WhatsApp Production | -5 | 5-7 dias | MÉDIA |
| Missing Components | -10 | 15-20 dias | BAIXA |

---

## 1. DESIGN SYSTEM — Componentes Faltantes

### Blueprint: 50 componentes
### Atual: ~18 implementados
### Gap: -10 para 90

| Componente | Status | Arquivo |
|------------|--------|---------|
| DatePicker | ❌ FALTA | packages/design-system/src/vue/ |
| TimePicker | ❌ FALTA | packages/design-system/src/vue/ |
| FileUpload | ❌ FALTA | packages/design-system/src/vue/ |
| Switch/Toggle | ❌ FALTA | packages/design-system/src/vue/ |
| Accordion | ❌ FALTA | packages/design-system/src/vue/ |
| Dropdown/Select | ⚠️ PARCIAL | SPA usa SearchSelect custom |
| Charts | ❌ FALTA | packages/design-system/src/vue/ |
| Tooltip | ❌ FALTA | packages/design-system/src/vue/ |
| Avatar | ❌ FALTA | packages/design-system/src/vue/ |
| Progress | ❌ FALTA | packages/design-system/src/vue/ |
| Skeleton | ⚠️ PARCIAL | SPA tem SkeletonLoader.vue |
| Calendar | ⚠️ PARCIAL | Só Kanban |
| Storybook | ❌ FALTA | packages/design-system/ |

**Ação:** Implementar DatePicker + FileUpload + Storybook primeiro.

---

## 2. PWA/OFFLINE — CRÍTICO

### Blueprint: Service Worker + Offline + Push
### Atual: ZERO implementação
### Gap: -8 para 90

**Arquivos necessários:**
- `apps/spa/public/manifest.json`
- `apps/spa/src/service-worker.ts`
- `vite.config.ts` com plugin PWA

**Ação:** Implementar PWA básico com Workbox.

---

## 3. EVENT BUS — CRÍTICO

### Blueprint: Redis/RabbitMQ + 30+ eventos + Outbox
### Atual: Só webhooks (8 eventos)
### Gap: -10 para 90

**Estado atual:**
- WebhooksService funcionando com 8 eventos
- packages/events só tem 2 tipos (ClinicalNote)

**Falta:**
- Redis Streams ou RabbitMQ
- Outbox pattern
- 22+ eventos de domínio
- Dead Letter Queue

**Ação:** Implementar Event Bus com Redis Streams + Outbox.

---

## 4. API PREMIUM — API Key Management

### Blueprint: API Keys + Rate Limit + Portal
### Atual: Só OpenAPI spec
### Gap: -5 para 90

**Falta:**
- Tabela api_keys
- CRUD de API keys
- Rate limiting por key
- Swagger UI interativo

**Ação:** Implementar API Key Management.

---

## 5. WORKER — Jobs Faltantes

### Blueprint: PIX, Reconciliação, Fiscal, etc.
### Atual: Só notification processing
### Gap: -8 para 90

**Jobs implementados:**
- Notification processing (1 job)

**Jobs faltantes:**
- PIX payment processing
- Card reconciliation
- Low stock alerts
- Commission calculations
- NFS-e emission
- Financial dashboard updates

**Ação:** Implementar 3-4 jobs críticos.

---

## 6. WHATSAPP — Production Ready

### Blueprint: WhatsApp Business API completo
### Atual: Twilio sandbox + lembretes
### Gap: -5 para 90

**Implementado:**
- TwilioWhatsAppAdapter (sandbox)
- Appointment reminders

**Falta:**
- 360dialog adapter production
- Template management
- Message status tracking
- Opt-out management
- Exam results delivery

**Ação:** Implementar 360dialog production + templates.

---

## 7. TEST COVERAGE — Gaps Críticos

### Atual: ~6% lines, 7 placeholders
### Meta: 80% lines, 0 placeholders
### Gap: -10 para 90

**Placeholders (0 testes):**
- worker
- shared/auth-sdk
- shared/config
- shared/database
- shared/logging
- shared/types
- shared/utils

**Ação:** Implementar testes para worker + shared packages críticos.

---

## PRIORIZAÇÃO DE EXECUÇÃO

### Sprint 1 (Semana 1-2): PWA + API Keys

| ID | Tarefa | Esforço | Entrega |
|----|--------|---------|---------|
| S1-01 | PWA Service Worker | 3 dias | manifest.json + SW + vite-plugin-pwa |
| S1-02 | API Key Management | 3 dias | tabela + CRUD + rate limit |
| S1-03 | Storybook Setup | 2 dias | DS storybook configurado |
| S1-04 | DatePicker Component | 2 dias | DsDatePicker.vue |

### Sprint 2 (Semana 3-4): Event Bus + Worker

| ID | Tarefa | Esforço | Entrega |
|----|--------|---------|---------|
| S2-01 | Redis Event Bus | 5 dias | EventBus + Outbox + 10 eventos |
| S2-02 | Worker Jobs | 5 dias | 3-4 jobs críticos |
| S2-03 | WhatsApp Production | 3 dias | 360dialog adapter |
| S2-04 | FileUpload Component | 2 dias | DsFileUpload.vue |

### Sprint 3 (Semana 5-6): Coverage + Components

| ID | Tarefa | Esforço | Entrega |
|----|--------|---------|---------|
| S3-01 | Test Coverage | 5 dias | worker + shared tests |
| S3-02 | Charts Component | 3 dias | DsCharts.vue |
| S3-03 | Remaining Components | 3 dias | Accordion, Tooltip, etc |

---

## ROADMAP FINAL

```
Semana 1-2:  PWA + API Keys + Storybook + DatePicker
Semana 3-4:  Event Bus + Worker + WhatsApp + FileUpload  
Semana 5-6:  Test Coverage + Charts + Componentes
Semana 7-8:  Integrações + Hardening + Docs
```

**Entrega prevista para 90+: ~8 semanas**

---

## CRITÉRIOS DE SUCESSO

- [ ] PWA funcionando offline
- [ ] API Key Management operacional
- [ ] Event Bus com 20+ eventos
- [ ] 3+ Worker jobs novos
- [ ] Storybook do DS publicado
- [ ] Test coverage > 30%
- [ ] 0 placeholders em módulos críticos

---

*Documento criado em 09/04/2026 via análise automatizada*
