# LGPD — Análise de Baseline e Plano de Consolidação

**Data:** 2026-04-07
**Versão:** 2.0
**Executor:** 4 — Trincheira de Fundação Enterprise
**Status:** Análise completa — Lacunas identificadas

---

## 1. Resumo Executivo

O módulo LGPD do CVG-HIS-V2 está **parcialmente implementado**. A infraestrutura existe (tabelas, RLS, service, API, testes) mas há lacunas de segurança, completeness do export, e transições de estado do DSR que impedem operação mínima confiável.

**O que funciona:** Consent flow básico e DSR básico com 30 testes passando.

**O que precisa ser corrigido:** Allowlist de dataProviders no export, métodos de transição de estado DSR, e validação de input.

---

## 2. Inventário do que Existe

### 2.1 Infraestrutura de Dados

| Item                           | Status   | Evidência                                                                                                  |
| ------------------------------ | -------- | ---------------------------------------------------------------------------------------------------------- |
| Tabela `consent_records`       | ✅ Feito | `0005_lgpd_consent_pipeline.sql`                                                                           |
| Tabela `data_subject_requests` | ✅ Feito | `0005_lgpd_consent_pipeline.sql`                                                                           |
| Enums de consentimento         | ✅ Feito | `consent_purpose`, `consent_status`, `consent_origin`                                                      |
| Enums de DSR                   | ✅ Feito | `dsr_type`, `dsr_status`                                                                                   |
| Índices de performance         | ✅ Feito | 3 índices em `consent_records`, 3 em `data_subject_requests`                                               |
| RLS Policies                   | ✅ Feito | `consent_records_tenant_isolation`, `data_subject_requests_tenant_isolation` em `0006_rls_lgpd_tables.sql` |

### 2.2 Camada de Serviço

| Método                      | Status     | Notas                                      |
| --------------------------- | ---------- | ------------------------------------------ |
| `grantConsent()`            | ✅ Feito   | Valida propósito e subject type            |
| `revokeConsent()`           | ✅ Feito   | Idempotente                                |
| `getConsents()`             | ✅ Feito   | Retorna todos                              |
| `getActiveCons()`           | ✅ Feito   | Filtra por status granted                  |
| `isConsentActive()`         | ✅ Feito   | Útil para guards                           |
| `createDsrRequest()`        | ✅ Feito   | Status inicial pending                     |
| `getDsrRequest()`           | ✅ Feito   | Lookup por ID                              |
| `getDsrRequestsBySubject()` | ✅ Feito   | Filtro por sujeito                         |
| `getDsrRequestsByStatus()`  | ✅ Feito   | Filtro por status                          |
| `completeDsrRequest()`      | ✅ Feito   | Altera para completed                      |
| `rejectDsrRequest()`        | ✅ Feito   | Altera para rejected com reason            |
| `buildPersonalDataExport()` | ⚠️ Parcial | Aceita providers mas não tem allowlist     |
| `cancelDsrRequest()`        | ❌ Falta   | Status `cancelled` existe mas método não   |
| `startDsrRequest()`         | ❌ Falta   | Status `in_progress` existe mas método não |
| `expireConsent()`           | ❌ Falta   | Status `expired` existe mas método não     |

### 2.3 API Endpoints

| Endpoint                       | Status     | Permissão                  |
| ------------------------------ | ---------- | -------------------------- |
| `POST /lgpd/consent`           | ✅ Feito   | `lgpd.consent.manage`      |
| `POST /lgpd/consent/revoke`    | ✅ Feito   | `lgpd.consent.manage`      |
| `GET /lgpd/consent`            | ✅ Feito   | `lgpd.consent.read`        |
| `GET /lgpd/consent/status`     | ✅ Feito   | `lgpd.consent.read`        |
| `POST /lgpd/requests`          | ✅ Feito   | `lgpd.requests.manage`     |
| `GET /lgpd/requests`           | ✅ Feito   | `lgpd.requests.read`       |
| `POST /lgpd/requests/complete` | ✅ Feito   | `lgpd.requests.manage`     |
| `POST /lgpd/requests/reject`   | ✅ Feito   | `lgpd.requests.manage`     |
| `POST /lgpd/export`            | ⚠️ Parcial | Sem allowlist de providers |

### 2.4 Testes

| Suite                  | Status           | Cobertura                |
| ---------------------- | ---------------- | ------------------------ |
| Unit tests (30 testes) | ✅ Passando      | Consent, DSR, Export     |
| RLS integration tests  | ⚠️ DB necessário | Isolamento cross-account |

---

## 3. Lacunas Críticas Identificadas

### LACUNA-01: Allowlist de dataProviders no Export (CRÍTICA - Segurança)

**Severidade:** Alta
**Arquivo:** `apps/api/src/server.ts:1151-1155`

**Problema:** O endpoint `/lgpd/export` aceita `dataProviders` do corpo da requisição e os executa diretamente como funções:

```typescript
// LINHA 1151-1155 (server.ts)
const exportData = await lgpdSvc.buildPersonalDataExport(
  principal.user.accountId,
  payload.subjectId,
  payload.subjectType,
  (payload.dataProviders as never) ?? {} // ← Aceita qualquer função!
);
```

Um usuário mal-intencionado poderia enviar:

```json
{
  "subjectId": "...",
  "subjectType": "owner",
  "dataProviders": {
    "malicious": "(subjectId) => eval('malicious code')"
  }
}
```

**Impacto:** Execução de código arbitrário no servidor.

**Correção necessária:** Remover a passagem de `dataProviders` do corpo da requisição. O export deve usar providers pré-cadastrados (owners, patients) que são adicionados pelo próprio código da API.

---

### LACUNA-02: Transição de Estado DSR Incompleta (Alta)

**Severidade:** Alta
**Arquivo:** `packages/modules/lgpd/src/service.ts`

**Problema:** Os statuses de DSR incluem `in_progress` e `cancelled`, mas não existem métodos no `LgpdService` para fazer essas transições:

- `startDsrRequest()` — transição de `pending` → `in_progress`
- `cancelDsrRequest()` — transição de `pending` → `cancelled`

**Impacto:** Não é possível representar todo o ciclo de vida de um DSR.

**Correção necessária:** Adicionar métodos `startDsrRequest()` e `cancelDsrRequest()` ao `LgpdService`.

---

### LACUNA-03: Método de Expiração de Consentimento (Média)

**Severidade:** Média
**Arquivo:** `packages/modules/lgpd/src/service.ts`

**Problema:** O status `expired` existe no enum mas não há método para expirar consents automaticamente ou via chamada.

**Impacto:** Consents com `expiresAt` setado nunca são automaticamente marcados como expirados.

**Correção necessária:** Adicionar método `expireConsent()` e/ou lógica de verificação de expiração em `isConsentActive()`.

---

## 4. Lacunas Registradas no Documento Existente (120-LGPD-OPERACIONAL)

O documento `120-LGPD-OPERACIONAL.md` já registrava 7 lacunas. Aqui está a análise atualizada:

| #   | Lacuna                                        | Status                   | Ação Necessária                                                 |
| --- | --------------------------------------------- | ------------------------ | --------------------------------------------------------------- |
| 1   | Allowlist de dataProviders no export          | **CRÍTICA — Confirmada** | Remover providers do body, usar allowlist interno               |
| 2   | Anonimização irreversível                     | Fora de escopo           | Postergar para fase de compliance avançada                      |
| 3   | Portal básico do titular                      | Fora de escopo           | Autoatendimento futuro                                          |
| 4   | Consentimento para dados clínicos específicos | Parcialmente em escopo   | Consentimento `clinical` existe, mas não há validação de escopo |
| 5   | Integração real de providers no export        | **CRÍTICA — Confirmada** | Wire up providers reais (owners, patients)                      |
| 6   | Retention policies                            | Fora de escopo           | Política de retenção por tipo de dado                           |
| 7   | Automação de DSRs                             | Parcialmente em escopo   | Métodos de transição existem parcialmente                       |

---

## 5. Correções a Serem Feitas

### 5.1 Correção LACUNA-01: Remover dataProviders do Body

**Arquivo:** `apps/api/src/server.ts`

O endpoint deve usar providers fixos definidos pela API:

```typescript
// ANTES (inseguro):
const exportData = await lgpdSvc.buildPersonalDataExport(
  principal.user.accountId,
  payload.subjectId,
  payload.subjectType,
  (payload.dataProviders as never) ?? {}
);

// DEPOIS (seguro):
// Providers fixos definidos pela API — nenhum vem do body
const dataProviders: Record<string, (id: string) => Promise<Record<string, unknown>>> = {
  consents: async (subjectId) => {
    const records = await lgpdSvc.getConsents(
      principal.user.accountId,
      subjectId,
      payload.subjectType
    );
    return { records };
  },
  dsrs: async (subjectId) => {
    const requests = await lgpdSvc.getDsrRequestsBySubject(
      principal.user.accountId,
      subjectId,
      payload.subjectType
    );
    return { requests };
  }
  // Providers reais de owners/patients devem ser adicionados aqui
};

const exportData = await lgpdSvc.buildPersonalDataExport(
  principal.user.accountId,
  payload.subjectId,
  payload.subjectType,
  dataProviders
);
```

### 5.2 Correção LACUNA-02: Adicionar Métodos de Transição DSR

**Arquivo:** `packages/modules/lgpd/src/service.ts`

```typescript
async startDsrRequest(requestId: string, startedBy: string): Promise<DataSubjectRequest> {
  if (!this.#dsrRepo) {
    throw new Error('DSR repository not configured');
  }

  const existing = await this.#dsrRepo.findById('', requestId);
  if (!existing) {
    throw new Error(`DSR request not found: ${requestId}`);
  }

  if (existing.status !== 'pending') {
    throw new Error(`DSR request is not in pending status: ${existing.status}`);
  }

  return this.#dsrRepo.updateStatus(requestId, 'in_progress', {
    completedBy: startedBy,
    completedAt: new Date().toISOString()
  });
}

async cancelDsrRequest(requestId: string, cancelledBy: string, reason?: string): Promise<DataSubjectRequest> {
  if (!this.#dsrRepo) {
    throw new Error('DSR repository not configured');
  }

  return this.#dsrRepo.updateStatus(requestId, 'cancelled', {
    completedBy: cancelledBy,
    completedAt: new Date().toISOString(),
    rejectionReason: reason
  });
}
```

### 5.3 Correção LACUNA-03: Validação de Expiração em isConsentActive

**Arquivo:** `packages/modules/lgpd/src/service.ts`

O método `isConsentActive()` deve verificar `expiresAt`:

```typescript
async isConsentActive(
  accountId: string,
  subjectId: string,
  subjectType: SubjectType,
  purpose: ConsentPurpose
): Promise<boolean> {
  if (!this.#consentRepo) {
    return false;
  }

  const record = await this.#consentRepo.findBySubjectAndPurpose(
    accountId,
    subjectId,
    subjectType,
    purpose
  );

  if (!record || record.status !== 'granted') {
    return false;
  }

  // Verificar expiração
  if (record.expiresAt && new Date(record.expiresAt) < new Date()) {
    return false;
  }

  return true;
}
```

---

## 6. Testes Existentes e o que Faltam

### 6.1 Testes Unitários (30 passing)

- LGPD-001: Grant Consent (5 testes)
- LGPD-002: Revoke Consent (3 testes)
- LGPD-003: Query Consents (3 testes)
- LGPD-004: Create DSR Requests (3 testes)
- LGPD-005: Query DSR Requests (3 testes)
- LGPD-006: Complete and Reject DSR Requests (2 testes)
- LGPD-007: Personal Data Export Builder (2 testes)
- LGPD-008: All Consent Purposes (6 testes)
- LGPD-009: All Subject Types (3 testes)

### 6.2 Testes Faltando

| Teste                                 | Prioridade | Descrição                                |
| ------------------------------------- | ---------- | ---------------------------------------- |
| DSR transition to in_progress         | Alta       | Testar `startDsrRequest()`               |
| DSR transition to cancelled           | Alta       | Testar `cancelDsrRequest()`              |
| Consent expiration check              | Alta       | Testar `isConsentActive()` com expiresAt |
| Consent expiry validation             | Média      | Testar validação de expiresAt no grant   |
| Export with no providers              | Média      | Testar export com providers vazios       |
| Export with real provider integration | Baixa      | Testar com providers wired up            |

---

## 7. Permissões e Auditoria

### 7.1 Permissões (já implementadas)

| Ação                     | Permissão              | Status |
| ------------------------ | ---------------------- | ------ |
| Conceder consentimento   | `lgpd.consent.manage`  | ✅     |
| Revogar consentimento    | `lgpd.consent.manage`  | ✅     |
| Consultar consentimentos | `lgpd.consent.read`    | ✅     |
| Criar DSR                | `lgpd.requests.manage` | ✅     |
| Consultar DSRs           | `lgpd.requests.read`   | ✅     |
| Completar/rejeitar DSR   | `lgpd.requests.manage` | ✅     |
| Exportar dados           | `lgpd.requests.manage` | ✅     |

### 7.2 Auditoria (já implementada)

| Evento                 | Risco | Status |
| ---------------------- | ----- | ------ |
| `lgpd.consent_granted` | High  | ✅     |
| `lgpd.consent_revoked` | High  | ✅     |
| `lgpd.dsr_created`     | High  | ✅     |
| `lgpd.dsr_completed`   | High  | ✅     |
| `lgpd.dsr_rejected`    | High  | ✅     |

---

## 8. Consistência de APIs e Contratos

### 8.1 Consent Record

| Campo         | Tipo    | Obrigatório | Notas                                                            |
| ------------- | ------- | ----------- | ---------------------------------------------------------------- |
| `id`          | UUID    | Sim         | Auto-gerado                                                      |
| `accountId`   | UUID    | Sim         | Do contexto do token                                             |
| `subjectId`   | UUID    | Sim         | ID do titular                                                    |
| `subjectType` | enum    | Sim         | owner/patient/user                                               |
| `purpose`     | enum    | Sim         | marketing/analytics/clinical/financial/operational/notifications |
| `status`      | enum    | Sim         | granted/revoked/expired                                          |
| `origin`      | enum    | Sim         | web_portal/api/mobile_app/in_person/phone/email/system_default   |
| `grantedBy`   | UUID    | Sim         | User ID que concedeu                                             |
| `grantedAt`   | ISO8601 | Sim         | Timestamp                                                        |
| `revokedBy`   | UUID    | Não         | User ID que revogou                                              |
| `revokedAt`   | ISO8601 | Não         | Timestamp                                                        |
| `expiresAt`   | ISO8601 | Não         | Opcional                                                         |
| `metadata`    | object  | Não         | Contexto adicional                                               |
| `createdAt`   | ISO8601 | Sim         | Auto-gerado                                                      |

### 8.2 Data Subject Request

| Campo             | Tipo    | Obrigatório | Notas                                            |
| ----------------- | ------- | ----------- | ------------------------------------------------ |
| `id`              | UUID    | Sim         | Auto-gerado                                      |
| `accountId`       | UUID    | Sim         | Do contexto do token                             |
| `subjectId`       | UUID    | Sim         | ID do titular                                    |
| `subjectType`     | enum    | Sim         | owner/patient/user                               |
| `requestType`     | enum    | Sim         | data_export/data_deletion/etc                    |
| `status`          | enum    | Sim         | pending/in_progress/completed/rejected/cancelled |
| `requestedBy`     | UUID    | Sim         | User ID que criou                                |
| `requestedAt`     | ISO8601 | Sim         | Auto-gerado                                      |
| `completedAt`     | ISO8601 | Não         | Quando completado/rejeitado                      |
| `completedBy`     | UUID    | Não         | User ID que completou                            |
| `notes`           | string  | Não         | Observações                                      |
| `rejectionReason` | string  | Não         | Motivo da rejeição                               |
| `resultJson`      | object  | Não         | Resultado do processamento                       |
| `createdAt`       | ISO8601 | Sim         | Auto-gerado                                      |
| `updatedAt`       | ISO8601 | Sim         | Auto-atualizado                                  |

---

## 9. O que o Export Inclui Agora vs O que Deveria

### 9.1 Agora (após correção necessária)

O export **deve** incluir:

1. **Consent Records** — Todos os registros de consentimento do sujeito
2. **DSR History** — Histórico de solicitações do sujeito
3. **Dados do titular via providers reais** — Owners, patients conforme subjectType

### 9.2 Nunca deve incluir

- Dados de outros titulares
- Dados de outras contas (RLS protege)
- Logs internos do sistema
- Dados financeiros detalhados sem consentimento específico

---

## 10. Arquivos Relevantes

| Arquivo                                                                  | Papel                                     |
| ------------------------------------------------------------------------ | ----------------------------------------- |
| `packages/modules/lgpd/src/service.ts`                                   | Lógica de domínio LGPD                    |
| `packages/modules/lgpd/src/repositories/consent-repository.interface.ts` | Interface do repositório de consentimento |
| `packages/modules/lgpd/src/repositories/database-consent.repository.ts`  | Implementação PostgreSQL                  |
| `packages/modules/lgpd/src/repositories/dsr-repository.interface.ts`     | Interface do repositório DSR              |
| `packages/modules/lgpd/src/repositories/database-dsr.repository.ts`      | Implementação PostgreSQL                  |
| `packages/db/src/schema/consent_records.ts`                              | Schema Drizzle                            |
| `packages/db/src/schema/data_subject_requests.ts`                        | Schema Drizzle                            |
| `packages/db/migrations/0005_lgpd_consent_pipeline.sql`                  | DDL das tabelas                           |
| `packages/db/migrations/0006_rls_lgpd_tables.sql`                        | RLS policies                              |
| `apps/api/src/server.ts:644-1160`                                        | Rotas da API                              |
| `tests/unit/lgpd/lgpd-service.test.ts`                                   | 30 testes unitários                       |
| `tests/integration/rls/rls-lgpd.test.ts`                                 | Testes de isolamento RLS                  |

---

## 11. Priorização das Correções

| Prioridade | Correção                                              | Esforço | Impacto     |
| ---------- | ----------------------------------------------------- | ------- | ----------- |
| **Alta**   | LACUNA-01: Remover dataProviders do body              | Baixo   | Segurança   |
| **Alta**   | LACUNA-02: Adicionar startDsrRequest/cancelDsrRequest | Baixo   | Completeza  |
| **Alta**   | LACUNA-03: Verificar expiresAt em isConsentActive     | Baixo   | Correctness |
| **Média**  | Adicionar testes para transições DSR                  | Médio   | Cobertura   |
| **Média**  | Wire up providers reais no export                     | Médio   | Utilidade   |

---

## 12. Recomendação

As correções LACUNA-01, 02 e 03 são de **baixo esforço e alto impacto**. Devem ser implementadas antes de qualquer operação real do módulo LGPD.

**Próximo passo recomendado:** Implementar as 3 correções críticas e adicionar testes unitários correspondentes em uma única PR.

---

_Documento de análise — Executor 4 — CVG-HIS-V2_
