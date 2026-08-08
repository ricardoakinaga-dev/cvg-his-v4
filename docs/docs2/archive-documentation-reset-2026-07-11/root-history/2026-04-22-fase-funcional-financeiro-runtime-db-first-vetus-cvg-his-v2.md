# Fase funcional — política final do runtime financeiro (DB-first)

Data: 2026-04-22
Domínio: Financeiro > Custos e Despesas + Centros de Custo

## Objetivo
Materializar a política final do runtime do catálogo financeiro para que o caminho padrão do API deixe de depender implicitamente do fallback file-backed.

## Decisão adotada
A política agora é:
- `DB-first` no runtime padrão do API
- fallback file-backed apenas quando explicitamente injetado por:
  - `handlers.store`
  - `handlers.storagePath`

Em outras palavras:
- no runtime real/default do API, se o app estiver configurado para banco mas não estiver em modo `database`, as rotas do catálogo financeiro falham explicitamente com `503`
- o caminho file-backed continua existindo como mecanismo controlado para testes e cenários explícitos de fallback, não como comportamento implícito silencioso do runtime principal

## Mudanças implementadas

### Backend
Arquivo:
- `apps/api/src/routes/expenses-catalog-routes.ts`

Mudança:
- `resolvePersistence()` agora retorna `null` quando:
  - não há `store` injetado
  - não há `storagePath` explícito
  - o `appState` indica `databaseConfigured=true` mas `persistenceMode !== 'database'`

Resposta padronizada nesse caso:
- status: `503`
- code: `FINANCE_CATALOG_DB_REQUIRED`
- message: `Finance catalog runtime requires database-backed persistence in the default API runtime`

### SPA
Arquivo:
- `apps/spa/src/services/api.ts`

Mudança:
- para erros não-auth, `apiRequest()` agora prioriza `body.message` quando presente
- isso permite que a UI mostre mensagens operacionais específicas do backend, em vez de somente `HTTP 503: Service Unavailable`

## Testes adicionados/ajustados

### API
Arquivo:
- `apps/api/src/routes/expenses-catalog-routes.test.ts`

Nova cobertura:
- fail-fast do runtime padrão quando o modo `database` não está disponível, retornando `503 FINANCE_CATALOG_DB_REQUIRED`

### SPA
Arquivo:
- `apps/spa/src/services/__tests__/api.test.ts`

Nova cobertura:
- `apiRequest()` prefere a mensagem semântica do backend em erros não-auth, incluindo a política do catálogo financeiro

## Validação executada

### API
Comando:
- `pnpm exec tsx --test src/routes/expenses-catalog-routes.test.ts`

Resultado:
- `tests 3`
- `pass 3`
- `fail 0`

### SPA focado
Comando:
- `npm test -- src/services/__tests__/api.test.ts src/pages/finance/__tests__/ExpensesPage.test.ts src/pages/finance/__tests__/CostCentersPage.test.ts`

Resultado:
- `Test Files 3 passed (3)`
- `Tests 12 passed (12)`

### SPA regressão representativa
Comando:
- `npm test -- src/navigation.test.ts src/router/routes.test.ts src/pages/__tests__/EnterpriseSurfaces.test.ts src/pages/finance/__tests__/CardsPage.test.ts src/pages/finance/__tests__/ExpensesPage.test.ts src/pages/finance/__tests__/CostCentersPage.test.ts src/services/__tests__/api.test.ts`

## Impacto da decisão

### Ganhos
- elimina fallback implícito silencioso no runtime principal
- deixa a operação do domínio financeiro mais previsível
- facilita diagnóstico operacional
- preserva fallback explícito para testes/cenários controlados

### Trade-off
- quando o ambiente estiver mal configurado para banco, o catálogo financeiro agora falha de forma explícita em vez de degradar silenciosamente

Esse trade-off é intencional e alinhado ao estágio atual do subdomínio.

## Próximo passo recomendado
Depois deste bloco de política de runtime, a próxima frente natural é:
- enriquecer auditoria/observabilidade funcional do domínio

Itens prioritários:
- melhorar `payloadSummary` e `diffSummary`
- deixar create/update/delete mais legíveis para operação gerencial
- depois disso, amadurecer filtros/ordenação/feedback do front
