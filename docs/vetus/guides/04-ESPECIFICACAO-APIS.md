# 🔌 ESPECIFICAÇÃO DE APIs — ERP ENTERPRISE

> **Baseado na análise do Vetus ERP**  
> **Data:** 02/04/2026  
> **Versão:** v1.0
>
> **Nota de governança:** esta especificação representa uma proposta exploratória de API alvo. Os contratos consolidados do programa estão em `docs2/13-api-contracts-vetus-like.md` e o outline OpenAPI em `docs2/16-openapi-outline-vetus-like.md`.

---

## 1. PADRÕES GERAIS

### 1.1 Base URL

```
https://api.{domain}.com/api/v1
```

### 1.2 Autenticação

```
Authorization: Bearer <JWT_TOKEN>
```

### 1.3 Headers Obrigatórios

```
Content-Type: application/json
Accept: application/json
X-Tenant-ID: {tenant_uuid}
X-Request-ID: {uuid_v4}
```

### 1.4 Paginação

```
GET /resource?page=0&size=20&sort=name,asc&query=search
```

### 1.5 Resposta Padrão

```json
{
  "data": [],
  "meta": {
    "page": 0,
    "size": 20,
    "totalElements": 150,
    "totalPages": 8,
    "sort": "name,asc"
  },
  "links": {
    "self": "/api/v1/resource?page=0&size=20",
    "first": "/api/v1/resource?page=0&size=20",
    "prev": null,
    "next": "/api/v1/resource?page=1&size=20",
    "last": "/api/v1/resource?page=7&size=20"
  }
}
```

### 1.6 Erros

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dados inválidos",
    "details": [
      {
        "field": "email",
        "message": "Email inválido"
      }
    ],
    "timestamp": "2026-04-02T19:00:00Z",
    "requestId": "req_abc123"
  }
}
```

---

## 2. AUTENTICAÇÃO

### 2.1 Login

```
POST /auth/login
```

**Request:**

```json
{
  "vetusId": "220319",
  "username": "vetus",
  "password": "senha123",
  "rememberMe": true
}
```

**Response (200):**

```json
{
  "accessToken": "<access-token>",
  "refreshToken": "<refresh-token>",
  "expiresIn": 600,
  "user": {
    "id": "uuid",
    "username": "vetus",
    "fullName": "Teste Vetus",
    "email": "vetus@email.com",
    "isSuperUser": true
  }
}
```

### 2.2 Refresh Token

```
POST /auth/refresh
```

**Request:**

```json
{
  "refreshToken": "<refresh-token>"
}
```

### 2.3 Logout

```
POST /auth/logout
```

### 2.4 Me (Dados do Usuário Logado)

```
GET /auth/me
```

### 2.5 Change Password

```
PUT /auth/change-password
```

**Request:**

```json
{
  "currentPassword": "senha_atual",
  "newPassword": "nova_senha"
}
```

---

## 3. CLIENTES

### 3.1 Listar Clientes

```
GET /clients?page=0&size=20&query=&type=&phone=&active=true
```

**Response:**

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Yasmin Xavier Santiago",
      "peopleType": "PHYSICAL_PERSON",
      "cpfCnpj": "477.576.378-48",
      "phone": "11978266098",
      "cellPhone": "11978266098",
      "email": "yasmin@email.com",
      "group": {
        "id": "uuid",
        "description": "CONVENIO PETLOVE"
      },
      "active": true,
      "registrationDate": "2026-04-02",
      "animalCount": 1
    }
  ],
  "meta": { "page": 0, "size": 20, "totalElements": 150, "totalPages": 8 }
}
```

### 3.2 Obter Cliente

```
GET /clients/{id}
```

**Response:**

```json
{
  "id": "uuid",
  "name": "Yasmin Xavier Santiago",
  "peopleType": "PHYSICAL_PERSON",
  "cpfCnpj": "477.576.378-48",
  "rg": "581473875",
  "birthday": "2013-06-04",
  "gender": "FEMALE",
  "phone": "11978266098",
  "email": "yasmin@email.com",
  "active": true,
  "address": {
    "zipCode": "04929160",
    "address": "Rua Ernesto Farrar",
    "number": 582,
    "complement": "casa",
    "district": "Alto da Riviera",
    "city": "São Paulo",
    "state": "SP"
  },
  "detail": {
    "acceptSms": false,
    "activeLiveLab": false,
    "activeLivePet": false,
    "debitBalanceLimit": 0,
    "creditBalance": 0,
    "blockedPoints": 0,
    "availablePoints": 0
  },
  "animals": [
    {
      "id": "uuid",
      "name": "Marley",
      "age": "13 anos, 3 meses e 8 dias",
      "breed": "SRD CANINO",
      "specie": "CANINA",
      "photoUrl": "https://..."
    }
  ]
}
```

### 3.3 Criar Cliente

```
POST /clients
```

**Request:**

```json
{
  "name": "João da Silva",
  "peopleType": "PHYSICAL_PERSON",
  "cpfCnpj": "123.456.789-00",
  "birthday": "1990-01-15",
  "gender": "MALE",
  "phone": "11999999999",
  "cellPhone": "11988888888",
  "email": "joao@email.com",
  "groupId": "uuid",
  "address": {
    "zipCode": "04929160",
    "address": "Rua Exemplo",
    "number": "123",
    "complement": "Apto 1",
    "district": "Bairro",
    "city": "São Paulo",
    "state": "SP"
  },
  "detail": {
    "acceptSms": true,
    "debitBalanceLimit": 500
  }
}
```

### 3.4 Atualizar Cliente

```
PUT /clients/{id}
```

### 3.5 Desativar Cliente

```
DELETE /clients/{id}
```

### 3.6 Aniversariantes

```
GET /clients/birthdays?month=4&type=CLIENT
GET /clients/birthdays?month=4&type=ANIMAL
```

### 3.7 Buscar Clientes

```
GET /clients/search?query=joao&fields=name,cpf,phone
```

---

## 4. ANIMAIS

### 4.1 Listar Animais

```
GET /animals?page=0&size=20&query=&specieId=&status=active&clientId=
```

### 4.2 Obter Animal

```
GET /animals/{id}
```

**Response:**

```json
{
  "id": "uuid",
  "name": "Marley",
  "specie": { "id": "uuid", "name": "Canina" },
  "breed": { "id": "uuid", "name": "SRD" },
  "color": { "id": "uuid", "name": "Caramelo" },
  "gender": "MALE_NEUTERED",
  "birthDate": "2013-01-01",
  "age": "13 anos, 3 meses e 8 dias",
  "weight": 15.5,
  "microchipNumber": "985112345678",
  "photoUrl": "https://...",
  "status": "active",
  "client": {
    "id": "uuid",
    "name": "Yasmin Xavier Santiago",
    "phone": "11978266098"
  },
  "medicalRecords": [],
  "vaccines": [],
  "lastVisit": "2026-03-15"
}
```

### 4.3 Criar Animal

```
POST /animals
```

### 4.4 Atualizar Animal

```
PUT /animals/{id}
```

### 4.5 Histórico Médico

```
GET /animals/{id}/medical-records
```

### 4.6 Vacinas

```
GET /animals/{id}/vaccines
POST /animals/{id}/vaccines
```

---

## 5. AGENDA

### 5.1 Listar Agendamentos

```
GET /schedules?startDateTime=2026-04-02T00:00:00&endDateTime=2026-04-02T23:59:00&professionalId=&status=
```

**Response:**

```json
{
  "data": [
    {
      "id": "uuid",
      "description": "08:00 10:30 - Retirada de pontos pós cirurgico",
      "client": { "id": "uuid", "name": "Ivonete Silva de Farias" },
      "type": "SERVICE",
      "status": "EXECUTED",
      "period": {
        "startDateTime": "2026-04-02T08:00:00",
        "endDateTime": "2026-04-02T10:30:00",
        "allDay": false
      },
      "items": [
        {
          "id": "uuid",
          "description": "Retirada de pontos pós cirurgico",
          "participants": [
            { "id": "uuid", "name": "Ricardo Akinaga", "type": "PROFESSIONAL" },
            { "id": "uuid", "name": "Dodo", "type": "ANIMAL" }
          ]
        }
      ],
      "observation": "Agendado via Wtsap",
      "markerId": "uuid"
    }
  ]
}
```

### 5.2 Criar Agendamento

```
POST /schedules
```

**Request:**

```json
{
  "clientId": "uuid",
  "animalId": "uuid",
  "professionalId": "uuid",
  "description": "Consulta de rotina",
  "type": "CONSULTATION",
  "startDateTime": "2026-04-10T10:00:00",
  "endDateTime": "2026-04-10T10:30:00",
  "markerId": "uuid",
  "observation": "Primeira consulta",
  "items": [
    {
      "serviceId": "uuid",
      "professionalId": "uuid",
      "animalId": "uuid"
    }
  ]
}
```

### 5.3 Atualizar Agendamento

```
PUT /schedules/{id}
```

### 5.4 Cancelar Agendamento

```
PATCH /schedules/{id}/cancel
```

**Request:**

```json
{
  "reason": "Cliente solicitou cancelamento"
}
```

### 5.5 Marcadores

```
GET /schedule-markers
POST /schedule-markers
PUT /schedule-markers/{id}
DELETE /schedule-markers/{id}
```

### 5.6 Disponibilidades

```
GET /professionals/{id}/availability?dayOfWeek=THURSDAY
```

### 5.7 Profissionais Disponíveis

```
GET /professionals/available?date=2026-04-10&time=10:00&serviceId=
```

---

## 6. COMANDAS

### 6.1 Listar Comandas

```
GET /commands?page=0&size=20&query=&state=open
```

**Response:**

```json
{
  "data": [
    {
      "id": "uuid",
      "commandNumber": 30842,
      "openingDate": "2026-04-02T19:40:21Z",
      "closingDate": null,
      "client": {
        "id": "uuid",
        "name": "Luciana Conceição da Silva",
        "phone": "11999690763"
      },
      "animal": {
        "id": "uuid",
        "name": "Frederico",
        "specie": "FELINA",
        "breed": "SRD FELINO"
      },
      "totalValue": 0,
      "state": "OPEN",
      "items": [],
      "payments": {
        "totalPaid": 0,
        "debitBalance": 0,
        "methods": []
      },
      "hasHealthPlan": false,
      "hasSubscription": false
    }
  ]
}
```

### 6.2 Comandas Abertas

```
GET /commands/open
```

### 6.3 Obter Comanda

```
GET /commands/{id}
```

### 6.4 Criar Comanda

```
POST /commands
```

**Request:**

```json
{
  "clientId": "uuid",
  "animalId": "uuid"
}
```

### 6.5 Adicionar Item

```
POST /commands/{id}/items
```

**Request:**

```json
{
  "productId": "uuid",
  "serviceId": "uuid",
  "quantity": 2,
  "unitPrice": 50.0,
  "discount": 0,
  "professionalId": "uuid"
}
```

### 6.6 Remover Item

```
DELETE /commands/{id}/items/{itemId}
```

### 6.7 Aplicar Desconto

```
POST /commands/{id}/discount
```

**Request:**

```json
{
  "type": "PERCENTAGE",
  "value": 10
}
```

### 6.8 Finalizar Comanda

```
POST /commands/{id}/finalize
```

**Request:**

```json
{
  "payments": [
    {
      "paymentMethodId": "uuid",
      "amount": 100.0,
      "installments": 1
    }
  ]
}
```

---

## 7. VENDAS

### 7.1 Listar Vendas

```
GET /sales?page=0&size=20&query=&dateFrom=&dateTo=&state=
```

### 7.2 Criar Venda

```
POST /sales
```

**Request:**

```json
{
  "clientId": "uuid",
  "branchId": "uuid",
  "posId": "uuid",
  "items": [
    {
      "productId": "uuid",
      "quantity": 2,
      "unitPrice": 50.0,
      "discount": 0
    }
  ],
  "payments": [
    {
      "paymentMethodId": "uuid",
      "amount": 100.0
    }
  ]
}
```

### 7.3 Cancelar Venda

```
POST /sales/{id}/cancel
```

**Request:**

```json
{
  "reason": "Erro de digitação"
}
```

---

## 8. PRODUTOS

### 8.1 Listar Produtos

```
GET /products?page=0&size=20&query=&groupId=&manufacturerId=&status=active
```

### 8.2 Obter Produto

```
GET /products/{id}
```

### 8.3 Criar Produto

```
POST /products
```

**Request:**

```json
{
  "code": "PROD001",
  "barcode": "7891234567890",
  "name": "Ração Premium 15kg",
  "description": "Ração premium para cães adultos",
  "groupId": "uuid",
  "manufacturerId": "uuid",
  "measurementUnitId": "uuid",
  "costPrice": 80.0,
  "salePrice": 120.0,
  "minStock": 10,
  "maxStock": 100,
  "ncm": "23091090",
  "cfopId": "uuid",
  "icmsId": "uuid",
  "taxes": {
    "ipiId": "uuid",
    "pisId": "uuid",
    "cofinsId": "uuid"
  }
}
```

### 8.4 Atualizar Produto

```
PUT /products/{id}
```

### 8.5 Importar Produtos

```
POST /products/import
```

**Content-Type:** `multipart/form-data`

### 8.6 Modelo de Importação

```
GET /products/import-template
```

### 8.7 Consulta de Preços

```
GET /products/price-consultation?query=&barcode=
```

---

## 9. ESTOQUE

### 9.1 Estoques

```
GET /stocks
POST /stocks
PUT /stocks/{id}
```

### 9.2 Transações

```
GET /stock-transactions?page=0&size=20&stockId=&type=&dateFrom=&dateTo=
POST /stock-transactions
```

**Request:**

```json
{
  "stockId": "uuid",
  "type": "entry",
  "reason": "Entrada manual",
  "items": [
    {
      "productId": "uuid",
      "quantity": 50,
      "unitCost": 80.0,
      "batchId": "uuid"
    }
  ]
}
```

### 9.3 Entrada de NF

```
POST /invoice-entries
```

### 9.4 Transferências

```
GET /stock-transfers
POST /stock-transfers
GET /stock-transfers/{id}
PATCH /stock-transfers/{id}/complete
```

### 9.5 Auditoria

```
POST /stock-audits
GET /stock-audits/{id}
POST /stock-audits/{id}/process
```

### 9.6 Validade

```
GET /product-batches?expirationBefore=2026-06-01&status=active
```

### 9.7 Reajuste de Preços

```
POST /products/price-adjustment
```

**Request:**

```json
{
  "filter": {
    "groupId": "uuid",
    "manufacturerId": "uuid"
  },
  "adjustmentType": "PERCENTAGE",
  "value": 5.5,
  "applyTo": "salePrice"
}
```

---

## 10. FINANCEIRO

### 10.1 Contas a Receber

```
GET /accounts-receivable?page=0&size=20&status=&dueFrom=&dueTo=&clientId=
POST /accounts-receivable
POST /accounts-receivable/{id}/pay
POST /accounts-receivable/batch-pay
```

### 10.2 Contas a Pagar

```
GET /accounts-payable?page=0&size=20&status=&dueFrom=&dueTo=&supplierId=
POST /accounts-payable
POST /accounts-payable/{id}/pay
POST /accounts-payable/batch-pay
```

### 10.3 Caixa

```
POST /cash-registers/open
GET /cash-registers/{id}
POST /cash-registers/{id}/withdrawal
POST /cash-registers/{id}/deposit
POST /cash-registers/{id}/close
```

### 10.4 Transações de Cartão

```
GET /card-transactions?page=0&size=20&dateFrom=&dateTo=&status=
POST /card-transactions
POST /card-transactions/{id}/cancel
```

### 10.5 Split

```
GET /split-configs
POST /split-configs
PUT /split-configs/{id}
POST /split-configs/{id}/toggle
POST /split/simulate
GET /split/export?dateFrom=&dateTo=
```

### 10.6 Fluxo de Caixa

```
GET /cash-flow?dateFrom=&dateTo=&branchId=
```

**Response:**

```json
{
  "openingBalance": 5000.0,
  "totalRevenue": 15000.0,
  "totalExpenses": 8000.0,
  "closingBalance": 12000.0,
  "daily": [
    {
      "date": "2026-04-01",
      "revenue": 2000.0,
      "expenses": 1000.0,
      "balance": 1000.0
    }
  ]
}
```

### 10.7 Dashboard Financeiro

```
GET /financial-dashboard?period=current_month
```

---

## 11. LABORATÓRIO

### 11.1 Exames

```
GET /exams?page=0&size=20&status=&animalId=&type=&dateFrom=&dateTo=
POST /exams
GET /exams/{id}
PUT /exams/{id}
```

### 11.2 Resultados

```
POST /exams/{id}/results
```

**Request:**

```json
{
  "results": [
    {
      "parameterName": "Hemoglobina",
      "resultValue": "14.5",
      "unit": "g/dL",
      "observation": ""
    }
  ]
}
```

### 11.3 Laudos

```
GET /reports?page=0&size=20&status=&examId=
POST /reports
GET /reports/{id}
PUT /reports/{id}
POST /reports/{id}/finalize
POST /reports/{id}/deliver
```

### 11.4 Tipos de Exame

```
GET /exam-types
POST /exam-types
PUT /exam-types/{id}
```

### 11.5 Valores de Referência

```
GET /exam-reference-values?examTypeId=&specieId=
POST /exam-reference-values
```

---

## 12. PROFISSIONAIS

### 12.1 Listar

```
GET /professionals?page=0&size=20&query=&status=
```

### 12.2 Básico (para dropdowns)

```
GET /professionals/basic
```

**Response:**

```json
[
  { "id": "uuid", "name": "Ricardo Akinaga" },
  { "id": "uuid", "name": "Flavia Ultrassom" }
]
```

### 12.3 Criar

```
POST /professionals
```

### 12.4 Comissões

```
GET /commissions?professionalId=&dateFrom=&dateTo=&status=
POST /commissions/calculate
```

### 12.5 Regras de Comissão

```
GET /commission-rules?professionalId=
POST /commission-rules
PUT /commission-rules/{id}
DELETE /commission-rules/{id}
```

### 12.6 Folgas

```
GET /time-off?professionalId=&dateFrom=&dateTo=
POST /time-off
DELETE /time-off/{id}
```

---

## 13. MARKETING

### 13.1 SMS

```
POST /sms/send
```

**Request:**

```json
{
  "clientId": "uuid",
  "phone": "11999999999",
  "message": "Lembrete: Vacina do Marley vence em 5 dias."
}
```

### 13.2 Campanhas

```
GET /sms-campaigns
POST /sms-campaigns
POST /sms-campaigns/{id}/send
```

### 13.3 Templates de Email

```
GET /email-templates
PUT /email-templates/{id}
```

---

## 14. PACOTES

### 14.1 Listar

```
GET /packages?page=0&size=20&status=&clientId=
```

### 14.2 Criar

```
POST /packages
```

**Request:**

```json
{
  "clientId": "uuid",
  "animalId": "uuid",
  "name": "Pacote Banho Mensal",
  "totalValue": 200.0,
  "intervalDays": 10,
  "totalSessions": 4,
  "items": [{ "serviceId": "uuid", "quantity": 4, "unitValue": 50.0 }]
}
```

### 14.3 Pagar Sessão

```
POST /packages/{id}/sessions/{sessionId}/pay
```

---

## 15. ORÇAMENTOS

### 15.1 Listar

```
GET /quotes?page=0&size=20&status=&clientId=
```

### 15.2 Criar

```
POST /quotes
```

### 15.3 Aprovar

```
POST /quotes/{id}/approve
```

### 15.4 Converter em Venda

```
POST /quotes/{id}/convert
```

---

## 16. INTERNAÇÃO

### 16.1 Listar

```
GET /hospitalizations?status=active&animalId=
```

### 16.2 Criar

```
POST /hospitalizations
```

### 16.3 Eventos

```
POST /hospitalizations/{id}/events
GET /hospitalizations/{id}/events
```

### 16.4 Boxes

```
GET /hospitalization-boxes
POST /hospitalization-boxes
PUT /hospitalization-boxes/{id}
```

### 16.5 Finalizar

```
POST /hospitalizations/{id}/discharge
```

---

## 17. FIDELIDADE

### 17.1 Pontos

```
GET /loyalty/points?clientId=
POST /loyalty/points/award
```

### 17.2 Resgate

```
POST /loyalty/redeem
```

**Request:**

```json
{
  "clientId": "uuid",
  "pointsUsed": 500,
  "rewardDescription": "1 banho grátis"
}
```

---

## 18. RELATÓRIOS

### 18.1 Executar Relatório

```
POST /reports/execute
```

**Request:**

```json
{
  "reportType": "DRE",
  "filters": {
    "dateFrom": "2026-01-01",
    "dateTo": "2026-03-31",
    "branchId": "uuid"
  },
  "format": "PDF"
}
```

### 18.2 Tipos de Relatório Disponíveis

```
GET /reports/types
```

### 18.3 Exportar

```
GET /reports/{id}/export?format=PDF
GET /reports/{id}/export?format=EXCEL
GET /reports/{id}/export?format=CSV
```

---

## 19. WEBSOCKETS (Tempo Real)

### 19.1 Conexão

```
ws://api.{domain}.com/ws?token=JWT_TOKEN
```

### 19.2 Eventos Recebidos

| Evento                 | Payload                                      |
| ---------------------- | -------------------------------------------- |
| `notification:new`     | `{ id, type, message, timestamp }`           |
| `command:updated`      | `{ commandId, action }`                      |
| `schedule:created`     | `{ scheduleId, datetime }`                   |
| `stock:low`            | `{ productId, currentStock, minStock }`      |
| `stock:expired`        | `{ productId, batchNumber, expirationDate }` |
| `payment:received`     | `{ paymentId, amount, method }`              |
| `appointment:reminder` | `{ scheduleId, inMinutes }`                  |

### 19.3 Eventos Enviados

| Evento             | Payload                              |
| ------------------ | ------------------------------------ |
| `command:add-item` | `{ commandId, productId, quantity }` |
| `schedule:update`  | `{ scheduleId, action, data }`       |

---

## 20. WEBHOOKS

### 20.1 Gerenciar Webhooks

```
GET /webhooks
POST /webhooks
PUT /webhooks/{id}
DELETE /webhooks/{id}
```

### 20.2 Eventos Disponíveis

```json
[
  "client.created",
  "client.updated",
  "animal.created",
  "animal.updated",
  "appointment.created",
  "appointment.reminder",
  "appointment.cancelled",
  "command.opened",
  "command.finalized",
  "sale.created",
  "sale.cancelled",
  "stock.low",
  "stock.expired",
  "payment.received",
  "payment.overdue",
  "exam.completed",
  "report.issued"
]
```

---

## 21. RATE LIMITING

| Endpoint           | Limite   | Janela |
| ------------------ | -------- | ------ |
| `/auth/login`      | 10 req   | 5 min  |
| `/auth/refresh`    | 30 req   | 1 hora |
| APIs normais       | 1000 req | 15 min |
| Upload de arquivos | 10 req   | 1 min  |
| Envio de SMS       | 50 req   | 5 min  |

**Headers de resposta:**

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 995
X-RateLimit-Reset: 1775171642
```

---

_Documento gerado em 02/04/2026 — Especificação completa de APIs_
