# 635 - Plano Operacional de Duas Equipes na Onda 2

## Objetivo do documento

Este documento define, com nível operacional, o escopo paralelo de duas equipes atuando simultaneamente na continuidade da `Onda 2 - Frontend Premium`, com foco em:

- consolidar a base visual e técnica da SPA Vue
- continuar a migração funcional do frontend legado SSR para a SPA
- manter a qualidade já conquistada em testes, E2E e visual regression
- reduzir risco de colisão entre frentes paralelas

## Documentos derivados

Para dar mais autonomia ao orquestrador e aos executores, este plano consolidado foi desdobrado em dois documentos independentes:

- [304-PLANO-EQUIPE-A-DESIGN-SYSTEM-VUE.md](/home/cvgserver3/.openclaw/workspace/cvg-his-v2/docs/Enterprise/304-PLANO-EQUIPE-A-DESIGN-SYSTEM-VUE.md)
- [305-PLANO-EQUIPE-B-SCHEDULING-QUEUE-SPA.md](/home/cvgserver3/.openclaw/workspace/cvg-his-v2/docs/Enterprise/305-PLANO-EQUIPE-B-SCHEDULING-QUEUE-SPA.md)

Também foram criados os documentos de execução imediata por equipe:

- [306-PLANO-EXECUCAO-IMEDIATA-EQUIPE-A.md](/home/cvgserver3/.openclaw/workspace/cvg-his-v2/docs/Enterprise/306-PLANO-EXECUCAO-IMEDIATA-EQUIPE-A.md)
- [307-PLANO-EXECUCAO-IMEDIATA-EQUIPE-B.md](/home/cvgserver3/.openclaw/workspace/cvg-his-v2/docs/Enterprise/307-PLANO-EXECUCAO-IMEDIATA-EQUIPE-B.md)

Também foram criados os artefatos de operação paralela:

- [308-QUADRO-DEPENDENCIAS-CRUZADAS-EQUIPES.md](/home/cvgserver3/.openclaw/workspace/cvg-his-v2/docs/Enterprise/308-QUADRO-DEPENDENCIAS-CRUZADAS-EQUIPES.md)
- [309-CRONOGRAMA-SEMANAL-RESUMIDO-DUAS-EQUIPES.md](/home/cvgserver3/.openclaw/workspace/cvg-his-v2/docs/Enterprise/309-CRONOGRAMA-SEMANAL-RESUMIDO-DUAS-EQUIPES.md)
- [310-LISTA-PRS-ISSUES-DUAS-EQUIPES.md](/home/cvgserver3/.openclaw/workspace/cvg-his-v2/docs/Enterprise/310-LISTA-PRS-ISSUES-DUAS-EQUIPES.md)
- [311-PAINEL-DE-ACOMPANHAMENTO-SEMANAL.md](/home/cvgserver3/.openclaw/workspace/cvg-his-v2/docs/Enterprise/311-PAINEL-DE-ACOMPANHAMENTO-SEMANAL.md)
- [312-MODELO-OPERACIONAL-ORQUESTRADOR-3-EXECUTORES.md](/home/cvgserver3/.openclaw/workspace/cvg-his-v2/docs/Enterprise/312-MODELO-OPERACIONAL-ORQUESTRADOR-3-EXECUTORES.md)

Uso recomendado:

- este arquivo `303` permanece como visão consolidada e de governança
- o arquivo `304` deve ser usado como plano autônomo da Equipe A
- o arquivo `305` deve ser usado como plano autônomo da Equipe B
- o arquivo `306` deve ser usado como backlog operacional imediato da Equipe A
- o arquivo `307` deve ser usado como backlog operacional imediato da Equipe B
- o arquivo `308` deve ser usado para gestão de dependências cruzadas
- o arquivo `309` deve ser usado como visão semanal de acompanhamento
- o arquivo `310` deve ser usado para abrir PRs e issues operacionais
- o arquivo `311` deve ser usado como ritual semanal de acompanhamento executivo-operacional
- o arquivo `312` deve ser usado como referência do novo arranjo operacional com 1 orquestrador e 3 executores

## Adendo operacional (05/04/2026)

Este plano continua válido como histórico da divisão inicial da `Onda 2`, mas o estado atual do projeto já evoluiu para um arranjo mais maduro:

- `Orquestrador`: governança, priorização, métricas, aceite executivo e coordenação de dependências
- `Executor E1`: plataforma frontend, design system, UX premium e padronização visual
- `Executor E2`: módulos operacionais, fluxos de negócio e expansão funcional da SPA
- `Executor E3`: qualidade, hardening, guardrails, evidência técnica e suporte transversal

Estado real já consolidado além do escopo original de "duas equipes":

- `Scheduling / Queue` já está entregue na SPA
- `Inpatient` já está entregue na SPA
- `Inventory` já foi aberto e avançou até list/detail/form com create/update
- o `design-system Vue` já está estabilizado com imports públicos, typecheck próprio e guardrail preventivo

Nova prioridade executiva recomendada para uma entrega `premium` e `ERP Enterprise`:

1. consolidar governança e scorecards no modelo `Orquestrador + 3 Executores`
2. fechar o hardening operacional de `Inventory` e completar seus fluxos críticos
3. elevar o nível premium do frontend com documentação, padrões de uso e componentes avançados
4. preparar o terreno real de `Onda 3` com integrações, contratos e observabilidade de ponta a ponta

## Contexto atual

O projeto já avançou materialmente na Onda 2:

- SPA em `apps/spa/` funcional com Vue 3 + Vite + Pinia + Router
- múltiplos módulos já migrados para a SPA:
  - Owners
  - Patients
  - Appointments
  - Encounters
  - Medical Records
  - Billing
  - Inpatient
  - Triage
- design system já possui base SSR-first e primeira camada de componentes Vue SFC
- cobertura de testes unitários, de página, E2E e visual regression já está em patamar alto

Com a entrada de duas equipes em paralelo, o maior ganho agora vem de dividir o trabalho em:

1. uma frente transversal de plataforma frontend
2. uma frente de produto/migração funcional

## Decisão de divisão de equipes

### Equipe A

**Missão:** consolidar o design system Vue e ampliar sua adoção nas páginas já migradas da SPA.

### Equipe B

**Missão:** migrar o próximo módulo operacional remanescente de maior maturidade para a SPA.

### Módulo escolhido para a Equipe B

O módulo recomendado para a Equipe B é `Scheduling / Queue Operacional`.

### Justificativa da escolha

- backend já maduro e endurecido
- persistência em banco já implementada
- fila operacional já possui state machine validada
- endpoints HTTP já existem
- alto valor operacional real
- ponte natural entre recepção, agenda, triagem e atendimento
- risco relativamente menor do que migrar módulos ainda mais amplos

## Princípios de execução paralela

### 1. Separação de ownership

Para evitar conflito entre equipes:

- Equipe A tem prioridade de escrita em:
  - `packages/design-system/`
  - `apps/spa/src/components/`
  - `apps/spa/src/styles/`
  - ajustes de UI em páginas já migradas
- Equipe B tem prioridade de escrita em:
  - `apps/spa/src/types/scheduling*.ts`
  - `apps/spa/src/services/scheduling*.ts`
  - `apps/spa/src/pages/scheduling/`
  - `apps/spa/src/router/routes.ts` para rotas do módulo
  - `apps/spa/src/layouts/AppLayout.vue` apenas se for necessário adicionar item de navegação
  - `apps/api/src/server.ts` apenas se faltar algum endpoint fino de apoio

### 2. Contratos estáveis

As duas equipes devem assumir como estáveis:

- stores base da SPA
- infraestrutura de testes SPA
- infraestrutura Playwright
- tokens e CSS variables do design system
- convenções de `types/`, `services/`, `pages/`

### 3. Integração incremental

Nenhuma equipe deve:

- reescrever grandes áreas já estáveis
- trocar o padrão global da SPA sem necessidade
- quebrar retrocompatibilidade com páginas migradas

### 4. Critério de valor

Cada equipe deve priorizar:

- entregas pequenas e integráveis
- ganho real de produto ou de plataforma
- redução de dívida estrutural

---

# Equipe A - Consolidação do Design System Vue

## Objetivo macro

Transformar os componentes `Ds*` em base real da SPA, reduzindo markup inline, CSS repetido e inconsistência visual entre páginas.

## Resultado esperado da equipe

Ao final desta frente, a SPA deve:

- usar componentes Vue do design system de forma mais ampla
- depender menos de markup local repetido
- ter uma base testada e confiável para UI
- ficar mais rápida de evoluir nas próximas migrações

## Fora de escopo da Equipe A

- migrar novos módulos de negócio completos
- alterar contratos de backend
- introduzir uma nova biblioteca de UI externa
- reescrever todos os componentes de uma vez
- substituir integralmente todas as páginas já migradas

## Ownership técnico da Equipe A

### Write scope principal

- `packages/design-system/`
- `apps/spa/src/components/`
- `apps/spa/src/pages/` em refactors visuais controlados
- `apps/spa/src/styles/`
- `apps/spa/tests/` e testes de componentes

### Dependências consumidas

- tokens e temas existentes
- páginas SPA já migradas
- infraestrutura de testes Vitest/Vue Test Utils

## Fases da Equipe A

## Fase A0 - Auditoria e Matriz de Adoção

### Objetivo

Mapear onde a SPA ainda repete markup, alertas, badges, formulários e cards que já poderiam usar os componentes `Ds*`.

### Subfases

#### A0.1 - Inventário de adoção atual

Levantar:

- quais páginas já usam `DsButton`, `DsInput`, `DsCard`, `DsAlert`, `DsBadge`, `DsModal`, `DsSpinner`
- quais páginas ainda usam markup local equivalente
- quais componentes ainda não estão maduros para adoção ampla

#### A0.2 - Matriz de oportunidade

Classificar páginas por:

- alto reaproveitamento
- baixo risco de refactor
- alto volume de markup duplicado
- valor de consistência visual

#### A0.3 - Definição de lote 1 e lote 2

Separar:

- lote 1: páginas de adoção imediata
- lote 2: páginas que exigem ajustes prévios no componente

### Entregáveis reais

- matriz de adoção por página
- lista de componentes prontos para expansão
- backlog de refactors priorizados

### Checklist da Fase A0

- [ ] inventário de uso atual dos componentes `Ds*`
- [ ] identificação das páginas com maior duplicação
- [ ] lista de gaps de API dos componentes
- [ ] definição de lote 1 de adoção
- [ ] definição de lote 2 de adoção

---

## Fase A1 - Hardening dos Componentes Vue Base

### Objetivo

Garantir que os componentes Vue já portados estejam suficientemente sólidos para adoção ampla.

### Componentes foco

- `DsButton`
- `DsInput`
- `DsCard`
- `DsAlert`
- `DsBadge`
- `DsModal`
- `DsSpinner`
- `DsTabs`

### Subfases

#### A1.1 - Revisão de API pública

Confirmar:

- props
- emits
- slots
- estados visuais
- comportamento de loading/disabled/error

#### A1.2 - Ajustes de acessibilidade

Validar e corrigir:

- `aria-*`
- foco visível
- labels
- keyboard behavior, quando aplicável

#### A1.3 - Estabilização de estilos

Alinhar:

- spacing
- variants
- tamanhos
- consistência com tokens
- estados hover/focus/disabled

#### A1.4 - Testes de componente

Cobrir:

- renderização
- props principais
- variantes
- loading/disabled/error
- slots relevantes
- dismiss/click/close quando houver

### Entregáveis reais

- componentes `Ds*` endurecidos
- testes unitários dos componentes Vue
- documentação de uso revisada

### Checklist da Fase A1

- [ ] API pública validada por componente
- [ ] acessibilidade revisada
- [ ] variantes visuais revisadas
- [ ] testes criados para os componentes base
- [ ] documentação atualizada

---

## Fase A2 - Adoção Ampla em Páginas da SPA

### Objetivo

Substituir markup local repetido por componentes `Ds*` nas páginas já migradas.

### Lote recomendado de adoção

#### Lote A2.1 - Páginas de autenticação e shell

- `LoginPage`
- trechos simples de `DashboardPage`
- alertas e botões do shell, quando aplicável

#### Lote A2.2 - Form pages

- `OwnerFormPage`
- `PatientFormPage`
- `AppointmentFormPage`
- `EncounterFormPage`
- possíveis formulários simples de `Triage`

#### Lote A2.3 - Detail pages

- cards de detalhe
- alerts
- modais simples
- badges de status

### Subfases

#### A2.1 - Refactor de formulários

Padronizar:

- labels
- campos
- hints
- erros
- actions footer

#### A2.2 - Refactor de cards e blocos de detalhe

Padronizar:

- seções
- cabeçalhos
- áreas de ação
- estados vazios

#### A2.3 - Refactor de feedback UI

Padronizar:

- erros
- sucesso
- warnings
- loading spinners

### Entregáveis reais

- páginas da SPA com adoção ampliada de `Ds*`
- redução visível de CSS/markup duplicado
- maior consistência visual entre módulos

### Checklist da Fase A2

- [ ] páginas prioritárias definidas
- [ ] formulários prioritários migrados para `DsInput` e `DsButton`
- [ ] alertas migrados para `DsAlert`
- [ ] cards migrados para `DsCard`
- [ ] badges/status migrados para `DsBadge` ou wrappers compatíveis
- [ ] modais simples migrados para `DsModal`
- [ ] regressão visual revisada

---

## Fase A3 - Componentes Compostos e Wrappers de Aplicação

### Objetivo

Criar camada intermediária de componentes reutilizáveis da SPA usando `Ds*` como base.

### Exemplos esperados

- `AppFormSection`
- `AppDetailSection`
- `AppPageHeader`
- `AppStatusPill`
- `AppConfirmModal`

### Subfases

#### A3.1 - Identificação de padrões repetidos

Mapear padrões que aparecem em 3+ páginas.

#### A3.2 - Extração de wrappers

Criar wrappers leves e sem acoplamento excessivo ao domínio.

#### A3.3 - Adoção seletiva

Aplicar wrappers nas páginas com maior ganho imediato.

### Entregáveis reais

- 2 a 5 wrappers reutilizáveis
- redução adicional de duplicação
- padronização mais alta da SPA

### Checklist da Fase A3

- [ ] padrões repetidos identificados
- [ ] wrappers criados
- [ ] wrappers adotados em páginas reais
- [ ] testes mínimos dos wrappers, se aplicável

---

## Fase A4 - Validação, Documentação e Gate de Pronto

### Objetivo

Fechar a frente com evidência técnica, documentação e lista residual clara.

### Entregáveis reais

- testes atualizados
- documentação de adoção do design system Vue
- lista de páginas ainda pendentes de adoção
- relatório de ganhos e limites

### Checklist da Fase A4

- [ ] `typecheck` limpo
- [ ] testes dos componentes passando
- [ ] testes da SPA passando
- [ ] docs atualizadas
- [ ] backlog residual documentado

## Critério de pronto da Equipe A

A Equipe A será considerada concluída quando:

- os componentes `Ds*` estiverem testados e prontos para uso amplo
- páginas prioritárias da SPA estiverem refatoradas para usar `Ds*`
- houver redução concreta de markup/CSS duplicado
- a documentação de uso e adoção estiver atualizada

## Riscos da Equipe A

- port excessivamente amplo gerar regressão visual
- componentes ainda imaturos serem adotados cedo demais
- refactors de muitas páginas ao mesmo tempo criarem conflito com outras frentes

## Mitigações da Equipe A

- adoção por lote
- testes e visual regression após cada lote
- foco em componentes mais maduros primeiro
- evitar mudança massiva em páginas de alto churn

---

# Equipe B - Migração do Módulo Scheduling / Queue para a SPA

## Objetivo macro

Migrar para a SPA o próximo módulo operacional remanescente de maior valor e maturidade: `Scheduling / Queue Operacional`.

## Resultado esperado da equipe

Ao final desta frente, a SPA deve possuir uma primeira versão funcional do fluxo de agenda operacional e fila:

- listagem de appointments
- criação controlada de appointment
- cancelamento de appointment
- visualização da queue operacional
- check-in, chamada e transições suportadas pela API

## Fora de escopo da Equipe B

- reconstruir todo o módulo de agenda enterprise final
- views complexas de calendário com drag-and-drop
- otimização de recursos/profissionais ainda não suportados pela API
- alocação inteligente
- reformulação do backend além do necessário para a migração

## Ownership técnico da Equipe B

### Write scope principal

- `apps/spa/src/types/scheduling*.ts`
- `apps/spa/src/services/scheduling*.ts`
- `apps/spa/src/pages/scheduling/`
- `apps/spa/src/router/routes.ts`
- `apps/spa/src/layouts/AppLayout.vue` apenas para navegação
- testes SPA do módulo

### Write scope secundário

- `apps/api/src/server.ts` se algum endpoint fino ainda faltar
- docs do módulo e scorecard

## Fases da Equipe B

## Fase B0 - Auditoria Funcional do Scheduling Atual

### Objetivo

Fechar o mapa real entre:

- SSR legado
- backend/API atual
- queue operacional persistida
- UX mínima viável para a SPA

### Subfases

#### B0.1 - Auditoria do SSR

Ler e consolidar:

- páginas legadas de scheduling
- rotas e componentes da web antiga
- diferenças de UX em relação ao backend atual

#### B0.2 - Auditoria da API real

Confirmar contratos de:

- `GET /appointments`
- `POST /appointments`
- `POST /appointments/:id/cancel`
- `GET /queue`
- `POST /queue/check-in`
- `POST /queue/:id/call`
- demais endpoints disponíveis ou ausentes

#### B0.3 - Auditoria das regras operacionais

Confirmar:

- conflito por janela de 30 minutos
- regras de cancelamento
- state machine da queue
- estados e labels reais

### Entregáveis reais

- mapa SSR vs API
- lista de divergências funcionais
- escopo exato do MVP SPA de scheduling

### Checklist da Fase B0

- [ ] SSR auditado
- [ ] API auditada
- [ ] regras operacionais documentadas
- [ ] divergências mapeadas
- [ ] MVP funcional definido

---

## Fase B1 - Base do Módulo na SPA

### Objetivo

Criar a espinha dorsal do módulo na SPA.

### Subfases

#### B1.1 - Tipos

Criar tipos claros para:

- `AppointmentSummary`
- `CreateAppointmentRequest`
- `CancelAppointmentRequest`
- `QueueEntrySummary`
- `QueueStatus`
- `AppointmentStatus`
- `SchedulingListResponse`

#### B1.2 - Service layer

Criar serviços para:

- listar appointments
- criar appointment
- cancelar appointment
- listar queue
- realizar check-in
- chamar queue entry
- outras transições mínimas que a API suporte

#### B1.3 - Rotas SPA

Adicionar rotas para:

- `/scheduling`
- `/scheduling/new`
- `/queue`
- telas de detalhe, se fizer sentido no MVP

### Entregáveis reais

- arquivos `types/`
- arquivos `services/`
- rotas integradas
- link de navegação no shell

### Checklist da Fase B1

- [ ] tipos do domínio criados
- [ ] serviços do módulo criados
- [ ] rotas definidas
- [ ] navegação adicionada

---

## Fase B2 - Appointments na SPA

### Objetivo

Entregar a primeira fatia da agenda na SPA.

### Subfases

#### B2.1 - List page de appointments

Deve cobrir:

- carregamento
- erro
- vazio
- dados reais
- labels de status
- horários
- filtros simples se suportados

#### B2.2 - Form de criação

Deve cobrir:

- patient
- owner quando aplicável
- horário
- validações
- conflito tratado com feedback

#### B2.3 - Cancelamento

Deve cobrir:

- ação explícita de cancelar
- motivo opcional se suportado
- feedback de sucesso/erro

### Entregáveis reais

- `SchedulingListPage`
- `SchedulingFormPage`
- cancelamento funcional

### Checklist da Fase B2

- [ ] listagem funcional de appointments
- [ ] create funcional
- [ ] cancel funcional
- [ ] feedback de erro/validação funcionando
- [ ] integração com API real funcionando

---

## Fase B3 - Queue Operacional na SPA

### Objetivo

Entregar a fila operacional como fluxo SPA utilizável.

### Subfases

#### B3.1 - Queue list / board

Mostrar:

- entries na ordem operacional
- prioridade
- paciente
- status atual
- hora de check-in

#### B3.2 - Check-in

Permitir:

- check-in de appointment
- criação da queue entry associada
- atualização visual da fila

#### B3.3 - Call / transições mínimas

Permitir:

- chamar entry
- mover para estados suportados pela API
- refletir state machine na UI

### Entregáveis reais

- `QueuePage` funcional
- ação de check-in funcional
- ação de call funcional
- estados operacionais visíveis

### Checklist da Fase B3

- [ ] queue list funcionando
- [ ] check-in funcionando
- [ ] call funcionando
- [ ] labels e transições visíveis
- [ ] feedback de erro/sucesso funcionando

---

## Fase B4 - Hardening do Módulo Scheduling na SPA

### Objetivo

Fechar a migração com qualidade mínima equivalente aos demais módulos SPA.

### Subfases

#### B4.1 - Testes unitários/de página

Cobrir:

- list page
- form page
- queue page
- ações críticas

#### B4.2 - Testes E2E

Adicionar, se couber:

- fluxo create appointment
- check-in
- cancelamento
- queue transition suportada

#### B4.3 - Visual regression

Adicionar snapshot em:

- scheduling list
- queue page

### Entregáveis reais

- testes do módulo
- E2E proporcional
- snapshots proporcionais

### Checklist da Fase B4

- [ ] unit/page tests do módulo
- [ ] E2E mínimo do módulo, se viável
- [ ] visual regression, se estável
- [ ] docs atualizadas

---

## Fase B5 - Fechamento e Backlog Residual

### Objetivo

Fechar o módulo com clareza do que ficou dentro e fora do MVP.

### Entregáveis reais

- relatório de escopo entregue
- backlog residual do scheduling SPA
- gaps conhecidos entre SSR e SPA

### Checklist da Fase B5

- [ ] docs atualizadas
- [ ] scorecard atualizado
- [ ] backlog residual documentado
- [ ] critérios de aceite final checados

## Critério de pronto da Equipe B

A Equipe B será considerada concluída quando:

- o módulo `Scheduling / Queue` estiver funcional na SPA
- a integração com a API real estiver validada
- a fila operacional estiver utilizável no frontend novo
- testes proporcionais tiverem sido adicionados
- documentação de escopo e gaps residuais estiver atualizada

## Riscos da Equipe B

- divergência entre UX legada e API real
- state machine da queue exigir UX mais sofisticada do que o MVP suporta
- conflitos de agenda e cancelamento gerarem edge cases operacionais
- write overlap com outras páginas já migradas

## Mitigações da Equipe B

- seguir a API real como fonte de verdade
- entregar MVP operacional antes de UX sofisticada
- limitar o escopo inicial a list/create/cancel/queue/check-in/call
- documentar explicitamente o que fica fora do MVP

---

# Quadro Consolidado de Entregáveis

## Equipe A

### Entregáveis obrigatórios

- auditoria de adoção dos componentes `Ds*`
- endurecimento dos componentes Vue base
- testes dos componentes Vue
- adoção ampliada em páginas reais da SPA
- wrappers compostos de aplicação, se fizer sentido
- documentação atualizada

### Entregáveis desejáveis

- redução significativa de CSS duplicado
- redução significativa de markup repetido
- maior consistência visual em formulários e detalhes

## Equipe B

### Entregáveis obrigatórios

- auditoria do módulo `Scheduling / Queue`
- tipos e services do módulo
- listagem de appointments
- formulário de criação de appointment
- cancelamento de appointment
- queue page funcional
- check-in e call operacionais
- testes proporcionais
- documentação atualizada

### Entregáveis desejáveis

- E2E mínimo do scheduling
- visual regression das telas do módulo
- filtros simples de agenda/queue

---

# Sequenciamento Recomendado

## Semana 1

### Equipe A

- Fase A0
- início da Fase A1

### Equipe B

- Fase B0
- Fase B1

## Semana 2

### Equipe A

- fechamento da Fase A1
- início da Fase A2

### Equipe B

- Fase B2

## Semana 3

### Equipe A

- continuação da Fase A2
- início da Fase A3

### Equipe B

- Fase B3
- início da Fase B4

## Semana 4

### Equipe A

- Fase A3
- Fase A4

### Equipe B

- Fase B4
- Fase B5

---

# Critérios de Governança

## Checkpoint semanal obrigatório

Cada equipe deve reportar:

- o que foi entregue
- o que está em andamento
- bloqueios
- arquivos com maior churn
- riscos novos
- o que já está pronto para integração

## Regras de merge

- nada entra sem `typecheck`
- nada entra sem testes proporcionais ao risco
- páginas alteradas devem manter compatibilidade visual mínima
- mudanças de contrato em API precisam ser documentadas

## Risco de colisão entre equipes

### Áreas de atenção

- `apps/spa/src/router/routes.ts`
- `apps/spa/src/layouts/AppLayout.vue`
- componentes compartilhados da SPA
- docs de scorecard e relatório consolidado

### Estratégia

- agrupar alterações nessas áreas em janelas coordenadas
- evitar múltiplos refactors estruturais simultâneos
- usar PRs pequenos e integráveis

---

# Definição de sucesso desta etapa paralela

Esta etapa com duas equipes será considerada bem-sucedida quando:

- a Equipe A consolidar a camada Vue do design system em páginas reais
- a Equipe B entregar `Scheduling / Queue` funcional na SPA
- a qualidade do projeto permanecer estável:
  - typecheck limpo
  - testes verdes
  - E2E e visual regression sem regressão relevante
- a documentação refletir com clareza o que foi entregue e o que ficou residual

## Síntese final

- **Equipe A** fortalece a plataforma frontend
- **Equipe B** amplia a cobertura funcional da SPA
- **Equipe A** reduz dívida estrutural
- **Equipe B** entrega valor operacional visível
- As duas frentes podem avançar em paralelo com baixo conflito se respeitarem ownership e checkpoints
