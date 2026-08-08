# API Contract Documentation (OpenAPI-lite)

Este documento descreve o contrato de integração entre `his-web` e `his-api`, consolidado no arquivo `apps/his-web/src/contracts/openapi-lite.ts`.

## 1. Visão Geral

A API segue padrões RESTful e autenticação JWT validada no servidor.

- **Base URL**: `/api` (Proxied via Next.js)
- **Formato**: JSON (snake_case no wire, mas camelCase no TS/Zod)
- **Timezones**: UTC (ISO-8601)

## 2. Autenticação & Segurança

O modelo é **JWT Bearer validado no `his-api`**.

### Headers Obrigatórios
| Header | Descrição | Exemplo |
|---|---|---|
| `Authorization` | Bearer JWT assinado | `Bearer eyJ...` |
| `x-request-id` | UUID para rastreamento (Correlation ID) | `a1b2c3d4...` |

### Claims obrigatórias do token
| Claim | Regra |
|---|---|
| `exp` | Deve existir e estar no futuro |
| `iss` | Deve bater com `JWT_ISSUER` |
| `aud` | Deve conter `JWT_AUDIENCE` |
| `accountId`/`account_id` | Define tenant no backend |
| `userId`/`user_id`/`sub` | Identidade do usuário |
| `roles`/`role` e/ou `permissions` | RBAC efetivo do ator |

## 3. Estrutura de Endpoints (Resumo)

### Pacientes (`/patients`)
- `GET /patients?q={name}`: Busca textual. Retorna `{ data: [], total: number }`.
- `POST /patients`: Cria paciente. Requer `ownerId`.
- `GET /patients/:id`: Detalhes completos + alertas.

### Internação (`/inpatient`)
- `GET /bedmap/map`: Retorna a árvore hierárquica `Wards -> Beds -> Stay`.
- `POST /inpatient/admit`: Internar paciente (cria `Stay`).
- `POST /inpatient/stays/:id/discharge`: Alta médica.
- `POST /inpatient/stays/:id/transfer`: Transferência de leito.

### Prontuário (`/encounters`, `/notes`)
- `POST /encounters/:id/notes`: Cria nota SOAP (Rascunho).
- `POST /notes/:id/sign`: Assina a nota.
  - **Evento**: Retorna objeto `event: { name: 'ClinicalNoteSigned' }`. O front deve usar isso para feedback visual.

### Medicamentos (`/medications`)
- `POST /medications/orders`: Cria prescrição. Suporta agendamento `interval` (a cada X horas) ou `fixed_times` (horários fixos).

### Plantão (`/handovers`)
- `POST /handovers/draft`: Salva rascunho de passagem de plantão.
- `POST /handovers/:id/publish`: **Async Action**.
  - Retorna `202 Accepted` e `{ jobId: "..." }`.
  - O front deve fazer polling no endpoint de leitura para confirmar a publicação.

## 4. Tratamento de Erros

A API retorna o padrão RFC 7807 (Problem Details) ou similar:

```json
{
  "statusCode": 400,
  "code": "VALIDATION_ERROR",
  "message": "Validation failed",
  "issues": [
    { "path": ["email"], "message": "Invalid email format" }
  ]
}
```

**Mapeamento de Status:**
- `400`: Erro de validação (Zod).
- `401`: Headers de auth ausentes.
- `403`: Falta de permissão RBAC (ex: `requirePermission('note.sign')`).
- `422`: Regra de negócio violada (ex: Paciente já internado).
- `500`: Erro interno (Verifique `x-request-id`).

## 5. Gaps e Riscos Identificados

1.  **Validação de Auth**: A API rejeita token ausente, inválido, expirado ou com `iss`/`aud` incorretos.
2.  **Schema Duplication**: O Front-end define seus próprios schemas Zod em `openapi-lite.ts` pois não tem acesso fácil ao `@cvg-his/domain`. **Recomendação**: Adicionar `@cvg-his/domain` ao `package.json` do `his-web` e refatorar para importar tipos.
3.  **Paginação**: Nem todos os endpoints de listagem (`alerts`, `meds`) possuem paginação clara/documentada. Risco de performance em contas grandes.
4.  **Async Jobs**: Falta endpoint genérico `GET /jobs/:id` para acompanhar status de tarefas longas (ex: Publicar Handover).

## 6. Próximos Passos recomendados

1.  Implementar middleware no Front que valida automaticamente `request/response` contra o `openapi-lite.ts`.
2.  Criar `ApiClient` fortemente tipado usando `ApiContract`.
