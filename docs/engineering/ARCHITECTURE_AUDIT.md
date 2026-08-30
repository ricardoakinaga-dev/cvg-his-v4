# CVG-HIS V4 — Auditoria de Arquitetura

**Data da auditoria:** 2026-08-25  
**Status:** discovery concluída; primeiro slice operacional implementado; consolidação global em andamento
**Escopo:** monorepo, composição API/worker/SPA, persistência, migrations, RLS, runtime, CI/CD, Helm, paridade, testes e documentação  
**Regra:** comportamento reproduzível e configuração executável prevalecem sobre nomes de documentos.

## 1. Sumário executivo

O repositório já contém uma base funcional ampla, com TypeScript compilando, lint e build completos verdes nesta auditoria. A consolidação ainda não está pronta para operação 24x7 porque há múltiplas fontes de identidade e operação, além de gaps P0/P1 que não aparecem em um build local:

- o produto é chamado V4 no programa e em parte da documentação, mas o runtime, os pacotes, o Compose canônico, imagens e o README ainda são V2;
- `packages/db` é a trilha oficial de migrations; `packages/shared/database` continua como cliente de runtime, mas seus comandos `db:*` agora falham fechado e apontam para a trilha canônica;
- o runner agora valida nome+checksum antes de qualquer nova aplicação; a prova de mismatch em PostgreSQL descartável passou, mas a aplicação positiva isolada ainda é um gate futuro;
- o Compose agora declara `/ready` em `127.0.0.1:3001`, removendo a dependência implícita do `HEALTHCHECK` da imagem;
- API e worker agora têm shutdown idempotente, drain/readiness, fechamento de listener/DB/observabilidade e process tests; rollout com DB/Redis reais ainda não foi ensaiado;
- há dois caminhos Helm, e `charts/helm` aponta `/health/startup`, rota que não existe na API;
- o gate de parity estrita prova presença de arquivos, não comportamento comparável ao Vetus. O relatório vigente registra 4/11 domínios verificados;
- restore real, RLS no catálogo implantado, Redis/provider, WCAG, cobertura e cutover ainda não têm evidência de ambiente-alvo.

Atualização bounded de `CVG-001`: a SPA construída agora tem um teste
Chromium/axe do setup wizard (2/2), incluindo teclado, foco, formulário
nomeado e `aria-describedby`; isso é evidência de componente/jornada de
primeiro acesso, não auditoria WCAG global nem evidência de ambiente-alvo.

**Conclusão:** a arquitetura é recuperável sem rewrite. A prioridade é tornar a superfície canônica executável e observável, retirar controles duplicados gradualmente e fechar jornadas clínicas/financeiras com provas reais.

## 2. Evidência de baseline

| Verificação                         |                                                                                                                                                                         Resultado em 2026-08-25 | Limite da evidência                               |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------: | ------------------------------------------------- |
| `pnpm typecheck`                    |                                                                                                                                                                      PASS — 70/70 projetos alvo | não prova runtime/deploy                          |
| `pnpm lint`                         |                                                                                                                                                                      PASS — 70/70 projetos alvo | não prova comportamento                           |
| `pnpm build`                        |                                                                                                                                                               PASS — SPA, API, worker e pacotes | gera artefatos locais; não prova imagem publicada |
| `pnpm security:secrets`             |                                                                                                                                                                                            PASS | scanner estático                                  |
| `pnpm validate:openapi`             |                                                                                                                                                          PASS — 345 paths, 40 tags, 396 schemas | contrato estático                                 |
| `pnpm validate:rls`                 |                                                                                                                                                   PASS — 158/159 tabelas, 1 exceção documentada | não inspeciona catálogo vivo                      |
| `pnpm validate:helm`                |                                                                                                                                                    PASS estático; Helm não disponível no runner | sem render real neste ambiente                    |
| `pnpm vetus:parity:test`            |                                                                                                                                                                  PASS — contrato estrutural 4/4 | não prova parity funcional                        |
| `pnpm readiness:enterprise`         |                                                                                                                                                    FAIL — 95/100, parity estrita não verificada | score de prontidão não é go-live                  |
| testes focados do primeiro slice    |                                                                                                                                                                    PASS — 4 arquivos, 22 testes |
| process lifecycle real              |                                                                                                                                        PASS — API/worker, SIGTERM repetido e readiness de drain |
| migration integrity PostgreSQL real |                                                                                                                                  PASS — 142 migrations aplicáveis e mismatch sem nova aplicação |
| laboratório route test              |                                                                                                                                                    PASS — 2/2 após fixture de signer autorizado |
| RLS/roles em PostgreSQL descartável |                                                                                                                        PASS — isolation/access/runtime ACL 19/19; bootstrap production-like 6/6 |
| clinical-financial vertical HTTP    | PASS — 11/11; admissão, handoff/stay, consumo, cobrança diária, alta, fechamento e recebimento; inclui cenário com Owner/Patient/Encounter criados via HTTP até inpatient/billing/stock/receipt |
| suíte monorepo `pnpm test`          |                                                                        PASS — 70 projetos selecionados; SPA 172 arquivos/1.016 testes, API 364/364; PostgreSQL `shm=1gb`, `OOM=false`, `exit=0` |
| suites DB concorrentes com lock     |                                                                                                                                      PASS — marketing 12/12 e staff 7/7 com `REQUIRE_TEST_DB=1` |

Os comandos de baseline não alteraram o worktree. O build emite warnings de bundling da SPA por import dinâmico e estático simultâneo de `services/api.ts` e `router/index.ts`; isso é dívida de performance/empacotamento, não falha de compilação. Uma execução anterior da suíte monorepo havia reproduzido exaustão de `/dev/shm`; `docker-compose.test.yml` agora dimensiona `postgres-test` para 1 GiB e a repetição completa não reproduziu o crash.

## 3. Topologia atual (CURRENT)

```text
docker-compose.v2.yml
  ├── postgres 16 + init-runtime-role.sh
  ├── redis 7
  ├── runtime-role-init
  ├── database-migrate → packages/db/dist/migrate.js + reconcile-runtime-roles.js
  ├── cvg-his-v2-api → apps/api/dist/index.js :3001 (`/ready` explícito no Compose)
  ├── cvg-his-v2-worker → apps/worker/dist/index.js
  └── cvg-his-v2-spa → nginx/apps/spa/dist :3002

apps/api/src/index.ts
  → bootstrapServices (bootstrap.ts)
  → createApiServer (server.ts)
  → handlers de rota + runtime/repos

apps/worker/src/index.ts
  → bootstrapWorkerServices
  → runner/event consumers/jobs

apps/spa/src/main.ts
  → Pinia/session
  → Vue Router (routes.ts)
  → pages/services/stores
```

Dimensões observadas:

- 70 pacotes internos: 65 `@cvg-his-v2/*` e 5 `@cvg-his/*`; nenhum ciclo no grafo de manifests;
- API: 175 arquivos e aproximadamente 69.597 linhas; `server.ts` tem 7.742 linhas, `bootstrap.ts` 1.327 e `runtime.ts` 1.249;
- worker: 29 arquivos e aproximadamente 7.190 linhas;
- SPA: 483 arquivos e aproximadamente 144.410 linhas; `routes.ts` tem 2.666 linhas;
- o servidor API concentra cerca de 50 chamadas `handle*Routes`, entre as linhas 4.080 e 7.460 de `apps/api/src/server.ts`.

## 4. Mapa de fontes canônicas

| Área              | CURRENT comprovado                                                                         | Conflito/limite                                                                                                                           | TARGET/PROPOSTA                                                                                                   |
| ----------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Deploy Compose    | `docker-compose.v2.yml`, imagens construídas pelos Dockerfiles                             | identidade V2 em programa V4; tags fixas no YAML                                                                                          | declarar a release como V4 em um cutover controlado, preservando aliases durante migração                         |
| API/worker/SPA    | `apps/api`, `apps/worker`, `apps/spa`                                                      | `apps/web` e docs históricas ainda aparecem                                                                                               | manter somente três apps na publicação; legado não entra no build/cutover                                         |
| SQL aplicado      | `packages/db/migrations` + `packages/db/src/migrate.ts`                                    | 142 SQL aplicáveis (147 arquivos incluindo revert) vs trilhas históricas em `shared/database`; comandos alternativos agora falham fechado | um único comando de aplicação; manter SQL histórico separado e reconciliar artefatos source-level em task própria |
| Schema/runtime DB | runtime importa `@cvg-his-v2/shared-database`; `packages/db` contém migration/schema/roles | duas casas de banco; o crossing direto de `module-fiscal` foi removido e o guardrail de namespace o impede de voltar | separar claramente schema de consumo e runner de deploy; manter owners legados explícitos                         |
| RLS/roles         | `scripts/validate-rls-coverage.ts`, migrations, `reconcile-runtime-roles.ts`               | prova descartável cobre isolation/access/runtime ACL 19/19 e bootstrap production-like 6/6; catálogo alvo continua sem verificação        | manter gate CI + executar a mesma prova no PostgreSQL alvo com `NOBYPASSRLS`                                      |
| Helm              | `infra/helm/cvg-his-v2` é o caminho validado por `validate:helm`                           | `charts/helm` é segundo track e contém probe inexistente                                                                                  | declarar `infra/helm` canônico; arquivar/desabilitar segundo track após decisão autorizada                        |
| CI                | `.github/workflows/ci.yml`                                                                 | gates RLS/Helm/deploy/backup não são todos executados                                                                                     | CI deve exigir os gates baratos; ambiente-alvo deve fornecer restore/provider/cutover                             |

## 5. Núcleo clínico Owner → Patient → Encounter

O núcleo está presente e rastreável. A prova HTTP agora cria Owner, Patient e Encounter e atravessa care até close idempotente; a certificação de release ainda precisa unir esse conjunto à vertical financeira/estoque completa:

1. **Owner:** `owners-routes.ts`, `OwnersListPage.vue`, repositório e testes de lifecycle.
2. **Patient:** `patients-routes.ts`, `PatientDetailPage.vue`, `patients` e `owner_patient_links`.
3. **Encounter:** `encounters` e `EncounterDetailPage.vue`; parte do dispatch permanece inline em `server.ts`.
4. **Care:** triage, medical records, prescriptions/executions e diagnostics têm rotas, páginas e migrations.
5. **Close:** inpatient/surgery/discharge, billing, cash receipt, stock e audit têm slices fortes de idempotência/failpoint; a jornada integrada total, com os mesmos registros criados no primeiro passo, ainda é `PARTIAL`.

O critério clínico não será “tela existe”. O cenário mínimo de release deve criar ou localizar owner, patient e encounter, registrar cuidado, lançar consequência financeira/estoque quando aplicável, fechar a jornada e verificar auditoria, tenant e idempotência.

## 6. Achados arquiteturais

### A-01 — composição API concentrada (P1/P5)

`server.ts` é simultaneamente composição, dispatch e parte da lógica de domínio. Isso aumenta blast radius, revisão cruzada e risco de drift entre OpenAPI, handlers e SPA.

**Direção:** extrair por fronteiras de domínio usando registries/ports, mantendo `createApiServer` como composition root. Não reescrever a API nem mover todos os módulos em uma única alteração.

### A-02 — namespaces e casas canônicas duplicadas (P0/P5) — BOUNDED

Os 5 pacotes `@cvg-his/*` coexistem com 65 `@cvg-his-v2/*`. Há pares como `packages/db`/`packages/shared/database`, `config`, `contracts`, `audit` e `events`. O crossing histórico que motivou o slice foi `module-fiscal → @cvg-his/db`, junto do catálogo RBAC consumido por `module-access-control` através do namespace legado.

Em 2026-08-30, o catálogo passou a ser publicado como `@cvg-his-v2/rbac`; os callers de access-control, database, aliases Vitest, filtros de build da API e harness E2E foram migrados. A dependência direta stale de `@cvg-his/db` saiu de `module-fiscal`. O guardrail `validate:namespaces` agora identifica manifests canônicos em `apps` e `packages`, usa a AST TypeScript para imports/exports estáticos, `import()`, `require`, `require.resolve`, `import = require` e templates, bloqueia crossings novos no job `repository-guards` e possui fixtures para crossings e para ignorar comentários/strings comuns, além da asserção de grafo limpo.

**Limite:** `packages/db` e `packages/audit` continuam owners legados explícitos; isso não é uma renomeação global nem certifica a retirada dos 5 pacotes históricos, o catálogo do target ou a decisão de release identity.

**Direção remanescente:** consolidar owners por capacidade em lotes autorizados, manter o guardrail e separar a aposentadoria física dos pacotes legados em task própria.

### A-03 — contrato de saúde implícito (P1/P3) — BOUNDED

O Dockerfile da API possui `HEALTHCHECK /ready`, e o primeiro slice agora explicita o mesmo contrato no Compose enquanto worker/SPA dependem de `service_healthy`. A duplicação de probes Helm ainda permanece.

**Direção:** manter o check explícito, alinhar os probes de Helm a `/health`, `/health/ready` e `/health/live` existentes e testar a imagem publicada.

### A-04 — ciclo de shutdown incompleto (P1/P3) — BOUNDED

O primeiro slice tornou o encerramento da API e do worker idempotente e observável, com drain/readiness, fechamento de listener/DB/observabilidade e `exitCode`. Permanecem provas de rollout real, requests/jobs em voo e dependências externas.

**Direção:** manter os process tests no CI e executar ensaio em staging com DB/Redis reais.

### A-05 — fonte de migration duplicada — BOUNDED (P0)

O diagnóstico inicial confirmou duas superfícies operacionais: o runner
checksum-aware em `packages/db` e comandos Drizzle em `packages/shared/database`.
O guardrail DB-001 agora mantém `packages/db/src/migrate.ts` e
`packages/db/src/seed.ts` como únicos entrypoints de aplicação/seed, remove
`drizzle-kit` dos dois manifests canônicos e transforma `db:generate`,
`db:push` e o `db:migrate` histórico em comandos fail-closed. Compose, Helm,
cutover, bootstrap de testes e CI apontam para o runner oficial; os 30 SQL
históricos do shared-database foram preservados.

Evidência local: `pnpm validate:migration-source`, 5 testes de contrato CI/
guardrail, builds de `@cvg-his/db` e `@cvg-his-v2/shared-database`, bloqueio
explícito dos comandos legados, `pnpm install --offline --frozen-lockfile` e
`git diff --check` passaram. O DB-002 removeu a família source-level stale —
`packages/db/src/migrate.js`, seus `.d.ts`/`.map` órfãos e
`packages/db/drizzle.config.ts`; o guardrail e o teste de artefato falham se
qualquer um voltar. A aplicação positiva de uma migration nova e o catálogo
alvo continuam fora desta mudança bounded.

## 7. Arquitetura alvo (TARGET/PROPOSTA)

```text
Release identity / deploy manifest
  → one canonical Compose + one canonical Helm track
  → explicit health/readiness/drain contract
  → API composition root with domain registries
  → domain modules with repository/transaction ports
  → packages/shared-database as runtime client contract
  → packages/db as schema + migration + role control plane
  → PostgreSQL tenant/RLS/audit/outbox source of truth
  → worker consumes durable work with idempotency/fencing
  → SPA consumes generated/public contracts, not package internals
```

Princípios de transição:

- expandir → migrar → contrair para nomes/imports/migrations;
- nunca editar ou apagar migration aplicada;
- manter compatibilidade de namespace até consumidores serem zero;
- toda mudança de runtime tem teste de processo ou contrato equivalente;
- toda claim de parity exige cenário comportamental executado;
- WhatsApp/provider não pode ser dependência de disponibilidade da internação;
- auditoria e tenant permanecem no caminho transacional, não em callback best-effort.

## 8. Desconhecidos que bloqueiam certificação

- o fixture restore drill foi executado em ambiente descartável, mas nenhum backup representativo do ambiente alvo foi restaurado;
- há prova fresca de RLS/roles em PostgreSQL descartável, mas não de RLS/FORCE RLS e privilégios no catálogo implantado;
- provider de laboratório, fiscal e pagamentos reais não estão homologados;
- Redis failover/clock-skew e dois processos em ambiente-alvo continuam abertos;
- parity Vetus de laboratório, financeiro, relatórios, marketing, integrações e governança não está comprovada;
- a política de fallback Vault → env precisa de decisão explícita para produção;
- não há decisão formal se `charts/helm` será arquivado, alinhado ou removido.

## 9. Decisões registradas

1. **Não haverá rename global V2→V4 nesta etapa.** É uma migração de identidade de release, não uma alteração semântica de código.
2. **`packages/db` + runner próprio é a fonte de aplicação de migrations até decisão posterior.** `shared/database` não pode iniciar migration de produção; seus comandos alternativos falham fechado e a SQL histórica permanece somente material de referência.
3. **O primeiro slice de implementação é operacional:** checksum, healthcheck e shutdown, com testes antes da alteração.
4. **O segundo Helm track é não-canônico até prova e owner.** Não será usado para afirmar readiness.
5. **O parity gate atual é estrutural/indicativo, não release gate comportamental.**
6. **O setup de testes adquire lock no banco administrativo para serializar migrations que alteram roles de cluster entre bancos efêmeros.**

## Referências primárias

- `docs/132-superficie-canonica-deploy-e-migracao.md`
- `docs/430-fonte-de-verdade-documental.md`
- `docker-compose.v2.yml`
- `apps/api/src/index.ts`, `apps/api/src/bootstrap.ts`, `apps/api/src/server.ts`
- `apps/worker/src/index.ts`, `apps/worker/src/bootstrap.ts`
- `apps/api/src/routes/health-routes.ts`
- `packages/db/src/migrate.ts`, `packages/db/migrations/`
- `scripts/check-migration-source-of-truth.mjs`, `scripts/reject-legacy-db-command.mjs`
- `scripts/lib/vetus-parity-audit.mjs`, `scripts/lib/vetus-parity-contract.mjs`
- `.github/workflows/ci.yml`, `infra/helm/cvg-his-v2`, `charts/helm`

## Addendum — CVG-001 browser accessibility

O contrato de primeiro acesso foi conectado ao artefato servido pelo harness
SPA e ao gate enterprise do CI. O teste intercepta apenas os endpoints de
setup para não mutar o banco seedado; a prova de persistência continua no
processo PostgreSQL/two-API. O axe encontrou contraste claro abaixo de AA no
token `#718198`; o token de tema claro foi corrigido para `#475569` e a
reexecução passou sem violações. A arquitetura permanece `PARTIAL` até os
fluxos críticos restantes, Redis, target RLS/FORCE RLS e operações serem
provados.

## Addendum — browser/axe final do setup

O spec final passou 4/4 contra a SPA construída e foi selecionado no script
focado e no CI enterprise. As rotas interceptadas são verificadas por URL/origem,
método, ausência de cookie e payload exato no status, sucesso e retry. A prova
inclui viewport 390px, teclado/foco, `aria-describedby`, `aria-invalid`,
limpeza de credenciais e axe WCAG 2.1/2.2 AA. A revisão independente final foi
`APPROVE_BOUNDED`; as jornadas browser restantes continuam fora do escopo.

## Reaudit — identidade de release e superfície Helm — 2026-08-26

A divergência observada na auditoria original era concreta: o chart completo
usado pelo validator fica em `infra/helm/cvg-his-v2`, enquanto
`charts/helm` mantinha uma segunda árvore com instruções de instalação e a rota
`/health/startup`, que não existe no contrato atual da API. O scan de consumers
não encontrou referência a `charts/helm` em CI, scripts ativos, package scripts
ou Compose; os usos restantes são documentação histórica, o próprio artefato
legado, testes do guard e arquivos de arquivo.

A decisão de transição agora está registrada em
`docs/engineering/RELEASE_IDENTITY.md`: `infra/helm/cvg-his-v2` é canônico,
`charts/helm` é não-canônico e fica retido somente como compatibilidade até
consumer scan, decisão explícita e re-auditoria futura. O README legado foi
reduzido a uma advertência não-executável. O guard
`pnpm validate:deploy-surface` exige os marcadores de identidade, a URL do
repositório V4, o validator canônico e a chamada no `repository-guards`.

Evidência local: o guard passou com 68 arquivos, o fixture com
`helm lint charts/helm/umbrella` foi rejeitado, `pnpm validate:helm` passou
somente pela validação estática de dev/staging/prod porque o binário Helm não
está instalado, `pnpm deploy:check` passou 12 verificações e o OpenAPI passou
com 345 paths, 40 tags e 396 schemas. Artefato:
`.agent/artifacts/CVG-003-release-identity-deploy-surface-2026-08-26.md`;
ledgers `VFY-CVG-003-RELEASE-IDENTITY-SURFACE-001` e
`VFY-CVG-003-RELEASE-IDENTITY-SURFACE-FINAL-001`.

Isto contém o risco de reintrodução em configuração ativa, mas não o encerra.
Helm executável, render contra cluster, imagem/porta/identidade observadas no
target, execução remota do CI, rollout/rollback e remoção ou alinhamento físico
do track legado continuam abertos. Nenhuma exclusão ou rename global foi
realizado.

### Addendum — decisão formal do segundo track

O item histórico que dizia não haver decisão formal permanece como registro da
observação original. A decisão vigente é a política de transição acima:
`infra/helm/cvg-his-v2` é a superfície canônica; `charts/helm` é legado
retido, não executável e fora de qualquer release. A remoção/alinhamento exige
uma task autorizada e nova prova de consumers; por isso o risco não muda para
`CLOSED` nesta rodada.

## Reaudit — gate executável Helm — 2026-08-26

A validação anterior permitia que a ausência do binário Helm terminasse com
sucesso estático. Isso era insuficiente para um gate de release, embora útil
para diagnóstico local. O validator agora separa os dois modos: sem
REQUIRE_HELM=1 há fallback estático explícito; com REQUIRE_HELM=1 a ausência
do executável ou uma versão diferente de v3.15.4 falha.

O workflow repository-guards instala Helm v3.15.4, valida o checksum pinado
11400fecfc07fd6f034863e4e0c4c4445594673fd2a129e701fe41f31170cfa9 e chama o
validator em modo obrigatório. O guard de superfície também rejeita drift
nesses quatro marcadores. A execução local com o binário oficial passou lint e
template nos overlays dev, staging e prod; o teste sem binário falhou fechado
como esperado.

Esta é uma prova mais forte do control plane, não prova de cluster. A execução
remota do workflow, a autenticação no Kubernetes API, a identidade efetiva de
imagem/porta, rollout/rollback, Secrets do target e o alinhamento/remoção
física do track legado continuam pendentes. Nenhuma alteração externa foi
realizada.

### Addendum final — controle do executável — 2026-08-26

O validator usa `HELM_BIN` tanto para descobrir a versão quanto para executar
`lint`/`template`; o workflow exige `/usr/local/bin/helm` depois de verificar o
SHA-256 do arquivo oficial. A comparação aceita somente `v3.15.4` e metadata
de build válida, não prefixos ou tokens vazios. Isso fecha a lacuna local do
toolchain sem alegar autenticação, render server-side ou rollout no target.

## Reaudit — contexto transacional do comando de estoque — 2026-08-26

A regressão crítica revelou uma falha concreta na composição do monólito
modular: o fallback sem chave de idempotência do `tenant-command` abria uma
transação tenant-scoped, mas não instalava o `TenantTransactionContext`. O
guard da rota de consumo de estoque falhava fechado com `503
TRANSACTION_REQUIRED`, portanto o problema não era um atalho permissivo nem
uma violação de isolamento.

O reparo mantém a separação de responsabilidades: o helper encaminha actor e
correlation metadata, o composition root chama `withTenantTransaction` e o
cliente compartilhado usa o `runInTenantTransactionContext` já existente
quando há metadata. Chamadas sem metadata preservam o comportamento anterior
do scoped client. A mudança não altera schema, migration, API payload ou
provider boundary.

Evidência fresca: o RED foi reproduzido por teste de contrato e pelo primeiro
run crítico 10/11; depois do GREEN passaram o teste compilado do helper 8/8,
API 383/383, Flow 7 1/1, fluxo crítico 11/11, SPA Docker 64/64, typecheck,
lint, cobertura acima de 80%, OpenAPI, RLS, secrets, migration-source e
deploy-surface. O detalhe está em
`.agent/artifacts/CVG-004-inventory-consumption-transaction-context-2026-08-26.md`.

O resultado é `PASS_BOUNDED` para essa composição e não prova todos os
mutating commands, todos os sete perfis de acesso, target/RLS, Redis
failover, providers, operações ou release. A revisão independente não esteve
disponível nesta conta; nenhum PASS de reviewer foi inferido.
