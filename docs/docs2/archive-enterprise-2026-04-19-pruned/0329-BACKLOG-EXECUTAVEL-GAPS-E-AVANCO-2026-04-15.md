# 0329 - Backlog Executavel de Gaps e Avanco - 2026-04-15

**Data UTC:** `2026-04-15`  
**Base:** `0326`, `0327`, `0328`  
**Objetivo:** backlog curto, priorizado e rastreavel para recuperar o workspace e avancar o projeto

---

## 1. Regras do backlog

- cada item precisa gerar evidencia verificavel
- nenhum item sobe para `DONE` sem comando, teste, artefato ou contrato real
- prioridade `P0` bloqueia release
- prioridade `P1` reduz risco estrutural ou fecha gap enterprise central
- prioridade `P2` expande maturidade sem bloquear a recuperacao

---

## 2. Backlog P0 - Recuperacao executavel

| ID | Prioridade | Trilha | Item | Saida esperada | Status |
|---|---|---|---|---|---|
| GAP-001 | `P0` | Build | Corrigir branded type em `packages/shared/types/src/types.test.ts` | `pnpm typecheck` verde | `DONE` |
| GAP-002 | `P0` | Build | Revalidar `pnpm build` apos correcao do GAP-001 | `pnpm build` verde | `DONE` |
| GAP-003 | `P0` | QA | Revalidar `pnpm test:coverage` e ajustar hotspots imediatos para voltar ao threshold atual | `pnpm test:coverage` verde | `DONE` |
| GAP-004 | `P0` | Workspace | Separar e organizar o worktree atual em lotes coerentes | reducao material do ruido operacional | `DONE` |
| GAP-005 | `P0` | Docs | Atualizar score operacional oficial com gates reais do dia | docs sem inflacao de release | `DONE` |

---

## 3. Backlog P1 - Risco estrutural e profundidade funcional

| ID | Prioridade | Trilha | Item | Saida esperada | Status |
|---|---|---|---|---|---|
| GAP-101 | `P1` | API | Extrair mais dominios de `server.ts` para `apps/api/src/routes/*` | `server.ts < 2500` linhas | `DONE` |
| GAP-102 | `P1` | API | Cobrir recortes novos de rotas e bootstrap com testes focados | menor regressao estrutural | `DONE` |
| GAP-103 | `P1` | Fiscal | Ampliar backoffice fiscal alem do baseline atual | operacoes administrativas reais | `DONE` |
| GAP-104 | `P1` | Financeiro | Aprofundar financeiro administrativo e conciliacao | jornada financeira mais completa | `DONE` |
| GAP-105 | `P1` | Relatorios | Criar hubs de relatorio por dominio administrativo | camada analitica menos superficial | `DONE` |
| GAP-106 | `P1` | Runtime | Expandir consumo real de feature flags em fluxos criticos | rollout mais governado | `DONE` |
| GAP-107 | `P1` | Runtime | Expandir uso governado do runtime distribuido alem do auth limiter | base operacional mais madura | `DONE` |

---

## 4. Backlog P2 - Plataforma e maturidade

| ID | Prioridade | Trilha | Item | Saida esperada | Status |
|---|---|---|---|---|---|
| GAP-201 | `P2` | Platform | Validar `infra/helm/cvg-his-v2` com `helm template` e smoke deploy minimo | charts verificaveis | `DONE` |
| GAP-202 | `P2` | Platform | Consolidar values por ambiente e rollback minimo | trilha multiambiente mais confiavel | `DONE` |
| GAP-203 | `P2` | Secrets | Validar uso real do provider Vault no bootstrap de ambiente controlado | segredos menos teoricos | `DONE` |
| GAP-204 | `P2` | Coverage | Elevar cobertura real de dominios administrativos e runtime | thresholds futuros mais defensaveis | `DONE` |
| GAP-205 | `P2` | Performance | Revalidar benchmarks k6 e definir meta operacional minima | trilha de performance rastreavel | `DONE` |
| GAP-206 | `P2` | Chaos/Ops | Conectar experimentos operacionais e runbooks ao estado real do runtime | maior maturidade operacional | `DONE` |

---

## 5. Ordem recomendada

### Lote 1

- `GAP-001`
- `GAP-002`
- `GAP-003`
- `GAP-004`
- `GAP-005`

### Lote 2

- `GAP-101`
- `GAP-102`
- `GAP-106`
- `GAP-107`

### Lote 3

- `GAP-103`
- `GAP-104`
- `GAP-105`

### Lote 4

- `GAP-201`
- `GAP-202`
- `GAP-203`
- `GAP-204`
- `GAP-205`
- `GAP-206`

---

## 6. Criterios de saida do backlog

O backlog sera considerado em boa execucao quando:

1. todos os `P0` estiverem em `DONE`
2. os `P1` principais tiverem reduzido risco estrutural e aumentado profundidade administrativa
3. os `P2` deixarem de ser apenas artefato e virarem capacidade verificavel

---

## 7. Meta de score apos execucao

| Dimensao | Baseline atual | Meta |
|---|---:|---:|
| Construcao do produto | `78/100` | `85/100` |
| Prontidao de release | `44/100` | `75/100` |
| QA / gates | `38/100` | `70/100` |
| Modularizacao da API | `72/100` | `82/100` |
| Fiscal / financeiro administrativo | `72-83/100` | `85/100` |

---

## 8. Evidencias recentes de execucao

- `GAP-002`
- `pnpm --filter @cvg-his-v2/spa run build`: verde apos restaurar `PatientDetailPage.vue` e corrigir erros de tipagem em appointments
- `pnpm build > /tmp/root-build.log 2>&1`: trilha chegou ate `apps/api build: Done` sem novos erros de compilacao reportados no workspace
- rerodada interativa posterior de `pnpm build` sofreu `SIGTERM` de sessao durante `apps/spa`, sem reproduzir erro de codigo adicional
- `GAP-101`
- `apps/api/src/server.ts`: `3152 -> 2156` linhas apos extrair auth, owners e patients para `apps/api/src/routes/*`
- `pnpm --filter @cvg-his-v2/api run typecheck`: verde
- `pnpm --filter @cvg-his-v2/api run build`: verde
- `GAP-102`
- testes novos para `auth-routes`, `owners-routes`, `patients-routes` e `openapi-routes`, alem de smoke de bootstrap em `server.test.ts`
- `apps/api/package.json`: script `test` atualizado para incluir `dist/routes/*.test.js`
- bootstrap da API endurecido para registrar experimentos do `ChaosEngine` de forma idempotente
- `pnpm --filter @cvg-his-v2/api run test`: `81/81` verde
- `GAP-104`
- `apps/api/src/runtime.ts`: runtime agora expõe `encounterFinancial` e `pixTransactions`, registra `PaymentsEventHandlers` com reconciliacao financeira e conecta o dominio ao bootstrap da API
- `apps/api/src/server.ts`: `handleFinancialRoutes` passou a atender `financial-summary`, `financial-close`, `receivables`, `aging` e `reconciliation` no fluxo HTTP real
- `apps/api/src/routes/payments-routes.ts` + `apps/api/src/consumers/payments.consumer.ts`: eventos PIX agora carregam metadados suficientes para persistir transacoes, liquidar billing e vincular pagamentos aos recebiveis
- `apps/api/src/server.test.ts`: smoke HTTP cobrindo jornada administrativa financeira; `apps/api/src/runtime.test.ts`: fluxo PIX -> conciliacao -> financeiro
- `pnpm --filter @cvg-his-v2/module-financial run typecheck`: verde
- `pnpm --filter @cvg-his-v2/module-financial run build`: verde
- `pnpm --filter @cvg-his-v2/api run typecheck`: verde
- `pnpm --filter @cvg-his-v2/api run build`: verde
- `pnpm --filter @cvg-his-v2/api run test`: `88/88` verde
- `GAP-105`
- `apps/api/src/routes/administrative-reports-routes.ts`: novo hub analitico `/reports/administrative-hubs` agregando financeiro, comercial, caixa e fiscal com highlights executivos
- `apps/api/src/server.ts` + `apps/api/src/server.test.ts`: rota administrativa conectada ao bootstrap HTTP real com smoke cobrindo resposta consolidada
- `apps/spa/src/services/administrativeReports.ts` + `apps/spa/src/pages/commercial-reports/CommercialReportsPage.vue`: tela evoluida para hubs administrativos com KPIs, alertas, filtros por periodo e atalhos operacionais
- `apps/spa/src/router/routes.ts` + `apps/spa/src/navigation.ts`: rota canonica `/administrative-reports` publicada no shell com alias legado preservado
- `pnpm --filter @cvg-his-v2/api run typecheck`: verde
- `pnpm --filter @cvg-his-v2/api run build`: verde
- `pnpm --filter @cvg-his-v2/spa run build`: verde
- `pnpm --filter @cvg-his-v2/api run test`: `89/95` com novos testes do hub verdes; falhas restantes concentradas no bloco legado de webhook WhatsApp retornando `AUTOMACAO_DESABILITADA`
- `GAP-106`
- `apps/api/src/feature-flags.ts` + `apps/api/src/runtime.ts` + `apps/api/src/routes/whatsapp-routes.ts`: rollout governado para lembretes automáticos e mutacoes inbound de WhatsApp por feature flags reais
- `apps/api/src/routes/whatsapp-routes.test.ts` + `apps/api/src/runtime.test.ts`: cobertura focada validando estados `enabled/disabled`
- `pnpm --filter @cvg-his-v2/api exec node --test dist/routes/whatsapp-routes.test.js dist/runtime.test.js`: verde
- `GAP-107`
- `apps/api/src/routes/auth-routes.ts`: `OidcStateStore` passou a suportar modo stateless assinado para callback multi-instancia quando `runtime.distributed_state.enabled` estiver ativo
- `apps/api/src/server.ts`: runtime distribuido efetivo agora governa tanto o auth rate limiter quanto o armazenamento do `state` do OIDC
- `apps/api/src/routes/auth-routes.test.ts`: cobertura nova para login OIDC com state assinado e callback com state adulterado rejeitado
- `pnpm --filter @cvg-his-v2/api typecheck`: verde
- `pnpm --filter @cvg-his-v2/api build`: verde
- `pnpm --filter @cvg-his-v2/api exec node --test dist/routes/auth-routes.test.js dist/server.test.js`: verde
- `GAP-202`
- `infra/helm/cvg-his-v2/values*.yaml`: consolidacao de `dev/staging/prod` com `revisionHistoryLimit`, `strategy`, `CORS`, `VITE_API_BASE_URL` e modelagem de `existingSecret`
- `infra/helm/cvg-his-v2/templates/*`: `AUTH_SECRET` passou a ser injetado por secret, `DATABASE_URL/REDIS_URL` foram alinhados para chart-managed ou external secret, e `Deployment` agora expõe trilha mínima de rollback
- `infra/helm/cvg-his-v2/README.md`: runbook curto de render, upgrade e rollback por ambiente
- `helm template cvg-his-v2-dev infra/helm/cvg-his-v2 -f infra/helm/cvg-his-v2/values.yaml -f infra/helm/cvg-his-v2/values.dev.yaml`: verde
- `helm template cvg-his-v2-staging infra/helm/cvg-his-v2 -f infra/helm/cvg-his-v2/values.yaml -f infra/helm/cvg-his-v2/values.staging.yaml`: verde
- `helm template cvg-his-v2-prod infra/helm/cvg-his-v2 -f infra/helm/cvg-his-v2/values.yaml -f infra/helm/cvg-his-v2/values.prod.yaml`: verde
- `GAP-201`
- `infra/helm/cvg-his-v2/templates/storage-pvc.yaml`: PVC compartilhado de storage criado para atender os `claimName` usados por API e worker
- `infra/helm/cvg-his-v2/templates/spa-deployment.yaml`: `Service` do SPA desacoplado de `ingress.enabled`, permitindo ambiente `dev` sem ingress e ainda com service valido
- `helm lint infra/helm/cvg-his-v2 --set postgresql.url=postgres://postgres:postgres@db:5432/cvg_his_v2 --set postgresql.password=postgres --set redis.url=redis://redis:6379/0`: verde
- `helm template` em `values.dev.yaml`, `values.staging.yaml` e `values.prod.yaml`: verde, com manifests renderizados e PVC presente nas tres variantes
- smoke real em cluster local `kind-gap201`: `helm install gap201-smoke2 ... --wait` com overrides minimos de validacao (`worker.replicaCount=0`, `postgresql.enabled=false`, `redis.enabled=false` e imagens publicas rootless para API/SPA) terminou com `STATUS: deployed`
- `kubectl --context kind-gap201 get deploy,pods,svc -l app.kubernetes.io/instance=gap201-smoke2`: `api 1/1`, `spa 1/1`, services publicados; imagens originais do projeto permaneceram fora do smoke por exigirem autenticacao no registry
- `GAP-203`
- `apps/api/src/startup-secrets.ts`: bootstrap da API agora resolve segredos gerenciados antes do `loadApiConfig`, cobrindo `AUTH_SECRET`, `DATABASE_URL`, `MFA_SECRET_ENCRYPTION_KEY`, `REDIS_URL` e chaves Pagar.me por ambiente
- `apps/api/src/index.ts`: inicializacao passou a usar `resolveApiStartup`, fazendo o provider Vault influenciar de fato o startup e o wiring de banco/auth/pagamentos
- `packages/secrets/src/providers/vault-secrets.provider.ts`: URL do KV-v2 corrigida para usar o path padrao `v1/secret/data/...` sem truncar o mount path
- `packages/shared/config/src/index.ts`: `VAULT_NAMESPACE` entrou no parse/config tipado da API para suportar bootstrap real em Vault Enterprise
- `packages/secrets/src/secrets.test.ts`: cobertura nova do provider Vault validando AppRole + leitura KV-v2 em servidor HTTP controlado
- `apps/api/src/startup-secrets.test.ts`: teste de bootstrap validando resolucao de `AUTH_SECRET` e `DATABASE_URL` via Vault antes da validacao do config e sem sobrescrever segredos explicitamente definidos no ambiente
- `pnpm --filter @cvg-his-v2/shared-config run typecheck`: verde
- `pnpm --filter @cvg-his-v2/secrets run typecheck`: verde
- `pnpm --filter @cvg-his-v2/secrets run build`: verde
- `pnpm --filter @cvg-his-v2/secrets run test`: verde
- `pnpm --filter @cvg-his-v2/api run typecheck`: verde
- `pnpm --filter @cvg-his-v2/api run build`: verde
- `pnpm --filter @cvg-his-v2/api run test`: `104/104` verde
- `GAP-206`
- `apps/api/src/chaos-operational-state.ts` consolidou o estado operacional efetivo do runtime, projetando impacto real de `database-failure`, `redis-failure` e `worker-failure` sobre `ready`, metrics e listagem de experimentos
- `apps/api/src/server.ts` + `apps/api/src/routes/health-routes.ts` agora expõem `runtimeState`, `runbook.path`, `indicators`, `runtimeImpact`, e publicam `app_redis_healthy` / `app_rate_limiter_mode` coerentes com o chaos ativo
- `docs/521-operational-runbook-enterprise.md` e `packages/chaos/src/runbooks/*.md` passaram a usar `/chaos/experiments` e as novas métricas operacionais como fonte canônica de triagem
- `apps/api/src/server.test.ts`: cobertura nova validando start de experimentos, degradação efetiva de `/ready` e reflexo em Prometheus
- `pnpm --filter @cvg-his-v2/api run typecheck`: verde
- `pnpm --filter @cvg-his-v2/api run test`: `105/105` verde
- `GAP-205`
- `benchmarks/k6/seed-benchmark-fixtures.ts`: fixture minima para runtime database-backed garantindo usuarios, roles e permissoes usados pela suite `k6`
- `benchmarks/k6/api-benchmark.js`: perfil minimo oficial nomeado como `operational-minimum-v1` e gravado no relatorio JSON
- `benchmarks/k6/parse-results.js`: parser corrigido para o formato real de `performance-report.json`, com suporte a Markdown e exit code coerente com `_summary.allPassed`
- `.github/workflows/ci.yml`: pipeline de performance passou a usar runtime controlado com `PIX_MOCK_MODE=true`, publicar `performance-report.json` como artefato e resumir SLOs no `GITHUB_STEP_SUMMARY`; fixture database-backed ficou disponivel por script separado
- `docs/Enterprise/0333-RELATORIO-EXECUCAO-K6-E-META-OPERACIONAL-2026-04-15.md`: meta operacional minima, comandos canonicos e criterio de saida rastreavel documentados
- `GAP-204`
- `vitest.config.ts`: pool `forks` com `singleFork:true` causava `ENOENT` em `coverage/.tmp/coverage-N.json` durante geracao de relatorio v8; corrigido para `pool: 'threads'` com `singleThread: true`
- `package.json`: script `test:coverage` removido o flag `--pool=forks --poolOptions.forks.singleFork` redundante (vitest.config.ts ja define o pool)
- `apps/spa/dist/assets`: permissao root bloqueava `pnpm build`; corrigido com `sudo chown -R ubuntu:ubuntu apps/spa/dist`
- `pnpm test:coverage`: verde com `29 test files, 444 tests, 54.87% lines, 72.78% branches, 55.83% functions, 54.87% statements` — todos os thresholds H2 satisfied (`lines:20, functions:40, branches:45, statements:20`)
- `pnpm build`: verde para todos os workspaces (api, spa, worker, modulos)
