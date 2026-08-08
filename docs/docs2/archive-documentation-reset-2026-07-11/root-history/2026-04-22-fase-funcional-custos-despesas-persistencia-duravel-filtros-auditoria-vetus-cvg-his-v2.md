# Fase funcional — Custos e Despesas com persistência durável, filtros server-side e auditoria enriquecida

## 1. Objetivo da onda

Aprofundar a mesma trilha de `Financeiro > Cadastros > Custos e Despesas` logo após a padronização de categorias e centros de custo, evitando trocar prematuramente para `Cartões`.

Nesta onda, o objetivo foi fechar a próxima camada de maturidade do subdomínio em três frentes:

1. persistência durável real fora da memória do processo;
2. filtros server-side para a listagem do catálogo;
3. auditoria mais rica para atualização e remoção.

## 2. Decisão técnica adotada

Em vez de pular imediatamente para persistência em banco relacional, a implementação adotou uma solução durável pragmática e operacional:

- armazenamento em arquivo JSON persistente no backend;
- catálogo de categorias e centros de custo mantido na mesma fonte persistida;
- acesso encapsulado em store própria do subdomínio;
- rota HTTP consumindo essa store;
- SPA enviando filtros ao backend via query string.

Isso atende o requisito de sair da persistência volátil em memória e cria uma camada durável imediata, sem depender de infraestrutura adicional antes da hora.

## 3. Arquitetura implementada

### 3.1 Nova store de backend

Arquivo criado:
- `/root/cvg-his-v2/apps/api/src/routes/expenses-catalog-store.ts`

Responsabilidades dessa store:

- carregar e salvar o estado persistido em disco;
- garantir criação automática do diretório de dados;
- manter estrutura persistida por conta (`accountId`);
- expor operações de:
  - listagem
  - criação
  - atualização
  - remoção
- aplicar filtros server-side por:
  - `search`
  - `category`
  - `costCenterCode`
- calcular diff resumido de atualização para auditoria.

### 3.2 Caminho de persistência

A store passa a usar:

- `process.env.CVG_HIS_EXPENSES_CATALOG_PATH`, quando definido;
- fallback para:
  - `apps/api/data/expenses-catalog.json`

Essa abordagem permite:

- persistência local durável entre reinícios do processo;
- injeção de caminho específico em teste;
- futura migração controlada para outra infraestrutura de persistência.

## 4. Mudanças de backend

Arquivo alterado:
- `/root/cvg-his-v2/apps/api/src/routes/expenses-catalog-routes.ts`

Evoluções aplicadas:

- a rota deixou de depender de `Map` em memória como fonte primária;
- agora resolve uma `ExpensesCatalogStore`;
- suporte opcional a:
  - `storagePath`
  - `store`
  no handler, facilitando testes e evolução futura;
- `GET /expenses-catalog` passou a interpretar query params:
  - `search`
  - `category`
  - `costCenterCode`
- `POST` e `PATCH` continuam validando categorias e centro de custo;
- `PATCH` agora registra auditoria com diff resumido de campos alterados;
- `DELETE` agora registra auditoria com contexto do item removido.

## 5. Mudanças de frontend

### 5.1 Serviço

Arquivo alterado:
- `/root/cvg-his-v2/apps/spa/src/services/expensesCatalog.ts`

Mudanças:

- `list()` passou a aceitar filtros opcionais;
- geração de query string para:
  - `search`
  - `category`
  - `costCenter`
- mapeamento para o contrato da API via `costCenterCode`.

### 5.2 Página

Arquivo alterado:
- `/root/cvg-his-v2/apps/spa/src/pages/finance/ExpensesPage.vue`

Mudanças:

- `reload()` agora envia filtros da tela para o backend;
- a listagem inicial continua sem filtro;
- o botão `Pesquisar` agora aciona consulta server-side real;
- a grade continua com leitura consistente do catálogo já retornado pela API.

## 6. Testes escritos primeiro

### 6.1 Backend

Arquivo reescrito/evoluído:
- `/root/cvg-his-v2/apps/api/src/routes/expenses-catalog-routes.test.ts`

Nova cobertura:

- listagem com filtros server-side;
- persistência em arquivo JSON;
- leitura correta após “reinício” lógico usando o mesmo arquivo persistido;
- atualização com auditoria contendo diff resumido;
- remoção com auditoria contextual;
- validação de centro de custo inválido.

### 6.2 Frontend

Arquivo evoluído:
- `/root/cvg-his-v2/apps/spa/src/pages/finance/__tests__/ExpensesPage.test.ts`

Nova cobertura:

- clique em `Pesquisar` gerando chamada server-side com filtros;
- verificação explícita de parâmetros enviados ao serviço;
- manutenção das coberturas já existentes de:
  - renderização
  - criação
  - edição
  - remoção
  - validação obrigatória.

## 7. Validações executadas

### 7.1 API

Comando:

```bash
cd /root/cvg-his-v2/apps/api
pnpm exec tsx --test src/routes/expenses-catalog-routes.test.ts
```

Resultado:

- `tests 2`
- `pass 2`
- `fail 0`

### 7.2 SPA — página de Custos e Despesas

Comando:

```bash
cd /root/cvg-his-v2/apps/spa
npm test -- src/pages/finance/__tests__/ExpensesPage.test.ts
```

Resultado:

- `Test Files 1 passed (1)`
- `Tests 6 passed (6)`

### 7.3 SPA — bloco financeiro

Comando:

```bash
npm test -- src/pages/finance/__tests__/CardsPage.test.ts src/pages/finance/__tests__/ExpensesPage.test.ts
```

Resultado:

- `Test Files 2 passed (2)`
- `Tests 10 passed (10)`

### 7.4 Regressão representativa SPA

Comando:

```bash
npm test -- src/stores/__tests__/auth.test.ts src/navigation.test.ts src/router/routes.test.ts src/pages/__tests__/EnterpriseSurfaces.test.ts src/pages/access-control/__tests__/AccessControlPage.test.ts src/pages/api-keys/__tests__/ApiKeysPage.test.ts src/pages/lgpd/__tests__/LgpdHubPage.test.ts src/pages/master-search/__tests__/MasterSearchPage.test.ts src/pages/audit/__tests__/AuditPage.test.ts src/pages/finance/__tests__/CardsPage.test.ts src/pages/finance/__tests__/ExpensesPage.test.ts
```

Resultado:

- `Test Files 11 passed (11)`
- `Tests 62 passed (62)`

## 8. Ganho funcional entregue

Com esta onda, `Custos e Despesas` sobe mais um degrau importante:

- sai da persistência apenas em memória do backend;
- ganha armazenamento durável local em disco;
- passa a consultar com filtros server-side reais;
- produz auditoria mais útil para leitura operacional e governança.

Em termos práticos, o catálogo agora está muito mais próximo de uma superfície administrativa de verdade do que de um mock funcional.

## 9. Limites ainda existentes

Ainda não foi implementado nesta fase:

- persistência relacional em banco oficial do domínio;
- CRUD de centros de custo como módulo separado;
- paginação server-side;
- ordenação server-side;
- trilha de auditoria estruturada com diff por campo em payload separado;
- histórico de versionamento por item.

## 10. Próximo passo técnico recomendado

Agora sim o melhor próximo passo fica bem definido dentro da mesma trilha:

1. extrair centros de custo para uma fonte backend própria/compartilhada;
2. adicionar paginação e ordenação server-side;
3. evoluir persistência de arquivo para repositório/banco do domínio;
4. transformar auditoria textual em estrutura mais rica e consultável.

Depois dessa próxima camada, a mudança de foco para `Cartões` passa a ter um custo de contexto bem menor e um ganho marginal mais claro.
