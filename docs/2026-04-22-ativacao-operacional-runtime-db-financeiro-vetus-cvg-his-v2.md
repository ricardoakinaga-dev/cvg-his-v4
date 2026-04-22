# Ativação operacional do runtime DB-backed — Financeiro > Custos e Despesas / Centros de Custo

Data: 2026-04-22
Repositório: /root/cvg-his-v2
Escopo: apps/api + subdomínio financeiro catalogado

## Objetivo
Ativar efetivamente o runtime do catálogo financeiro em banco para:
- Centros de Custo
- Custos e Despesas

a partir dos artefatos já preparados anteriormente:
- repositório DB-backed
- migration SQL
- schema do domínio
- rotas HTTP já estabilizadas

## O que foi feito

### 1. Disponibilização operacional do DATABASE_URL
Foi validado que a sessão shell pura não expunha `DATABASE_URL` por padrão, mas o valor está disponível ao carregar o arquivo operacional do ambiente:
- `/root/cvg-his-v2/.env.v2`

Validação executada:
- `set -a && source /root/cvg-his-v2/.env.v2 && set +a`
- teste de conectividade com Postgres via `node + pg`

Resultado:
- conexão OK
- `select 1` retornou sucesso

### 2. Conexão efetiva das rotas ao repositório de banco
Arquivo ajustado:
- `/root/cvg-his-v2/apps/api/src/routes/expenses-catalog-routes.ts`

Comportamento atual:
- se o pool do `@cvg-his-v2/shared-database` estiver inicializado, as rotas usam `DatabaseFinanceCatalogRepository`
- se o pool não estiver disponível, o fallback em arquivo continua funcional

Isso preserva compatibilidade com:
- testes existentes file-backed
- modo degradado local
- ativação real em runtime quando o banco é inicializado

### 3. Aplicação da migration do domínio financeiro
Migration aplicada manualmente no banco operacional via `node + pg`:
- `/root/cvg-his-v2/packages/shared/database/src/migrations/022_create_finance_catalogs.sql`

Tabelas confirmadas após aplicação:
- `finance_cost_centers`
- `finance_expense_catalog_items`

### 4. Seed operacional mínimo do catálogo de centros de custo
Para o account existente encontrado no ambiente:
- `65751ed5-07d3-44a2-830a-cc9dc8a0dbe4`

Foram garantidos/upsertados os centros:
- `CC-ADM` — Administrativo Central
- `CC-ATD` — Operação de Atendimento
- `CC-LAB` — Diagnóstico e Laboratório

Objetivo do seed:
- evitar tela DB-backed vazia logo na ativação
- preservar usabilidade imediata do fluxo de `Custos e Despesas`
- habilitar validação ponta a ponta com centro de custo real

## Validação ponta a ponta executada
Foi executado um smoke DB-backed em `apps/api`, inicializando o client de banco real e chamando `handleExpensesCatalogRoutes` sem store/file path injetados.

Fluxo validado:
1. GET `/cost-centers-catalog`
2. POST `/expenses-catalog`
3. GET `/expenses-catalog?search=...`
4. PATCH `/expenses-catalog/:id`
5. DELETE `/expenses-catalog/:id`

Resultado observado:
- listagem de centros retornou 3 centros
- criação retornou `201`
- item criado com id `DES-001`
- listagem filtrada retornou o item criado
- atualização retornou `200`
- remoção retornou `200`
- auditoria registrou 5 eventos no fluxo

Resumo do smoke:
- `beforeStatus: 200`
- `centersReturned: 3`
- `createdStatus: 201`
- `listedStatus: 200`
- `updatedStatus: 200`
- `removedStatus: 200`

## Regressões executadas

### API
Comando:
- `pnpm exec tsx --test src/routes/expenses-catalog-routes.test.ts`

Resultado:
- `# tests 2`
- `# pass 2`
- `# fail 0`

Observação:
- a suíte existente continua verde, validando que o fallback file-backed não foi quebrado.

### SPA — financeiro focado
Comando:
- `npm test -- src/pages/finance/__tests__/CardsPage.test.ts src/pages/finance/__tests__/ExpensesPage.test.ts src/pages/finance/__tests__/CostCentersPage.test.ts src/pages/finance/__tests__/FinanceCatalogPages.test.ts`

Resultado:
- `Test Files 4 passed (4)`
- `Tests 17 passed (17)`

### SPA — regressão representativa
Comando:
- `npm test -- src/stores/__tests__/auth.test.ts src/navigation.test.ts src/router/routes.test.ts src/pages/__tests__/EnterpriseSurfaces.test.ts src/pages/access-control/__tests__/AccessControlPage.test.ts src/pages/api-keys/__tests__/ApiKeysPage.test.ts src/pages/lgpd/__tests__/LgpdHubPage.test.ts src/pages/master-search/__tests__/MasterSearchPage.test.ts src/pages/audit/__tests__/AuditPage.test.ts src/pages/finance/__tests__/CardsPage.test.ts src/pages/finance/__tests__/ExpensesPage.test.ts src/pages/finance/__tests__/CostCentersPage.test.ts`

Resultado:
- `Test Files 12 passed (12)`
- `Tests 64 passed (64)`

## Estado final após ativação

### Runtime efetivo
- O runtime agora pode operar em banco real para o subdomínio financeiro quando `DATABASE_URL` estiver carregado e o client DB for inicializado.
- As rotas do catálogo financeiro já conseguem usar o repositório DB-backed no ambiente operacional validado.

### Compatibilidade preservada
- fallback file-backed continua disponível
- testes existentes continuam passando
- contratos SPA/API não foram alterados

## Pendência remanescente
O fallback em arquivo ainda existe e continua sendo o plano de contingência.

Próximo passo técnico recomendável:
1. decidir se o ambiente desejado ficará em modo híbrido ou fail-fast sem fallback
2. se a decisão for produção/controlado, reduzir ou remover o fallback file-backed
3. idealmente, automatizar o seed default por account no repositório DB-backed para evitar dependência de seed manual no primeiro uso

## Arquivos relevantes desta etapa
- `/root/cvg-his-v2/apps/api/src/routes/expenses-catalog-routes.ts`
- `/root/cvg-his-v2/apps/api/src/repositories/database-finance-catalog.repository.ts`
- `/root/cvg-his-v2/packages/shared/database/src/migrations/022_create_finance_catalogs.sql`
- `/root/cvg-his-v2/docs/2026-04-22-ativacao-operacional-runtime-db-financeiro-vetus-cvg-his-v2.md`
