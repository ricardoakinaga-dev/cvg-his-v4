# API Premium: OpenAPI 3.0 Baseline

## Overview

Baseline OpenAPI 3.0.3 specification for the CVG HIS API. A especificação cobre 104 paths e 70 schemas, documentando todas as rotas funcionais do runtime.

## What Was Delivered

### OpenAPI Specification

**File:** `apps/api/src/openapi.yaml` (4398 lines, 107 paths, 74 schemas, 24 tags)

Covers all functional endpoints across 24 tags:
Health, Authentication, MFA, LGPD, Owners, Patients, Encounters, Appointments, Queue, Medical Records, Inpatient, Triage, Billing, Inventory, Notifications, **Webhooks**, Access Control, Audit, Staff, Products, Quotes, Prescriptions, Discharges, Utilities

### Endpoint de Spec

A spec é servida em dois formatos pelo runtime:

- `GET /openapi.json` — JSON formatado
- `GET /openapi.yaml` — YAML raw

### CI Validation

O pipeline CI valida a spec a cada PR (`.github/workflows/ci.yml`):

- Job: `validate-openapi`
- Runs: on every PR, after `typecheck`
- Script: `node scripts/validate-openapi.js apps/api/src/openapi.yaml`
- Checks: YAML parsing, `openapi: 3.x`, `info.title`, `info.version`, `paths` non-empty
- Outcome: blocks merge se a spec estiver inválida

Validação local:

```bash
node scripts/validate-openapi.js apps/api/src/openapi.yaml
```

## Cobertura de Rotas

| Área            | Paths | Status   |
| --------------- | ----- | -------- |
| Health          | 6     | completo |
| Authentication  | 6     | completo |
| MFA             | 5     | completo |
| LGPD            | 9     | completo |
| Owners          | 4     | completo |
| Patients        | 3     | completo |
| Encounters      | 5     | completo |
| Appointments    | 3     | completo |
| Queue           | 5     | completo |
| Medical Records | 5     | completo |
| Inpatient       | 6     | completo |
| Triage          | 3     | completo |
| Billing         | 5     | completo |
| Inventory       | 3     | completo |
| Notifications   | 4     | completo |
| Webhooks        | 4     | completo |
| Access Control  | 10    | completo |
| Audit           | 1     | completo |
| Staff           | 4     | completo |
| Products        | 3     | completo |
| Services        | 2     | completo |
| Quotes          | 7     | completo |
| Prescriptions   | 4     | completo |
| Discharges      | 3     | completo |
| Utilities       | 1     | completo |

## Lacunas已知 (Fora do Escopo)

- **Swagger UI** — portal interativo (precisa de decisão de infraestrutura)
- **Validação de requests** — middleware OpenAPI em runtime
- **Codegen** — geração de SDKs a partir da spec
- **Cobertura de erros detalhada** — alguns endpoints têm resposta de erro genérica sem schema
- **Paginação completa** — só owners/patients têm paginação documentada

## Not Delivered (Out of Scope)

- OpenAPI validation middleware (request/response against spec at runtime)
- Client SDK generation from spec
- Postman / Insomnia collections
- Interactive Swagger UI
- Spec versioning strategy

## Runtime vs Spec — Alinhamento

Audit confirmed: todas as rotas funcionais em `server.ts` estão documentadas na spec. Rotas verificadas:

- Health endpoints (incluindo aliases `/health/ready`, `/health/live`)
- Auth (login, refresh, logout, session, MFA)
- LGPD completo (consent, revoke, status, requests, complete, reject, export)
- Todos os módulos de domínio (owners, patients, encounters, appointments, queue, etc.)
- Access control (teams, org-sectors, users, grants)
- Staff, Products, Services, Quotes, Prescriptions, Discharges
- master-search, owner-patient-links
- Webhooks (CRUD: list, register, get, update, delete + delivery history)

### Webhooks — Onda 3.2

Webhook dispatch ativo no evento:

| Evento                   | Trigger                         |
| ------------------------ | ------------------------------- |
| `billing.record.created` | Novo registro de billing criado |

> **Nota:** Este é o evento atualmente dispatchado pelo `BillingService`. O módulo `WebhooksService` está operacional com retry 3x (5s, 30s, 90s) e delivery log em `webhook_deliveries`. Novos eventos serão adicionados conforme demanda real.

Webhooks são registrados via API (`POST /webhooks`) e delivery é feito com retry exponencial. Delivery log mantido em `webhook_deliveries`.

Rotas: `GET /webhooks`, `POST /webhooks`, `GET /webhooks/{id}`, `PATCH /webhooks/{id}`, `DELETE /webhooks/{id}`, `GET /webhooks/{id}/deliveries`

## Validação

```bash
node -e "const yaml=require('yaml'); const fs=require('fs'); yaml.parse(fs.readFileSync('apps/api/src/openapi.yaml','utf8')); console.log('OK')"
# YAML válido
```
