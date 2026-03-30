# Módulo Alta — Backend

## Visão Geral

O backend do módulo Alta fornece APIs REST para gestão de altas/desfechos clínicos, integrando-se com o sistema de persistência e mantendo rastreabilidade completa.

## Rotas API

### POST /discharges

Cria um novo registro de alta.

**Autenticação**: Requerida (`medical-records.manage`)

**Request Body**:

```json
{
  "encounterId": "enc_123",
  "patientId": "pat_456",
  "ownerId": "own_789",
  "hospitalizationId": "hosp_001",
  "dischargeType": "inpatient_discharge",
  "outcome": "recovered",
  "dischargedAt": "2024-01-15T14:00:00Z",
  "finalDiagnosis": "Osteomielite tratados",
  "clinicalSummary": "Paciente responded well to treatment...",
  "proceduresPerformed": "Cirurgia ortopédica, antibioticoterapia",
  "medicationsAtDischarge": "Antibiótico oral 7 dias",
  "recommendations": "Repouso por 15 dias",
  "followUpRequired": true,
  "followUpInstructions": "Retorno em 15 dias",
  "returnWarningSigns": "Febre, dor intensa, inchaco",
  "dischargeReason": "Cumprimento do tratamento",
  "dischargeNotes": "Tutor orientado"
}
```

**Response**: `201 Created`

```json
{
  "id": "discharge_001",
  "accountId": "acc_cvg",
  ... // DischargeSummary
}
```

**Validações**:

- `encounterId` obrigatório
- `patientId` obrigatório
- `dischargeType` obrigatório
- `outcome` obrigatório
- `dischargedAt` obrigatório
- Impedir duplicidade (um desfecho por atendimento)

### GET /discharges

Lista altas com filtros opcionais.

**Autenticação**: Requerida (`medical-records.read`)

**Query Params**:

- `encounterId` (opcional): Filtrar por atendimento
- `patientId` (opcional): Filtrar por paciente
- `outcome` (opcional): Filtrar por desfecho
- `dischargeType` (opcional): Filtrar por tipo

**Response**: `200 OK`

```json
{
  "items": [...],
  "total": 10
}
```

### GET /discharges/:id

Retorna detalhes de uma alta específica.

**Autenticação**: Requerida (`medical-records.read`)

**Response**: `200 OK`

```json
{
  "discharge": { ...DischargeSummary }
}
```

### PATCH /discharges/:id

Atualiza uma alta existente.

**Autenticação**: Requerida (`medical-records.manage`)

**Request Body**:

```json
{
  "outcome": "improved",
  "clinicalSummary": "Resumo atualizado..."
}
```

**Response**: `200 OK`

```json
{
  ... // DischargeSummary atualizado
}
```

## Regras de Negócio Backend

1. **Validação de Encounter**: O encounter deve existir
2. **Coerência de Paciente**: patientId deve corresponder ao encounter
3. **Duplicidade**: Não permitir mais de uma alta por atendimento
4. **Autoria**: Preencher createdByUserId e updatedByUserId
5. **Persistência**: Usar banco como fonte real
6. **Eventos**: Registrar evento no timeline clínico

## Integração com Medical Records

Ao criar uma alta, registrar evento no timeline:

- Tipo: `discharge_created`
- Descrição: Resumo do desfecho

## Auditoria

Todas as operações devem gerar registro de auditoria:

- create: Alta criada
- read: Alta consultada
- update: Alta atualizada
