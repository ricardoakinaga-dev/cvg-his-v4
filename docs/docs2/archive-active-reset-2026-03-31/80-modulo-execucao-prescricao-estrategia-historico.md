# Modulo Execucao de Prescricao / Enfermagem — Estratégia de Histórico e Eventos

## 1. Visão Geral

Este documento descreve a estratégia de histórico e eventos do módulo Execução de Prescrição / Enfermagem.

## 2. Objetivo

Garantir que o módulo preserve o histórico operacional sem sobrescrita destrutiva simples.

## 3. Estratégia de Histórico

### 3.1 Abordagem Principal

- Eventos separados por execução na tabela `prescription_execution_events`
- Cada execução pode ter múltiplos eventos
- Atualizações controladas não apagam eventos anteriores
- Campo `supersedesExecutionId` permite encadeamento de revisões
- Campo `versionNumber` controla versões da execução

### 3.2 Vantagens

- Histórico completo preservado
- Rastreabilidade garantida
- Auditoria facilitada
- Recuperação de estado possível
- Conformidade regulatória

## 4. Entidade de Evento

### 4.1 PrescriptionExecutionEvent

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| id | uuid | sim | Identificador único |
| prescriptionExecutionId | uuid | sim | Referência à execução |
| eventType | enum | sim | Tipo do evento |
| eventAt | timestamp | sim | Data/hora do evento |
| eventByUserId | uuid | sim | Usuário que registrou o evento |
| notes | text | não | Observações do evento |
| payloadSnapshot | jsonb | não | Snapshot do payload no momento do evento |

### 4.2 Tipos de Evento

- `created` — Execução criada
- `scheduled` — Execução agendada
- `administered` — Item administrado
- `not_administered` — Item não administrado
- `delayed` — Execução atrasada
- `suspended` — Execução suspensa
- `resumed` — Execução retomada
- `cancelled` — Execução cancelada
- `amended` — Execução emendada
- `double_checked` — Checagem dupla realizada

## 5. Fluxos de Eventos

### 5.1 Fluxo de Criação

1. Criar execução
2. Registrar evento `created`
3. Salvar evento no banco
4. Vincular evento à execução

### 5.2 Fluxo de Administração

1. Administrar execução
2. Registrar evento `administered`
3. Salvar evento no banco
4. Atualizar status da execução

### 5.3 Fluxo de Não Administração

1. Não administrar execução
2. Registrar evento `not_administered`
3. Salvar evento no banco
4. Atualizar status da execução

### 5.4 Fluxo de Atraso

1. Atrasar execução
2. Registrar evento `delayed`
3. Salvar evento no banco
4. Atualizar status da execução

### 5.5 Fluxo de Suspensão

1. Suspender execução
2. Registrar evento `suspended`
3. Salvar evento no banco
4. Atualizar status da execução

### 5.6 Fluxo de Retomada

1. Retomar execução suspensa
2. Registrar evento `resumed`
3. Salvar evento no banco
4. Atualizar status da execução

### 5.7 Fluxo de Cancelamento

1. Cancelar execução
2. Registrar evento `cancelled`
3. Salvar evento no banco
4. Atualizar status da execução

### 5.8 Fluxo de Emenda

1. Emendar execução
2. Registrar evento `amended`
3. Salvar evento no banco
4. Atualizar versão da execução

### 5.9 Fluxo de Checagem Dupla

1. Realizar checagem dupla
2. Registrar evento `double_checked`
3. Salvar evento no banco
4. Atualizar campos de checagem

## 6. Preservação de Histórico

### 6.1 Regras de Preservação

- Eventos nunca são deletados
- Eventos nunca são atualizados
- Eventos são apenas criados
- Cada evento tem timestamp único
- Cada evento tem usuário único

### 6.2 Regras de Atualização

- Atualizações de execução não apagam eventos
- Atualizações de execução criam novos eventos quando aplicável
- Campos de autoria não podem ser alterados
- Campos de data/hora não podem ser alterados retroativamente

### 6.3 Regras de Recuperação

- Eventos podem ser recuperados por execução
- Eventos podem ser recuperados por período
- Eventos podem ser recuperados por tipo
- Eventos podem ser recuperados por usuário
- Eventos são retornados em ordem cronológica

## 7. Snapshot de Eventos

### 7.1 Payload Snapshot

- Snapshot do payload no momento do evento
- Permite reconstruir estado em qualquer ponto
- Armazenado como JSONB
- Opcional, mas recomendado para eventos críticos

### 7.2 Campos de Snapshot

- Dados da execução no momento do evento
- Dados da prescrição no momento do evento
- Dados do item no momento do evento
- Dados do atendimento no momento do evento
- Dados do paciente no momento do evento
- Dados do tutor no momento do evento
- Dados da internação no momento do evento (se houver)

## 8. Versionamento

### 8.1 Version Number

- Campo `versionNumber` controla versões
- Inicia em 1 na criação
- Incrementa a cada emenda
- Permite identificar versão atual

### 8.2 Supersedência

- Campo `supersedesExecutionId` permite encadeamento
- Aponta para execução anterior
- Permite reconstruir cadeia de revisões
- Usado quando execução é emendada

## 9. Auditoria

### 9.1 Campos de Auditoria

- `createdAt` — Data/hora de criação
- `createdByUserId` — Usuário que criou
- `updatedAt` — Data/hora de atualização
- `updatedByUserId` — Usuário que atualizou

### 9.2 Regras de Auditoria

- `createdAt` não pode ser alterado
- `createdByUserId` não pode ser alterado
- `updatedAt` é atualizado a cada modificação
- `updatedByUserId` é atualizado a cada modificação

## 10. Consultas de Histórico

### 10.1 Consulta por Execução

```sql
SELECT * FROM prescription_execution_events
WHERE prescriptionExecutionId = ?
ORDER BY eventAt ASC
```

### 10.2 Consulta por Período

```sql
SELECT * FROM prescription_execution_events
WHERE eventAt BETWEEN ? AND ?
ORDER BY eventAt ASC
```

### 10.3 Consulta por Tipo

```sql
SELECT * FROM prescription_execution_events
WHERE eventType = ?
ORDER BY eventAt ASC
```

### 10.4 Consulta por Usuário

```sql
SELECT * FROM prescription_execution_events
WHERE eventByUserId = ?
ORDER BY eventAt ASC
```

## 11. Integridade de Histórico

### 11.1 Validações

- Evento deve ter execução válida
- Evento deve ter tipo válido
- Evento deve ter data/hora válida
- Evento deve ter usuário válido

### 11.2 Consistências

- Data/hora do evento deve ser coerente com criação
- Data/hora do evento deve ser coerente com eventos anteriores
- Usuário do evento deve ser válido
- Tipo do evento deve ser coerente com status da execução

## 12. Limitações

### 12.1 Escopo Atual

- Não implementa prontuário de enfermagem completo por turno
- Não implementa aprazamento avançado
- Não implementa agenda de doses complexa
- Não implementa bomba de infusão
- Não implementa integração com dispositivos
- Não implementa dispensação/farmácia
- Não implementa controle de estoque
- Não implementa assinatura digital avançada

### 12.2 Preparações Futuras

- Estrutura permite evolução para aprazamento
- Estrutura permite evolução para enfermagem por turno
- Estrutura permite evolução para checagem avançada
- Estrutura permite evolução para assinatura digital
