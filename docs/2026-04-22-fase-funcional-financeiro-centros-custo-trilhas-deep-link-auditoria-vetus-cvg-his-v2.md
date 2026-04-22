# Fase funcional — Financeiro — centros de custo com trilhas agrupadas e deep-link para auditoria

Data: 2026-04-22
Status: concluído
Escopo: Financeiro > Cadastros > Centros de Custo

## Objetivo do bloco

Expandir a observabilidade gerencial já iniciada em `Custos e Despesas` para `Centros de Custo`, adicionando:
- leitura gerencial visível no próprio módulo
- agrupamento visual por `correlationId`
- navegação profunda para a tela central de Auditoria com filtros pré-hidratados

## O que foi implementado

### 1. Timeline gerencial em `Centros de Custo`

Arquivo principal:
- `apps/spa/src/pages/finance/CostCentersPage.vue`

Foi criada uma seção nova no módulo:
- `Linha do tempo gerencial dos Centros de Custo`

Essa seção consome `auditService.listEvents()` e filtra somente eventos relevantes do domínio:
- `module = billing`
- `entityType = cost-center-catalog`

Eventos de outros módulos continuam fora da superfície financeira.

### 2. Agrupamento por `correlationId`

A leitura da trilha agora não é apenas uma lista plana. Os eventos passam a ser organizados por trilha transacional, usando:
- `correlationId`

Cada grupo mostra:
- o correlationId da trilha
- os eventos pertencentes àquela sequência
- summaries semânticos do backend
- um botão de navegação profunda para a Auditoria central

Esse agrupamento melhora a leitura operacional de mudanças compostas, especialmente quando uma mesma ação gerencial gera mais de um evento relacionado.

### 3. Filtro local por `correlationId`

Na própria página de Centros de Custo foi adicionado:
- `Filtrar por correlationId da trilha`

Isso permite ao operador isolar rapidamente uma investigação específica dentro do domínio financeiro.

### 4. Deep-link para `Console Enterprise > Auditoria`

Cada trilha agrupada agora expõe ação direta:
- `Abrir Auditoria`

O deep-link navega para `/audit` com query params predefinidos, incluindo:
- `q`
- `correlationId`
- `entity`

### 5. Hidratação de filtros na tela de Auditoria

Arquivo alterado:
- `apps/spa/src/pages/audit/AuditPage.vue`

A página de Auditoria passou a aceitar hidratação inicial de filtros a partir de `route.query`:
- `q`
- `entity`
- `correlationId`

Também foram adicionados novos campos visuais de filtro na Auditoria para suportar esse fluxo profundo:
- filtro por entidade/id afetado
- filtro por correlationId

Isso transforma a Auditoria central em destino navegável contextualizado, e não apenas uma listagem genérica.

## TDD executado

### RED

Arquivos endurecidos:
- `apps/spa/src/pages/finance/__tests__/CostCentersPage.test.ts`
- `apps/spa/src/pages/audit/__tests__/AuditPage.test.ts`

Novos cenários adicionados:
- timeline gerencial de Centros de Custo deve consumir auditoria do domínio financeiro
- eventos externos não devem aparecer na superfície de Centros de Custo
- filtros por `correlationId` devem funcionar na página
- CTA `Abrir Auditoria` deve existir como navegação profunda
- `AuditPage` deve hidratar filtros com base em `route.query`

As falhas RED confirmaram a ausência do consumo de auditoria em `CostCentersPage` e da hidratação por query na `AuditPage`.

### GREEN

Após a implementação:
- `CostCentersPage` passou a carregar e agrupar a trilha financeira
- `AuditPage` passou a ler filtros iniciais do contexto de rota
- o fluxo ponta a ponta ficou suportado pela UI

## Arquivos alterados

### SPA
- `apps/spa/src/pages/finance/CostCentersPage.vue`
- `apps/spa/src/pages/finance/__tests__/CostCentersPage.test.ts`
- `apps/spa/src/pages/audit/AuditPage.vue`
- `apps/spa/src/pages/audit/__tests__/AuditPage.test.ts`

## Validações executadas

### Testes focados de Centros de Custo
Comando:
- `npm test -- src/pages/finance/__tests__/CostCentersPage.test.ts`

Resultado:
- verde
- `Test Files 1 passed (1)`
- `Tests 1 passed (1)`

### Testes focados de Auditoria
Comando:
- `npm test -- src/pages/audit/__tests__/AuditPage.test.ts`

Resultado:
- verde
- `Test Files 1 passed (1)`
- `Tests 6 passed (6)`

### Regressão representativa SPA
Comando:
- `npm test -- src/navigation.test.ts src/router/routes.test.ts src/pages/__tests__/EnterpriseSurfaces.test.ts src/pages/audit/__tests__/AuditPage.test.ts src/pages/finance/__tests__/CardsPage.test.ts src/pages/finance/__tests__/ExpensesPage.test.ts src/pages/finance/__tests__/CostCentersPage.test.ts src/services/__tests__/api.test.ts`

Resultado:
- verde
- `Test Files 8 passed (8)`
- `Tests 51 passed (51)`

Observação:
- permaneceram warnings não bloqueantes do Vue em montagem enterprise para `useRoute` sem provider explícito, mas com `exit code 0` e regressão verde.

## Ganho de produto

Com este bloco, `Centros de Custo` passa a oferecer:
- leitura gerencial própria da trilha de mudança
- agrupamento transacional por `correlationId`
- ponte direta para auditoria aprofundada
- navegação contextual entre módulo operacional e console enterprise

## Decisão consolidada

A observabilidade financeira deixa de ser apenas local por página ou genérica por console. Agora existe uma malha navegável entre:
- página operacional do subdomínio
- trilha agrupada por correlação
- auditoria central com filtros pré-aplicados

## Próximo passo recomendado

Bloco 5:
- consolidar um padrão visual único de observabilidade financeira entre `Custos e Despesas` e `Centros de Custo`
- adicionar drill-down mais explícito por grupo/trilha expandível
- avaliar endpoint backend específico de auditoria financeira filtrada para reduzir carga e tornar a UI menos dependente da listagem global de auditoria
- considerar navegação cruzada bidirecional da Auditoria central de volta para a página funcional de origem
