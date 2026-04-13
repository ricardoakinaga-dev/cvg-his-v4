# LGPD — Guia Operacional Minimo

## Objetivo

Documentar o fluxo LGPD minimo operacional atualmente entregue no CVG-HIS-V2, incluindo escopo, endpoints, limitações e próximos passos.

**Data desta versao:** 2026-04-07
**Executor:** 4 — Trincheira de Fundacao Enterprise
**Status:** Minimo operacional entregue

---

## 1. O que esta entregue

### 1.1 Tabelas

| Tabela                  | Migracao                         | RLS                                                          | Enums                                                 |
| ----------------------- | -------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------- |
| `consent_records`       | `0005_lgpd_consent_pipeline.sql` | Habilitado (policy `consent_records_tenant_isolation`)       | `consent_purpose`, `consent_status`, `consent_origin` |
| `data_subject_requests` | `0005_lgpd_consent_pipeline.sql` | Habilitado (policy `data_subject_requests_tenant_isolation`) | `dsr_type`, `dsr_status`                              |

### 1.2 Finalidades de consentimento

```
marketing, analytics, clinical, financial, operational, notifications
```

### 1.3 Tipos de sujeito

```
owner, patient, user
```

### 1.4 Tipos de DSR

```
data_export, data_deletion, data_anonymization,
data_rectification, data_access, data_portability, consent_revocation
```

---

## 2. Endpoints da API LGPD

Todos os endpoints exigem:

- Header `Authorization: Bearer <token>`
- Permissão relevante (ver coluna de permissao)
- Tenant isolado via RLS + `accountId` do token

### 2.1 Consentimento

#### POST /lgpd/consent — Conceder consentimento

| Campo         | Tipo                   | Obrigatorio | Descricao              |
| ------------- | ---------------------- | ----------- | ---------------------- |
| `subjectId`   | UUID                   | Sim         | ID do titular          |
| `subjectType` | `owner\|patient\|user` | Sim         | Tipo do titular        |
| `purpose`     | string                 | Sim         | Finalidade (ver 1.2)   |
| `origin`      | string                 | Nao         | Origem (`api` default) |
| `expiresAt`   | ISO8601                | Nao         | Expiracao opcional     |
| `metadata`    | object                 | Nao         | Contexto adicional     |

**Permissao:** `lgpd.consent.manage`
**Auditoria:** `lgpd.consent_granted` (high)
**Idempotencia:** Se ja existe consentimento ativo para mesma finalidade, retorna o registro existente (sem criar duplicado).

**Resposta 201:**

```json
{
  "id": "uuid",
  "accountId": "uuid",
  "subjectId": "uuid",
  "subjectType": "owner",
  "purpose": "marketing",
  "status": "granted",
  "origin": "web_portal",
  "grantedBy": "uuid",
  "grantedAt": "2026-04-07T10:00:00.000Z",
  "metadata": { "ipAddress": "127.0.0.1" }
}
```

#### POST /lgpd/consent/revoke — Revogar consentimento

| Campo         | Tipo                   | Obrigatorio | Descricao            |
| ------------- | ---------------------- | ----------- | -------------------- |
| `subjectId`   | UUID                   | Sim         | ID do titular        |
| `subjectType` | `owner\|patient\|user` | Sim         | Tipo do titular      |
| `purpose`     | string                 | Sim         | Finalidade a revogar |

**Permissao:** `lgpd.consent.manage`
**Auditoria:** `lgpd.consent_revoked` (high)
**Idempotencia:** Se ja esta revogado, retorna o registro existente.

#### GET /lgpd/consent — Listar consentimentos

| Parametro     | Tipo                   | Obrigatorio | Descricao                              |
| ------------- | ---------------------- | ----------- | -------------------------------------- |
| `subjectId`   | UUID                   | Sim         | ID do titular                          |
| `subjectType` | `owner\|patient\|user` | Sim         | Tipo do titular                        |
| `activeOnly`  | boolean                | Nao         | Se `true`, retorna apenas os `granted` |

**Permissao:** `lgpd.consent.read`

**Resposta 200:**

```json
{ "consents": [...] }
```

#### GET /lgpd/consent/status — Status por finalidade

Retorna um mapa `purpose -> boolean` indicando se cada finalidade esta ativa.

| Parametro     | Tipo                   | Obrigatorio | Descricao       |
| ------------- | ---------------------- | ----------- | --------------- |
| `subjectId`   | UUID                   | Sim         | ID do titular   |
| `subjectType` | `owner\|patient\|user` | Sim         | Tipo do titular |

**Permissao:** `lgpd.consent.read`

**Resposta 200:**

```json
{
  "subjectId": "uuid",
  "subjectType": "owner",
  "active": {
    "marketing": true,
    "analytics": false,
    "clinical": true,
    "financial": true,
    "operational": true,
    "notifications": false
  }
}
```

### 2.2 DSR (Data Subject Requests)

#### POST /lgpd/requests — Criar solicitacao do titular

| Campo         | Tipo                   | Obrigatorio | Descricao       |
| ------------- | ---------------------- | ----------- | --------------- |
| `subjectId`   | UUID                   | Sim         | ID do titular   |
| `subjectType` | `owner\|patient\|user` | Sim         | Tipo do titular |
| `requestType` | string                 | Sim         | Tipo (ver 1.4)  |
| `notes`       | string                 | Nao         | Observacoes     |

**Permissao:** `lgpd.requests.manage`
**Auditoria:** `lgpd.dsr_created` (high)
**Status inicial:** `pending`

#### GET /lgpd/requests — Listar solicitacoes

| Parametro                   | Tipo          | Obrigatorio | Descricao           |
| --------------------------- | ------------- | ----------- | ------------------- |
| `subjectId` + `subjectType` | UUID + string | Sim\*       | Filtrar por titular |
| `status`                    | string        | Sim\*       | Filtrar por status  |

\*Ao menos um conjunto de filtros deve ser fornecido.

**Permissao:** `lgpd.requests.read`

#### POST /lgpd/requests/complete — Concluir solicitacao

| Campo        | Tipo   | Obrigatorio | Descricao                  |
| ------------ | ------ | ----------- | -------------------------- |
| `requestId`  | UUID   | Sim         | ID da solicitacao          |
| `resultJson` | object | Nao         | Resultado do processamento |

**Permissao:** `lgpd.requests.manage`
**Auditoria:** `lgpd.dsr_completed` (high)
**Altera status para:** `completed`

#### POST /lgpd/requests/reject — Rejeitar solicitacao

| Campo       | Tipo   | Obrigatorio | Descricao          |
| ----------- | ------ | ----------- | ------------------ |
| `requestId` | UUID   | Sim         | ID da solicitacao  |
| `reason`    | string | Sim         | Motivo da rejeicao |

**Permissao:** `lgpd.requests.manage`
**Auditoria:** `lgpd.dsr_rejected` (high)
**Altera status para:** `rejected`

### 2.3 Export de dados pessoais

#### POST /lgpd/export — Exportar dados pessoais

| Campo         | Tipo                   | Obrigatorio | Descricao       |
| ------------- | ---------------------- | ----------- | --------------- |
| `subjectId`   | UUID                   | Sim         | ID do titular   |
| `subjectType` | `owner\|patient\|user` | Sim         | Tipo do titular |

**Permissao:** `lgpd.requests.manage`

**Nota de seguranca:** Providers sao pre-configurados no bootstrap e nao podem ser injetados pela requisicao. Apenas providers da allowlist (`owners`, `patients`, `owner_patient_links`) sao executados.

**Resposta 200:**

```json
{
  "subjectId": "uuid",
  "subjectType": "owner",
  "exportedAt": "2026-04-07T10:00:00.000Z",
  "providersUsed": ["owners", "patients"],
  "data": {
    "owners": {
      "id": "uuid",
      "accountId": "uuid",
      "fullName": "Maria Silva",
      "documentId": "123.456.789-00",
      "contacts": [
        { "label": "Telefone", "value": "+55 11 99999-1111", "type": "whatsapp", "primary": true }
      ],
      "financialResponsible": true,
      "status": "active",
      "createdAt": "2026-03-25T00:00:00.000Z",
      "updatedAt": "2026-03-25T00:00:00.000Z"
    },
    "patients": {
      "id": "patient_luna",
      "accountId": "acc_cvg_demo",
      "name": "Luna",
      "species": "canine",
      "breed": "SRD",
      "sex": "female",
      "primaryOwnerId": "owner_maria",
      "status": "active",
      "createdAt": "2026-03-25T00:00:00.000Z",
      "updatedAt": "2026-03-25T00:00:00.000Z"
    },
    "owner_patient_links": [
      {
        "id": "link_001",
        "ownerId": "owner_maria",
        "patientId": "patient_luna",
        "relationshipType": "primary",
        "financialResponsible": true,
        "createdAt": "2026-03-25T00:00:00.000Z"
      }
    ]
  }
}
```

**Providers disponiveis na allowlist:**

| Provider              | Descricao                               | Sujeito   |
| --------------------- | --------------------------------------- | --------- |
| `owners`              | Dados basicos do proprietario (tutor)   | `owner`   |
| `patients`            | Dados basicos do paciente (animal)      | `patient` |
| `owner_patient_links` | Viculos entre proprietarios e pacientes | qualquer  |

**Nota:** `administrativeNotes` sao omitidos do export por serem internos e nao relevantes ao titular.

---

## 3. Fluxos operativos

### 3.1 Concessao de consentimento

```
1. Operador abre interface de consentimento
2. Sistema chama POST /lgpd/consent com subjectId, subjectType, purpose
3. Registro criado com status "granted" e grantedAt = now
4. Auditoria: lgpd.consent_granted
5. Resposta: registro completo
```

### 3.2 Revogacao de consentimento

```
1. Titular solicita revogacao
2. Sistema chama POST /lgpd/consent/revoke
3. status = "revoked", revokedAt = now, revokedBy = operador
4. Auditoria: lgpd.consent_revoked
5. Resposta: registro atualizado
```

### 3.3 Ciclo de vida de um DSR

```
1. Titular ou representante cria DSR
   POST /lgpd/requests
   -> status: "pending"
   Auditoria: lgpd.dsr_created

2. Operador interno analisa a solicitacao

3a. Se aprovada:
    POST /lgpd/requests/complete
    -> status: "completed", completedAt, resultJson
    Auditoria: lgpd.dsr_completed

3b. Se rejeitada:
    POST /lgpd/requests/reject + reason
    -> status: "rejected", rejectionReason
    Auditoria: lgpd.dsr_rejected
```

**Nota:** `start` e `cancel` ainda sao backlog — nao estao implementados no servico.

---

## 4. O que o export de dados pessoais inclui agora

### 4.1 Providers concretos disponiveis (allowlist)

| Provider              | O que exporta                                                  | Limitacao                                                   |
| --------------------- | -------------------------------------------------------------- | ----------------------------------------------------------- |
| `owners`              | Nome, documento, contatos, status, responsabilidade financeira | Notas administrativas omitidas por serem internas           |
| `patients`            | Nome, especie, raca, sexo, porte, tutor principal, status      | Dados clinicos omitidos (precisam consentimento especifico) |
| `owner_patient_links` | Todos os vinculos owner-patient para o sujeto                  | Apenas vinculos ativos                                      |

### 4.2 Nao inclui ainda (proximo passo)

- Dados financeiros detalhados por titular
- Registros clinicos (precisa consentimento especifico por tipo de dado)
- Anexos e imagens
- Dados de agendamento
- Logs de auditoria relacionados ao titular
- Dados de internacao

### 4.3 Formato do export

O export retorna um objeto JSON com a estrutura:

```json
{
  "subjectId": "uuid",
  "subjectType": "owner|patient|user",
  "exportedAt": "ISO8601",
  "providersUsed": ["owners", "patients", "owner_patient_links"],
  "data": {
    "owners": { ...dados do proprietario... },
    "patients": { ...dados do paciente... },
    "owner_patient_links": [ ...vinculos... ]
  }
}
```

- `providersUsed` indica quais providers foram executados com sucesso
- Providers fora da allowlist sao ignorados silenciosamente
- Providers que falham retornam `{ error: "Failed to collect data from this source" }` em seu lugar

### 4.4 Seguranca do export

**Resolvido:** Providers sao pre-configurados no bootstrap via `LgpdServiceOptions.dataProviders`. O endpoint `/lgpd/export` NAO aceita `dataProviders` do corpo da requisicao. Apenas providers da allowlist (`owners`, `patients`, `owner_patient_links`) sao executados.

---

## 5. Isolamento e seguranca

### 5.1 RLS (Row-Level Security)

Ambas as tabelas LGPD tem RLS habilitado com policy de isolamento por `account_id`. Isso significa que:

- Uma conta NAO consegue ver dados de outra conta no banco
- Queries sem contexto de conta retornam zero registros
- Tentativas de INSERT/UPDATE cross-account falham no nivel do banco

### 5.2 Permissoes

| Acao                           | Permissao necessaria   |
| ------------------------------ | ---------------------- |
| Conceder/revogar consentimento | `lgpd.consent.manage`  |
| Consultar consentimentos       | `lgpd.consent.read`    |
| Criar DSR                      | `lgpd.requests.manage` |
| Consultar DSRs                 | `lgpd.requests.read`   |
| Completar/rejeitar DSR         | `lgpd.requests.manage` |
| Exportar dados                 | `lgpd.requests.manage` |

### 5.3 Auditoria

Todas as operacoes sensiveis geram entradas de auditoria:

| Evento                 | Risco | Conteudo            |
| ---------------------- | ----- | ------------------- |
| `lgpd.consent_granted` | High  | subjectId, purpose  |
| `lgpd.consent_revoked` | High  | subjectId, purpose  |
| `lgpd.dsr_created`     | High  | DSR ID, tipo        |
| `lgpd.dsr_completed`   | High  | DSR ID, tipo        |
| `lgpd.dsr_rejected`    | High  | DSR ID, tipo, razao |

---

## 6. Lacunas registradas (proximo passo)

| #   | Lacuna                                           | Prioridade | Motivo           |
| --- | ------------------------------------------------ | ---------- | ---------------- |
| 1   | ~~Allowlist de dataProviders no export~~         | ~~Alta~~   | **ENTREGUE**     |
| 2   | ~~Integracao de providers concretos no export~~  | ~~Media~~  | **ENTREGUE**     |
| 3   | Metodos start/cancel DSR                         | Media      | Backlog          |
| 4   | Portal basico do titular (autoatendimento)       | Media      | Usabilidade      |
| 5   | Consentimento para dados clinicos especificos    | Media      | Regulacao        |
| 6   | Retention policies por tipo de dado              | Baixa      | Operaaposteriori |
| 7   | Automacao de DSRs (fila, notificacao ao titular) | Baixa      | Escala           |

---

## 7. Arquivos relevantes

| Arquivo                                                 | Papel                        |
| ------------------------------------------------------- | ---------------------------- |
| `packages/modules/lgpd/src/service.ts`                  | Logica de dominio            |
| `packages/modules/lgpd/src/repositories/*.ts`           | Persistencia                 |
| `packages/db/src/schema/consent_records.ts`             | Schema consent               |
| `packages/db/src/schema/data_subject_requests.ts`       | Schema DSR                   |
| `packages/db/migrations/0005_lgpd_consent_pipeline.sql` | DDL das tabelas              |
| `packages/db/migrations/0006_rls_lgpd_tables.sql`       | RLS policies                 |
| `apps/api/src/server.ts` (linhas 510-860)               | Rotas da API                 |
| `tests/unit/lgpd/lgpd-service.test.ts`                  | Testes unitarios (33 testes) |
| `tests/integration/rls/rls-lgpd.test.ts`                | Testes de isolamento RLS     |

---

## 8. Testes

### Unitarios

```
pnpm vitest run tests/unit/lgpd/lgpd-service.test.ts
```

**Resultado:** 33 testes passando (cobertura: grant, revoke, query, DSR lifecycle, export)

### Integracao RLS

```
pnpm vitest run tests/integration/rls/rls-lgpd.test.ts
```

**Requisito:** PostgreSQL local com RLS habilitado. Falha com `ECONNREFUSED` se o banco nao estiver disponivel.
