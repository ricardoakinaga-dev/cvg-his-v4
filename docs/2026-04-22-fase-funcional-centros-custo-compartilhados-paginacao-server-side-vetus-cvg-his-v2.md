# Fase funcional — Centros de Custo compartilhados e paginação server-side em Custos e Despesas

## 1. Objetivo da onda

Continuar aprofundando `Financeiro > Cadastros > Custos e Despesas` sem abrir outra frente funcional, atacando a próxima camada de maturidade identificada anteriormente:

1. backend próprio/compartilhado para centros de custo;
2. paginação e ordenação server-side;
3. reutilização dessa fonte compartilhada pela superfície de `Custos e Despesas` e pela página de `Centros de Custo`.

## 2. Decisão técnica

Em vez de criar imediatamente um módulo separado com banco relacional dedicado, a solução adotada foi:

- manter uma store persistida em disco como base durável do subdomínio;
- evoluir essa store para virar a fonte compartilhada dos centros de custo;
- expor um endpoint próprio de catálogo de centros de custo;
- paginar e ordenar no backend tanto o catálogo de despesas quanto o catálogo de centros.

Essa escolha entrega valor funcional real agora e preserva um caminho limpo para futura migração para repositório/banco do domínio.

## 3. Mudanças de backend

### 3.1 Store compartilhada do subdomínio

Arquivo alterado:
- `/root/cvg-his-v2/apps/api/src/routes/expenses-catalog-store.ts`

Evoluções aplicadas:

- `ExpenseCostCenterItem` foi enriquecido com:
  - `owner`
  - `description`
- a store passou a oferecer dois eixos principais:
  - `list(accountId, filters)` para custos e despesas
  - `listCostCenters(filters)` para centros de custo
- paginação e ordenação reutilizáveis foram centralizadas na store;
- filtros server-side agora existem em ambos os catálogos.

### 3.2 Catálogo próprio de centros de custo

Arquivo alterado:
- `/root/cvg-his-v2/apps/api/src/routes/expenses-catalog-routes.ts`

Novo endpoint:
- `GET /cost-centers-catalog`

Suporte implementado:
- `search`
- `kind`
- `page`
- `pageSize`
- `sort`
- `order`

Além disso, `GET /expenses-catalog` passou a suportar de forma explícita:
- `page`
- `pageSize`
- `sort`
- `order`

Ordenações habilitadas:
- despesas: `id`, `name`, `category`, `costCenterCode`
- centros de custo: `code`, `name`, `kind`, `owner`

### 3.3 Auditoria

Também foi mantida e ampliada a leitura operacional da auditoria:
- listagem de despesas agora registra parâmetros de paginação/ordenação;
- listagem de centros de custo ganhou evento dedicado:
  - `list_cost_centers_catalog`

## 4. Mudanças de frontend

### 4.1 Serviço de despesas

Arquivo alterado:
- `/root/cvg-his-v2/apps/spa/src/services/expensesCatalog.ts`

Evoluções:
- filtros expandidos para incluir:
  - `page`
  - `pageSize`
  - `sort`
  - `order`
- resposta expandida para incluir metadados de paginação.

### 4.2 Novo serviço de centros de custo

Arquivo criado:
- `/root/cvg-his-v2/apps/spa/src/services/costCentersCatalog.ts`

Função principal:
- consumir `GET /cost-centers-catalog` com filtros e paginação.

### 4.3 Página de Custos e Despesas

Arquivo alterado:
- `/root/cvg-his-v2/apps/spa/src/pages/finance/ExpensesPage.vue`

Mudanças:
- paginação server-side materializada na UI;
- barra de contexto com:
  - página atual
  - total de páginas
  - total de registros
- botões:
  - `Página anterior`
  - `Próxima página`
- `Pesquisar` agora reinicia em página 1 e consulta o backend com filtros + paginação;
- create/update/remove mantêm feedback funcional local sem perder o modelo server-backed.

### 4.4 Página de Centros de Custo

Arquivo alterado:
- `/root/cvg-his-v2/apps/spa/src/pages/finance/CostCentersPage.vue`

Mudanças:
- a página deixou de ser puramente estática;
- agora carrega do backend compartilhado;
- exibe paginação server-side;
- mantém leitura operacional com:
  - nome
  - tipo
  - responsável
  - descrição.

## 5. Testes escritos primeiro

### 5.1 Backend

Arquivo evoluído:
- `/root/cvg-his-v2/apps/api/src/routes/expenses-catalog-routes.test.ts`

Cobertura nova:
- paginação de despesas com filtros server-side;
- ordenação server-side;
- endpoint dedicado de centros de custo;
- paginação do catálogo de centros de custo;
- persistência durável em disco preservada;
- auditoria enriquecida preservada.

### 5.2 Frontend — Custos e Despesas

Arquivo evoluído:
- `/root/cvg-his-v2/apps/spa/src/pages/finance/__tests__/ExpensesPage.test.ts`

Cobertura nova:
- envio de paginação/ordenação ao backend;
- navegação entre páginas;
- manutenção dos fluxos de:
  - criação
  - edição
  - remoção
  - validação.

### 5.3 Frontend — Centros de Custo

Arquivo criado:
- `/root/cvg-his-v2/apps/spa/src/pages/finance/__tests__/CostCentersPage.test.ts`

Cobertura:
- carregamento do backend compartilhado;
- navegação paginada;
- renderização da segunda página.

## 6. Validações executadas

### 6.1 API

Comando:

```bash
cd /root/cvg-his-v2/apps/api
pnpm exec tsx --test src/routes/expenses-catalog-routes.test.ts
```

Resultado:
- `tests 2`
- `pass 2`
- `fail 0`

### 6.2 SPA — bloco financeiro relevante

Comando:

```bash
cd /root/cvg-his-v2/apps/spa
npm test -- src/pages/finance/__tests__/CardsPage.test.ts src/pages/finance/__tests__/ExpensesPage.test.ts src/pages/finance/__tests__/CostCentersPage.test.ts src/pages/finance/__tests__/FinanceCatalogPages.test.ts
```

Resultado:
- `Test Files 4 passed (4)`
- `Tests 17 passed (17)`

### 6.3 Regressão representativa SPA

Comando:

```bash
npm test -- src/stores/__tests__/auth.test.ts src/navigation.test.ts src/router/routes.test.ts src/pages/__tests__/EnterpriseSurfaces.test.ts src/pages/access-control/__tests__/AccessControlPage.test.ts src/pages/api-keys/__tests__/ApiKeysPage.test.ts src/pages/lgpd/__tests__/LgpdHubPage.test.ts src/pages/master-search/__tests__/MasterSearchPage.test.ts src/pages/audit/__tests__/AuditPage.test.ts src/pages/finance/__tests__/CardsPage.test.ts src/pages/finance/__tests__/ExpensesPage.test.ts src/pages/finance/__tests__/CostCentersPage.test.ts
```

Resultado:
- `Test Files 12 passed (12)`
- `Tests 64 passed (64)`

## 7. Ganho funcional entregue

Com esta onda, o subdomínio financeiro ganhou duas coisas muito importantes:

1. `Centros de Custo` deixou de ser apenas uma tela estrutural estática e passou a ter backend compartilhado real;
2. `Custos e Despesas` passou a operar com paginação e ordenação server-side, aproximando-se de um catálogo administrativo escalável.

Isso reduz acoplamento entre páginas, melhora coerência de dados e prepara o caminho para backend relacional mais sólido.

## 8. Limites ainda existentes

Ainda não foi feito nesta etapa:
- CRUD dedicado de centros de custo;
- vinculação relacional com repositório/banco oficial;
- ordenação configurável pela UI;
- paginação de create/update/delete com refetch seletivo e reconciliação mais sofisticada;
- auditoria estruturada em payload consultável em vez de resumo textual.

## 9. Próximo passo técnico recomendado

O próximo passo mais forte agora é:

1. transformar centros de custo em módulo CRUD administrável;
2. migrar store em arquivo para repositório/banco do domínio;
3. tornar paginação/ordenação configuráveis na UI;
4. estruturar auditoria rica em payload serializado consultável.

Depois dessa etapa, o subdomínio de `Custos e Despesas` estará suficientemente maduro para que a volta estratégica para `Cartões` aconteça com menor risco e menos frente aberta no financeiro.
