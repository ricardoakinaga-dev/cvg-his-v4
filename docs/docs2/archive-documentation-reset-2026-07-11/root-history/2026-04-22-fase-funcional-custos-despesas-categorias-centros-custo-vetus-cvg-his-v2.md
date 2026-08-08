# Fase funcional — Custos e Despesas com categorias padronizadas e centros de custo

## 1. Objetivo da onda

Aprofundar o subdomínio `Financeiro > Cadastros > Custos e Despesas` imediatamente após a criação do backend dedicado, mantendo a recomendação de continuar na mesma trilha funcional antes de voltar para `Cartões`.

Nesta onda, o foco foi consolidar três pontos que aumentam o valor operacional do catálogo:

1. categorias padronizadas controladas pelo backend;
2. vínculo obrigatório entre custo/despesa e centro de custo;
3. leitura consistente dessa estrutura na SPA.

## 2. Decisão técnica

Em vez de abrir uma nova frente em `Cartões`, foi escolhido aprofundar o backend recém-criado de `Custos e Despesas`, porque esse subdomínio já havia cruzado a fronteira browser → servidor e ainda existia um ganho incremental forte na mesma linha de implementação.

A escolha aplicada foi:

- manter a persistência server-side em memória por `accountId`;
- enriquecer o contrato da API com metadados do catálogo;
- padronizar categorias vindas do backend;
- tornar `costCenterCode` obrigatório;
- devolver também `costCenterName` para simplificar a leitura da SPA.

## 3. Mudanças implementadas

### 3.1 Backend API

Arquivo alterado:
- `/root/cvg-his-v2/apps/api/src/routes/expenses-catalog-routes.ts`

Evoluções aplicadas:

- `ExpenseCatalogItem` passou a carregar:
  - `costCenterCode`
  - `costCenterName`
- criação de catálogo backend de categorias padronizadas:
  - `Infraestrutura`
  - `Logística`
  - `Tecnologia`
- criação de catálogo backend de centros de custo:
  - `CLI-ATD` → `Atendimento Clínico`
  - `ESTOQUE` → `Suprimentos e Estoque`
  - `LAB-OP` → `Laboratório`
- itens default enriquecidos com centro de custo;
- `GET /expenses-catalog` agora retorna:
  - `items`
  - `categories`
  - `costCenters`
- `POST /expenses-catalog` e `PATCH /expenses-catalog/:id` agora exigem:
  - `name`
  - `category`
  - `costCenterCode`
  - `description`
- validação server-side para:
  - categoria inválida
  - centro de custo inválido
- respostas de validação explícitas com:
  - `code: VALIDATION_ERROR`
  - `message`
  - `correlationId`
- auditoria enriquecida com referência ao centro de custo nos eventos de criação, atualização e remoção.

### 3.2 SPA — serviço

Arquivo alterado:
- `/root/cvg-his-v2/apps/spa/src/services/expensesCatalog.ts`

Mudanças:

- `list()` passou a retornar um payload estruturado:
  - `items`
  - `categories`
  - `costCenters`
- tipagem expandida para refletir:
  - `costCenterCode`
  - `costCenterName`
- inputs de criação/edição atualizados para incluir `costCenterCode`.

### 3.3 SPA — página funcional

Arquivo alterado:
- `/root/cvg-his-v2/apps/spa/src/pages/finance/ExpensesPage.vue`

Mudanças:

- subtítulo da página atualizado para refletir persistência server-side e vínculo com centro de custo;
- KPIs atualizados para mostrar:
  - total de registros
  - fixos
  - operacionais
  - quantidade de categorias padronizadas
  - quantidade de centros de custo disponíveis
- formulário funcional alterado para usar:
  - `select` de categoria padronizada
  - `select` de centro de custo
- validação de formulário passou a exigir centro de custo;
- tabela passou a exibir coluna de `Centro de custo` com:
  - nome
  - código
- filtros da grade passaram a incluir busca por centro de custo.

## 4. Testes escritos primeiro e depois validados

### 4.1 Backend

Arquivo alterado:
- `/root/cvg-his-v2/apps/api/src/routes/expenses-catalog-routes.test.ts`

A suíte passou a cobrir:

- listagem com `categories` e `costCenters`;
- item default com `costCenterName` resolvido;
- criação com `costCenterCode` válido;
- atualização com troca de centro de custo;
- rejeição de `costCenterCode` inválido com `400`;
- remoção do item criado.

### 4.2 Frontend

Arquivo alterado:
- `/root/cvg-his-v2/apps/spa/src/pages/finance/__tests__/ExpensesPage.test.ts`

A suíte passou a cobrir:

- renderização da tabela com metadados de centro de custo;
- KPI de categorias padronizadas;
- criação usando categoria padronizada + centro de custo;
- edição com reatribuição de centro de custo;
- remoção;
- validação obrigatória incluindo centro de custo.

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

### 5.2 SPA — bloco financeiro

Comando:

```bash
cd /root/cvg-his-v2/apps/spa
npm test -- src/pages/finance/__tests__/CardsPage.test.ts src/pages/finance/__tests__/ExpensesPage.test.ts
```

Resultado:

- `Test Files 2 passed (2)`
- `Tests 10 passed (10)`

### 5.3 Regressão representativa SPA

Comando:

```bash
npm test -- src/stores/__tests__/auth.test.ts src/navigation.test.ts src/router/routes.test.ts src/pages/__tests__/EnterpriseSurfaces.test.ts src/pages/access-control/__tests__/AccessControlPage.test.ts src/pages/api-keys/__tests__/ApiKeysPage.test.ts src/pages/lgpd/__tests__/LgpdHubPage.test.ts src/pages/master-search/__tests__/MasterSearchPage.test.ts src/pages/audit/__tests__/AuditPage.test.ts src/pages/finance/__tests__/CardsPage.test.ts src/pages/finance/__tests__/ExpensesPage.test.ts
```

Resultado:

- `Test Files 11 passed (11)`
- `Tests 62 passed (62)`

## 6. Ganho funcional entregue

Antes desta onda, `Custos e Despesas` já tinha backend dedicado, mas ainda faltava um contrato mais governado para o catálogo.

Agora o módulo passa a ter:

- classificação financeira controlada pelo backend;
- alocação explícita por centro de custo;
- payload mais próximo de um catálogo financeiro real;
- base melhor para futura auditoria gerencial e rateio.

## 7. Limites ainda existentes

Ainda não foi implementado nesta etapa:

- persistência durável em banco/repositório real;
- catálogo de centros de custo compartilhado com uma fonte backend própria;
- paginação e filtros server-side;
- trilha de auditoria rica com diffs de campo;
- vínculo contábil/gerencial mais profundo por competência;
- histórico de inativação/reativação de categorias ou centros.

## 8. Próximo passo técnico recomendado

O próximo passo mais forte continua sendo permanecer em `Custos e Despesas`, agora em uma terceira camada de consolidação:

1. criar persistência durável para o catálogo;
2. separar centro de custo em backend dedicado ou fonte compartilhada real;
3. adicionar filtros server-side por categoria/centro/nome;
4. enriquecer auditoria de edição/remoção com diff resumido.

Só depois disso a troca de contexto para `Cartões` volta a fazer mais sentido, porque o subdomínio de despesas terá deixado de ser apenas um catálogo assistido e passará a operar como base mais sólida do financeiro gerencial.
