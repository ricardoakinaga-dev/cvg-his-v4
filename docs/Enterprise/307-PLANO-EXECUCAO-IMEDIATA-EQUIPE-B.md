# 307 - Plano de Execução Imediata da Equipe B

## Objetivo

Este documento converte o plano estratégico da `Equipe B` em um plano de execução imediata, com foco em:

- backlog por sprint
- entregáveis por semana
- definição de pronto por fase
- ordem sugerida de PRs

## Escopo da Equipe B

A Equipe B é responsável por migrar o módulo `Scheduling / Queue Operacional` para a SPA Vue.

Documento de referência principal:

- [305-PLANO-EQUIPE-B-SCHEDULING-QUEUE-SPA.md](/home/cvgserver3/.openclaw/workspace/cvg-his-v2/docs/Enterprise/305-PLANO-EQUIPE-B-SCHEDULING-QUEUE-SPA.md)

## Resultado esperado ao final da execução

- appointments utilizáveis na SPA
- queue operacional visível e funcional
- check-in e chamada de fila funcionando
- integração com API real validada
- testes proporcionais ao módulo entregues

---

## Estratégia de execução

### Princípios

- seguir a API real como fonte de verdade
- entregar o módulo em fatias utilizáveis
- não tentar construir agenda enterprise final de uma vez
- priorizar fluxo operacional antes de UX sofisticada

### Cadência sugerida

- horizonte inicial: `4 semanas`
- 1 sprint por semana
- 1 checkpoint funcional no meio da semana
- 1 validação integrada no final da semana

---

## Sprint 1 - Auditoria e fundação do módulo

### Objetivo do sprint

Fechar o mapa SSR vs API e criar a espinha dorsal do módulo na SPA.

### Backlog do sprint

#### B0.1 - Auditoria do legado

- revisar páginas SSR de scheduling
- mapear diferenças entre UX legada e contrato real da API

#### B0.2 - Auditoria do backend

- revisar endpoints de appointments
- revisar endpoints de queue
- revisar regras de conflito
- revisar regras de cancelamento
- revisar state machine da queue

#### B1.1 - Tipos do módulo

- `AppointmentSummary`
- `AppointmentStatus`
- `CreateAppointmentRequest`
- `CancelAppointmentRequest`
- `QueueEntrySummary`
- `QueueStatus`
- tipos de lista e filtros

#### B1.2 - Service layer

- list appointments
- create appointment
- cancel appointment
- get queue
- check-in
- call queue entry

#### B1.3 - Rotas e navegação

- `/scheduling`
- `/scheduling/new`
- `/queue`
- item de navegação na SPA

### Entregáveis reais da semana

- auditoria funcional do módulo
- estrutura base do módulo criada na SPA
- tipos e services implementados
- rotas configuradas

### Checklist da semana

- [ ] SSR auditado
- [ ] API auditada
- [ ] regras operacionais documentadas
- [ ] tipos criados
- [ ] services criados
- [ ] rotas adicionadas
- [ ] navegação adicionada

### Definição de pronto do Sprint 1

O Sprint 1 será considerado pronto quando:

- a equipe tiver clareza formal do MVP do módulo
- a estrutura base da SPA estiver pronta para começar as telas
- a integração com a API já puder ser exercitada via service layer

### Ordem sugerida de PRs

1. `PR-B1-01` Auditoria SSR/API + documentação de escopo
2. `PR-B1-02` Tipos e services do módulo
3. `PR-B1-03` Rotas e navegação do módulo

---

## Sprint 2 - Listagem e criação de appointments

### Objetivo do sprint

Entregar a primeira fatia visível e utilizável de agenda na SPA.

### Backlog do sprint

#### B2.1 - SchedulingListPage

Implementar:

- loading
- error
- empty
- data state
- labels de status
- horários
- ações principais

#### B2.2 - SchedulingFormPage

Implementar:

- formulário de criação
- seleção de paciente
- owner quando aplicável
- data/hora
- visit type ou equivalente suportado
- validações
- tratamento de conflito

#### B2.3 - Cancelamento de appointment

Implementar:

- ação de cancelamento
- feedback de sucesso
- feedback de erro
- atualização do estado na UI

### Entregáveis reais da semana

- listagem funcional de appointments
- criação funcional
- cancelamento funcional

### Checklist da semana

- [ ] list page pronta
- [ ] form page pronta
- [ ] create funcionando
- [ ] cancel funcionando
- [ ] conflito tratado com feedback
- [ ] integração com API real validada

### Definição de pronto do Sprint 2

O Sprint 2 será considerado pronto quando:

- um usuário conseguir listar appointments
- um usuário conseguir criar appointment
- um usuário conseguir cancelar appointment elegível
- a UI refletir corretamente os estados principais

### Ordem sugerida de PRs

1. `PR-B2-01` Scheduling list page
2. `PR-B2-02` Scheduling form page
3. `PR-B2-03` Cancelamento e feedback operacional

---

## Sprint 3 - Queue operacional

### Objetivo do sprint

Entregar a fila operacional na SPA com as principais ações reais do backend.

### Backlog do sprint

#### B3.1 - QueuePage

Implementar:

- loading
- error
- empty
- data state
- ordenação operacional
- prioridade
- status
- horários

#### B3.2 - Check-in

Implementar:

- ação de check-in
- reflexão na queue
- atualização visual do appointment quando necessário

#### B3.3 - Call / transições mínimas

Implementar:

- chamar queue entry
- refletir status
- validar restrições da API na UI

### Entregáveis reais da semana

- queue page funcional
- check-in funcional
- call funcional

### Checklist da semana

- [ ] queue page pronta
- [ ] check-in pronto
- [ ] call pronto
- [ ] labels/status corretos
- [ ] feedback de erro/sucesso correto
- [ ] integração com API real validada

### Definição de pronto do Sprint 3

O Sprint 3 será considerado pronto quando:

- a queue puder ser visualizada na SPA
- o fluxo appointment -> check-in -> queue estiver funcionando
- a chamada operacional da fila estiver visível e utilizável

### Ordem sugerida de PRs

1. `PR-B3-01` Queue page
2. `PR-B3-02` Check-in flow
3. `PR-B3-03` Call e transições mínimas

---

## Sprint 4 - Hardening, testes e fechamento

### Objetivo do sprint

Fechar o módulo com qualidade, documentação e backlog residual claros.

### Backlog do sprint

#### B4.1 - Testes de página

Cobrir:

- scheduling list
- scheduling form
- queue page

#### B4.2 - Testes de interação

Cobrir:

- create success/error
- cancel success/error
- check-in success/error
- call success/error, se aplicável

#### B4.3 - E2E proporcional

Se viável no sprint:

- create appointment
- check-in
- presença na queue

#### B5.1 - Documentação e backlog residual

Atualizar:

- docs do módulo
- scorecard
- relatório consolidado
- backlog residual do scheduling SPA

### Entregáveis reais da semana

- testes proporcionais do módulo
- documentação atualizada
- backlog residual claro

### Checklist da semana

- [ ] page tests do módulo
- [ ] interaction tests do módulo
- [ ] E2E mínimo, se viável
- [ ] docs do módulo atualizadas
- [ ] scorecard atualizado
- [ ] backlog residual documentado
- [ ] `typecheck` limpo

### Definição de pronto do Sprint 4

O Sprint 4 será considerado pronto quando:

- o módulo estiver funcional e testado na SPA
- a documentação deixar claro o que foi entregue
- houver uma lista objetiva do que ainda fica para evolução futura

### Ordem sugerida de PRs

1. `PR-B4-01` Testes de página e interação
2. `PR-B4-02` E2E proporcional do módulo
3. `PR-B4-03` Documentação + backlog residual

---

## Quadro de PRs sugerido da Equipe B

### Bloco 1 - Fundação

- `PR-B1-01`
- `PR-B1-02`
- `PR-B1-03`

### Bloco 2 - Appointments

- `PR-B2-01`
- `PR-B2-02`
- `PR-B2-03`

### Bloco 3 - Queue

- `PR-B3-01`
- `PR-B3-02`
- `PR-B3-03`

### Bloco 4 - Fechamento

- `PR-B4-01`
- `PR-B4-02`
- `PR-B4-03`

---

## Critérios globais de pronto da Equipe B

- `Scheduling / Queue` funcional na SPA
- list/create/cancel de appointments funcionando
- queue visível e operacional
- check-in e call funcionando
- testes proporcionais entregues
- documentação e backlog residual atualizados

## Riscos operacionais

- divergência entre SSR e backend real
- UX do módulo exigir mais complexidade do que o backend suporta hoje
- edge cases operacionais de conflito e estado
- necessidade de pequenos endpoints finos adicionais

## Mitigações

- usar sempre a API real como fonte de verdade
- manter MVP enxuto
- documentar gaps explicitamente
- quebrar em PRs pequenos e funcionais

## Indicadores de acompanhamento

- número de rotas reais do módulo já entregues
- número de ações reais suportadas pela UI
- cobertura de testes do módulo
- estabilidade do fluxo appointment -> queue
