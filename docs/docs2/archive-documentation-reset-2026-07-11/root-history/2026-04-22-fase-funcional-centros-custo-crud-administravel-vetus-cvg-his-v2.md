# Fase funcional — Centros de Custo com CRUD administrável

## 1. Objetivo da onda

Dar o próximo passo mais forte dentro do mesmo subdomínio financeiro, transformando `Financeiro > Cadastros > Centros de Custo` de um catálogo apenas consultável em uma superfície CRUD administrável, ainda apoiada pela store durável já existente.

A meta desta onda foi:

1. criar CRUD real de centros de custo no backend compartilhado;
2. manter compatibilidade direta com `Custos e Despesas`;
3. preservar paginação server-side já conquistada;
4. enriquecer a trilha de auditoria com eventos específicos do catálogo de centros.

## 2. Estratégia adotada

Em vez de iniciar imediatamente a migração para banco relacional, a implementação evoluiu a store durável em arquivo para suportar também mutações completas do catálogo de centros de custo.

Isso permitiu entregar agora:
- criação;
- edição;
- remoção com proteção de integridade quando o centro está em uso;
- propagação de renome/código para itens já vinculados quando necessário.

## 3. Backend implementado

### 3.1 Store compartilhada do subdomínio

Arquivo alterado:
- `/root/cvg-his-v2/apps/api/src/routes/expenses-catalog-store.ts`

Novidades principais:
- novo payload `CostCenterCatalogPayload`;
- novos métodos:
  - `createCostCenter(...)`
  - `updateCostCenter(...)`
  - `removeCostCenter(...)`
- regra de unicidade para `code`;
- proteção contra remoção de centro em uso:
  - erro `COST_CENTER_IN_USE`
- ao editar centro de custo:
  - atualização do próprio catálogo;
  - propagação do novo `code` e `name` para os itens de despesas vinculados;
- diff resumido também para mudanças no catálogo de centros.

### 3.2 Rotas HTTP

Arquivo alterado:
- `/root/cvg-his-v2/apps/api/src/routes/expenses-catalog-routes.ts`

Novos endpoints:
- `POST /cost-centers-catalog`
- `PATCH /cost-centers-catalog/:code`
- `DELETE /cost-centers-catalog/:code`

Validações adicionadas:
- obrigatoriedade de:
  - `code`
  - `name`
  - `kind`
  - `owner`
  - `description`
- `kind` restrito a:
  - `Operacional`
  - `Administrativo`
- conflito de código duplicado:
  - `DUPLICATE_COST_CENTER_CODE`
- bloqueio de exclusão em uso:
  - `COST_CENTER_IN_USE`

### 3.3 Auditoria

Novos eventos materializados:
- `create_cost_center_catalog_item`
- `update_cost_center_catalog_item`
- `remove_cost_center_catalog_item`

Com isso, a superfície de centros de custo passa a produzir rastreabilidade própria, separada da trilha de despesas.

## 4. Frontend implementado

### 4.1 Serviço

Arquivo alterado:
- `/root/cvg-his-v2/apps/spa/src/services/costCentersCatalog.ts`

Novos métodos:
- `create(...)`
- `update(code, ...)`
- `remove(code)`

### 4.2 Página de Centros de Custo

Arquivo alterado:
- `/root/cvg-his-v2/apps/spa/src/pages/finance/CostCentersPage.vue`

Evoluções:
- criação de formulário funcional para cadastro/edição;
- suporte a modo de edição;
- ações por card:
  - `Editar`
  - `Remover`
- persistência server-backed;
- manutenção da paginação server-side;
- feedbacks de sucesso/erro;
- botão `Novo Centro` agora funcional.

### 4.3 Compatibilidade com Custos e Despesas

O vínculo entre despesas e centros de custo foi mantido.

Impacto importante:
- se o centro de custo muda no backend, a store já atualiza os itens vinculados;
- se o centro está em uso, a exclusão é bloqueada.

Isso evita inconsistência entre catálogos do mesmo subdomínio.

## 5. Testes escritos primeiro

### 5.1 Backend

Arquivo alterado:
- `/root/cvg-his-v2/apps/api/src/routes/expenses-catalog-routes.test.ts`

Cobertura adicionada:
- criação de centro de custo;
- edição de centro de custo;
- uso do centro recém-criado por item de despesa;
- bloqueio de exclusão quando há uso ativo;
- exclusão após desvinculação;
- eventos de auditoria do CRUD de centros;
- manutenção das validações de despesas.

### 5.2 Frontend

Arquivo alterado:
- `/root/cvg-his-v2/apps/spa/src/pages/finance/__tests__/CostCentersPage.test.ts`

Cobertura adicionada:
- criação de centro de custo pela UI;
- edição de centro de custo pela UI;
- navegação paginada;
- remoção pela UI;
- integração com o serviço CRUD do catálogo.

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

### 6.2 SPA — bloco financeiro

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

Esta onda muda bastante o patamar do subdomínio:

- `Centros de Custo` deixa de ser apenas catálogo consultável;
- passa a ser uma superfície administrável real;
- o financeiro ganha melhor governança estrutural;
- `Custos e Despesas` continua coerente com o catálogo compartilhado.

## 8. O que ainda falta

Ainda não foi feito nesta etapa:
- migração da store em arquivo para banco/repositório do domínio;
- auditoria estruturada em payload consultável em vez de resumo textual;
- filtros/ordenação configuráveis diretamente pela UI de centros;
- histórico/versionamento formal do catálogo de centros.

## 9. Próximo passo técnico recomendado

Agora o próximo passo mais forte é realmente a migração da store para repositório/banco do domínio, porque:
- o CRUD já existe;
- a semântica do catálogo está mais clara;
- a superfície já provou valor suficiente para justificar persistência transacional mais forte.

Sequência recomendada:
1. criar repositório do domínio para centros + despesas;
2. substituir a store em arquivo por esse repositório;
3. preservar os contratos HTTP/SPA já estabilizados;
4. estruturar auditoria rica em payload serializado consultável.
