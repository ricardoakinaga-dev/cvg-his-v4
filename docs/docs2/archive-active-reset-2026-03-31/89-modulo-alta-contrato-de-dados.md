# Módulo Alta — Contrato de Dados

## Entidade: Discharge

### Campos Obrigatórios

| Campo           | Tipo     | Descrição                   |
| --------------- | -------- | --------------------------- |
| id              | string   | Identificador único (UUID)  |
| encounterId     | string   | ID do atendimento           |
| patientId       | string   | ID do paciente              |
| ownerId         | string   | ID do tutor/proprietário    |
| dischargeType   | enum     | Tipo de alta                |
| outcome         | enum     | Desfecho clínico            |
| dischargedAt    | datetime | Data/hora da alta           |
| createdAt       | datetime | Data de criação             |
| updatedAt       | datetime | Data de atualização         |
| createdByUserId | string   | ID do usuário que criou     |
| updatedByUserId | string   | ID do usuário que atualizou |

### Campos Clínicos

| Campo                  | Tipo    | Descrição                |
| ---------------------- | ------- | ------------------------ |
| finalDiagnosis         | string? | Diagnóstico final        |
| clinicalSummary        | string? | Resumo clínico           |
| proceduresPerformed    | string? | Procedimentos realizados |
| medicationsAtDischarge | string? | Medicações na alta       |
| recommendations        | string? | Recomendações            |

### Campos de Continuidade

| Campo                | Tipo     | Descrição                     |
| -------------------- | -------- | ----------------------------- |
| followUpRequired     | boolean? | Se follow-up é necessário     |
| followUpInstructions | string?  | Instruções de retorno         |
| returnWarningSigns   | string?  | Sinais de alerta para retorno |

### Campos Operacionais

| Campo             | Tipo    | Descrição                       |
| ----------------- | ------- | ------------------------------- |
| hospitalizationId | string? | ID da internação (se aplicável) |
| dischargeReason   | string? | Motivo da alta                  |
| dischargeNotes    | string? | Observações                     |

## Enums

### DischargeType

```typescript
type DischargeType = 'outpatient' | 'inpatient_discharge' | 'transfer' | 'death';
```

### Outcome

```typescript
type Outcome = 'recovered' | 'improved' | 'unchanged' | 'worsened' | 'deceased';
```

## Relacionamentos

- **Encounter**: Um Discharge pertence a um Encounter
- **Patient**: Um Discharge pertence a um Patient
- **Owner**: Um Discharge pertence a um Owner
- **Hospitalization**: Opcional, vincula a uma internação

## Contrato de Requisição (Create)

```typescript
interface CreateDischargeRequest {
  encounterId: string;
  patientId: string;
  ownerId?: string;
  hospitalizationId?: string;
  dischargeType: DischargeType;
  outcome: Outcome;
  dischargedAt: string;
  finalDiagnosis?: string;
  clinicalSummary?: string;
  proceduresPerformed?: string;
  medicationsAtDischarge?: string;
  recommendations?: string;
  followUpRequired?: boolean;
  followUpInstructions?: string;
  returnWarningSigns?: string;
  dischargeReason?: string;
  dischargeNotes?: string;
}
```

## Contrato de Requisição (Update)

```typescript
interface UpdateDischargeRequest {
  dischargeType?: DischargeType;
  outcome?: Outcome;
  dischargedAt?: string;
  finalDiagnosis?: string;
  clinicalSummary?: string;
  proceduresPerformed?: string;
  medicationsAtDischarge?: string;
  recommendations?: string;
  followUpRequired?: boolean;
  followUpInstructions?: string;
  returnWarningSigns?: string;
  dischargeReason?: string;
  dischargeNotes?: string;
}
```

## Contrato de Resposta

```typescript
interface DischargeSummary {
  id: string;
  accountId: string;
  encounterId: string;
  patientId: string;
  ownerId: string;
  hospitalizationId?: string;
  dischargeType: DischargeType;
  outcome: Outcome;
  dischargedAt: string;
  finalDiagnosis?: string;
  clinicalSummary?: string;
  proceduresPerformed?: string;
  medicationsAtDischarge?: string;
  recommendations?: string;
  followUpRequired?: boolean;
  followUpInstructions?: string;
  returnWarningSigns?: string;
  dischargeReason?: string;
  dischargeNotes?: string;
  versionNumber: number;
  createdByUserId: string;
  updatedByUserId: string;
  createdAt: string;
  updatedAt: string;
}
```
