# Modulo Execucao de Prescricao / Enfermagem — Backend

## 1. Visão Geral

O backend do módulo Execução de Prescrição / Enfermagem fornece API REST para gestão de execuções de prescrição, incluindo criação, atualização, listagem e detalhamento, com integração aos módulos de Prescrições, Internação, Prontuário, Atendimentos, Pacientes e Tutores.

## 2. Arquitetura

### 2.1 Camadas

- **Routes**: Definição dos endpoints HTTP
- **Handlers**: Lógica de controle de requisições/respostas
- **Services**: Lógica de negócio e validações
- **Repositories**: Persistência no banco de dados

### 2.2 Dependências

- `prescriptions` — Validação de prescrição e itens
- `encounters` — Validação de atendimento
- `patients` — Validação de paciente
- `owners` — Validação de tutor
- `hospitalizations` — Validação de internação (opcional)
- `users` — Validação de usuários (autor, executor)

## 3. Endpoints

### 3.1 Rotas Obrigatórias

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | /prescription-executions | Criar execução |
| GET | /prescription-executions | Listar execuções |
| GET | /prescription-executions/:id | Detalhar execução |
| PATCH | /prescription-executions/:id | Atualizar execução |

### 3.2 Rotas Opcionais

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /prescriptions/:id/executions | Listar execuções por prescrição |
| GET | /hospitalizations/:id/executions | Listar execuções por internação |
| POST | /prescription-executions/:id/administer | Registrar administração |
| POST | /prescription-executions/:id/not-administer | Registrar não administração |
| POST | /prescription-executions/:id/suspend | Suspender execução |
| POST | /prescription-executions/:id/cancel | Cancelar execução |
| POST | /prescription-executions/:id/double-check | Registrar checagem dupla |

## 4. Validações

### 4.1 Validações de Criação

- `prescriptionId` deve existir e ser válido
- `prescriptionItemId` deve existir e pertencer à prescrição
- `encounterId` deve existir e ser coerente com a prescrição
- `patientId` deve existir e ser coerente com o atendimento
- `ownerId` deve existir e ser coerente com o paciente
- `hospitalizationId` (se informado) deve existir e ser coerente com o atendimento
- `executionStatus` é obrigatório
- `scheduledFor` é obrigatório

### 4.2 Validações de Atualização

- Registro deve existir
- Campos de autoria (`createdByUserId`) não podem ser alterados
- Status deve respeitar transições válidas
- Campos de data/hora devem ser coerentes

### 4.3 Validações por Tipo de Execução

#### Administração
- `administeredAt` é obrigatório
- `performerUserId` é obrigatório
- `administrationOutcome` é obrigatório

#### Não Administração
- `notAdministeredAt` é obrigatório
- `nonExecutionReason` é obrigatório

#### Atraso
- `delayReason` é obrigatório

#### Suspensão
- `suspendedAt` é obrigatório

#### Cancelamento
- `cancelledAt` é obrigatório

## 5. Regras de Negócio

1. Execução não existe sem prescrição válida
2. Execução não existe sem item de prescrição válido
3. Execução não existe sem vínculo coerente com atendimento, paciente e tutor
4. Se houver internação ativa, a execução deve conseguir se vincular a ela
5. O fluxo principal não deve depender de digitação manual de IDs
6. `executionStatus` é obrigatório
7. `scheduledFor` é obrigatório
8. Deve ser possível registrar execução realizada
9. Deve ser possível registrar não execução com motivo
10. Deve ser possível registrar suspensão/cancelamento operacional quando aplicável
11. Deve existir rastreabilidade mínima de quem executou e quando executou
12. O histórico de execução não deve ser perdido por edição destrutiva simples
13. Backend deve usar persistência/banco como fonte real de verdade
14. Não usar memória volátil como fonte principal
15. Exclusão destrutiva de execução não deve ser implementada
16. A execução deve respeitar coerência com o item prescrito e seu contexto clínico
17. Itens cancelados/superseded/inativos da prescrição não devem continuar gerando execução ativa sem tratamento adequado

## 6. Integrações

### 6.1 Com Prescrições

- Valida existência da prescrição
- Valida existência e coerência do item
- Recupera dados da prescrição para contexto

### 6.2 Com Atendimentos

- Valida existência do atendimento
- Valida coerência com a prescrição

### 6.3 Com Pacientes

- Valida existência do paciente
- Valida coerência com o atendimento

### 6.4 Com Tutores

- Valida existência do tutor
- Valida coerência com o paciente

### 6.5 Com Internação

- Valida existência da internação (quando aplicável)
- Valida coerência com o atendimento

## 7. Persistência

### 7.1 Fonte de Verdade

- Banco de dados PostgreSQL é a fonte principal
- Não usar memória volátil como base principal
- Todas as operações devem persistir no banco

### 7.2 Transações

- Operações de criação e atualização devem ser atômicas
- Eventos devem ser registrados junto com a execução
- Rollback em caso de falha de validação

## 8. Respostas

### 8.1 Sucesso

- 201 Created — criação bem-sucedida
- 200 OK — atualização/listagem bem-sucedida
- 204 No Content — exclusão bem-sucedida (não aplicável neste módulo)

### 8.2 Erro

- 400 Bad Request — dados inválidos
- 404 Not Found — registro não encontrado
- 409 Conflict — conflito de dados
- 422 Unprocessable Entity — validação falhou
- 500 Internal Server Error — erro interno

## 9. Logging

- Log de criação de execução
- Log de atualização de execução
- Log de eventos operacionais
- Log de erros de validação
- Log de integrações com outros módulos
