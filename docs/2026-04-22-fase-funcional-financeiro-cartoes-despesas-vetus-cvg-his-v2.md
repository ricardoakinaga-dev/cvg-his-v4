# Fase funcional — Financeiro > Cartões / Custos e Despesas

Data: 2026-04-22
Status: primeira entrega funcional implementada
Escopo: transformar as superfícies de `Cartões` e `Custos e Despesas` de placeholders estruturais em páginas com comportamento útil de verdade

## 1. Objetivo

Iniciar a próxima fase funcional do domínio financeiro, escolhendo duas superfícies já materializadas na fase estrutural:
- `Financeiro > Cadastros > Cartões`
- `Financeiro > Cadastros > Custos e Despesas`

Nesta primeira entrega, o objetivo foi sair do placeholder puro e entrar em comportamento real utilizável.

## 2. Estratégia adotada

A entrega foi feita em duas profundidades diferentes, de forma honesta:

### Cartões
- integração real com backend já existente no ecossistema financeiro
- leitura da reconciliação operacional de cartões via API

### Custos e Despesas
- ainda sem backend dedicado no domínio
- primeira camada funcional com persistência local e fluxo real de cadastro/filtro

Essa decisão maximiza valor sem fingir maturidade onde o backend ainda não existe.

## 3. Entregas implementadas

## 3.1 Serviço novo de cartões
Arquivo criado:
- `apps/spa/src/services/financeCards.ts`

Função:
- consumir `GET /financial/reconciliation/cards`
- expor linhas operacionais de cartões para a SPA

Resultado:
- a página de cartões passou a ler transações reais do domínio financeiro em vez de seed estático local.

## 3.2 Serviço novo de custos e despesas
Arquivo criado:
- `apps/spa/src/services/expensesCatalog.ts`

Funções:
- `list()`
- `create()`

Estratégia:
- persistência local via `localStorage`
- catálogo inicial default
- geração incremental de IDs

Resultado:
- a página de custos e despesas ganhou um comportamento funcional real, mesmo sem backend ainda disponível.

## 3.3 Página de Cartões atualizada
Arquivo atualizado:
- `apps/spa/src/pages/finance/CardsPage.vue`

Antes:
- cards estáticos locais
- sem carregamento real
- sem estado de erro
- sem estado vazio funcional

Depois:
- `onMounted(loadCards)`
- consumo de `financeCardsService.list()`
- pesquisa local sobre dados carregados
- estado de erro
- estado vazio
- leitura operacional com:
  - portador
  - bandeira
  - operadora/provedor
  - final do cartão
  - tutor/paciente
  - status de captura

Resultado:
- `Cartões` passou a funcionar como visão operacional de conciliação, não só como catálogo fictício.

## 3.4 Página de Custos e Despesas atualizada
Arquivo atualizado:
- `apps/spa/src/pages/finance/ExpensesPage.vue`

Antes:
- seed local fixa
- sem criação real
- sem persistência funcional

Depois:
- carregamento via `expensesCatalogService.list()`
- formulário funcional de inclusão
- validação mínima obrigatória
- persistência local via serviço
- mensagem de sucesso
- mensagem de erro
- filtros mantendo a leitura tabular já alinhada ao benchmark

Resultado:
- a superfície passou a ter um CRUD inicial de verdade, ainda que local.

## 4. Testes implementados

Arquivos criados/atualizados:
- `apps/spa/src/pages/finance/__tests__/CardsPage.test.ts`
- `apps/spa/src/pages/finance/__tests__/ExpensesPage.test.ts`

## 4.1 Cobertura de Cartões
- carregamento de linhas reais via serviço
- renderização de dados operacionais
- filtro por query
- estado vazio
- estado de erro

## 4.2 Cobertura de Custos e Despesas
- carregamento inicial da tabela
- criação funcional de novo registro
- filtro por critérios digitados
- validação obrigatória do formulário

## 5. Validação executada

### Suíte funcional focada
Comando:

```bash
cd apps/spa
npm test -- src/pages/finance/__tests__/CardsPage.test.ts src/pages/finance/__tests__/ExpensesPage.test.ts
```

Resultado:
- `Test Files 2 passed (2)`
- `Tests 8 passed (8)`

### Validação ampliada da base recente
Comando:

```bash
npm test -- src/stores/__tests__/auth.test.ts src/navigation.test.ts src/router/routes.test.ts src/pages/__tests__/EnterpriseSurfaces.test.ts src/pages/access-control/__tests__/AccessControlPage.test.ts src/pages/api-keys/__tests__/ApiKeysPage.test.ts src/pages/lgpd/__tests__/LgpdHubPage.test.ts src/pages/master-search/__tests__/MasterSearchPage.test.ts src/pages/audit/__tests__/AuditPage.test.ts src/pages/finance/__tests__/CardsPage.test.ts src/pages/finance/__tests__/ExpensesPage.test.ts
```

Resultado:
- `Test Files 11 passed (11)`
- `Tests 60 passed (60)`

## 6. Leitura executiva do impacto

Antes desta entrega:
- `Cartões` e `Custos e Despesas` comunicavam a taxonomia, mas ainda eram superfícies rasas.

Depois desta entrega:
- `Cartões` passou a consumir uma fonte funcional real do domínio financeiro;
- `Custos e Despesas` passou a permitir uso real com cadastro e persistência local;
- o projeto deu o primeiro passo concreto para fora da fase estrutural e entrou em profundidade funcional incremental.

## 7. O que ainda resta para próximas ondas

### Cartões
Próximos passos naturais:
- filtros de provider/status
- leitura de reconciliação mais rica
- eventual captura/baixa e vínculos com recebíveis

### Custos e Despesas
Próximos passos naturais:
- backend dedicado
- edição/remoção
- categoria estruturada
- centros de custo reais
- conciliação com financeiro gerencial

## 8. Conclusão

A primeira fase funcional de `Financeiro > Cartões / Custos e Despesas` foi concluída com sucesso.

Esta entrega é importante porque marca a transição do projeto de uma fase predominantemente estrutural para uma fase de comportamento real de produto, preservando honestidade técnica sobre o que já tem backend e o que ainda opera com persistência local.