# Fase funcional — Migração preparada para repositório/banco do domínio financeiro

## 1. Objetivo da onda

Preparar a próxima camada do subdomínio `Centros de Custo + Custos e Despesas` para sair da store em arquivo e entrar em um caminho de persistência por repositório/banco do domínio, sem quebrar os contratos HTTP e SPA já estabilizados.

## 2. Estratégia aplicada

Como o ambiente atual não expõe `DATABASE_URL` inicializado no runtime desta sessão, a implementação foi feita em duas frentes:

1. manter o fluxo atual funcionando com a store em arquivo, preservando toda a superfície já validada;
2. adicionar os artefatos de migração para banco/repositório do domínio, de forma compatível com a evolução futura do runtime.

Isso permite avançar de forma segura sem romper a trilha funcional já consolidada.

## 3. O que foi criado nesta etapa

### 3.1 Repositório de banco do catálogo financeiro

Arquivo criado:
- `/root/cvg-his-v2/apps/api/src/repositories/database-finance-catalog.repository.ts`

Esse repositório materializa a camada de persistência orientada a banco para:
- catálogo de despesas;
- catálogo de centros de custo.

Responsabilidades previstas/implementadas:
- listagem paginada de despesas;
- listagem paginada de centros de custo;
- criação/edição/remoção de despesas;
- criação/edição/remoção de centros de custo;
- atualização de vínculos de despesas quando um centro de custo é alterado;
- proteção contra exclusão de centro em uso.

### 3.2 Migração SQL do domínio financeiro

Arquivo criado:
- `/root/cvg-his-v2/packages/shared/database/src/migrations/022_create_finance_catalogs.sql`

Tabelas definidas:
- `finance_cost_centers`
- `finance_expense_catalog_items`

Estrutura coberta:
- escopo por `account_id`;
- unicidade por centro de custo via chave composta;
- índices para consulta por conta, nome, categoria e centro;
- relação entre despesa e centro de custo.

### 3.3 Schema Drizzle do domínio

Arquivo criado:
- `/root/cvg-his-v2/packages/db/src/schema/finance_catalogs.ts`

Export atualizado em:
- `/root/cvg-his-v2/packages/db/src/schema/index.ts`

Objetivo:
- preparar o domínio financeiro para entrar no trilho canônico do banco compartilhado do projeto.

## 4. Compatibilidade preservada

O fluxo atual da aplicação foi mantido estável:
- rotas HTTP continuam compatíveis;
- SPA continua compatível;
- testes da superfície financeira continuam verdes.

Na prática, esta onda funciona como uma ponte arquitetural:
- mantém o caminho estável em arquivo;
- adiciona o caminho canônico para banco;
- reduz o risco da migração final do runtime.

## 5. Validações executadas

### 5.1 API

Comando:

```bash
cd /root/cvg-his-v2/apps/api
pnpm exec tsx --test src/routes/expenses-catalog-routes.test.ts
```

Resultado:
- `tests 2`
- `pass 2`
- `fail 0`

### 5.2 SPA financeira focada

Comando:

```bash
cd /root/cvg-his-v2/apps/spa
npm test -- src/pages/finance/__tests__/CardsPage.test.ts src/pages/finance/__tests__/ExpensesPage.test.ts src/pages/finance/__tests__/CostCentersPage.test.ts src/pages/finance/__tests__/FinanceCatalogPages.test.ts
```

Resultado:
- `Test Files 4 passed (4)`
- `Tests 17 passed (17)`

### 5.3 Regressão representativa SPA

Comando:

```bash
npm test -- src/stores/__tests__/auth.test.ts src/navigation.test.ts src/router/routes.test.ts src/pages/__tests__/EnterpriseSurfaces.test.ts src/pages/access-control/__tests__/AccessControlPage.test.ts src/pages/api-keys/__tests__/ApiKeysPage.test.ts src/pages/lgpd/__tests__/LgpdHubPage.test.ts src/pages/master-search/__tests__/MasterSearchPage.test.ts src/pages/audit/__tests__/AuditPage.test.ts src/pages/finance/__tests__/CardsPage.test.ts src/pages/finance/__tests__/ExpensesPage.test.ts src/pages/finance/__tests__/CostCentersPage.test.ts
```

Resultado:
- `Test Files 12 passed (12)`
- `Tests 64 passed (64)`

## 6. Limitação objetiva encontrada nesta sessão

Verificação de ambiente executada:
- `DATABASE_URL` não estava disponível/inicializado no runtime desta sessão.

Consequência prática:
- a trilha de banco foi preparada em código e migrações;
- mas a troca completa do runtime ativo para o repositório de banco não foi validada ponta a ponta nesta sessão.

## 7. Leitura executiva

Esta onda não foi apenas documental.
Ela entregou os artefatos concretos necessários para a migração real do domínio financeiro para banco:
- repositório dedicado;
- migração SQL;
- schema canônico;
- compatibilidade preservada com o contrato atual.

Ou seja: a aplicação segue funcionando como antes, mas agora o caminho de substituição do armazenamento em arquivo está muito mais claro e pronto para ser ativado assim que o banco do ambiente for disponibilizado no runtime correspondente.

## 8. Próximo passo técnico correto

Agora o próximo passo ideal é operacionalizar essa base:

1. disponibilizar `DATABASE_URL` e garantir pool inicializado no runtime do API;
2. ligar efetivamente as rotas ao repositório de banco;
3. executar validação ponta a ponta contra as novas tabelas;
4. só então remover a store em arquivo como fallback principal.

Depois disso, a próxima frente natural continua sendo:
- auditoria rica em payload consultável;
- UI mais avançada de filtros/ordenação.
