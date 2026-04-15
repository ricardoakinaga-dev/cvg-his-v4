# 0319 - Backlog Operacional de Feature Flags com Governanca

**Status:** vivo — em correcao  
**Data de validacao:** 2026-04-13  
**Data da auditoria:** 2026-04-14  
**Escopo:** transformar a ausencia de feature flags em execucao operacional por ondas  
**Relacionamento:** `IMP-203` em `0193`, Sprint 10 em `0194`, plano de acao `0300`, auditoria `0301`, gap residual `0318`

---

## 1. Leitura objetiva do gap

Baseline observado no repositorio:

- existe governanca madura de configuracao por ambiente em `packages/shared/config/src/index.ts`;
- existe runtime com wiring central em `apps/api/src/runtime.ts`;
- existe primeiro caso de estado distribuido real no auth limiter com Redis;
- ja existe contrato compartilhado de feature flags e provider `env` de bootstrap;
- API e worker ja recebem configuracao inicial de flags por ambiente;
- ainda nao existe governanca HTTP ou persistencia canônica de flags.

Leitura tecnica:

- o repositorio ja possui substrate de configuracao, auditoria e runtime suficientes para receber feature flags;
- o gap atual nao e falta de infraestrutura base, e falta de contrato formal de rollout governado;
- expandir runtime distribuido sem feature flags aumenta risco de rollout irreversivel, regressao de ambiente e ativacao acidental de capacidade incompleta.

---

## 2. Objetivo executivo

Implantar um sistema de feature flags com provider e governanca, capaz de controlar rollout por ambiente, conta, allowlist e percentual, com auditoria, fallback seguro e consumo padronizado por API e worker.

Metas:

- Marco M1: existe contrato unico de feature flags compartilhado no monorepo;
- Marco M2: API e worker consomem o mesmo provider;
- Marco M3: existe backend canonico governavel, sem depender apenas de `process.env`;
- Marco M4: mudancas de flags ficam auditaveis e operaveis por administracao controlada;
- Marco M5: pelo menos 2 flags reais entram em uso governado.

---

## 3. Regras operacionais

- feature flag nao pode ser sinonimo de `if` em env var espalhado;
- toda flag precisa ter `owner`, `descricao`, `default`, `scope` e `expiresAt`;
- toda mudanca operacional de flag precisa ser auditada;
- provider canonico precisa ter fallback explicito;
- consumo de flag deve acontecer em runtime/servicos/handlers, nao diretamente em `server.ts`;
- nenhum rollout sensivel entra sem teste de fallback e comportamento default.

---

## 4. Epicos

| Epico | Nome | Objetivo | Status |
|------|------|----------|--------|
| EP-FF-01 | Contrato Compartilhado | criar tipos, registry e interface unica de provider | ✅ DONE |
| EP-FF-02 | Provider de Bootstrap | implementar provider via env para bootstrap e contingencia | ✅ DONE |
| EP-FF-03 | Provider Canonico | implementar persistencia database-backed e leitura governada | ✅ DONE (PR-FF-04/05/06: schema + migrations + `DatabaseFeatureFlagRepository` + `createDatabaseFeatureFlagProvider`) |
| EP-FF-04 | Runtime Integration | integrar flags na API e no worker sem acoplamento ao transport root | ✅ DONE (consumo via `server.ts`, flags usadas em handlers) |
| EP-FF-05 | Governanca Operacional | expor administracao, avaliacao e auditoria de flags | ✅ DONE (PR-FF-10 + PR-FF-11 + PR-FF-12 todos DONE) |
| EP-FF-06 | Observabilidade e Fallback | adicionar metricas, alertas, cache e comportamento seguro sob falha | ⚠️ PARTIAL (PR-FF-13: `createFeatureFlagMetricsCollector()` wired em `server.ts` + `metrics.ts` ✅; PR-FF-14 testes DONE ✅; porem `createDatabaseFeatureFlagProvider` NAO instrumentado com metrics ❌ e worker NAO consome collector ❌) |
| EP-FF-07 | Adoção Real | ligar flags reais aos fluxos de rollout prioritarios | ⚠️ PARTIAL (PR-FF-15+: `auth.oidc.enabled` (2 rotas ✅), `auth.webauthn.enabled` (4 rotas ✅), `fiscal.backoffice.enabled` (gate em fiscal-routes.ts ✅); `runtime.distributed_state.enabled` DEFINIDA e COMPUTADA MAS NAO consumida em nenhum handler/runtime — gap PR-FF-17) |

---

## 5. Ondas de execucao

### Onda 1 - Contrato e provider minimo

**Objetivo:** parar de tratar rollout como detalhe implícito de env var.

**Status em `2026-04-13`:**

- `PR-FF-01` concluido com criacao do package compartilhado `@cvg-his-v2/shared-feature-flags`;
- contrato entregue com `FeatureFlagProvider`, `FlagDefinition`, `EvaluationContext`, `FlagDecision` e `FeatureFlagRegistry`;
- validacoes executadas para `PR-FF-01`: `pnpm --filter @cvg-his-v2/shared-feature-flags typecheck` e `test`;
- `PR-FF-02` ✅ DONE: campos `FEATURE_FLAGS_PROVIDER` (default 'env') e `API_FEATURE_FLAGS` adicionados a `API_CONFIG_FIELDS`; campos `FEATURE_FLAGS_PROVIDER` e `WORKER_FEATURE_FLAGS` adicionados a `WORKER_CONFIG_FIELDS`; `ApiAppConfig` e `WorkerAppConfig` com novos campos; `loadApiConfig`/`loadWorkerConfig` parseiam e retornam os novos campos; `createApiServer` recebe `featureFlagsProvider` e `apiFeatureFlags` do config; `createApiFeatureFlags` em `server.ts` recebe `options.apiFeatureFlags` como `enabledKeys`
- `PR-FF-03` concluido com provider `env` no package compartilhado e defaults governados;
- `PR-FF-07` ✅ DONE com integracao da API ao bootstrap de flags;
- `PR-FF-09` ⚠️ PARTIAL: `auth.oidc.enabled` em 2 rotas (`server.ts:1306,1335`), `auth.webauthn.enabled` em 4 rotas (`server.ts:1136,1165,1214,1244`); `fiscal.backoffice.enabled` consumida via gate em `fiscal-routes.ts`; `runtime.distributed_state.enabled` DEFINIDA e COMPUTADA porem NAO consumida em handlers (gap PR-FF-17);
- validacoes executadas nesta onda: `pnpm --filter @cvg-his-v2/shared-feature-flags build`, `pnpm --filter @cvg-his-v2/shared-config build`, `pnpm --filter @cvg-his-v2/api typecheck`, `pnpm --filter @cvg-his-v2/api test`, `pnpm validate:openapi`, `pnpm test:coverage`.

**PRs planejados**

| PR | Escopo | Arquivos alvo | Saida esperada |
|----|--------|---------------|----------------|
| PR-FF-01 | criar modulo compartilhado | novo `packages/shared/feature-flags/*` ou `packages/modules/feature-flags/*` | `FeatureFlagProvider`, `FlagDefinition`, `EvaluationContext`, `FlagDecision`, registry central |
| PR-FF-02 | integrar config de bootstrap | `packages/shared/config/src/index.ts`, novo bootstrap de flags | suporte a provider `env` e configuracao inicial de fallback | ✅ DONE (`FEATURE_FLAGS_PROVIDER`, `API_FEATURE_FLAGS`, `WORKER_FEATURE_FLAGS` em `shared-config`; wired a `createApiServer` e `createApiFeatureFlags`) |
| PR-FF-03 | provider `env` e regras basicas | novo modulo/provider | avaliacao por ambiente, on/off global e defaults governados | ✅ DONE (`createEnvFeatureFlagProvider` em `@cvg-his-v2/shared-feature-flags`, conectado ao bootstrap via `shared-config`) |

**Criterio de aceite da onda**

- existe contrato unico e reutilizavel;
- existe registry oficial de flags;
- existe provider `env` com fallback previsivel;
- flags deixam de depender de leitura ad-hoc de `process.env`.

### Onda 2 - Provider canonico com governanca

**Objetivo:** sair do bootstrap e entrar em controle operacional real.

**PRs planejados**

| PR | Escopo | Arquivos alvo | Saida esperada |
|----|--------|---------------|----------------|
| PR-FF-04 | schema e persistencia | `packages/db`, migrations, repositorio de flags | armazenamento canonico database-backed | ✅ DONE |
| PR-FF-05 | provider `database` | novo provider e wiring de repositorio | leitura canônica com regras por ambiente, conta e allowlist | ✅ DONE |
| PR-FF-06 | rollout percentual e kill switch | provider e testes | suporte a percentual, allowlist e desativacao emergencial | ✅ DONE |

**Criterio de aceite da onda**

- flags podem ser governadas sem redeploy;
- existe backend canonico para leitura e escrita;
- percentual e allowlist funcionam com contrato testado;
- kill switch esta disponivel para fluxos sensiveis.

### Onda 3 - Integracao no runtime

**Objetivo:** ligar feature flags ao runtime real sem sujar o transport root.

**Status em `2026-04-14`:**

- `PR-FF-07` ✅ DONE: API recebe flags via bootstrap de config (`loadApiConfig` → `FEATURE_FLAGS_PROVIDER`, `API_FEATURE_FLAGS`), `createApiFeatureFlags` é chamada em `createApiServer` com `environment` e `enabledKeys`. Registry com 4 flags: `auth.oidc.enabled`, `auth.webauthn.enabled`, `runtime.distributed_state.enabled`, `fiscal.backoffice.enabled`.
- `PR-FF-08` ✅ DONE (parcial): Worker tem definitions próprias (`WORKER_FEATURE_FLAG_DEFINITIONS`) + `createWorkerFeatureFlags` em `feature-flags.ts`, configurado via `loadWorkerConfig` (`WORKER_FEATURE_FLAGS`). Defs: `runtime.distributed_state.enabled`, `notifications.whatsapp.provider_enabled`.
- `PR-FF-09` ⚠️ PARTIAL: Flags usadas em handlers em `server.ts`: `auth.webauthn.enabled` em 4 rotas (lines 1136, 1165, 1214, 1244 ✅), `auth.oidc.enabled` em 2 rotas (lines 1306, 1335 ✅). `fiscal.backoffice.enabled` consumida via gate em `fiscal-routes.ts:57` ✅. `runtime.distributed_state.enabled` DEFINIDA e COMPUTADA MAS NÃO consumida ❌ — gap PR-FF-17.
- `PR-FF-03` ✅ DONE: Provider `env` (`createEnvFeatureFlagProvider`) implementado e conectado ao bootstrap via `shared-config`.

**O que foi implementado:**
- ✅ Rotas administrativas `/flags/*` (PR-FF-10 DONE, wired em `server.ts`)
- ⚠️ Métricas de fallback/erro do provider (PR-FF-13 PARTIAL — `createFeatureFlagMetricsCollector()` implementada e wiring API feito ✅; porem `createDatabaseFeatureFlagProvider` NAO instrumentado ❌ e worker NAO consome collector ❌)
- ✅ Cache TTL no provider (60s default em `createDatabaseFeatureFlagProvider`)
- ✅ Worker com bootstrap próprio de flags (PR-FF-08 DONE)
- ✅ `fiscal.backoffice.enabled` consumida via gate em `handleFiscalRoutes`
- ❌ `runtime.distributed_state.enabled` DEFINIDA MAS NAO CONSUMIDA — gap PR-FF-17

**Residual:**
- Worker ainda não é chamado com flags dinamicamente em runtime — só no bootstrap inicial (considerar EP-FF-07 para próxima iteração)

**Criterio de aceite da onda**

- API e worker compartilham o mesmo contrato;
- `server.ts` nao vira centro de avaliacao de flags;
- flags passam a controlar fluxos reais no runtime.

### Onda 4 - Governanca operacional e auditoria

**Objetivo:** tornar rollout controlado, explicavel e reversivel.

**PRs planejados**

| PR | Escopo | Arquivos alvo | Saida esperada |
|----|--------|---------------|----------------|
| PR-FF-10 | rotas administrativas | novos handlers em `apps/api/src/routes/*` | listar, criar, atualizar e avaliar flags | ✅ DONE |
| PR-FF-11 | permissoes e auditoria | access-control, audit e handlers | toda mudanca de flag gera evidencia auditavel | ✅ DONE (permissões `flags.read` + `flags.admin` em `access-control`, `AuditableFeatureFlagRepository` + `DatabaseFeatureFlagRepository` em `shared-feature-flags/repositories`) |
| PR-FF-12 | catalogo operacional | docs e endpoint de leitura | inventario de flags com owner, default e expiracao | ✅ DONE (`apps/api/src/routes/feature-flags-routes.ts` wired em `server.ts` + `docs/Enterprise/0325-CATALOGO-FEATURE-FLAGS-OPERACIONAL.md`) |

**Criterio de aceite da onda**

- administradores conseguem operar flags com seguranca;
- toda alteracao fica registrada;
- existe catalogo oficial consultavel;
- mudancas de rollout nao dependem de acesso informal ao codigo.

### Onda 5 - Observabilidade, endurecimento e adoção real

**Objetivo:** fechar o gap com uso real, nao apenas com infraestrutura pronta.

**PRs planejados**

| PR | Escopo | Arquivos alvo | Saida esperada |
|----|--------|---------------|----------------|
| PR-FF-13 | metricas e alertas | metrics, logging e dashboards/runbooks | visibilidade sobre fallback, erro e avaliacoes | ⚠️ PARTIAL (`createFeatureFlagMetricsCollector()` implementada em `metrics.ts` ✅ e wiring API feito ✅; porem `createDatabaseFeatureFlagProvider` do `packages/modules/feature-flags` NAO instrumentado ❌ e worker NAO usa collector ❌) |
| PR-FF-14 | testes de resiliencia | suites de contrato/integracao | fallback, cache e rollout percentual validados | ✅ DONE (testes existentes em `feature-flags.test.ts` cobrem rollout % + kill switch + allowlist; `database-provider.test.ts` cobre fallback, cache TTL e rollback via mock DB) |
| PR-FF-15 | ligar flags reais prioritarias | runtime e handlers reais | pelo menos 2 flags operacionais em uso governado | ⚠️ PARTIAL (gate `auth.webauthn.enabled` em 4 rotas WebAuthn + gate `auth.oidc.enabled` em 2 rotas OIDC ✅; `fiscal.backoffice.enabled` consumida via gate em `fiscal-routes.ts` ✅; `runtime.distributed_state.enabled` DEFINIDA e COMPUTADA porem NAO consumida ❌) |
| PR-FF-16 | consolidacao documental | `0193`, `0194`, `0300`, `0301`, `0319` | backlog refletindo fechamento do gap | ⚠️ PARTIAL (documentacao 0319 atualizada com todos os gaps identificados (PR-FF-17, PR-FF-18), epicos EP-FF-06 e EP-FF-07 como PARTIAL, criterio de aceite com status reais; porem IMP-203 NAO fechavel enquanto metricas (PR-FF-13 PARTIAL) e consumo de `runtime.distributed_state.enabled` (PR-FF-17) estiverem abertos) |
| PR-FF-17 | Consumir `runtime.distributed_state.enabled` | `apps/api/src/runtime.ts`, `apps/api/src/feature-flags.ts` | consumir a flag no runtime ou em handler concreto | 🆕 TODO (`runtimeDistributedStateEnabled` definido e computado porem nao usado em nenhum lugar — gap media) |
| PR-FF-18 | Instrumentar `createDatabaseFeatureFlagProvider` com metrics | `packages/modules/feature-flags/src/repositories/database-feature-flag.repository.ts` | adicionar `FeatureFlagMetricsCollector` ao provider database e instrumentar metodo evaluate | 🆕 TODO (database provider nao aceita collector; avaliacoes nao gravam em Prometheus) |

**Criterio de aceite da onda**

- rollout percentual e kill switch sao testados; ✅
- ao menos 2 flags reais estao governando rollout; ✅ (`auth.webauthn.enabled`, `auth.oidc.enabled`)
- existem metricas de erro e fallback do provider; ⚠️ PARTIAL (PR-FF-13 PARTIAL — `createFeatureFlagMetricsCollector()` wiring API feito; `createDatabaseFeatureFlagProvider` do modules/package NAO instrumentado)
- `IMP-203` fica fechavel com evidencia executavel. ⚠️ BLOQUEADO (IMP-203 fechavel SOMENTE apos resolver PR-FF-17 e PR-FF-18)

---

## 6. Flags candidatas iniciais

As primeiras flags devem controlar frentes que ja aparecem como gaps ou rollout sensivel:

- `runtime.distributed_state.enabled`
- `auth.oidc.enabled`
- `auth.webauthn.enabled`
- `payments.pagarme.enabled`
- `notifications.whatsapp.provider_enabled`

Regra:

- evitar flags cosmeticas no inicio;
- priorizar flags que reduzam risco de rollout em runtime distribuido e integracoes.

---

## 7. Ordem recomendada por dependencia

1. PR-FF-01 a PR-FF-03
2. PR-FF-04 a PR-FF-06
3. PR-FF-07 a PR-FF-09
4. PR-FF-10 a PR-FF-12
5. PR-FF-13 a PR-FF-16
6. PR-FF-17 (fechar gap `runtime.distributed_state.enabled`)
7. PR-FF-18 (instrumentar database provider com metrics)

Bloqueios:

- PR-FF-17 depende de EP-FF-04 estar estavel (ja esta);
- PR-FF-17 e o ultimo gate para IMP-203 fechavel com 4 flags reais em uso;
- PR-FF-18 depende de PR-FF-13 estar parcialmente feito (ja esta);
- PR-FF-18 pode ser executado em paralelo com PR-FF-17.

Bloqueios:

- Onda 2 depende de o contrato da Onda 1 estar estavel;
- Onda 3 depende de o provider canonico existir;
- Onda 4 depende de a avaliacao de flags ja estar integrada ao runtime;
- Onda 5 depende de existirem flags reais ligadas a fluxos sensiveis.

---

## 8. Definition of Done por PR

Todo PR deste backlog so fecha quando cumprir todos os itens abaixo:

- reduz o gap real de rollout governado;
- mantem o contrato de feature flags coeso e sem bypass por env direto;
- adiciona testes proporcionais ao risco;
- define fallback claro para falha do provider;
- atualiza este documento com status `DONE`, `PARTIAL` ou `TODO`;
- deixa evidencia objetiva de uso ou de readiness operacional.

---

## 9. Evidence pack por onda

Ao fechar cada onda, registrar:

- lista de novos modulos, providers, schemas e handlers;
- suites executadas;
- flags cadastradas ou controladas de forma real;
- fallback disponivel e evidenciado;
- riscos residuais para a proxima onda.

Comandos minimos:

```bash
pnpm typecheck
pnpm build
pnpm test
```

Adicionar quando existir:

```bash
pnpm --filter @cvg-his-v2/api test
pnpm --filter @cvg-his-v2/worker test
```

---

## 10. Gaps residuais (auditoria 2026-04-14)

Os itens abaixo foram identificados na auditoria de codigo mas NAO estao refletidos como pendencias no backlog:

### Gaps corrigidos pela trilha

| Gap | Severidade | Descricao | Arquivo afetado | Status |
|-----|------------|-----------|----------------|--------|
| Wiring Prometheus para metrics de FF | ~~**ALTA**~~ | `FeatureFlagMetricsCollector` + providers instrumentados existem porem `createFeatureFlagMetricsCollector()` e contadores `feature_flag_*` NAO existem em `metrics.ts` — collector nunca envia para Prometheus | `apps/api/src/metrics.ts` | ✅ FIXED (PR-FF-13+: `createFeatureFlagMetricsCollector()` implementada e wiring API feito; porem `createDatabaseFeatureFlagProvider` NAO instrumentado) |
| `fiscal.backoffice.enabled` nao consumida | ~~**MEDIA**~~ | Flag definida em `API_FEATURE_FLAG_DEFINITIONS` e em `ApiFeatureFlagsSnapshot` POREM nenhum handler avalia essa flag | `apps/api/src/server.ts` | ✅ FIXED (PR-FF-15+: consumed via fiscal-routes.ts gate) |
| Schema de feature flags nao exportado | ~~**MEDIA**~~ | Schema existe em `packages/db/src/schema/feature_flags.ts` POREM NAO e exportado em `packages/db/src/schema/index.ts` | `packages/db/src/schema/index.ts` | ✅ FIXED |
| `auth.oidc.enabled` em apenas 2 rotas | ~~**BAIXA**~~ | Documentacao original decia 3 rotas OIDC, auditoria confirmou 2 rotas (lines 1306, 1335) | `apps/api/src/server.ts` | ✅ VERIFIED (2 rotas corretas) |

### Gap identificado na auditoria 2026-04-14

| Gap | Severidade | Descricao | Arquivo afetado | Status |
|-----|------------|-----------|----------------|--------|
| `runtime.distributed_state.enabled` definida mas nao consumida | **MEDIA** | Flag definida em `API_FEATURE_FLAG_DEFINITIONS` (feature-flags.ts:35-43), boolean `runtimeDistributedStateEnabled` computado em `createApiFeatureFlags` (feature-flags.ts:112), POREM nenhum handler ou runtime consome essa flag. Valor disponivel em `ApiFeatureFlagsSnapshot` mas nao passado a `createApiRuntime` nem usado em nenhum lugar. | `apps/api/src/feature-flags.ts`, `apps/api/src/runtime.ts` | ❌ OPEN — PR-FF-17 necessario |
| `createDatabaseFeatureFlagProvider` sem instrumentacao de metrics | **MEDIA** | `createDatabaseFeatureFlagProvider` em `database-feature-flag.repository.ts` NAO aceita `FeatureFlagMetricsCollector` e NAO grava avaliacoes em Prometheus. O provider env (API) tem metrics porem o provider database (governanca) nao. | `packages/modules/feature-flags/src/repositories/database-feature-flag.repository.ts` | ❌ OPEN — PR-FF-18 necessario |

**Proximos passos recomendados:**

1. ⚠️ **PR-FF-13续** (PR-FF-13+): ⚠️ PARTIAL — `createFeatureFlagMetricsCollector()` implementada e wiring API feito; porem `createDatabaseFeatureFlagProvider` NAO instrumentado
2. ⚠️ **PR-FF-15续** (PR-FF-15+): ⚠️ PARTIAL — `fiscal.backoffice.enabled` conectada; `runtime.distributed_state.enabled` AINDA NAO consumida
3. 🆕 **PR-FF-17**: Consumir `runtimeDistributedStateEnabled` no runtime — falta implementar gate em `createApiRuntime` ou handler concreto
4. 🆕 **PR-FF-18**: Instrumentar `createDatabaseFeatureFlagProvider` com `FeatureFlagMetricsCollector` — adicionar parametro de metrics e gravar avaliacoes em Prometheus

---

## 11. Resultado esperado

Ao fim da trilha:

- o programa deixa de operar sem mecanismo formal de rollout;
- feature flags passam a existir com governanca real;
- API e worker compartilham o mesmo provider;
- ativacao de capacidades sensiveis deixa de depender de deploy ou improviso por env;
- `IMP-203` deixa de ser `TODO` e passa a ser fechavel com evidencia objetiva.
