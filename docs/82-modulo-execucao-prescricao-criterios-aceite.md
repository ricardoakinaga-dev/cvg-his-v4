# Modulo Execucao de Prescricao / Enfermagem — Critérios de Aceite

## 1. Visão Geral

Este documento descreve os critérios de aceite do módulo Execução de Prescrição / Enfermagem.

## 2. Critérios Funcionais

### 2.1 Criação de Execução

- [ ] Deve ser possível criar uma execução vinculada a uma prescrição válida
- [ ] Deve ser possível criar uma execução vinculada a um item de prescrição válido
- [ ] Deve ser possível criar uma execução vinculada a um atendimento válido
- [ ] Deve ser possível criar uma execução vinculada a um paciente válido
- [ ] Deve ser possível criar uma execução vinculada a um tutor válido
- [ ] Deve ser possível criar uma execução vinculada a uma internação válida (opcional)
- [ ] Deve ser possível definir `executionStatus` na criação
- [ ] Deve ser possível definir `scheduledFor` na criação
- [ ] Deve ser possível definir `createdByUserId` na criação
- [ ] Deve ser possível definir `updatedByUserId` na criação

### 2.2 Atualização de Execução

- [ ] Deve ser possível atualizar uma execução existente
- [ ] Deve ser possível atualizar `executionStatus`
- [ ] Deve ser possível atualizar `administeredAt`
- [ ] Deve ser possível atualizar `notAdministeredAt`
- [ ] Deve ser possível atualizar `suspendedAt`
- [ ] Deve ser possível atualizar `cancelledAt`
- [ ] Deve ser possível atualizar `routeUsed`
- [ ] Deve ser possível atualizar `dosageGiven`
- [ ] Deve ser possível atualizar `dosageUnit`
- [ ] Deve ser possível atualizar `executionNotes`
- [ ] Deve ser possível atualizar `nonExecutionReason`
- [ ] Deve ser possível atualizar `delayReason`
- [ ] Deve ser possível atualizar `administrationOutcome`
- [ ] Deve ser possível atualizar `performerUserId`
- [ ] Deve ser possível atualizar `updatedByUserId`
- [ ] Deve ser possível atualizar `requiresDoubleCheck`
- [ ] Deve ser possível atualizar `doubleCheckedByUserId`
- [ ] Deve ser possível atualizar `doubleCheckedAt`
- [ ] Deve ser possível atualizar `vitalSignsSnapshot`
- [ ] Deve ser possível atualizar `infusionRate`
- [ ] Deve ser possível atualizar `siteUsed`
- [ ] Deve ser possível atualizar `adverseReactionFlag`
- [ ] Deve ser possível atualizar `adverseReactionNotes`

### 2.3 Listagem de Execuções

- [ ] Deve ser possível listar todas as execuções
- [ ] Deve ser possível filtrar execuções por status
- [ ] Deve ser possível filtrar execuções por período
- [ ] Deve ser possível filtrar execuções por prescrição
- [ ] Deve ser possível filtrar execuções por paciente
- [ ] Deve ser possível filtrar execuções por atendimento
- [ ] Deve ser possível filtrar execuções por internação
- [ ] Deve ser possível ordenar execuções
- [ ] Deve ser possível paginar execuções
- [ ] Deve ser possível buscar execuções por texto

### 2.4 Detalhe de Execução

- [ ] Deve ser possível visualizar detalhe de uma execução
- [ ] Deve ser possível visualizar dados da prescrição
- [ ] Deve ser possível visualizar dados do item
- [ ] Deve ser possível visualizar dados do atendimento
- [ ] Deve ser possível visualizar dados do paciente
- [ ] Deve ser possível visualizar dados do tutor
- [ ] Deve ser possível visualizar dados da internação (se houver)
- [ ] Deve ser possível visualizar histórico de eventos

### 2.5 Registro de Eventos

- [ ] Deve ser possível registrar evento de criação
- [ ] Deve ser possível registrar evento de agendamento
- [ ] Deve ser possível registrar evento de administração
- [ ] Deve ser possível registrar evento de não administração
- [ ] Deve ser possível registrar evento de atraso
- [ ] Deve ser possível registrar evento de suspensão
- [ ] Deve ser possível registrar evento de retomada
- [ ] Deve ser possível registrar evento de cancelamento
- [ ] Deve ser possível registrar evento de emenda
- [ ] Deve ser possível registrar evento de checagem dupla

## 3. Critérios de Validação

### 3.1 Validação de Prescrição

- [ ] Prescrição deve existir
- [ ] Prescrição deve estar ativa
- [ ] Prescrição não pode estar cancelada

### 3.2 Validação de Item

- [ ] Item deve existir
- [ ] Item deve pertencer à prescrição
- [ ] Item deve estar ativo

### 3.3 Validação de Atendimento

- [ ] Atendimento deve existir
- [ ] Atendimento deve ser coerente com a prescrição
- [ ] Atendimento deve estar aberto/ativo

### 3.4 Validação de Paciente

- [ ] Paciente deve existir
- [ ] Paciente deve ser coerente com o atendimento

### 3.5 Validação de Tutor

- [ ] Tutor deve existir
- [ ] Tutor deve ser coerente com o paciente

### 3.6 Validação de Internação

- [ ] Quando informada, internação deve existir
- [ ] Internação deve ser coerente com o atendimento
- [ ] Internação deve estar ativa

### 3.7 Validação de Status

- [ ] `executionStatus` é obrigatório
- [ ] `executionStatus` deve respeitar valores permitidos
- [ ] Transições de status devem ser válidas

### 3.8 Validação de Campos

- [ ] `scheduledFor` é obrigatório
- [ ] `scheduledFor` deve ser uma data/hora válida
- [ ] Campos obrigatórios por status devem ser preenchidos

## 4. Critérios de Integração

### 4.1 Integração com Prescrições

- [ ] Deve ser possível selecionar prescrição ativa
- [ ] Deve ser possível selecionar item da prescrição
- [ ] Deve ser possível recuperar dados da prescrição
- [ ] Deve ser possível recuperar dados do item

### 4.2 Integração com Atendimentos

- [ ] Deve ser possível recuperar dados do atendimento
- [ ] Deve ser possível validar coerência com prescrição

### 4.3 Integração com Pacientes

- [ ] Deve ser possível recuperar dados do paciente
- [ ] Deve ser possível validar coerência com atendimento

### 4.4 Integração com Tutores

- [ ] Deve ser possível recuperar dados do tutor
- [ ] Deve ser possível validar coerência com paciente

### 4.5 Integração com Internação

- [ ] Deve ser possível recuperar dados da internação
- [ ] Deve ser possível validar coerência com atendimento

## 5. Critérios de Histórico

### 5.1 Preservação

- [ ] Histórico de execução não deve ser perdido
- [ ] Eventos não devem ser deletados
- [ ] Eventos não devem ser atualizados
- [ ] Eventos devem ser preservados

### 5.2 Recuperação

- [ ] Deve ser possível recuperar eventos por execução
- [ ] Deve ser possível recuperar eventos por período
- [ ] Deve ser possível recuperar eventos por tipo
- [ ] Deve ser possível recuperar eventos por usuário
- [ ] Eventos devem ser retornados em ordem cronológica

### 5.3 Versionamento

- [ ] Deve ser possível controlar versões da execução
- [ ] Deve ser possível encadear revisões
- [ ] Deve ser possível reconstruir cadeia de revisões

## 6. Critérios de Interface

### 6.1 Listagem

- [ ] Listagem deve exibir identificador da execução
- [ ] Listagem deve exibir prescrição/item
- [ ] Listagem deve exibir atendimento
- [ ] Listagem deve exibir paciente
- [ ] Listagem deve exibir tutor
- [ ] Listagem deve exibir internação (se houver)
- [ ] Listagem deve exibir horário previsto
- [ ] Listagem deve exibir status
- [ ] Listagem deve exibir responsável/quem executou
- [ ] Listagem deve exibir sinais de atraso/pendência
- [ ] Listagem deve ter busca e filtros

### 6.2 Formulário

- [ ] Formulário deve ter Bloco 1 — Contexto do caso
- [ ] Formulário deve ter Bloco 2 — Planejamento de execução
- [ ] Formulário deve ter Bloco 3 — Registro da execução
- [ ] Formulário deve ter Bloco 4 — Não execução / suspensão / atraso
- [ ] Formulário deve ter Bloco 5 — Snapshot operacional
- [ ] Formulário deve ter validação por campo
- [ ] Formulário deve ter mensagens de erro claras

### 6.3 Detalhe

- [ ] Detalhe deve exibir dados completos da execução
- [ ] Detalhe deve exibir dados da prescrição
- [ ] Detalhe deve exibir dados do item
- [ ] Detalhe deve exibir dados do atendimento
- [ ] Detalhe deve exibir dados do paciente
- [ ] Detalhe deve exibir dados do tutor
- [ ] Detalhe deve exibir dados da internação (se houver)
- [ ] Detalhe deve exibir histórico de eventos

## 7. Critérios Técnicos

### 7.1 Backend

- [ ] Backend deve usar banco como fonte real
- [ ] Backend não deve usar memória como fonte principal
- [ ] Backend deve validar todos os campos obrigatórios
- [ ] Backend deve validar coerência entre entidades
- [ ] Backend deve registrar eventos operacionais
- [ ] Backend deve retornar payloads coerentes

### 7.2 Frontend

- [ ] Frontend deve estar sincronizado com backend
- [ ] Frontend deve ter nomes/types/payloads coerentes
- [ ] Frontend deve ter estados de loading, error, success, empty
- [ ] Frontend deve ter validação por campo
- [ ] Frontend não deve depender de fluxo manual frágil

### 7.3 Banco

- [ ] Banco deve suportar create
- [ ] Banco deve suportar update controlado
- [ ] Banco deve suportar detail
- [ ] Banco deve suportar list
- [ ] Banco deve suportar histórico de eventos

## 8. Critérios de Não Funcional

### 8.1 Performance

- [ ] Listagem deve ser paginada
- [ ] Detalhe deve ser rápido
- [ ] Criação deve ser rápida
- [ ] Atualização deve ser rápida

### 8.2 Segurança

- [ ] Dados devem ser validados
- [ ] Autoria deve ser registrada
- [ ] Histórico deve ser preservado
- [ ] Exclusão destrutiva não deve ser implementada

### 8.3 Usabilidade

- [ ] Interface deve ser intuitiva
- [ ] Mensagens de erro devem ser claras
- [ ] Fluxo deve ser coerente
- [ ] UX não deve depender de fluxo manual frágil

## 9. Critérios de Auditoria

### 9.1 Checklist de Auditoria

- [ ] create execução funciona
- [ ] update execução funciona
- [ ] list execução funciona
- [ ] detail execução funciona
- [ ] prescrição/item sempre vinculados corretamente
- [ ] execução sempre coerente com paciente, tutor e internação quando houver
- [ ] integração com Prescrições, Internação, Prontuário, Atendimentos, Pacientes e Tutores funciona
- [ ] histórico operacional funciona
- [ ] backend usa banco como fonte real nos fluxos expostos
- [ ] frontend está sincronizado
- [ ] módulo está pronto para auditoria
