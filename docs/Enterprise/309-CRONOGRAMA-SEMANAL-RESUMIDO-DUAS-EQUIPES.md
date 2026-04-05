# 309 - Cronograma Semanal Resumido de Acompanhamento das Duas Equipes

## Objetivo

Oferecer um cronograma curto, semanal e operacional para acompanhamento das duas equipes sem obrigar leitura integral dos planos detalhados.

## Horizonte recomendado

- 4 semanas
- 2 equipes em paralelo
- checkpoints fixos por semana

## Legenda

- `A` = Equipe A
- `B` = Equipe B
- `M` = milestone
- `G` = gate de integração

---

## Semana 1

### Equipe A

- auditoria de adoção dos componentes `Ds*`
- revisão de API dos componentes base
- início dos testes dos componentes Vue

### Equipe B

- auditoria do legado SSR de scheduling
- auditoria dos endpoints reais de appointments e queue
- criação de tipos e services do módulo
- início das rotas base do módulo

### Milestones da semana

- `M1-A` componentes base auditados
- `M1-B` contrato real de scheduling consolidado

### Gate de integração

- `G1` congelar API dos componentes base da sprint

### Saída esperada

- Equipe A pronta para começar adoção
- Equipe B pronta para começar telas reais

---

## Semana 2

### Equipe A

- adoção de `Ds*` nas form pages prioritárias
- padronização de alerts, hints e footer de ação
- limpeza inicial de CSS local

### Equipe B

- `SchedulingListPage`
- `SchedulingFormPage`
- create appointment
- cancelamento de appointment

### Milestones da semana

- `M2-A` formulários prioritários usando `Ds*`
- `M2-B` appointments funcionais na SPA

### Gate de integração

- `G2` validar se formulários de scheduling já podem aderir ao padrão da Equipe A

### Saída esperada

- Equipe A com padrão visual estabelecido nos forms
- Equipe B com primeira entrega visível do módulo

---

## Semana 3

### Equipe A

- adoção em detail pages prioritárias
- criação de wrappers compostos
- aplicação seletiva dos wrappers

### Equipe B

- `QueuePage`
- check-in operacional
- call de fila
- labels e state machine refletidas na UI

### Milestones da semana

- `M3-A` wrappers compostos em uso real
- `M3-B` queue funcional na SPA

### Gate de integração

- `G3` revisar `routes.ts`, `AppLayout.vue` e visual regression antes de merge das telas finais de scheduling

### Saída esperada

- Equipe A reduzindo repetição estrutural
- Equipe B entregando fluxo operacional completo do módulo

---

## Semana 4

### Equipe A

- fechamento da adoção do lote
- revisão final de backlog residual
- atualização de documentação

### Equipe B

- testes de página
- testes de interação
- E2E proporcional, se viável
- documentação do módulo

### Milestones da semana

- `M4-A` design system Vue consolidado como base da SPA
- `M4-B` scheduling/queue funcional e validado

### Gate de integração

- `G4` typecheck + testes + visual regression + docs

### Saída esperada

- duas frentes concluídas e integradas
- scorecard e consolidado atualizados

---

## Ritual semanal recomendado

### Segunda

- revisar backlog da semana
- confirmar áreas de alto churn
- confirmar PRs prioritários

### Quarta

- checkpoint técnico curto
- revisar bloqueios cruzados
- congelar mudanças breaking da semana

### Sexta

- revisar entregáveis da semana
- validar testes, docs e scorecard
- confirmar o que segue para a semana seguinte

---

## Quadro resumido por equipe

| Semana | Equipe A | Equipe B |
|-------|----------|----------|
| 1 | audit + hardening de componentes | audit + tipos/services/rotas do scheduling |
| 2 | adoção em formulários | appointments list/create/cancel |
| 3 | detail pages + wrappers | queue/check-in/call |
| 4 | fechamento + docs | testes + docs + hardening |

---

## Indicadores semanais de acompanhamento

### Equipe A

- quantidade de componentes estabilizados
- quantidade de páginas adotando `Ds*`
- quantidade de testes dos componentes

### Equipe B

- quantidade de rotas reais do módulo entregues
- quantidade de ações reais funcionando
- quantidade de testes do módulo entregues

---

## Sinal de alerta

Acionar revisão do plano se ocorrer um dos seguintes:

- mais de 2 PRs em conflito no mesmo arquivo compartilhado
- regressão visual em páginas já estabilizadas
- Equipe B bloqueada por API de componente por mais de 1 dia
- Equipe A travada por mudanças funcionais em páginas com alto churn
