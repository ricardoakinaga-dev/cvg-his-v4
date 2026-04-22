# Fase funcional — Financeiro — observabilidade gerencial visível na UI

Data: 2026-04-22
Status: concluído
Escopo: Financeiro > Cadastros > Custos e Despesas

## Objetivo do bloco

Levar a trilha auditável do domínio financeiro para dentro da superfície operacional do módulo, transformando a auditoria backend em leitura gerencial visível, semântica e filtrável por:
- ação
- entidade/id afetado
- correlationId

## O que foi implementado

### 1. Timeline operacional embutida em `Custos e Despesas`

Arquivo principal:
- `apps/spa/src/pages/finance/ExpensesPage.vue`

Foi adicionada uma nova seção visível no módulo:
- `Linha do tempo operacional do Financeiro`

Essa seção consome eventos de auditoria e mostra apenas a trilha relevante do domínio financeiro:
- módulo `billing`
- entidades `expense-catalog`
- entidades `cost-center-catalog`

Eventos de outras áreas, como integrações/webhooks, são filtrados para fora da leitura do módulo.

### 2. Leitura semântica gerencial

A UI agora exibe a trilha auditável em formato de timeline com:
- ação do evento
- entidade e id afetado
- correlationId em destaque visual
- payloadSummary já enriquecido no bloco anterior
- data/hora do evento
- ator responsável

Isso transforma a trilha de backend em uma superfície operacional diretamente utilizável por coordenação financeira e backoffice.

### 3. Filtros operacionais na timeline

Foram adicionados filtros dedicados para a timeline:
- `Filtrar por ação ou resumo da trilha`
- `Filtrar por entidade ou id afetado`
- `Filtrar por correlationId`

Esses filtros são client-side sobre a trilha já carregada e permitem investigar rapidamente uma sequência de alterações específicas.

### 4. KPIs da trilha financeira

A seção também passou a expor indicadores rápidos:
- total de eventos
- eventos de despesas
- eventos de centros de custo
- total de trilhas correlacionadas

Isso ajuda a operação a entender volume e distribuição da atividade recente do catálogo financeiro.

## TDD executado

### RED

Arquivo endurecido:
- `apps/spa/src/pages/finance/__tests__/ExpensesPage.test.ts`

Novos cenários escritos primeiro:
- renderizar timeline semântica apenas com eventos do Financeiro
- filtrar a timeline por ação, entidade e correlationId

Falhas RED iniciais confirmaram que:
- a página ainda não buscava `auditService.listEvents()`
- não havia os campos visuais/inputs da timeline

### GREEN

Após a implementação em `ExpensesPage.vue`, a suíte passou a validar:
- consumo de auditoria no carregamento da página
- filtro de eventos apenas do módulo `billing`
- exclusão de eventos de módulos externos
- leitura visível de payloads enriquecidos
- filtros funcionais por ação, entidade e correlationId

## Arquivos alterados

### SPA
- `apps/spa/src/pages/finance/ExpensesPage.vue`
- `apps/spa/src/pages/finance/__tests__/ExpensesPage.test.ts`

## Validações executadas

### SPA focado
Comando:
- `npm test -- src/pages/finance/__tests__/ExpensesPage.test.ts src/pages/finance/__tests__/CostCentersPage.test.ts src/services/__tests__/api.test.ts`

Resultado:
- `Test Files 3 passed (3)`
- `Tests 14 passed (14)`

### API focado
Comando:
- `pnpm exec tsx --test src/routes/expenses-catalog-routes.test.ts`

Resultado:
- `3 tests`, `3 pass`, `0 fail`

### Regressão representativa SPA
Comando:
- `npm test -- src/navigation.test.ts src/router/routes.test.ts src/pages/__tests__/EnterpriseSurfaces.test.ts src/pages/finance/__tests__/CardsPage.test.ts src/pages/finance/__tests__/ExpensesPage.test.ts src/pages/finance/__tests__/CostCentersPage.test.ts src/services/__tests__/api.test.ts`

Resultado:
- `Test Files 7 passed (7)`
- `Tests 45 passed (45)`

## Ganho de produto

Com este bloco, `Custos e Despesas` deixa de ser apenas um CRUD com backend e passa a oferecer:
- visibilidade operacional da mudança
- rastreabilidade semântica por trilha
- leitura gerencial embutida no próprio módulo
- ponte real entre auditoria técnica e acompanhamento funcional

## Decisão consolidada

A superfície primária de observabilidade funcional do catálogo financeiro passa a nascer dentro do próprio módulo operacional, não apenas em telas genéricas de auditoria enterprise.

## Próximo passo recomendado

Bloco 4:
- expandir a mesma leitura gerencial para `Centros de Custo`
- avaliar drill-down por correlationId com agrupamento visual
- considerar timeline combinada com paginação/recência e ação de refresh independente
- preparar eventual ponte com `Console Enterprise > Auditoria` via deep-link filtrado para o contexto financeiro
