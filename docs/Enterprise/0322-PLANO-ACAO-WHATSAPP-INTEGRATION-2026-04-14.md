# 0322 — Plano de Ação: WhatsApp Integration

**Data:** 2026-04-14
**Fonte:** `313.4-ONDA-3.4-WHATSAPP-VENDOR-PREP.md` e `0207-BACKLOG-DERIVADO-ERP`
**Prioridade:** MÉDIO
**Status atual:** PARCIAL — MVP backbone existe, gaps de produção permanecem

---

## 1. Diagnóstico — Estado Real

### Já implementado ✅

| Componente | Evidência | Status |
|------------|-----------|--------|
| `packages/modules/notifications-whatsapp/` | Package com 5 arquivos | ✅ |
| `WhatsAppProviderService` + `TwilioWhatsAppAdapter` | Adapter factory implementada | ✅ |
| `AppointmentReminderWorkflow` | Consome `appointment.scheduled` | ✅ |
| `EnvNotificationSettingsProvider` | Settings via env vars | ✅ |
| `/webhooks/whatsapp/inbound` | Endpoint em `server.ts:4766` | ✅ |
| CONFIRMAR → `checkIn()` | Testado em `server.test.ts` | ✅ |
| CANCELAR → `cancelAppointment()` | Testado em `server.test.ts` | ✅ |
| 29 testes unitários | `whatsapp.test.ts` passing | ✅ |
| OpenAPI documentado | `/webhooks/whatsapp/inbound` em `openapi.yaml` | ✅ |
| Audit log de inbound | `whatsapp.inbound_received` | ✅ |

### Gaps de produção ❌

| Gap | Impacto | Esforço |
|-----|---------|---------|
| WABA / Meta approval | Não é possível enviar mensagens reais | DEPENDE EXTERNO |
| Template `appointment_reminder` approved | Meta precisa aprovar antes do envío | DEPENDE EXTERNO |
| HMAC validation (Twilio) | Segurança do webhook incompleta | BAIXO |
| 360dialog provider | Só Twilio funciona, 360dialog é NoOp | MÉDIO |
| NotificationRepository persistence | Não há registro de delivery | MÉDIO |
| Database-backed NotificationSettings | Só env vars, sem gestão por tenant | MÉDIO |
| Background scheduler | Lembretes são on-demand, não programados | MÉDIO |
| Secrets configuration | Credenciais não estão em prod | DEPENDE EXTERNO |

---

## 2. Gaps que dependem apenas de código interno

Estes podem ser fechados sem aprovação externa:

### G-01: HMAC Validation para webhook inbound

**Arquivo:** `apps/api/src/server.ts` (linha ~4766)
**Atual:** Sem validação HMAC
**Alvo:** Validar `X-Twilio-Signature` ou `360dialog-Signature`

```typescript
// Adicionar antes de processar inbound
function validateTwilioHmac(body: string, signature: string): boolean {
  const secret = process.env.WHATSAPP_WEBHOOK_SECRET;
  if (!secret) return true; // fail-open temporário
  const expected = crypto.createHmac('sha1', secret).update(body).digest('base64');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
```

### G-02: 360dialog Provider real

**Arquivo:** `packages/modules/notifications-whatsapp/src/adapters.ts`
**Atual:** `NoOpWhatsAppAdapter` para 360dialog
**Alvo:** Implementar adapter real

```
Provider: 360dialog
Base URL: https://api.360dialog.com/v1
Auth: API Key header
```

### G-03: NotificationRepository — persistência de delivery

**Arquivo:** `packages/db/src/schema/notifications.ts`
**Alvo:** Criar tabela `notification_delivery_log`

```typescript
export const notificationDeliveryLog = pgTable('notification_delivery_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  notificationId: uuid('notification_id').notNull(),
  channel: text('channel').notNull(), // 'whatsapp'
  providerMessageId: text('provider_message_id'),
  status: text('status').notNull(), // 'sent' | 'delivered' | 'failed' | 'read'
  providerResponse: jsonb('provider_response'),
  sentAt: timestamp('sent_at').defaultNow(),
  deliveredAt: timestamp('delivered_at'),
  correlationId: uuid('correlation_id'),
});
```

### G-04: Database-backed NotificationSettings por tenant

**Arquivo:** `packages/db/src/schema/notifications.ts`
**Alvo:** Permitir que cada tenant configure WhatsApp via API

```typescript
export const notificationSettings = pgTable('notification_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  channel: text('channel').notNull(), // 'whatsapp'
  enabled: boolean('enabled').default(false),
  provider: text('provider'), // 'twilio' | '360dialog'
  providerConfig: jsonb('provider_config'), // { apiKey, fromNumber, etc }
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

### G-05: Background Scheduler para lembretes programados

**Arquivo:** `apps/worker/src/index.ts`
**Atual:** `AppointmentReminderWorkflow` é invocado on-demand
**Alvo:** Worker queConsulta appointments do dia seguinte e envia lembretes

```
Cron: todo dia às 09:00 e 18:00
Query: SELECT * FROM appointments WHERE scheduledAt BETWEEN tomorrow 09:00 E tomorrow 09:00 + 24h AND status = 'scheduled'
Action: Para cada um, invocar AppointmentReminderWorkflow
```

---

## 3. Gaps que dependem de aprovação externa

| Item | Responsável | Prazo estimado | Bloqueia |
|------|-------------|----------------|----------|
| Conta Meta Business verificada | PO | 1-3 dias | WABA |
| WABA criado | PO | 1-2 dias | Templates |
| Número verificado | PO | 1-3 dias | Sandbox |
| Template `appointment_reminder` submitted | PO | 24-72h após submission | Sandbox |
| Template approved | Meta | 24-72h | Produção |
| Credenciais em produção | DevOps | 1 dia | Produção |

---

## 4. Plano de Execução — 5 dias + aprovação externa

### Dia 1: G-01 (HMAC) + G-03 (NotificationRepository)

| Tarefa | Responsável | Saída |
|--------|-------------|-------|
| Implementar HMAC validation em `server.ts` | Dev | `validateTwilioHmac()` |
| Criar schema `notification_delivery_log` | Dev | Migration + tipo |
| Criar `NotificationDeliveryRepository` | Dev | Repository com `save()`, `updateStatus()` |
| Ajustar `WhatsAppProviderService` para chamar `NotificationDeliveryRepository` | Dev | Delivery log persistido |
| Testar HMAC com mock | Dev | Teste unitário |

### Dia 2: G-04 (Database-backed settings) + G-02 (360dialog)

| Tarefa | Responsável | Saída |
|--------|-------------|-------|
| Criar schema `notification_settings` | Dev | Migration |
| Implementar `DatabaseNotificationSettingsProvider` | Dev | Implementa interface `INotificationSettingsProvider` |
| Implementar `ThreeSixtyDialogWhatsAppAdapter` | Dev | Adapter real |
| Ajustar factory para selecionar por `WHATSAPP_PROVIDER` | Dev | TWILIO ou 360DIALOG |
| Testes unitários dos novos adapters | Dev | 10+ novos testes |

### Dia 3: G-05 (Background scheduler) + Integração

| Tarefa | Responsável | Saída |
|--------|-------------|-------|
| Criar job `appointment-reminder-scheduler` | Dev | `apps/worker/src/jobs/appointment-reminder.ts` |
| Registrar cron job em `apps/worker/src/index.ts` | Dev | Job registrado |
| Criar endpoint `POST /notifications/settings/whatsapp` (admin) | Dev | CRUD de settings |
| Criar endpoint `GET /notifications/delivery-history` | Dev | Consulta de logs |
| Testes de integração worker | Dev | Testes de scheduler |

### Dia 4: Homologação + Documentação

| Tarefa | Responsável | Saída |
|--------|-------------|-------|
| Testar fluxo completo em staging | Dev/QA | Mensagem enviada via sandbox |
| Validar HMAC com credenciais reais | Dev | Security validado |
| Documentar variáveis de ambiente | Dev | `docs/WHATSAPP_SETUP.md` |
| Atualizar OpenAPI com novos endpoints | Dev | `openapi.yaml` sincronizado |
| Teste end-to-end: appointment → reminder → delivery | QA | Relatório de QA |

### Dia 5: Apresentação + PR

| Tarefa | Responsável | Saída |
|--------|-------------|-------|
| Review de código | Tech Lead | PR aprovado |
| Update do doc `313.4` | PO | Status: HOMOLOGADO |
| Atualizar `0321` | Dev | Nova nota: 85/100 |

---

## 5. Aprovação Externa (paralelo ao Dia 1-5)

###PO Actions

- [ ] Criar conta Meta Business (dia 1)
- [ ] Verificação de empresa (dia 1-3)
- [ ] Criar WABA (dia 2-4)
- [ ] Reservar número dedicado para WhatsApp (dia 2-4)
- [ ] Solicitar template `appointment_reminder` (dia 3)
- [ ] Submeter template para Meta (dia 3)
- [ ] Configurar Twilio sandbox com número verificado (dia 4-5)

---

## 6. Critérios de Aceite — WhatsApp Integration

| # | Critério | Status | Evidência |
|---|----------|--------|-----------|
| 1 | `appointment.scheduled` consumer funcional | ✅ DONE | `runtime.ts:183-195` |
| 2 | WhatsAppProviderService com adapter configurável | ✅ DONE | Factory em `adapters.ts` |
| 3 | Twilio adapter implementado | ✅ DONE | `TwilioWhatsAppAdapter` |
| 4 | 360dialog adapter implementado | ❌ G-02 | Stub atual (NoOp) |
| 5 | HMAC validation do webhook inbound | ❌ G-01 | Não existe |
| 6 | CONFIRMAR → checkIn() | ✅ DONE | `server.test.ts:1551` |
| 7 | CANCELAR → cancelAppointment() | ✅ DONE | `server.test.ts:1607` |
| 8 | Delivery log persistido | ❌ G-03 | Não existe |
| 9 | Settings por tenant (DB-backed) | ❌ G-04 | Só env vars |
| 10 | Background scheduler para lembretes | ❌ G-05 | On-demand only |
| 11 | Testes unitários (29+ passando) | ✅ DONE | `whatsapp.test.ts` |
| 12 | Build/typecheck/testes validado | ✅ DONE | CI verde |
| 13 | Sandbox com template approved | ⏳ DEPENDE EXTERNO | Meta approval |
| 14 | Produção com credenciais reais | ⏳ DEPENDE EXTERNO | WABA + secrets |
| 15 | 360dialog homologado | ❌ G-02 | Stub |

---

## 7. Estimativa Final

| Fase | Esforço | Dependência |
|------|---------|-------------|
| Código interno (G-01 a G-05) | **5 dias/homem** | Nenhuma externa |
| Aprovação Meta/WABA | **2-4 semanas** | Externa |
| Credenciais + sandbox | **3-5 dias** | Externa |

**Total código interno:** 5 dias
**Total com aprovação:** 3-4 semanas

---

## 8. Priorização Recomendada

Executar nesta ordem:

1. **Dia 1:** Fechar G-01 (HMAC) + G-03 (delivery log) — segurança + observabilidade
2. **Dia 2:** Fechar G-04 (DB settings) + G-02 (360dialog) — multi-provider
3. **Dia 3:** Fechar G-05 (scheduler) — valor de negócio real
4. **Paralelo:** PO inicia aprovação WABA
5. **Dia 4-5:** Homologação + PR

---

## 9. Score Alvo

| Dimensão | Atual | Após G-01 a G-05 | Com sandbox |
|----------|-------|------------------|-------------|
| WhatsApp Integration | 60/100 | 80/100 | 90/100 |

**Gaps restantes após G-01 a G-05:** Apenas aprovação externa e produção real.
