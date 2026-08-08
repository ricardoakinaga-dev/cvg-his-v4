# Onda estrutural — Estoque > Cadastrados adicionais

Data: 2026-04-22
Status: implementado
Escopo: materialização inicial de Fornecedores, Fabricantes, Grupos de Produto e Estoques no domínio de estoque

## 1. Objetivo

Fechar a próxima lacuna estrutural mais visível do bloco de estoque depois da convergência de shell, taxonomia e breadcrumbs, criando superfícies reais para os cadastros mestre que o benchmark Vetus já evidencia.

## 2. Referência de benchmark Vetus usada nesta onda

Base documental consultada:
- `docs/vetus/guides/14-modulo-estoque-fiscal.md`
- screenshots:
  - `docs/vetus/screenshots/estoque-fornecedores-01.png`
  - `docs/vetus/screenshots/estoque-fabricantes-01.png`
  - `docs/vetus/screenshots/estoque-grupos-produto-01.png`
  - `docs/vetus/screenshots/estoque-estoques-01.png`

Padrões extraídos do benchmark:
- breadcrumb `Estoque > Cadastrados > ...`;
- CTA primário no topo direito;
- busca simples por id/nome/descrição;
- cards ou lista leve como estrutura inicial;
- ação secundária `Ver Detalhes` onde faz sentido;
- empty state ou superfície honesta, sem hub genérico vazio.

## 3. Entregas implementadas

## 3.1 Navegação

Arquivo atualizado:
- `apps/spa/src/navigation.ts`

Seção `Estoque > Cadastrados` expandida com:
- `Produtos`
- `Fornecedores`
- `Fabricantes`
- `Grupos de Produto`
- `Estoques`

## 3.2 Rotas

Arquivo atualizado:
- `apps/spa/src/router/routes.ts`

Rotas materializadas:
- `/suppliers`
- `/manufacturers`
- `/product-groups`
- `/warehouses`

Ajuste complementar importante:
- `/products` deixou de apontar para parent genérico e passou a convergir para `Cadastrados`.

Metadados entregues em todas as novas rotas:
- `meta.title`
- `meta.breadcrumb`
- `meta.breadcrumbParent = 'Cadastrados'`
- `meta.icon`

## 3.3 Páginas novas

Arquivos criados:
- `apps/spa/src/pages/inventory/SuppliersPage.vue`
- `apps/spa/src/pages/inventory/ManufacturersPage.vue`
- `apps/spa/src/pages/inventory/ProductGroupsPage.vue`
- `apps/spa/src/pages/inventory/WarehousesPage.vue`

Características comuns das páginas:
- `AppPageHeader` com breadcrumb explícito;
- `DsAlert` contextualizando que a superfície é a primeira materialização do domínio;
- `DsStatCard` para leitura rápida de volume/contexto;
- estrutura simples de busca;
- cards/lista com dados seed locais e leitura operacional honesta.

## 3.4 Hub do domínio de estoque

Arquivo atualizado:
- `apps/spa/src/pages/inventory/InventoryListPage.vue`

Melhoria entregue:
- o card `Cadastros` agora aponta explicitamente para:
  - `Catálogo de produtos`
  - `Fornecedores e despesas`
  - `Fabricantes`
  - `Grupos de produto`
  - `Estoques cadastrados`
  - `Orçamentos vinculados`

Isso faz o hub de estoque parar de apontar apenas para produtos e passar a refletir melhor a profundidade esperada do módulo.

## 3.5 Testes

Arquivos atualizados/criados:
- `apps/spa/src/navigation.test.ts`
- `apps/spa/src/router/routes.test.ts`
- `apps/spa/src/pages/inventory/__tests__/InventoryCatalogPages.test.ts`

Cobertura adicionada:
- presença das novas rotas na navegação oficial;
- convergência de `breadcrumbParent` no router;
- renderização básica das novas páginas e seus controles de busca.

## 4. Validação executada

Comando executado:

```bash
cd apps/spa
npm test -- src/navigation.test.ts src/router/routes.test.ts src/pages/inventory/__tests__/InventoryCatalogPages.test.ts src/pages/inventory/__tests__/InventoryListPage.test.ts
```

Resultado:
- `Test Files 4 passed (4)`
- `Tests 27 passed (27)`

## 5. Leitura executiva do impacto

Antes desta onda:
- o domínio `Estoque` estava forte em `Controles` e `Configurações Fiscais`;
- `Cadastrados` ainda era raso demais para comunicar um ERP maduro.

Depois desta onda:
- o domínio passa a exibir cadastros mestre mais próximos do benchmark Vetus;
- o usuário consegue ler o bloco de estoque como um ecossistema com catálogo, fornecedores, fabricantes, grupos e estoques;
- a navegação promete menos do que entrega? não mais nesse segmento principal.

## 6. O que esta onda ainda não tenta resolver

Deliberadamente fora do escopo desta entrega:
- CRUD real completo com backend;
- detalhe/edição de fornecedores, fabricantes, grupos e estoques;
- filtros avançados persistentes;
- acoplamento profundo com compras, fiscal e pricing;
- relatórios derivados desses cadastros.

A decisão foi correta porque:
- o maior ganho agora era estrutural e semântico;
- superfícies iniciais honestas são melhores do que manter a seção vazia;
- a taxonomia já ficou pronta para evolução incremental posterior.

## 7. Próxima recomendação após esta onda

Com esta lacuna fechada, a sequência natural passa a ser uma destas frentes:

1. `Financeiro > Cadastros` remanescente
- Cartões
- Custos e Despesas

2. `Relatórios > Produção`
- para fechar o bloco analítico por domínio

3. superfícies enterprise ainda rasas
- access-control
- api-client
- api-keys
- audit
- lgpd
- master-search

## 8. Conclusão

A expansão de `Estoque > Cadastrados adicionais` foi concluída com sucesso e validada em teste.

Esta entrega fecha a lacuna estrutural mais visível do módulo de estoque e consolida a transição do projeto para uma fase de expansão orientada por domínio, não mais por correção superficial de breadcrumb.
