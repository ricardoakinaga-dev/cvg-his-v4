# Modulo Execucao de Prescricao / Enfermagem — Contrato de Dados

## 1. Entidades Principais

### 1.1 PrescriptionExecution

Representa a execução de um item prescrito.

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| id | uuid | sim | Identificador único |
| prescriptionId | uuid | sim | Referência à prescrição |
| prescriptionItemId | uuid | sim | Referência ao item prescrito |
| encounterId | uuid | sim | Referência ao atendimento |
| patientId | uuid | sim | Referência ao paciente |
| ownerId | uuid | sim | Referência ao tutor |
| hospitalizationId | uuid | não | Referência à internação (quando aplicável) |
| executionStatus | enum | sim | Status da execução |
| scheduledFor | timestamp | sim | Data/hora prevista para execução |
| createdAt | timestamp | sim | Data/hora de criação |
| updatedAt | timestamp | sim | Data/hora de atualização |
| createdByUserId | uuid | sim | Usuário que criou o registro |
| updatedByUserId | uuid | sim | Usuário que atualizou o registro |

### 1.2 Campos Operacionais

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| administeredAt | timestamp | não | Data/hora de administração |
| notAdministeredAt | timestamp | não | Data/hora de não administração |
| suspendedAt | timestamp | não | Data/hora de suspensão |
| cancelledAt | timestamp | não | Data/hora de cancelamento |
| routeUsed | varchar(100) | não | Via de administração utilizada |
| dosageGiven | varchar(100) | não | Dosagem administrada |
| dosageUnit | varchar(50) | não | Unidade da dosagem |
| executionNotes | text | não | Observações da execução |
| nonExecutionReason | varchar(100) | não | Motivo da não execução |
| delayReason | varchar(100) | não | Motivo do atraso |
| administrationOutcome | enum | não | Resultado da administração |
| performerUserId | uuid | não | Usuário que executou |

### 1.3 Campos de Controle

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| versionNumber | integer | sim | Número da versão (default: 1) |
| supersedesExecutionId | uuid | não | ID da execução anterior (para revisões) |
| requiresDoubleCheck | boolean | não | Requer checagem dupla |
| doubleCheckedByUserId | uuid | não | Usuário que fez a checagem dupla |
| doubleCheckedAt | timestamp | não | Data/hora da checagem dupla |

### 1.4 Campos Opcionais

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| vitalSignsSnapshot | jsonb | não | Snapshot de sinais vitais |
| infusionRate | varchar(50) | não | Taxa de infusão |
| siteUsed | varchar(100) | não | Local utilizado |
| adverseReactionFlag | boolean | não | Flag de reação adversa |
| adverseReactionNotes | text | não | Notas sobre reação adversa |

## 2. Entidade de Evento/Log

### 2.1 PrescriptionExecutionEvent

Representa um evento operacional relacionado a uma execução.

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| id | uuid | sim | Identificador único |
| prescriptionExecutionId | uuid | sim | Referência à execução |
| eventType | enum | sim | Tipo do evento |
| eventAt | timestamp | sim | Data/hora do evento |
| eventByUserId | uuid | sim | Usuário que registrou o evento |
| notes | text | não | Observações do evento |
| payloadSnapshot | jsonb | não | Snapshot do payload no momento do evento |

## 3. Enums

### 3.1 executionStatus

- `pending` — Pendente
- `administered` — Administrado
- `not_administered` — Não administrado
- `delayed` — Atrasado
- `suspended` — Suspenso
- `cancelled` — Cancelado

### 3.2 eventType

- `created` — Criado
- `scheduled` — Agendado
- `administered` — Administrado
- `not_administered` — Não administrado
- `delayed` — Atrasado
- `suspended` — Suspenso
- `resumed` — Retomado
- `cancelled` — Cancelado
- `amended` — Emendado
- `double_checked` — Checagem dupla

### 3.3 administrationOutcome

- `successful` — Sucesso
- `partial` — Parcial
- `failed` — Falha
- `adverse_reaction` — Reação adversa
- `unknown` — Desconhecido

### 3.4 nonExecutionReason

- `patient_refusal` — Recusa do paciente
- `unavailable_item` — Item indisponível
- `clinical_contraindication` — Contraindicação clínica
- `patient_instability` — Instabilidade do paciente
- `order_suspended` — Ordem suspensa
- `scheduling_issue` — Problema de agendamento
- `other` — Outro

## 4. Relacionamentos

### 4.1 Com Prescrição

- `prescriptionId` → `prescriptions.id` (obrigatório)
- `prescriptionItemId` → `prescription_items.id` (obrigatório)
- Validação: item deve pertencer à prescrição

### 4.2 Com Atendimento

- `encounterId` → `encounters.id` (obrigatório)
- Validação: atendimento deve estar coerente com a prescrição

### 4.3 Com Paciente

- `patientId` → `patients.id` (obrigatório)
- Validação: paciente deve ser coerente com o atendimento

### 4.4 Com Tutor

- `ownerId` → `owners.id` (obrigatório)
- Validação: tutor deve ser coerente com o paciente

### 4.5 Com Internação

- `hospitalizationId` → `hospitalizations.id` (opcional)
- Validação: quando informado, deve estar coerente com o atendimento

## 5. Estratégia de Histórico

- Eventos são registrados na tabela `prescription_execution_events`
- Cada execução pode ter múltiplos eventos
- Atualizações controladas não apagam eventos anteriores
- Campo `supersedesExecutionId` permite encadeamento de revisões
- Campo `versionNumber` controla versões da execução
