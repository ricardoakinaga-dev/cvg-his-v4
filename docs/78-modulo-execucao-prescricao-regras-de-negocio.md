# Modulo Execucao de Prescricao / Enfermagem — Regras de Negócio

## 1. Visão Geral

Este documento descreve as regras de negócio obrigatórias do módulo Execução de Prescrição / Enfermagem.

## 2. Regras de Existência

### 2.1 Regra 1: Execução não existe sem prescrição válida

- Uma execução deve estar vinculada a uma prescrição existente e válida
- A prescrição deve estar ativa
- A prescrição não pode estar cancelada ou suspensa

### 2.2 Regra 2: Execução não existe sem item de prescrição válido

- Uma execução deve estar vinculada a um item de prescrição existente e válido
- O item deve pertencer à prescrição vinculada
- O item deve estar ativo/não cancelado

### 2.3 Regra 3: Execução não existe sem vínculo coerente com atendimento, paciente e tutor

- Uma execução deve estar vinculada a um atendimento existente e válido
- O atendimento deve ser coerente com a prescrição
- O paciente deve ser coerente com o atendimento
- O tutor deve ser coerente com o paciente

### 2.4 Regra 4: Vínculo com internação quando aplicável

- Se houver internação ativa, a execução deve conseguir se vincular a ela
- A internação deve ser coerente com o atendimento
- A internação deve estar ativa

## 3. Regras de Fluxo

### 3.1 Regra 5: Fluxo principal não depende de digitação manual de IDs

- O fluxo principal não deve depender de digitação manual de IDs
- Usar contexto de entidades salvas
- Permitir criação a partir do contexto da prescrição
- Permitir criação a partir do contexto da internação

### 3.2 Regra 6: executionStatus é obrigatório

- Todo registro de execução deve ter `executionStatus` definido
- O status deve respeitar os valores permitidos

### 3.3 Regra 7: scheduledFor é obrigatório

- Todo registro de execução deve ter `scheduledFor` definido
- A data/hora deve ser válida

## 4. Regras de Registro

### 4.1 Regra 8: Deve ser possível registrar execução realizada

- Deve ser possível registrar que a execução foi realizada
- Campos obrigatórios: `administeredAt`, `performerUserId`, `administrationOutcome`

### 4.2 Regra 9: Deve ser possível registrar não execução com motivo

- Deve ser possível registrar que a execução não foi realizada
- Campos obrigatórios: `notAdministeredAt`, `nonExecutionReason`

### 4.3 Regra 10: Deve ser possível registrar suspensão/cancelamento operacional

- Deve ser possível suspender uma execução
- Deve ser possível cancelar uma execução
- Campos obrigatórios: `suspendedAt` ou `cancelledAt`

### 4.4 Regra 11: Rastreabilidade mínima de quem executou e quando executou

- Deve existir rastreabilidade mínima de quem executou
- Deve existir rastreabilidade mínima de quando executou
- Campos: `performerUserId`, `administeredAt`

## 5. Regras de Histórico

### 5.1 Regra 12: Histórico não deve ser perdido por edição destrutiva simples

- O histórico de execução não deve ser perdido
- Edições não devem destruir dados anteriores
- Eventos devem ser preservados

### 5.2 Regra 13: Backend usa persistência como fonte real de verdade

- Backend deve usar banco de dados como fonte principal
- Não usar memória volátil como fonte principal
- Todas as operações devem persistir no banco

### 5.3 Regra 14: Não usar memória volátil como fonte principal

- Não usar memória como base principal
- Persistência deve ser garantida
- Dados devem sobreviver a reinicializações

## 6. Regras de Preparação

### 6.1 Regra 15: Preparação para funcionalidades futuras

- O módulo deve preparar terreno para aprazamento
- O módulo deve preparar terreno para enfermagem por turno
- O módulo deve preparar terreno para checagem avançada
- Não implementar tudo agora

### 6.2 Regra 16: Exclusão destrutiva não deve ser implementada

- Exclusão destrutiva de execução não deve ser implementada
- Preservar histórico operacional
- Usar soft delete ou estratégia similar

## 7. Regras de Coerência

### 7.1 Regra 17: Execução deve respeitar coerência com item prescrito

- A execução deve respeitar coerência com o item prescrito
- A execução deve respeitar coerência com o contexto clínico
- Validações devem garantir coerência

### 7.2 Regra 18: Itens cancelados/superseded/inativos

- Itens cancelados não devem continuar gerando execução ativa
- Itens superseded não devem continuar gerando execução ativa
- Itens inativos não devem continuar gerando execução ativa
- Tratamento adequado deve ser implementado

## 8. Regras de Validação

### 8.1 Validação de Prescrição

- Prescrição deve existir
- Prescrição deve estar ativa
- Prescrição não pode estar cancelada

### 8.2 Validação de Item

- Item deve existir
- Item deve pertencer à prescrição
- Item deve estar ativo

### 8.3 Validação de Atendimento

- Atendimento deve existir
- Atendimento deve ser coerente com a prescrição
- Atendimento deve estar aberto/ativo

### 8.4 Validação de Paciente

- Paciente deve existir
- Paciente deve ser coerente com o atendimento

### 8.5 Validação de Tutor

- Tutor deve existir
- Tutor deve ser coerente com o paciente

### 8.6 Validação de Internação

- Quando informada, internação deve existir
- Internação deve ser coerente com o atendimento
- Internação deve estar ativa

## 9. Regras de Status

### 9.1 Transições de Status

- `pending` → `administered`
- `pending` → `not_administered`
- `pending` → `delayed`
- `pending` → `suspended`
- `pending` → `cancelled`
- `delayed` → `administered`
- `delayed` → `not_administered`
- `delayed` → `suspended`
- `delayed` → `cancelled`
- `suspended` → `pending`
- `suspended` → `cancelled`

### 9.2 Campos Obrigatórios por Status

#### Administered
- `administeredAt` obrigatório
- `performerUserId` obrigatório
- `administrationOutcome` obrigatório

#### Not Administered
- `notAdministeredAt` obrigatório
- `nonExecutionReason` obrigatório

#### Delayed
- `delayReason` obrigatório

#### Suspended
- `suspendedAt` obrigatório

#### Cancelled
- `cancelledAt` obrigatório

## 10. Regras de Autoria

### 10.1 createdByUserId

- Obrigatório na criação
- Não pode ser alterado após criação

### 10.2 updatedByUserId

- Obrigatório na atualização
- Deve ser preenchido a cada atualização

### 10.3 performerUserId

- Obrigatório quando execução é realizada
- Deve ser um usuário válido
