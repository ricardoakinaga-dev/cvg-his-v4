# Modulo Execucao de Prescricao / Enfermagem — Gate de Auditoria

## 1. Visão Geral

Este documento descreve o gate de auditoria do módulo Execução de Prescrição / Enfermagem.

## 2. Checklist Obrigatório

### 2.1 Funcionalidades Básicas

- [ ] create execução funciona
- [ ] update execução funciona
- [ ] list execução funciona
- [ ] detail execução funciona

### 2.2 Vínculos

- [ ] prescrição/item sempre vinculados corretamente
- [ ] execução sempre coerente com paciente, tutor e internação quando houver

### 2.3 Integrações

- [ ] integração com Prescrições funciona
- [ ] integração com Atendimentos funciona
- [ ] integração com Pacientes funciona
- [ ] integração com Tutores funciona
- [ ] integração com Internação funciona
- [ ] integração com Prontuário funciona

### 2.4 Histórico

- [ ] histórico operacional funciona
- [ ] eventos são registrados corretamente
- [ ] histórico é preservado
- [ ] versionamento funciona

### 2.5 Backend

- [ ] backend usa banco como fonte real nos fluxos expostos
- [ ] backend não usa memória como fonte principal
- [ ] backend valida todos os campos obrigatórios
- [ ] backend valida coerência entre entidades
- [ ] backend registra eventos operacionais
- [ ] backend retorna payloads coerentes

### 2.6 Frontend

- [ ] frontend está sincronizado com backend
- [ ] frontend tem nomes/types/payloads coerentes
- [ ] frontend tem estados de loading, error, success, empty
- [ ] frontend tem validação por campo
- [ ] frontend não depende de fluxo manual frágil

### 2.7 Testes

- [ ] testes focados passando
- [ ] typecheck passando
- [ ] build passando

## 3. Critérios de Aceite

### 3.1 Funcionalidade

- [ ] Execução é registrada corretamente
- [ ] Vínculo com prescrição, item, atendimento, paciente, tutor e internação é obrigatório e funcional
- [ ] Fluxo assistencial operacional é coerente
- [ ] Histórico de execução é preservado
- [ ] Frontend, backend e banco estão sincronizados

### 3.2 Qualidade

- [ ] Código está limpo e organizado
- [ ] Validações são rigorosas
- [ ] Erros são tratados adequadamente
- [ ] Logs são registrados
- [ ] Performance é adequada

### 3.3 Manutenibilidade

- [ ] Código é legível
- [ ] Código é documentado
- [ ] Código é testável
- [ ] Código é extensível

## 4. Validações de Auditoria

### 4.1 Validação de Prescrição

- [ ] Prescrição existe
- [ ] Prescrição está ativa
- [ ] Prescrição não está cancelada

### 4.2 Validação de Item

- [ ] Item existe
- [ ] Item pertence à prescrição
- [ ] Item está ativo

### 4.3 Validação de Atendimento

- [ ] Atendimento existe
- [ ] Atendimento é coerente com a prescrição
- [ ] Atendimento está aberto/ativo

### 4.4 Validação de Paciente

- [ ] Paciente existe
- [ ] Paciente é coerente com o atendimento

### 4.5 Validação de Tutor

- [ ] Tutor existe
- [ ] Tutor é coerente com o paciente

### 4.6 Validação de Internação

- [ ] Quando informada, internação existe
- [ ] Internação é coerente com o atendimento
- [ ] Internação está ativa

### 4.7 Validação de Status

- [ ] `executionStatus` é obrigatório
- [ ] `executionStatus` respeita valores permitidos
- [ ] Transições de status são válidas

### 4.8 Validação de Campos

- [ ] `scheduledFor` é obrigatório
- [ ] `scheduledFor` é uma data/hora válida
- [ ] Campos obrigatórios por status são preenchidos

## 5. Testes de Auditoria

### 5.1 Testes de Criação

- [ ] Criar execução com sucesso
- [ ] Criar execução com internação
- [ ] Rejeitar criação sem prescrição
- [ ] Rejeitar criação com prescrição inexistente
- [ ] Rejeitar criação com item incoerente
- [ ] Rejeitar criação com atendimento incoerente
- [ ] Rejeitar criação com paciente incoerente
- [ ] Rejeitar criação com tutor incoerente
- [ ] Rejeitar criação com internação incoerente

### 5.2 Testes de Atualização

- [ ] Atualizar execução com sucesso
- [ ] Atualizar status para administered
- [ ] Atualizar status para not_administered
- [ ] Atualizar status para delayed
- [ ] Atualizar status para suspended
- [ ] Atualizar status para cancelled
- [ ] Rejeitar atualização de execução inexistente
- [ ] Rejeitar atualização com dados inválidos

### 5.3 Testes de Listagem

- [ ] Listar execuções com sucesso
- [ ] Listar execuções vazias
- [ ] Filtrar execuções por status
- [ ] Filtrar execuções por período
- [ ] Filtrar execuções por prescrição
- [ ] Filtrar execuções por paciente
- [ ] Buscar execuções por texto

### 5.4 Testes de Detalhe

- [ ] Detalhar execução com sucesso
- [ ] Rejeitar detalhe de execução inexistente

### 5.5 Testes de Eventos

- [ ] Registrar evento de criação
- [ ] Registrar evento de administração
- [ ] Registrar evento de não administração
- [ ] Registrar evento de atraso
- [ ] Registrar evento de suspensão
- [ ] Registrar evento de cancelamento
- [ ] Registrar evento de checagem dupla
- [ ] Listar eventos por execução

### 5.6 Testes de Validação

- [ ] Validar prescrição obrigatória
- [ ] Validar item obrigatório
- [ ] Validar atendimento obrigatório
- [ ] Validar paciente obrigatório
- [ ] Validar tutor obrigatório
- [ ] Validar status obrigatório
- [ ] Validar scheduledFor obrigatório
- [ ] Validar coerência prescrição/item
- [ ] Validar coerência atendimento/prescrição
- [ ] Validar coerência paciente/atendimento
- [ ] Validar coerência tutor/paciente
- [ ] Validar coerência internação/atendimento

### 5.7 Testes de Integração

- [ ] Integração com Prescrições
- [ ] Integração com Atendimentos
- [ ] Integração com Pacientes
- [ ] Integração com Tutores
- [ ] Integração com Internação

### 5.8 Testes de Histórico

- [ ] Preservação de histórico
- [ ] Recuperação de histórico
- [ ] Versionamento

### 5.9 Testes de Autoria

- [ ] createdByUserId preenchido
- [ ] updatedByUserId preenchido
- [ ] performerUserId preenchido

## 6. Decisão

### 6.1 Opções

- Apto para auditoria
- Apto com restrições
- Não apto

### 6.2 Critérios de Decisão

#### Apto para auditoria

- Todos os critérios de aceite atendidos
- Todos os testes passando
- Build e typecheck passando
- Código limpo e organizado
- Documentação completa

#### Apto com restrições

- Maioria dos critérios de aceite atendidos
- Testes principais passando
- Build e typecheck passando
- Pendências não críticas identificadas
- Plano de correção definido

#### Não apto

- Critérios de aceite não atendidos
- Testes falhando
- Build ou typecheck falhando
- Código com problemas graves
- Documentação incompleta

## 7. Registro de Auditoria

### 7.1 Informações do Auditor

- Nome do auditor
- Data da auditoria
- Versão do módulo

### 7.2 Resultados

- Critérios atendidos
- Critérios não atendidos
- Testes passando
- Testes falhando
- Pendências identificadas
- Riscos identificados

### 7.3 Decisão Final

- Decisão tomada
- Justificativa
- Condições (se aplicável)
- Plano de ação (se aplicável)

## 8. Pós-Auditoria

### 8.1 Se Apto

- Documentar aprovação
- Registrar pendências futuras
- Comunicar stakeholders
- Preparar para produção

### 8.2 Se Apto com Restrições

- Documentar restrições
- Criar plano de correção
- Definir prazos
- Acompanhar correções

### 8.3 Se Não Apto

- Documentar reprovação
- Identificar problemas críticos
- Criar plano de correção
- Reagendar auditoria
