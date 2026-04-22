# Fase funcional — Financeiro — padrão unificado de observabilidade, drill-down expandível e endpoint filtrado

Data: 2026-04-22
Status: concluído
Escopo: Financeiro > Custos e Despesas + Centros de Custo + Auditoria central

## Objetivo do bloco

Consolidar um padrão único de observabilidade financeira entre as superfícies operacionais do domínio, adicionando:
- padrão visual mais consistente entre Custos e Despesas e Centros de Custo
- drill-down expandível por trilha/grupo
- endpoint backend com filtros específicos para auditoria
- navegação de ida e volta entre a Auditoria central e a superfície funcional de origem

## O que foi implementado

### 1. Endpoint backend específico de auditoria filtrada

Arquivos:
- `apps/api/src/routes/access-control-routes.ts`
- `apps/api/src/routes/access-control-audit-events.test.ts`

O endpoint `GET /audit/events` foi enriquecido para aceitar filtros por query string:
- `module`
- `entity`
- `entityType` (múltiplo)
- `correlationId`
- `q`
- `limit`

Isso permitiu deixar a UI financeira menos dependente da leitura global “bruta” da auditoria, trazendo um caminho de consulta mais específico e mais barato em processamento client-side.

### 2. `auditService.listEvents(filters)` na SPA

Arquivo:
- `apps/spa/src/services/audit.ts`

A camada cliente passou a suportar filtros tipados de auditoria, incluindo:
- `module`
- `entity`
- `entityTypes`
- `correlationId`
- `q`
- `limit`

Com isso:
- `ExpensesPage` pede só eventos financeiros relevantes
- `CostCentersPage` pede só eventos de `cost-center-catalog`

### 3. Padrão visual unificado entre as duas superfícies financeiras

Arquivos:
- `apps/spa/src/pages/finance/ExpensesPage.vue`
- `apps/spa/src/pages/finance/CostCentersPage.vue`

As duas páginas passaram a convergir para o mesmo padrão de leitura auditável:
- trilhas agrupadas por `correlationId`
- cards/containers homogêneos
- CTA `Abrir Auditoria`
- leitura semântica por evento
- filtro local da trilha
- visual em grupo expansível

### 4. Drill-down expandível por trilha/grupo

Agora, nas duas páginas, a trilha financeira não é mais apenas lista plana:
- os eventos ficam agrupados por `correlationId`
- cada grupo é renderizado em bloco expansível (`details/summary`)
- o operador pode abrir/fechar a trilha conforme necessidade

Isso melhora a legibilidade de fluxos compostos e reduz ruído visual.

### 5. Navegação de volta da Auditoria central para a origem funcional

Arquivo:
- `apps/spa/src/pages/audit/AuditPage.vue`

A Auditoria central passou a reconhecer, via query params:
- `origin`
- `originLabel`

Quando presentes, a tela mostra botão de retorno contextual, por exemplo:
- `Voltar para Custos e Despesas`
- `Voltar para Centros de Custo`

Isso fecha o ciclo de navegação e transforma a Auditoria central em drill-down real, não em ruptura de contexto.

## TDD executado

### RED

Arquivos endurecidos:
- `apps/spa/src/pages/finance/__tests__/ExpensesPage.test.ts`
- `apps/spa/src/pages/finance/__tests__/CostCentersPage.test.ts`
- `apps/spa/src/pages/audit/__tests__/AuditPage.test.ts`
- `apps/api/src/routes/access-control-audit-events.test.ts`

Novas exigências de teste:
- `auditService.listEvents()` deve ser chamado com filtros específicos do domínio
- `ExpensesPage` deve manter CTA de drill-down para Auditoria
- `CostCentersPage` deve manter agrupamento financeiro por trilha
- `AuditPage` deve renderizar botão de volta contextual
- backend deve filtrar `GET /audit/events` por parâmetros financeiros

### GREEN

Após implementação:
- backend filtrado ficou verde em teste dedicado
- as páginas financeiras passaram a pedir somente o recorte necessário
- o fluxo ida/volta com Auditoria foi materializado
- a regressão representativa permaneceu verde

## Arquivos alterados

### Backend
- `apps/api/src/routes/access-control-routes.ts`
- `apps/api/src/routes/access-control-audit-events.test.ts`

### SPA
- `apps/spa/src/services/audit.ts`
- `apps/spa/src/pages/finance/ExpensesPage.vue`
- `apps/spa/src/pages/finance/CostCentersPage.vue`
- `apps/spa/src/pages/audit/AuditPage.vue`
- `apps/spa/src/pages/finance/__tests__/ExpensesPage.test.ts`
- `apps/spa/src/pages/finance/__tests__/CostCentersPage.test.ts`
- `apps/spa/src/pages/audit/__tests__/AuditPage.test.ts`

## Validações executadas

### API focado
Comando:
- `pnpm exec tsx --test src/routes/access-control-audit-events.test.ts`

Resultado:
- verde
- `1 test`, `1 pass`

### SPA regressão representativa
Comando:
- `npm test -- src/navigation.test.ts src/router/routes.test.ts src/pages/__tests__/EnterpriseSurfaces.test.ts src/pages/audit/__tests__/AuditPage.test.ts src/pages/finance/__tests__/CardsPage.test.ts src/pages/finance/__tests__/ExpensesPage.test.ts src/pages/finance/__tests__/CostCentersPage.test.ts src/services/__tests__/api.test.ts`

Resultado:
- verde
- `Test Files 8 passed (8)`
- `Tests 51 passed (51)`

## Ganho de produto

Este bloco fecha a primeira versão coerente da malha de observabilidade financeira:
- páginas financeiras com trilhas expandidas e agrupadas
- backend com filtro específico para auditoria
- Auditoria central com retorno contextual
- padrão mais homogêneo entre subdomínios adjacentes

## Decisão consolidada

A observabilidade financeira deve operar em três níveis conectados:
1. filtro backend específico (`/audit/events` com query params)
2. lente operacional contextual nas páginas do domínio
3. drill-down central em Auditoria com retorno contextual para a origem

## Próximo passo recomendado

Bloco 6:
- extrair um componente compartilhado de observabilidade financeira para eliminar duplicação entre `ExpensesPage` e `CostCentersPage`
- avaliar paginação/limite incremental da trilha auditável
- considerar endpoint dedicado `/audit/events/finance` ou `/financial/audit-events` se o volume crescer
- preparar analytics/telemetria adicional por usuário, centro e categoria
