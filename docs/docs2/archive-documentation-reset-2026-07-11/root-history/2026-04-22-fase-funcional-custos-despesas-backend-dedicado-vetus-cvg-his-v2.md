# Fase funcional — Custos e Despesas com backend dedicado

Data: 2026-04-22
Status: implementado
Escopo: preparação do backend dedicado de `Custos e Despesas` e integração da SPA à persistência server-side

## 1. Objetivo

Dar o próximo salto funcional do subdomínio `Financeiro > Cadastros > Custos e Despesas`, saindo do CRUD apenas local para uma base server-side dedicada, ainda leve, mas já preparada para evolução futura com auditoria e regras de negócio mais fortes.

## 2. Estratégia adotada

A entrega foi feita em três frentes combinadas:
- rota backend dedicada no app API;
- integração da SPA via `apiRequest`;
- manutenção da experiência funcional já amadurecida na página.

## 3. Entregas implementadas

## 3.1 Backend dedicado
Arquivo criado:
- `apps/api/src/routes/expenses-catalog-routes.ts`

Rotas implementadas:
- `GET /expenses-catalog`
- `POST /expenses-catalog`
- `PATCH /expenses-catalog/:id`
- `DELETE /expenses-catalog/:id`

Características da entrega:
- catálogo inicial default por conta;
- persistência server-side em memória por `accountId`;
- validação mínima de payload (`name`, `category`, `description`);
- auditoria de leitura, criação, atualização e remoção;
- uso de permissões existentes:
  - `billing.read`
  - `billing.manage`

Resultado:
- o domínio deixa de depender apenas de `localStorage` do browser para persistência funcional.

## 3.2 Integração no servidor principal
Arquivo atualizado:
- `apps/api/src/server.ts`

Integração realizada:
- import do handler novo
- delegação explícita para `handleExpensesCatalogRoutes(...)`

Resultado:
- a API principal agora reconhece o novo subdomínio financeiro dedicado de custos e despesas.

## 3.3 Serviço SPA migrado para backend
Arquivo atualizado:
- `apps/spa/src/services/expensesCatalog.ts`

Antes:
- CRUD local via `localStorage`

Depois:
- `list()` via `GET /expenses-catalog`
- `create()` via `POST /expenses-catalog`
- `update()` via `PATCH /expenses-catalog/:id`
- `remove()` via `DELETE /expenses-catalog/:id`

Resultado:
- a SPA continua com o mesmo comportamento de alto nível, mas agora apoiada por uma camada server-side dedicada.

## 3.4 Página SPA preservada e compatível
Arquivo mantido/compatível:
- `apps/spa/src/pages/finance/ExpensesPage.vue`

Comportamentos preservados sobre backend novo:
- criação
- edição
- remoção
- categorias estruturadas
- filtros por id/nome/categoria/descrição
- mensagens de sucesso e erro

## 4. Testes implementados

### Backend
Arquivo criado:
- `apps/api/src/routes/expenses-catalog-routes.test.ts`

Cobertura backend:
- listagem dos itens default
- criação de item novo
- atualização de item existente
- remoção de item existente

Comando executado:

```bash
cd apps/api
pnpm exec tsx --test src/routes/expenses-catalog-routes.test.ts
```

Resultado:
- `pass 2`
- `fail 0`

### Frontend financeiro
Comando executado:

```bash
cd apps/spa
npm test -- src/pages/finance/__tests__/CardsPage.test.ts src/pages/finance/__tests__/ExpensesPage.test.ts
```

Resultado:
- `Test Files 2 passed (2)`
- `Tests 10 passed (10)`

### Validação ampliada da base recente
Comando executado:

```bash
npm test -- src/stores/__tests__/auth.test.ts src/navigation.test.ts src/router/routes.test.ts src/pages/__tests__/EnterpriseSurfaces.test.ts src/pages/access-control/__tests__/AccessControlPage.test.ts src/pages/api-keys/__tests__/ApiKeysPage.test.ts src/pages/lgpd/__tests__/LgpdHubPage.test.ts src/pages/master-search/__tests__/MasterSearchPage.test.ts src/pages/audit/__tests__/AuditPage.test.ts src/pages/finance/__tests__/CardsPage.test.ts src/pages/finance/__tests__/ExpensesPage.test.ts
```

Resultado:
- `Test Files 11 passed (11)`
- `Tests 62 passed (62)`

## 5. Leitura executiva do impacto

Antes desta entrega:
- `Custos e Despesas` já tinha CRUD funcional local, mas sem persistência server-side real.

Depois desta entrega:
- a SPA passa a consumir backend dedicado;
- o domínio ganha base server-side própria, ainda simples, mas extensível;
- a trilha futura para auditoria, padronização de categorias e vínculo com centros de custo fica muito mais natural.

## 6. Próximos passos naturais

Próximas ondas mais valiosas para este subdomínio:
- persistência em repositório mais durável (banco);
- categorias padronizadas por enum ou catálogo separado;
- vínculo com `Centros de Custo` reais;
- trilha auditável de edição/remoção em nível de produto;
- filtros mais ricos e paginação.

No eixo alternativo de `Cartões`, segue aberta a trilha de:
- filtros por provider/status;
- enriquecimento de reconciliação;
- captura/baixa;
- vínculo com recebíveis.

## 7. Conclusão

Esta etapa marca a transição de `Custos e Despesas` de um CRUD local amadurecido para um módulo com backend dedicado inicial.

É um avanço importante porque transforma a superfície em um domínio funcional mais sério, sem exigir ainda a complexidade completa de um módulo financeiro definitivo.