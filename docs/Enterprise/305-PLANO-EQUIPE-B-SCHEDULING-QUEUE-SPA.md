# 305 - Plano da Equipe B - Migração do Scheduling / Queue para a SPA

## Objetivo do documento

Este documento isola o escopo operacional da `Equipe B`, permitindo execução autônoma da frente de produto responsável por migrar o próximo módulo operacional remanescente mais valioso para a SPA.

O módulo alvo desta equipe é:

- `Scheduling / Queue Operacional`

## Missão da Equipe B

Migrar o fluxo operacional de agenda e fila para a SPA Vue, respeitando a API real e a modelagem endurecida já existente no backend.

## Resultado esperado

Ao final desta frente, a SPA deve oferecer um MVP funcional de scheduling/queue com:

- listagem de appointments
- criação de appointment
- cancelamento de appointment
- visualização da queue
- check-in operacional
- chamada de fila
- estados coerentes com a state machine já implementada

## Justificativa da escolha do módulo

O módulo `Scheduling / Queue Operacional` foi escolhido porque:

- possui backend maduro
- já tem persistência real em banco
- já possui state machine da queue validada
- já possui regras de cancelamento e conflito endurecidas
- entrega valor operacional alto
- faz ponte entre recepção, agenda, triagem e atendimento

## Contexto funcional e técnico já existente

O backend já possui:

- `GET /appointments`
- `POST /appointments`
- `POST /appointments/:id/cancel`
- `GET /queue`
- `POST /queue/check-in`
- `POST /queue/:id/call`

O domínio já implementa:

- persistência de `appointments`
- persistência de `scheduling_queue_entries`
- validação de conflito por janela de 30 minutos
- cancelamento controlado
- state machine explícita da queue

## Fora de escopo

- calendário visual completo com drag-and-drop
- otimização por profissional ou recurso ainda não suportada pelo backend
- alocação inteligente
- agenda enterprise completa estilo produto final
- reformulação ampla do backend além do necessário para o MVP SPA

## Ownership técnico

### Áreas prioritárias de escrita

- `apps/spa/src/types/scheduling*.ts`
- `apps/spa/src/services/scheduling*.ts`
- `apps/spa/src/pages/scheduling/`
- `apps/spa/src/router/routes.ts`
- `apps/spa/src/layouts/AppLayout.vue` apenas para link de navegação
- testes do módulo na SPA

### Áreas secundárias de escrita

- `apps/api/src/server.ts` se faltar algum endpoint fino
- documentação do módulo
- scorecard e relatório consolidado

## Dependências que a equipe pode assumir como estáveis

- infraestrutura base da SPA
- stores e auth da SPA
- design system e componentes base
- infraestrutura de testes da SPA
- infraestrutura Playwright e visual regression

---

## Fase B0 - Auditoria Funcional e Definição do MVP

### Objetivo

Fechar o mapa real entre legado SSR, API atual e MVP SPA viável.

### Subfase B0.1 - Auditoria do legado SSR

Ler e consolidar:

- páginas legadas de scheduling
- comportamentos da agenda antiga
- diferenças entre UX legada e backend atual

### Subfase B0.2 - Auditoria da API real

Confirmar:

- contratos dos endpoints disponíveis
- payloads reais
- limitações da API
- respostas de erro
- regras de transição

### Subfase B0.3 - Auditoria da regra operacional

Confirmar:

- regra de conflito de 30 minutos
- estados de appointments
- estados de queue
- labels reais
- ações realmente suportadas

### Entregáveis reais da fase

- matriz SSR vs API
- lista de divergências
- definição formal do MVP SPA

### Checklist

- [ ] SSR auditado
- [ ] API auditada
- [ ] regras operacionais consolidadas
- [ ] labels e status reais documentados
- [ ] MVP funcional definido

---

## Fase B1 - Fundação do Módulo na SPA

### Objetivo

Criar a estrutura base do módulo em `apps/spa/`.

### Subfase B1.1 - Tipos do domínio

Criar tipos para:

- `AppointmentSummary`
- `AppointmentStatus`
- `CreateAppointmentRequest`
- `CancelAppointmentRequest`
- `QueueEntrySummary`
- `QueueStatus`
- `CheckInRequest`
- respostas de lista relevantes

### Subfase B1.2 - Service layer

Criar métodos para:

- listar appointments
- criar appointment
- cancelar appointment
- listar queue
- realizar check-in
- chamar queue entry
- demais transições mínimas suportadas

### Subfase B1.3 - Rotas e navegação

Criar rotas para:

- `/scheduling`
- `/scheduling/new`
- `/queue`

Adicionar item de menu na SPA, se necessário.

### Entregáveis reais da fase

- tipos criados
- serviços criados
- rotas adicionadas
- navegação integrada

### Checklist

- [ ] tipos do módulo criados
- [ ] services criados
- [ ] rotas configuradas
- [ ] item de navegação adicionado

---

## Fase B2 - Appointments na SPA

### Objetivo

Entregar a primeira fatia funcional de agenda operacional.

### Subfase B2.1 - Listagem de appointments

A list page deve cobrir:

- loading
- error
- empty
- data state
- labels de status
- horários
- ordenação coerente

### Subfase B2.2 - Criação de appointment

A form page deve cobrir:

- paciente
- owner quando aplicável
- horário
- validações
- tratamento de conflito
- feedback de sucesso e erro

### Subfase B2.3 - Cancelamento

A list/detail deve permitir:

- cancelar appointment elegível
- exibir feedback
- refletir o novo status

### Entregáveis reais da fase

- `SchedulingListPage`
- `SchedulingFormPage`
- ação de cancelamento funcional

### Checklist

- [ ] listagem funcional de appointments
- [ ] criação funcional
- [ ] cancelamento funcional
- [ ] feedback de conflito funcionando
- [ ] integração real com API validada

---

## Fase B3 - Queue Operacional na SPA

### Objetivo

Entregar a fila operacional na SPA, respeitando a state machine do backend.

### Subfase B3.1 - Queue list / queue board

A queue page deve exibir:

- entries ordenadas corretamente
- prioridade
- paciente
- horário de check-in
- status atual

### Subfase B3.2 - Check-in

A UI deve permitir:

- check-in de appointment elegível
- criação/atualização da queue entry
- feedback visual claro

### Subfase B3.3 - Call e transições mínimas

A UI deve permitir:

- chamar queue entry
- mover estados suportados pela API, se houver endpoint disponível
- refletir restrições da state machine

### Entregáveis reais da fase

- `QueuePage`
- fluxo de check-in
- ação de call
- estados operacionais visíveis

### Checklist

- [ ] queue page funcional
- [ ] check-in funcional
- [ ] call funcional
- [ ] labels/status coerentes
- [ ] feedback de erro e sucesso funcionando

---

## Fase B4 - Hardening do Módulo Scheduling na SPA

### Objetivo

Fechar o módulo com qualidade equivalente aos demais módulos já migrados.

### Subfase B4.1 - Testes de página

Cobrir:

- list page
- form page
- queue page
- ações críticas

### Subfase B4.2 - Testes de interação

Cobrir:

- create com sucesso
- conflito/erro
- cancelamento
- check-in
- call, se houver fluxo de UI estável

### Subfase B4.3 - E2E proporcional

Adicionar, se couber:

- create appointment
- localizar na agenda
- check-in
- refletir queue

### Subfase B4.4 - Visual regression proporcional

Adicionar snapshots para:

- list page
- queue page

### Entregáveis reais da fase

- testes de página
- testes de interação
- E2E proporcional
- visual regression proporcional

### Checklist

- [ ] unit/page tests do módulo
- [ ] testes de interação do módulo
- [ ] E2E mínimo do módulo, se viável
- [ ] visual regression do módulo, se estável
- [ ] documentação técnica atualizada

---

## Fase B5 - Fechamento, Documentação e Backlog Residual

### Objetivo

Fechar a migração deixando claro o que entrou no MVP e o que ficou para as próximas ondas.

### Subfase B5.1 - Documentação funcional

Documentar:

- o que foi entregue na SPA
- quais fluxos ainda dependem do legado
- quais diferenças existem entre SSR e SPA

### Subfase B5.2 - Lista residual

Documentar backlog residual, por exemplo:

- visualização de calendário mais rica
- filtros mais avançados
- conflito por profissional/recurso
- ações adicionais da queue

### Entregáveis reais da fase

- documentação final do módulo migrado
- backlog residual priorizado
- atualização do scorecard

### Checklist

- [ ] documentação do módulo atualizada
- [ ] backlog residual documentado
- [ ] scorecard atualizado
- [ ] relatório consolidado atualizado

---

## Critério de pronto da Equipe B

A frente será considerada concluída quando:

- o módulo `Scheduling / Queue` estiver funcional na SPA
- a integração com a API real estiver validada
- appointments e queue estiverem utilizáveis pelo frontend novo
- testes proporcionais tiverem sido entregues
- documentação do que entrou e do que ficou residual estiver atualizada

## Entregáveis obrigatórios consolidados

- auditoria SSR vs API
- tipos e services do módulo
- listagem de appointments
- criação de appointment
- cancelamento de appointment
- queue page funcional
- check-in e call mínimos
- testes proporcionais
- documentação atualizada

## Riscos

- divergência entre UX legada e contrato real da API
- state machine exigir mais UX do que o MVP suporta
- conflitos operacionais nos fluxos de agenda
- endpoints finos faltando para completar a UX

## Mitigações

- seguir a API real como fonte de verdade
- entregar MVP operacional antes de UX avançada
- documentar explicitamente os gaps residuais
- limitar a primeira entrega a list/create/cancel/queue/check-in/call

## Indicadores de sucesso

- módulo `Scheduling / Queue` acessível pela SPA
- ações principais operacionais funcionando
- cobertura mínima de testes do módulo
- ausência de regressões relevantes nos módulos já migrados

## Próximo passo natural após esta frente

Após a entrega de `Scheduling / Queue`, o caminho natural é:

- migrar o próximo módulo operacional remanescente
- enriquecer agenda com filtros e views mais avançadas
- conectar melhor queue, triage e encounter em fluxos E2E adicionais
