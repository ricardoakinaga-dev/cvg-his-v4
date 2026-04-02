# Modulo Execucao de Prescricao / Enfermagem — Fluxo Operacional

## 1. Visão Geral

Este documento descreve os fluxos operacionais do módulo Execução de Prescrição / Enfermagem.

## 2. Fluxo Principal

### 2.1 Fluxo de Criação de Execução

1. Prescrição ativa com itens
2. Equipe identifica item a ser executado
3. Equipe registra execução (ou não execução)
4. Sistema salva com autoria, tempo e status
5. Histórico operacional preservado

### 2.2 Fluxo Detalhado

#### Etapa 1: Identificação da Prescrição

- Localizar prescrição ativa
- Verificar status da prescrição
- Verificar itens disponíveis

#### Etapa 2: Seleção do Item

- Abrir contexto do item prescrito
- Verificar status do item
- Verificar coerência com prescrição

#### Etapa 3: Registro da Execução

- Preencher dados da execução
- Registrar status
- Registrar data/hora
- Registrar responsável

#### Etapa 4: Persistência

- Salvar execução no banco
- Registrar evento operacional
- Atualizar histórico

#### Etapa 5: Confirmação

- Confirmar criação
- Retornar dados da execução
- Atualizar interface

## 3. Fluxos Específicos

### 3.1 Fluxo de Administração

1. Abrir execução pendente
2. Registrar data/hora de administração
3. Registrar responsável
4. Registrar resultado da administração
5. Registrar observações
6. Salvar
7. Status alterado para `administered`

### 3.2 Fluxo de Não Administração

1. Abrir execução pendente
2. Registrar data/hora de não administração
3. Registrar motivo da não execução
4. Registrar observações
5. Salvar
6. Status alterado para `not_administered`

### 3.3 Fluxo de Atraso

1. Abrir execução pendente
2. Registrar motivo do atraso
3. Registrar observações
4. Salvar
5. Status alterado para `delayed`

### 3.4 Fluxo de Suspensão

1. Abrir execução pendente ou atrasada
2. Registrar data/hora de suspensão
3. Registrar observações
4. Salvar
5. Status alterado para `suspended`

### 3.5 Fluxo de Cancelamento

1. Abrir execução pendente, atrasada ou suspensa
2. Registrar data/hora de cancelamento
3. Registrar observações
4. Salvar
5. Status alterado para `cancelled`

## 4. Fluxos de Integração

### 4.1 Fluxo a partir de Prescrição

1. Abrir detalhe da prescrição
2. Listar itens da prescrição
3. Selecionar item para execução
4. Clicar "Executar item"
5. Abrir formulário com contexto preenchido
6. Registrar execução
7. Salvar
8. Voltar ao histórico do caso

### 4.2 Fluxo a partir de Internação

1. Abrir detalhe da internação
2. Listar prescrições da internação
3. Selecionar prescrição
4. Selecionar item para execução
5. Clicar "Registrar execução"
6. Abrir formulário com contexto preenchido
7. Registrar execução
8. Salvar
9. Voltar ao histórico do caso

### 4.3 Fluxo a partir de Atendimento

1. Abrir detalhe do atendimento
2. Listar prescrições do atendimento
3. Selecionar prescrição
4. Selecionar item para execução
5. Clicar "Executar item"
6. Abrir formulário com contexto preenchido
7. Registrar execução
8. Salvar
9. Voltar ao histórico do caso

## 5. Fluxos de Visualização

### 5.1 Fluxo de Listagem

1. Acessar listagem de execuções
2. Visualizar execuções pendentes
3. Filtrar por status
4. Filtrar por período
5. Filtrar por prescrição
6. Filtrar por paciente
7. Ordenar resultados
8. Paginar resultados

### 5.2 Fluxo de Detalhe

1. Selecionar execução na listagem
2. Abrir detalhe da execução
3. Visualizar dados da execução
4. Visualizar dados da prescrição
5. Visualizar dados do item
6. Visualizar dados do atendimento
7. Visualizar dados do paciente
8. Visualizar dados do tutor
9. Visualizar dados da internação (se houver)
10. Visualizar histórico de eventos

## 6. Fluxos de Atualização

### 6.1 Fluxo de Atualização de Execução

1. Abrir execução existente
2. Editar campos permitidos
3. Salvar alterações
4. Registrar evento de atualização
5. Atualizar interface

### 6.2 Fluxo de Checagem Dupla

1. Abrir execução que requer checagem dupla
2. Registrar usuário que fez a checagem
3. Registrar data/hora da checagem
4. Salvar
5. Registrar evento de checagem dupla

## 7. Fluxos de Histórico

### 7.1 Fluxo de Recuperação de Histórico

1. Selecionar execução
2. Listar eventos da execução
3. Ordenar eventos por data/hora
4. Visualizar detalhes de cada evento
5. Visualizar snapshot de cada evento

### 7.2 Fluxo de Preservação de Histórico

1. Criar execução → evento `created`
2. Agendar execução → evento `scheduled`
3. Administrar execução → evento `administered`
4. Não administrar execução → evento `not_administered`
5. Atrasar execução → evento `delayed`
6. Suspender execução → evento `suspended`
7. Retomar execução → evento `resumed`
8. Cancelar execução → evento `cancelled`
9. Emendar execução → evento `amended`
10. Checagem dupla → evento `double_checked`

## 8. Fluxos de Validação

### 8.1 Fluxo de Validação de Prescrição

1. Verificar se prescrição existe
2. Verificar se prescrição está ativa
3. Verificar se prescrição não está cancelada
4. Retornar erro se inválida

### 8.2 Fluxo de Validação de Item

1. Verificar se item existe
2. Verificar se item pertence à prescrição
3. Verificar se item está ativo
4. Retornar erro se inválido

### 8.3 Fluxo de Validação de Atendimento

1. Verificar se atendimento existe
2. Verificar se atendimento é coerente com a prescrição
3. Verificar se atendimento está aberto/ativo
4. Retornar erro se inválido

### 8.4 Fluxo de Validação de Paciente

1. Verificar se paciente existe
2. Verificar se paciente é coerente com o atendimento
3. Retornar erro se inválido

### 8.5 Fluxo de Validação de Tutor

1. Verificar se tutor existe
2. Verificar se tutor é coerente com o paciente
3. Retornar erro se inválido

### 8.6 Fluxo de Validação de Internação

1. Verificar se internação existe (quando informada)
2. Verificar se internação é coerente com o atendimento
3. Verificar se internação está ativa
4. Retornar erro se inválida

## 9. Fluxos de Erro

### 9.1 Fluxo de Erro de Validação

1. Detectar erro de validação
2. Registrar erro
3. Retornar mensagem de erro clara
4. Indicar campo com erro
5. Permitir correção

### 9.2 Fluxo de Erro de Persistência

1. Detectar erro de persistência
2. Registrar erro
3. Fazer rollback se necessário
4. Retornar mensagem de erro
5. Permitir retry

### 9.3 Fluxo de Erro de Integração

1. Detectar erro de integração
2. Registrar erro
3. Retornar mensagem de erro
4. Indicar módulo com problema
