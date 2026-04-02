# Modulo Execucao de Prescricao / Enfermagem — Frontend

## 1. Visão Geral

O frontend do módulo Execução de Prescrição / Enfermagem fornece interface para gestão de execuções de prescrição, incluindo listagem, criação, atualização e detalhamento, com integração aos módulos de Prescrições, Internação, Prontuário, Atendimentos, Pacientes e Tutores.

## 2. Arquivo Principal

- `apps/web/src/pages/nursing-executions.ts`

## 3. Componentes

### 3.1 Listagem

#### Colunas Obrigatórias

- Identificador da execução
- Prescrição/item
- Atendimento
- Paciente
- Tutor
- Internação (se houver)
- Horário previsto
- Status
- Responsável/quem executou
- Sinais de atraso/pendência

#### Funcionalidades

- Busca por texto
- Filtros por status
- Filtros por período
- Filtros por prescrição
- Filtros por paciente
- Paginação
- Ordenação

### 3.2 Formulário de Criação/Edição

#### Bloco 1 — Contexto do Caso

- Prescrição (seleção)
- Item prescrito (seleção)
- Atendimento (preenchido automaticamente)
- Paciente (preenchido automaticamente)
- Tutor (preenchido automaticamente)
- Internação (preenchido automaticamente, se houver)

#### Bloco 2 — Planejamento de Execução

- `scheduledFor` — Data/hora prevista
- `routeUsed` — Via de administração
- `dosageGiven` — Dosagem planejada
- `requiresDoubleCheck` — Requer checagem dupla

#### Bloco 3 — Registro da Execução

- `executionStatus` — Status
- `administeredAt` — Data/hora de administração
- `performerUserId` — Responsável
- `administrationOutcome` — Resultado
- `executionNotes` — Observações

#### Bloco 4 — Não Execução / Suspensão / Atraso

- `notAdministeredAt` — Data/hora de não administração
- `nonExecutionReason` — Motivo da não execução
- `delayReason` — Motivo do atraso
- `suspendedAt` — Data/hora de suspensão
- `cancelledAt` — Data/hora de cancelamento
- `adverseReactionFlag` — Flag de reação adversa
- `adverseReactionNotes` — Notas sobre reação adversa

#### Bloco 5 — Snapshot Operacional

- `vitalSignsSnapshot` — Sinais vitais
- `siteUsed` — Local utilizado
- `infusionRate` — Taxa de infusão
- Observações adicionais

### 3.3 Detalhe

- Visualização completa da execução
- Histórico de eventos
- Dados da prescrição
- Dados do atendimento
- Dados do paciente
- Dados do tutor
- Dados da internação (se houver)

## 4. Estados da Interface

### 4.1 Loading

- Indicador de carregamento durante requisições
- Skeleton loading para listagem
- Spinner para operações de criação/atualização

### 4.2 Error

- Mensagens de erro claras
- Indicação de campos com erro
- Possibilidade de retry

### 4.3 Success

- Confirmação de operações bem-sucedidas
- Redirecionamento após criação
- Atualização automática da listagem

### 4.4 Empty

- Mensagem quando não há execuções
- Sugestão de ação quando lista vazia

## 5. Validações Frontend

### 5.1 Validação por Campo

- Campos obrigatórios marcados
- Validação em tempo real
- Mensagens de erro por campo
- Impedir envio de dados inválidos

### 5.2 Validação de Formulário

- Verificar todos os campos obrigatórios
- Verificar coerência entre campos
- Verificar formato de datas
- Verificar relacionamentos

## 6. Integrações Frontend

### 6.1 Com Prescrições

- Seleção de prescrição ativa
- Seleção de item prescrito
- Preenchimento automático de contexto

### 6.2 Com Atendimentos

- Visualização do atendimento
- Preenchimento automático

### 6.3 Com Pacientes

- Visualização do paciente
- Preenchimento automático

### 6.4 Com Tutores

- Visualização do tutor
- Preenchimento automático

### 6.5 Com Internação

- Visualização da internação
- Preenchimento automático

## 7. Fluxos de Navegação

### 7.1 Criação a partir de Prescrição

1. Abrir detalhe da prescrição
2. Clicar "Executar item"
3. Abrir formulário com contexto preenchido
4. Registrar execução
5. Salvar
6. Voltar ao histórico do caso

### 7.2 Criação a partir de Internação

1. Abrir detalhe da internação
2. Clicar "Registrar execução"
3. Abrir formulário com contexto preenchido
4. Registrar execução
5. Salvar
6. Voltar ao histórico do caso

### 7.3 Edição

1. Abrir listagem de execuções
2. Selecionar execução
3. Editar campos
4. Salvar
5. Atualizar listagem

## 8. UX

### 8.1 Regras Obrigatórias

- Não aceitar ID manual de prescrição, item, atendimento, paciente, tutor e internação como caminho principal
- Usar contexto de entidades salvas
- Permitir criação a partir do contexto da prescrição e/ou da internação
- Implementar estados de loading, error, success, empty quando aplicável
- Implementar validação por campo
- Manter sincronização de names/types/payload com backend

### 8.2 Feedback

- Confirmação de criação
- Confirmação de atualização
- Mensagens de erro claras
- Indicadores de progresso

## 9. Sincronização com Backend

- Nomes de campos devem corresponder
- Tipos de dados devem corresponder
- Payloads devem ser coerentes
- Enums devem ser iguais
- Validações devem ser consistentes
