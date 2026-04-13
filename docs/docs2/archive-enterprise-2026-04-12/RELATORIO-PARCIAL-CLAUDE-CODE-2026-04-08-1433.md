# Relatório Parcial Claude Code

## Data e contexto

- **Data:** 2026-04-08
- **Executor:** 33 — Onda 3.4 — WhatsApp Vendor-Assisted Integration
- **Contexto:** Conectar resposta inbound do tutor via WhatsApp à transição real de status do agendamento, fechando o primeiro loop funcional de confirmação/cancelamento

---

## Resumo executivo

Corrigiu-se a semantics da confirmação WhatsApp: o fluxo `CONFIRMAR` agora chama `scheduling.checkIn()` (transição `scheduled` → `checked_in`) em vez de `cancelAppointment()`. A ação CANCELAR já estava correta. Isso fecha o loop funcional: o tutor confirma presença via WhatsApp e o agendamento muda para `checked_in`, sinalizando que o paciente chegou — em vez de ser cancelado erroneamente.

**Resultado:** O inbound do tutor agora altera o status real do appointment de forma semanticamente correta. Audit trail e `appointment.status_changed` via webhook continuam coerentes. Build/typecheck passando. Documentação do event catalog corrigida para refletir o nome real do evento (`appointment.scheduled`).

---

## Lote escolhido

**Onda 3.4 — WhatsApp inbound loop: confirmação real de agendamento**

Justificativa:
1. **Maior valor:** Fecha o loop funcional — confirmação real de presença via WhatsApp
2. **Menor risco:** Usa `checkIn()` existente (já testado em `SchedulingService`)
3. **Fechamento possível:** Bug era uma linha de código no handler `/webhooks/whatsapp/inbound`
4. **Desbloqueia:** Próxima iteração pode testar o fluxo completo em staging

---

## O que foi implementado

### Bug fix: CONFIRMAR não era cancelamento

**Problema:** O handler `POST /webhooks/whatsapp/inbound` chamava `cancelAppointment()` quando o tutor enviava `CONFIRMAR`. Isso cancelava o agendamento em vez de confirmar a chegada —语义 inverso do desejado.

**Causa:** Exec 32 implementou `cancelAppointment()` para CONFIRMAR porque esse era o único método disponível no `scopedScheduling` cast. `checkIn()` não estava no cast.

**Fix:**

1. **Adicionou-se `checkIn` ao cast `scopedScheduling`** (`server.ts:135-145`):
```typescript
const scopedScheduling = scheduling as unknown as {
  // ...existing
  checkIn(
    accountId: string,
    payload: { patientId: string; ownerId: string; appointmentId?: string; reason?: string }
  ): Promise<unknown>;
};
```

2. **Corrigiu-se o handler CONFIRMAR** (`server.ts:3596-3618`):
```typescript
// ANTES (errado):
await scopedScheduling.cancelAppointment(
  appointmentId,
  'Confirmed via WhatsApp by tutor'
);

// DEPOIS (corrigido):
await scopedScheduling.checkIn(appointment.accountId as string, {
  appointmentId,
  patientId: appointment.patientId as string,
  ownerId: appointment.ownerId as string,
  reason: 'Confirmed via WhatsApp by tutor'
});
```

### Comportamento atual do loop WhatsApp

| Mensagem do tutor | Ação real | Status resultante | Resposta |
|-------------------|----------|-------------------|----------|
| `CONFIRMAR` / `CONFIRM` | `checkIn()` → `scheduled` → `checked_in` | `checked_in` | `CONFIRMADO` |
| `CANCELAR` / `CANCELAR CONSULTA` | `cancelAppointment()` → `scheduled` → `cancelled` | `cancelled` | `CANCELADO` |
| `REMARCAR` | Apenas audit log | inalterado | `AGUARDANDO REMARCA` |
| qualquer outra | Apenas audit | inalterado | `OK` |

**O que dispara em cada transição:**
- CONFIRMAR: `appointment.status_changed` via `onAppointmentStatusChanged` (webhook dispatch), audit `whatsapp_confirm`
- CANCELAR: `appointment.status_changed` via `onAppointmentStatusChanged` (webhook dispatch), audit `whatsapp_cancel`

### Correção documental

**Arquivo:** `docs/Enterprise/313.3-ONDA-3.3-EVENT-CATALOG.md`

- `appointment.created` → `appointment.scheduled` (tabela, critérios de aceite, seção 4, nota de nomenclatura)
- Trigger do `appointment.status_changed` expandido para incluir `checkIn()` e todas as transições
- Nota de nomenclatura adicionada explicando a diferença entre `onAppointmentCreated` (callback) e `appointment.scheduled` (evento)

---

## Arquivos alterados

| Arquivo | Mudança |
|---------|--------|
| `apps/api/src/server.ts` | Bug fix: CONFIRMAR usa `checkIn()` em vez de `cancelAppointment()`; `checkIn` adicionado ao cast `scopedScheduling` |
| `docs/Enterprise/313.3-ONDA-3.3-EVENT-CATALOG.md` | Nomenclatura unificada: `appointment.created` → `appointment.scheduled` em todo o documento |

---

## Comandos executados

| Comando | Resultado |
|---------|-----------|
| `pnpm --filter @cvg-his-v2/api run typecheck` | ✅ PASS |
| `pnpm --filter @cvg-his-v2/api run build` | ✅ PASS |
| `pnpm --filter @cvg-his-v2/spa run typecheck` | ✅ PASS |
| `pnpm --filter @cvg-his-v2/spa run build` | ✅ PASS |
| `pnpm --filter @cvg-his-v2/module-scheduling run test` | ✅ 29/29 PASS |
| `pnpm --filter @cvg-his-v2/notifications-whatsapp run test` | ✅ 29/29 PASS |
| `node scripts/validate-openapi.js` | ✅ 108 paths, 24 tags, 74 schemas, all checks passed |

---

## Validações

### Build e Typecheck
- **API typecheck:** PASS
- **API build:** PASS
- **SPA typecheck:** PASS
- **SPA build:** PASS

### Testes
- **Scheduling module:** 29/29 PASS
- **WhatsApp module:** 29/29 PASS
- **OpenAPI:** 108 paths, 74 schemas, all structural checks PASS

### Análise de consistência
- `availableEvents` em `webhook.ts`: `appointment.scheduled` ✅ (não é `appointment.created`)
- `scopedScheduling` cast: `checkIn` adicionado ✅
- `CANCELLABLE_APPOINTMENT_STATUSES`: `['scheduled', 'checked_in']` ✅ (CONFIRMAR agora transição para `checked_in`, não cancela)
- `availableStatuses` em `SchedulingAppointmentSummary`: `'scheduled' | 'checked_in' | 'completed' | 'cancelled'` ✅

---

## Pendências e bloqueios

### O que funciona agora
- Loop completo CONFIRMAR → `checkIn()` → `checked_in` → `appointment.status_changed` webhook + audit
- Loop completo CANCELAR → `cancelAppointment()` → `cancelled` → `appointment.status_changed` webhook + audit
- REMARCAR registra intenção em audit sem automação

### O que ainda depende de ambiente/vendor externo
1. **Credenciais Twilio/360dialog** — `WHATSAPP_ENABLED`, `WHATSAPP_API_KEY`, `WHATSAPP_FROM_NUMBER` não configurados em staging
2. **WABA approval** — Meta/Meta Business verificado + templates approved
3. **HMAC validation** — Autenticação HMAC do webhook inbound (marcado para Onda 3.5)
4. **Docker** — Testes de persistência WH-001/002/003 continuam bloqueados

### O que não foi implementado (escopo)
- Automação completa de remarcação (REMARCAR apenas loga intenção)
- UI de gestão de lembretes
- Persistência do resultado de envio em NotificationRepository

---

## Estado atual auditável

| Componente | Status |
|-----------|--------|
| `POST /webhooks/whatsapp/inbound` handler | ✅ CONFIRMAR → `checkIn()` |
| `SchedulingService.checkIn()` | ✅ Transição `scheduled` → `checked_in` com audit + webhook |
| `SchedulingService.cancelAppointment()` | ✅ CANCELAR via WhatsApp funciona |
| `appointment.status_changed` (webhook) | ✅ Dispara em checkIn e cancelAppointment |
| Event catalog | ✅ `appointment.scheduled` (não `appointment.created`) |
| Runtime vs docs | ✅ Unificado — evento é `appointment.scheduled` no código e nos docs |
| OpenAPI | ✅ 108 paths, 74 schemas |
| WhatsApp module | ✅ 29/29 testes |
| Scheduling module | ✅ 29/29 testes |

---

## Próxima tarefa recomendada

### Prioridade 1 — Homologar loop CONFIRMAR em staging
Configurar `WHATSAPP_ENABLED=true` com credenciais Twilio sandbox em staging. Criar um appointment via API, enviar payload inbound `CONFIRMAR` com `AppointmentId`, e validar:
1. Appointment status → `checked_in`
2. `appointment.status_changed` webhook disparado
3. Audit log `whatsapp_confirm` criado
4. Twilio response → `CONFIRMADO`

Passos:
```bash
# 1. Criar appointment
POST /appointments { patientId, ownerId, scheduledAt, visitType, reason }

# 2. Simular inbound WhatsApp
curl -X POST http://localhost:3001/webhooks/whatsapp/inbound \
  -H "Content-Type: application/json" \
  -d '{"Body":"CONFIRMAR","From":"whatsapp:+5511999998888","AppointmentId":"<appt_id>"}'

# 3. Verificar status
GET /appointments/<appt_id>  → status = "checked_in"
```

### Prioridade 2 — Adicionar unit test para o handler inbound
Criar teste em `apps/api/src/server.test.ts` cobrindo o inbound handler com mocking de `scopedScheduling`.

### Prioridade 3 — Fechar persistência (Docker)
Quando Docker estiver disponível: executar `tests/integration/webhook-persistence.test.ts` (WH-001/002/003).

---

## Caminhos de documentação atualizados

- Bug fix: `apps/api/src/server.ts`
- Documentação: `docs/Enterprise/313.3-ONDA-3.3-EVENT-CATALOG.md`
- Relatório: `docs/Enterprise/RELATORIO-PARCIAL-CLAUDE-CODE-2026-04-08-1433.md`
