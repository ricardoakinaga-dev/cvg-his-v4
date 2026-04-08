# Relatório Parcial Claude Code

## Data e contexto

- **Data:** 2026-04-08
- **Executor:** 35 — Onda 3.4 — Testes automatizados do inbound webhook WhatsApp
- **Contexto:** Adicionar testes de API para `POST /webhooks/whatsapp/inbound`, cobrindo o loop de confirmação e cancelamento de agendamentos via WhatsApp

---

## Resumo executivo

Adicionou-se um bloco de 6 testes em `apps/api/src/server.test.ts` cobrindo o endpoint `POST /webhooks/whatsapp/inbound`. Os testes validam os cenários: CONFIRMAR com transição `scheduled` → `checked_in`, CANCELAR com transição `scheduled` → `cancelled`, REMARCAR sem alteração de status, payload malformado (fail-safe), appointment inexistente (fail-safe), e alias `CONFIRM`. Todos os testes estão sintaticamente corretos e compilados em `dist/server.test.js`.

**Bloqueio de execução:** O workspace tem um problema de ambiente — módulos como `@cvg-his-v2/tenant-context` e `@cvg-his-v2/module-lgpd` não têm `dist/` compilado, causando `ERR_MODULE_NOT_FOUND` quando o Node tenta resolver `.js` de `.ts` com `NodeNext` module resolution. Isso impede a execução dos testes de API via `node --test`. Typecheck, build e OpenAPI validation passam. Scheduling module tests (29/29) executam via vitest porque usam bundling.

---

## Lote escolhido

**Onda 3.4 — Testes automatizados do inbound webhook WhatsApp**

Justificativa:
1. **Maior valor:** Cobrir o loop CONFIRMAR/CANCELAR automaticament elimina risco de regressão no inbound webhook
2. **Menor risco:** Testes unitários de API usando infraestrutura existente (`MockRequest`/`MockResponse`, `performRequest`, `login`)
3. **Fechamento possível:** 6 cenários implementados — cobrindo os casos principais e fail-safe
4. **Desbloqueia:** Com testes, a próxima execução pode validar homologação real em staging

---

## O que foi implementado

### 6 novos testes de API em `apps/api/src/server.test.ts`

| # | Teste | Cenário | Validação |
|---|-------|---------|-----------|
| 1 | `POST /webhooks/whatsapp/inbound confirms a scheduled appointment` | CONFIRMAR + AppointmentId válido | HTTP 200, resposta `CONFIRMADO`, status → `checked_in` |
| 2 | `POST /webhooks/whatsapp/inbound cancels a scheduled appointment` | CANCELAR + AppointmentId válido | HTTP 200, resposta `CANCELADO`, status → `cancelled` |
| 3 | `POST /webhooks/whatsapp/inbound with REMARCAR returns AGUARDANDO REMARCA` | REMARCAR + AppointmentId válido | HTTP 200, resposta `AGUARDANDO REMARCA`, status permanece `scheduled` |
| 4 | `POST /webhooks/whatsapp/inbound with malformed payload returns OK` | CONFIRMAR sem AppointmentId | HTTP 200, resposta `OK` (fail-safe) |
| 5 | `POST /webhooks/whatsapp/inbound returns CONFIRMADO even if appointment not found` | CONFIRMAR + AppointmentId inexistente | HTTP 200, resposta `CONFIRMADO` (fail-safe) |
| 6 | `POST /webhooks/whatsapp/inbound CONFIRM returns CONFIRMADO (alias)` | CONFIRM (alias de CONFIRMAR) | HTTP 200, resposta `CONFIRMADO` |

### Padrão de teste
Cada teste:
1. Cria um appointment via `POST /appointments`
2. Envia payload via `POST /webhooks/whatsapp/inbound`
3. Valida resposta HTTP e texto
4. Busca appointment via `GET /appointments/:id` para verificar status real

---

## Arquivos alterados

| Arquivo | Mudança |
|---------|--------|
| `apps/api/src/server.test.ts` | Adicionados 6 testes para `POST /webhooks/whatsapp/inbound` (248 linhas adicionadas) |

---

## Comandos executados

| Comando | Resultado |
|---------|-----------|
| `pnpm --filter @cvg-his-v2/api run typecheck` | ✅ PASS |
| `pnpm --filter @cvg-his-v2/api run build` | ✅ PASS (todos os 32 arquivos compilados) |
| `pnpm --filter @cvg-his-v2/module-scheduling run test` | ✅ 29/29 PASS |
| `node --test apps/api/dist/server.test.js` | ❌ ERRO — `ERR_MODULE_NOT_FOUND` em `packages/tenant-context/src/context.js` (módulo sem dist compilado) |
| `pnpm --filter @cvg-his-v2/api run test` | ❌ 8/10 PASS, 2 FAIL — health.test.js passa, runtime.test.js e server.test.js falham por falta de dist em módulos externos |
| `node scripts/validate-openapi.js` | ✅ 108 paths, 24 tags, 74 schemas |

---

## Validações

### Build e Typecheck
- **API typecheck:** PASS
- **API build:** PASS — 32 arquivos compilados corretamente para `dist/`

### Testes Scheduling
- **Scheduling module:** 29/29 PASS (via vitest — bundling mascara o problema de modules)

### Testes API
- **Status:** 8/10 PASS nos testes existentes (health 8/8). Bloqueio: runtime.test.js e server.test.js dependem de módulos externos sem `dist/` compilado — erro de ambiente, não de código.

### OpenAPI
- **OpenAPI:** ✅ 108 paths, 74 schemas, all structural checks PASS

### Análise do erro de ambiente
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module
  '/home/ricardo/.openclaw/workspace/cvg-his-v2/packages/tenant-context/src/context.js'
  imported from .../packages/tenant-context/src/index.ts
```
Causa: `@cvg-his-v2/tenant-context` tem `"main": "src/index.ts"` (sem `type: "module"` com declaração explícita) e `NodeNext` resolution tenta resolver como `.js`. Módulos com `workspace:*` dependências são montados como "virtual" — não são linkados fisicamente. Apenas módulos com script `build` geram `dist/`. Solução temporária: executar via `vitest` ou corrigir `include` do workspace.

---

## O que ficou coberto agora

| Cenário | Status |
|---------|--------|
| CONFIRMAR → `checkIn()` → `checked_in` | ✅ Implementado — teste 1 |
| CANCELAR → `cancelAppointment()` → `cancelled` | ✅ Implementado — teste 2 |
| REMARCAR sem alteração de status | ✅ Implementado — teste 3 |
| Payload malformado (sem AppointmentId) | ✅ Implementado — teste 4 |
| Appointment inexistente (fail-safe) | ✅ Implementado — teste 5 |
| Alias `CONFIRM` | ✅ Implementado — teste 6 |

---

## O que ainda depende de ambiente/vendor

| Item | Status |
|------|--------|
| Execução dos testes via `node --test` | ❌ Bloqueado — falta `dist/` em `tenant-context`, `lgpd`, outros módulos |
| Execução via vitest | ✅ Funciona para módulos isolados |
| Credenciais Twilio sandbox | ❌ Depende de vendor externo |
| WABA approval | ❌ Depende de processo Meta |
| HMAC validation | ❌ Onda 3.5 |
| Docker para persistência | ❌ Não disponível |

---

## Próxima tarefa recomendada

### Prioridade 1 — Resolver ambiente de testes local
O workspace não executa `node --test` diretamente devido a módulos sem `dist/` compilado. Avaliar:
- Configurar `vitest` para executar os testes de API junto com os módulos
- Ou adicionar script `build:all` que compila todos os módulos necessários antes dos testes
- Alternativa: adaptar os 2 testes falhados (runtime + server) para usar `vitest` com mocking

### Prioridade 2 — Homologar loop CONFIRMAR em staging real
Com os testes prontos, a próxima etapa é testar o fluxo real:
```bash
# Criar appointment
POST /appointments { patientId, ownerId, scheduledAt, visitType, reason }

# Simular inbound
POST /webhooks/whatsapp/inbound {
  "Body": "CONFIRMAR",
  "From": "whatsapp:+5511999998888",
  "AppointmentId": "<id>"
}
# Esperado: "CONFIRMADO", appointment status = "checked_in"
```

### Prioridade 3 — Executar suite de testes via vitest
Configurar um `vitest.config.ts` na API que permita executar todos os testes (incluindo server.test.ts) via vitest com environment configurado.

---

## Caminhos de documentação atualizados

- Testes: `apps/api/src/server.test.ts` (248 linhas adicionadas, 655 total)
- Relatório: `docs/Enterprise/RELATORIO-PARCIAL-CLAUDE-CODE-2026-04-08-1611.md`
