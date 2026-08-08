# Fase funcional — Custos e Despesas (CRUD local ampliado)

Data: 2026-04-22
Status: segunda entrega funcional implementada
Escopo: aprofundamento de `Financeiro > Cadastros > Custos e Despesas` com edição, remoção e categorias estruturadas

## 1. Objetivo

Dar continuidade à fase funcional do financeiro atacando o subdomínio com melhor relação entre valor e viabilidade imediata:
- `Custos e Despesas`

Meta desta etapa:
- fechar melhor o ciclo CRUD local;
- introduzir categorias estruturadas;
- deixar a superfície mais próxima de um módulo funcional real antes da futura camada backend.

## 2. Entregas implementadas

## 2.1 Serviço de catálogo enriquecido
Arquivo atualizado:
- `apps/spa/src/services/expensesCatalog.ts`

Evoluções entregues:
- inclusão do campo `category` em `ExpenseCatalogItem`;
- novos contratos:
  - `UpdateExpenseCatalogItemInput`
- novas operações:
  - `update(id, input)`
  - `remove(id)`
- normalização de itens persistidos;
- catálogo default enriquecido com categorias como:
  - `Infraestrutura`
  - `Logística`
  - `Tecnologia`

Resultado:
- o serviço deixa de ser apenas criação/listagem e passa a sustentar um CRUD local mais completo.

## 2.2 Página de Custos e Despesas evoluída
Arquivo atualizado:
- `apps/spa/src/pages/finance/ExpensesPage.vue`

Principais mudanças:
- formulário passou a suportar modo criação e edição;
- campo novo de categoria no formulário;
- filtro novo por categoria;
- tabela agora mostra `Categoria`;
- ações por linha:
  - `Editar`
  - `Remover`
- mensagens distintas para:
  - criação
  - atualização
  - remoção
- contador novo por categorias no bloco de KPIs.

Resultado funcional:
- agora a superfície suporta:
  - criar registros
  - editar registros existentes
  - remover registros
  - filtrar por nome/categoria/descrição/id

## 2.3 Leitura executiva da evolução

Antes desta etapa:
- a superfície já criava registros localmente, mas ainda era limitada;
- não havia ciclo CRUD mais completo;
- não havia categorização estruturada.

Depois desta etapa:
- `Custos e Despesas` já se comporta como um catálogo funcional mais maduro dentro da SPA;
- a categoria passa a organizar melhor a leitura financeira;
- o próximo passo pode ser backend e persistência server-side sem voltar ao estágio de tela rasa.

## 3. Testes atualizados

Arquivo atualizado:
- `apps/spa/src/pages/finance/__tests__/ExpensesPage.test.ts`

Cobertura agora inclui:
- renderização da tabela com categoria;
- criação com categoria;
- filtro por nome e categoria;
- edição de registro existente;
- remoção de registro;
- validação obrigatória agora exigindo:
  - nome
  - categoria
  - descrição

## 4. Validação executada

### Suíte focada
Comando:

```bash
cd apps/spa
npm test -- src/pages/finance/__tests__/ExpensesPage.test.ts
```

Resultado:
- `Test Files 1 passed (1)`
- `Tests 6 passed (6)`

### Validação funcional do bloco financeiro
Comando:

```bash
npm test -- src/pages/finance/__tests__/CardsPage.test.ts src/pages/finance/__tests__/ExpensesPage.test.ts
```

Resultado:
- `Test Files 2 passed (2)`
- `Tests 10 passed (10)`

### Validação ampliada da base recente
Comando:

```bash
npm test -- src/stores/__tests__/auth.test.ts src/navigation.test.ts src/router/routes.test.ts src/pages/__tests__/EnterpriseSurfaces.test.ts src/pages/access-control/__tests__/AccessControlPage.test.ts src/pages/api-keys/__tests__/ApiKeysPage.test.ts src/pages/lgpd/__tests__/LgpdHubPage.test.ts src/pages/master-search/__tests__/MasterSearchPage.test.ts src/pages/audit/__tests__/AuditPage.test.ts src/pages/finance/__tests__/CardsPage.test.ts src/pages/finance/__tests__/ExpensesPage.test.ts
```

Resultado:
- `Test Files 11 passed (11)`
- `Tests 62 passed (62)`

## 5. Próximos passos naturais

Agora a trilha de `Custos e Despesas` fica bem posicionada para:
- backend dedicado;
- persistência real server-side;
- edição/remoção auditável;
- categorias padronizadas por domínio financeiro;
- vínculo com centros de custo reais.

No eixo de `Cartões`, os próximos ganhos continuam sendo:
- filtros por provider/status;
- reconciliação mais rica;
- captura/baixa e vínculo com recebíveis.

## 6. Conclusão

Esta etapa fecha melhor o ciclo funcional de `Custos e Despesas` e reforça a transição do projeto para uma fase de produto real, não apenas de taxonomia e estrutura.

Com isso, `Financeiro > Cartões / Custos e Despesas` deixa de ser somente um recorte promissor e passa a ter um núcleo funcional mais convincente dentro da SPA.