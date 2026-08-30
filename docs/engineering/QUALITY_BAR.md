# CVG-HIS V4 — Quality Bar v1

**Congelada em:** 2026-08-25  
**Aplicação:** consolidação sem rewrite, operação 24x7 e parity comportamental.  
**Regra de veredicto:** ausência de evidência é `PARTIAL`/`BLOCKED`, nunca PASS.

| ID         | Critério                                             | Evidência mínima                                                  | Estado atual                                                                                                                                                                                                                                                                     |
| ---------- | ---------------------------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| QB-ARC-01  | uma identidade de release e uma superfície de deploy | mapa sem conflito + Compose/Helm canônicos executados             | PARTIAL                                                                                                                                                                                                                                                                          |
| QB-DB-01   | uma trilha de migration com checksum verificável     | mismatch falha antes de aplicar; migration nova aplica uma vez    | BOUNDED PASS — runner/checksum + PostgreSQL descartável + guardrails DB-001/DB-002; aplicação positiva isolada segue pendente                                                                                                                                                    |
| QB-DB-02   | runtime role não escapa tenant/RLS                   | PostgreSQL real com `NOBYPASSRLS`, grants e cross-tenant negativo | BOUNDED PASS local — RLS 19/19, bootstrap production-like 6/6, catálogo local `FORCE RLS` 123/123 e restore representativo sob `restore_probe`; catálogo alvo pendente                                                                                                           |
| QB-OPS-01  | API/worker iniciam, ficam ready e encerram drenando  | process tests + logs/exit code + health matrix                    | BOUNDED PASS — API/worker process tests; DB/Redis de ambiente-alvo seguem pendentes                                                                                                                                                                                              |
| QB-OPS-02  | backup restaura banco, globals e storage             | drill descartável com manifest, hash, TOC e tempos                | BOUNDED PASS local — perfis mínimo e representativo restaurados em PostgreSQL descartável; representativo: 176 tabelas, 3 arquivos, 19 assertions sob `restore_probe` e `28.610 s`; RTO/RPO de alvo pendentes                                                                    |
| QB-SEC-01  | secrets, auth, tenant e audit fail closed            | secret scan + integração DB/RLS + negativos                       | PARTIAL — Vault prod-like fail-closed, ACL/audit rollback-retry, cache pending fail-closed, token-stability/coalescing, privilege outage→503→recovery e revogação protegida cross-instance passaram localmente; target, provider de secrets e homologação externa seguem abertos |
| QB-CLIN-01 | Owner→Patient→Encounter→care→close é transacional    | jornada PostgreSQL com audit, idempotência e isolamento           | PARTIAL                                                                                                                                                                                                                                                                          |
| QB-PAR-01  | parity Vetus é comportamento, não inventário         | cenário executado por domínio com fonte/resultado                 | PARTIAL — 4/11                                                                                                                                                                                                                                                                   |
| QB-REL-01  | CI bloqueia contratos operacionais baratos           | OpenAPI, RLS, Helm, deploy, backup check e testes                 | BOUNDED PASS — job, contrato, RLS/roles e suíte local verificados; execução GitHub pendente                                                                                                                                                                                      |
| QB-REL-02  | providers reais homologados                          | sandbox/certificado/callback/rollback por provider                | BLOCKED                                                                                                                                                                                                                                                                          |
| QB-UX-01   | jornada SPA crítica executável e acessível           | Playwright + axe/WCAG em alvo                                     | PARTIAL                                                                                                                                                                                                                                                                          |
| QB-ARCH-01 | módulos evoluem por fronteira e sem novo crossing    | graph/guardrail + route registry incremental                      | PARTIAL                                                                                                                                                                                                                                                                          |

## Barra do primeiro slice

O primeiro slice só é considerado verde quando:

1. migration com nome conhecido e hash diferente encerra com erro explícito;
2. migration conhecida com hash igual é ignorada;
3. o Compose declara `/ready` como healthcheck da API, usando a mesma porta interna;
4. API e worker fecham listener/DB/observabilidade uma vez, sem `process.exit(0)` no caminho gracioso;
5. os testes focados e typecheck/lint/build passam;
6. um crítico independente revisa o diff e tenta invalidar o contrato.

## Evidência registrada do primeiro slice

| Evidência                                                                                                                                                                                             | Resultado                                                                                                                                                                                       |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm vitest run packages/db/src/migrate.test.ts tests/unit/worker/health-contract.test.ts tests/unit/infra/runtime-lifecycle.test.ts tests/unit/infra/ci-contract.test.ts --config vitest.config.ts` | PASS — 4 arquivos, 22 testes                                                                                                                                                                    |
| `pnpm vitest run tests/integration/process/runtime-lifecycle.test.ts --config vitest.integration.config.ts`                                                                                           | PASS — 2 processos reais                                                                                                                                                                        |
| `REQUIRE_TEST_DB=1 pnpm vitest run tests/integration/database/migration-integrity-runtime.test.ts --config vitest.integration.config.ts`                                                              | PASS — PostgreSQL descartável, 142 migrations aplicáveis, mismatch sem alteração de contagem                                                                                                    |
| `REQUIRE_TEST_DB=1` com RLS isolation/access governance/runtime ACL                                                                                                                                   | PASS — 19/19 contra PostgreSQL descartável com 176 tabelas                                                                                                                                      |
| `REQUIRE_TEST_DB=1` com production-like runtime bootstrap                                                                                                                                             | PASS — 6/6; roles restritas `NOBYPASSRLS`, unsafe login e schema incompleto falham fechados                                                                                                     |
| `REQUIRE_TEST_DB=1` com clinical-financial vertical HTTP                                                                                                                                              | PASS — 11/11; admissão, handoff/stay, consumo, cobrança diária, alta, fechamento e recebimento; inclui cenário com Owner/Patient/Encounter criados via HTTP até inpatient/billing/stock/receipt |
| `REQUIRE_TEST_DB=1` com marketing+staff concorrentes                                                                                                                                                  | PASS — 12/12 + 7/7; lock de roles evitou colisão                                                                                                                                                |
| revisão independente Locke + correções Gauss                                                                                                                                                          | concluída; gaps de processo, cleanup, CI e hash tratados; tentativa adicional do harness sem relatório por incompatibilidade/timeout                                                            |

| `pnpm test` com `docker-compose.test.yml` atualizado | PASS — os 70 projetos selecionados concluíram sem falha; SPA 172 arquivos/1.016 testes, API 364/364; PostgreSQL com `shm=1gb`, `OOM=false`, `exit=0` |
| `pnpm ops:restore:drill:fixture` | PASS — checksums/TOC, globals, banco e storage restaurados em runtime descartável; 2 tabelas, 2 arquivos, listing idêntico; wall time do comando: 13,41 s |
| `pnpm ops:restore:drill:fixture:representative` | PASS — migrations canônicas 0000–0144, 176 tabelas, 3 arquivos, `storageListingMatch=true`, 19 assertions após `SET ROLE restore_probe` (`false,false`); `elapsedMs=28610` |

A execução anterior havia terminado em `module-event-consumers` com exaustão de `/dev/shm` e segfault do PostgreSQL. O Compose agora reserva 1 GiB para o serviço `postgres-test`; a repetição completa não reproduziu o crash. A variação entre runners CI ainda deve ser observada no GitHub.

O estado global permanece `PARTIAL`: há evidência local descartável de RLS/roles e restore mínimo/representativo, mas não há RTO/RPO de alvo, provider homologado, parity 11/11, catálogo RLS de produção, Helm renderizado ou cutover no ambiente alvo.

Esse slice não promove parity, produção, provider, RLS do catálogo alvo, DR ou go-live.

## Evidência QB-OPS-02 — restore representativo — 2026-08-25

O comando explícito `pnpm ops:restore:drill:fixture:representative` passou
ponta a ponta em runtime descartável. Ele aplicou as migrations canônicas
`0000`–`0144`, gerou bundle custom com globals/storage/checksums e restaurou
176 tabelas públicas e 3 arquivos. A validação pós-restore normalizou o role
`restore_probe` (`rolsuper=false`, `rolbypassrls=false`), configurou
`app.current_account_id` e passou 19 assertions do grafo
Owner→Patient→Encounter→internação→billing→estoque→ledger→outbox/audit/
documento; `elapsedMs=28610` e `storageListingMatch=true`.

Artefato: `.agent/artifacts/CVG-002C6-restore-representative-2026-08-25.md`.
Esta é uma prova local `PASS_BOUNDED`: não substitui RTO/RPO medidos, retenção,
restore de bundle real, ownership/grants do alvo, failover, staging ou Game Day
autorizado.

A matriz completa requisito→comportamento→evidência rejeitante→artefato/ledger
está em `docs/engineering/REQUIREMENT_EVIDENCE_MATRIX.md` e é protegida por
`tests/unit/infra/requirement-evidence-matrix.test.ts` no `repository-guards`.

## Evidência DB-001 — fonte única de migration — 2026-08-25

| Evidência                                                                                                                           | Resultado                                                                                                                                                                           |
| ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm validate:migration-source`                                                                                                    | PASS — `packages/db` é o runner/seed canônico; CI, Compose, Helm, cutover e bootstrap de testes apontam para ele; SQL histórica do shared-database permanece presente e não-oficial |
| `pnpm vitest run tests/unit/infra/migration-source-of-truth.test.ts tests/unit/infra/ci-contract.test.ts --config vitest.config.ts` | PASS — 2 arquivos, 5 testes                                                                                                                                                         |
| `pnpm --filter @cvg-his-v2/shared-database run db:migrate` e `pnpm --filter @cvg-his/db run db:push`                                | PASS negativo — ambos falham fechado com instrução explícita para a trilha canônica                                                                                                 |
| `pnpm --filter @cvg-his-v2/shared-database build` + `pnpm --filter @cvg-his/db build`                                               | PASS — clientes/runtime e runner compilam sem `drizzle-kit` nos manifests alvo                                                                                                      |
| `pnpm install --offline --frozen-lockfile`, Prettier e `git diff --check`                                                           | PASS                                                                                                                                                                                |
| revisão independente Aristotle                                                                                                      | APPROVE — sem falha P0/P1 na barra DB-001; gap de documentação nominal classificado LOW                                                                                             |

Essa evidência é local e bounded. Não prova migration positiva nova em staging,
catálogo RLS/FORCE RLS alvo, restore/RTO-RPO representativo ou execução remota
do GitHub Actions.

## Evidência DB-002 — remoção de entrypoints stale — 2026-08-25

| Evidência                                                                                                                                                                                                              | Resultado                                                                                 |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `pnpm vitest run tests/unit/infra/migration-source-artifact.test.ts --config vitest.config.ts` antes da remoção inicial                                                                                                | RED — 1 teste falhou porque `packages/db/src/migrate.js` ainda existia                    |
| o mesmo contrato após ampliar o bar para companions source-level                                                                                                                                                       | RED — 1 teste falhou porque `packages/db/src/migrate.d.ts` ainda existia                  |
| `pnpm vitest run packages/db/src/migrate.test.ts tests/unit/infra/migration-source-artifact.test.ts tests/unit/infra/migration-source-of-truth.test.ts tests/unit/infra/ci-contract.test.ts --config vitest.config.ts` | PASS — 4 arquivos, 15 testes                                                              |
| `pnpm --filter @cvg-his/db build` + `pnpm --filter @cvg-his-v2/shared-database build`                                                                                                                                  | PASS — TypeScript e cliente runtime compilam após a remoção                               |
| `node --check packages/db/dist/migrate.js`                                                                                                                                                                             | PASS — entrypoint gerado continua sintaticamente executável                               |
| `pnpm validate:migration-source`                                                                                                                                                                                       | PASS — os cinco artefatos source-level stale ausentes; consumidores canônicos preservados |
| scan de consumidores ativos + `git diff --check`                                                                                                                                                                       | PASS — nenhum uso não-arquivado dos caminhos removidos                                    |

O histórico SQL e as migrations aplicáveis não foram alterados. A prova é local
e bounded; migration positiva em staging, catálogo RLS/FORCE RLS, restore/RTO-RPO
e execução remota do CI continuam pendentes.

## Evidência CVG-001 — wizard browser/axe — 2026-08-25

| Evidência                                                                                                                | Resultado                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm exec playwright test --config playwright-spa.config.ts e2e/spa/setup-wizard-accessibility.spec.ts --reporter=line` | PASS — 2/2 contra a SPA construída, com Chromium, navegação por teclado, formulário nomeado, `aria-describedby`, foco de erro/sucesso e axe WCAG 2A/2AA sem violações |
| `pnpm --filter @cvg-his-v2/spa run build`                                                                                | PASS — `vue-tsc --noEmit` e Vite produziram o artefato servido pelo teste                                                                                             |
| `pnpm exec prettier --check e2e/spa/setup-wizard-accessibility.spec.ts apps/spa/src/pages/setup/SetupPage.vue`           | PASS                                                                                                                                                                  |
| revisão independente do slice                                                                                            | pendente no momento do registro; não promover globalmente antes do veredicto                                                                                          |

O browser usa interceptação explícita apenas para o status e o POST do setup,
portanto prova o comportamento da UI construída e não substitui a prova de
persistência. A fronteira HTTP/PostgreSQL real permanece no teste de processo
`setup-installation-to-session.test.ts`. O axe encontrou e levou a GREEN a
correção do token de texto auxiliar claro (`#718198` para `#475569`, contraste
AA); a mesma cor é um token compartilhado e a alteração não é uma exceção
visual local.

Este checkpoint promove `QB-UX-01` somente para `PARTIAL`: outras jornadas
desktop/mobile, responsividade manual, Redis, catálogo RLS/FORCE RLS, cobertura
global e release continuam sem certificação.

### Reconciliação final do wizard — 2026-08-25

O comando oficial `pnpm test:e2e:spa:setup` passou 4/4 contra a SPA construída.
Depois do RED de contraste, o scan axe passou com tags WCAG 2.1/2.2 AA. O
teste valida URL/origem e métodos exatos, ausência de cookie e payload exato no
status, sucesso e retry; também cobre teclado/foco, nome do formulário,
`aria-describedby`, `aria-invalid`, viewport 390px e limpeza de token/senha/
confirmação. SetupPage 8/8, DsInput 9/9 e SPA typecheck/build passaram.

O spec está no script focado e no conjunto enterprise do CI. A revisão
independente final aprovou o escopo como `APPROVE_BOUNDED`, sem HIGH/MEDIUM.
Isso atualiza a evidência do wizard para `PARTIAL`, mas não promove o gate
global `QB-UX-01`: demais jornadas críticas, tema/manual review, RLS alvo,
Redis, DR, cobertura, operações e release continuam abertos.

### Evidência browser clínica/enterprise — 2026-08-25

O conjunto enterprise selecionado pelo CI passou 15/15: dashboard/relatórios,
exports de payables/receivables, Busca Mestre 360 em desktop/mobile e wizard.
A jornada crítica separada passou 1/1 em Owner → Patient → Encounter → entrada
clínica → item de billing → fechamento. Agendamento passou 2/2 e internação
2/2.

O fluxo adjacente de billing passou 5/6: a quitação em dinheiro não chegou à
asserção final `R$ 0,00` no harness local padrão, que inicia a API com
`API_DISABLE_INCOMPATIBLE_DB_REPOS=1` e portanto não disponibiliza a rota de
cash receipt persistente. O modo DB (`=0`) também não iniciou porque o banco
local não estava seedado com a fixture `user_admin`. O resultado é um gap de
harness/ambiente, não evidência de billing verde; `QB-CORE-01` segue `PARTIAL`
até a execução no Docker/CI seedado.

### Runner SPA DB-backed em Docker — 2026-08-25

O primeiro bootstrap limpo encontrou duas lacunas de ambiente: o seed não
criava o signer laboratorial humano exigido pelo diagnóstico e o Compose E2E
não montava a criação das roles runtime. Os contratos de seed/role e os
defeitos de inicialização shell/SQL encontrados no caminho foram corrigidos.

A primeira execução pós-correção chegou a 59/60; a única falha era o snapshot
dark da fila contaminado por um item real. A comparação do actual com o
baseline identificou que o stub comparava `/queue`, enquanto a SPA chamava
`/api/queue`. O contrato do stub foi corrigido e o baseline não foi alterado.

`pnpm test:e2e:spa:docker` passou 60/60 em aproximadamente 4 minutos com
PostgreSQL/Redis, migrations 0000–0143, seed primário/secundário,
restart/rehydration do runtime, API database-backed, cash settlement e cleanup.
Isso atualiza a evidência do fluxo persistente para `PASS_BOUNDED`, mas não
promove `QB-CORE-01` globalmente: RLS/FORCE RLS de alvo, restore/RTO-RPO,
Redis/failover, providers, parity, execução remota, cobertura, operações e
release continuam abertos.

### Restore drill com tempos — 2026-08-25

O comando `pnpm ops:restore:drill:fixture` passou novamente em PostgreSQL 16
descartável. Checksums, TOC, globals, banco e storage passaram; foram
restauradas 2 tabelas públicas e 2 arquivos. O relatório agora persiste
timestamps, duração total e fases: `elapsedMs=8657`, checksum/TOC `995 ms`,
startup `6961 ms`, restore do banco `581 ms` e storage `14 ms`.

Essa medição promove a instrumentação local para `QB-OPS-02` bounded, mas não
é RTO/RPO de produção: bundle representativo, retenção, volume e ambiente
homologado/alvo continuam pendentes.

### Catálogo local FORCE RLS — 2026-08-25

O contrato de catálogo começou RED contra um banco efêmero: 123 tabelas
públicas com `account_id` tinham RLS habilitado, mas não `FORCE RLS`. A única
exceção sem RLS foi `installation_state`, o singleton global da instalação.

A migration `0144_force_rls_tenant_tables.sql` agora aplica `FORCE ROW LEVEL
SECURITY` por catálogo a toda tabela pública base/particionada com
`account_id`, excluindo explicitamente apenas `installation_state`. O contrato
verde passou 2/2; a regressão RLS/setup passou 4 arquivos e 26/26 testes, e
`pnpm validate:rls`/`pnpm validate:migration-source` permaneceram verdes.

Artefato: `.agent/artifacts/CVG-002C6-force-rls-catalog-2026-08-25.md`.
Isso promove o catálogo local para `QB-DB-02` bounded; ownership/grants no
PostgreSQL alvo, cross-tenant no alvo e rollout positivo em staging continuam
pendentes. O `repository-guards` do CI agora executa o contrato de catálogo
junto com as demais suites RLS; o contrato de composição passou 4/4.

### Evidência de contenção — QB-ARC-01 — 2026-08-26

O contrato de identidade de release agora declara `CVG-HIS-V4`, preserva os
namespaces V2 como compatibilidade e designa `infra/helm/cvg-his-v2` como a
única superfície Helm canônica. `charts/helm` permanece explicitamente legado;
seu README não contém mais instruções executáveis nem a probe inexistente
`/health/startup`, e nenhuma remoção ou rename global foi autorizado.

`pnpm validate:deploy-surface` passou com 68 arquivos escaneados e rejeitou um
fixture que referenciava `charts/helm`; `pnpm deploy:check`, `pnpm
validate:openapi` e a validação estática de Helm também passaram. O controle
está conectado ao `repository-guards` do CI. Artefato:
`.agent/artifacts/CVG-003-release-identity-deploy-surface-2026-08-26.md`;
ledgers `VFY-CVG-003-RELEASE-IDENTITY-SURFACE-001` e
`VFY-CVG-003-RELEASE-IDENTITY-SURFACE-FINAL-001`.

O resultado é `PASS_BOUNDED` somente para a contenção local. `QB-ARC-01`
continua `PARTIAL`: o binário Helm não está instalado nesta execução, não há
render/lint em cluster, execução remota do GitHub, prova de identidade no
target ou decisão de remoção/alinhamento do artefato legado.

### Evidência executável — Helm/CI — 2026-08-26

O gap do fallback silencioso foi fechado. O validator mantém o modo estático
somente para uso local sem REQUIRE_HELM=1; no modo obrigatório ele falha fechado
quando o executável está ausente ou não é v3.15.4. O repository-guards instala
essa versão a partir do arquivo oficial, verifica o SHA-256 pinado
11400fecfc07fd6f034863e4e0c4c4445594673fd2a129e701fe41f31170cfa9 e executa
REQUIRE_HELM=1 pnpm validate:helm.

Com o binário oficial v3.15.4 isolado localmente, os checks estáticos e
lint/template passaram para dev, staging e prod. O contrato Helm passou 4/4,
incluindo ausência do binário, ordem dos checks estáticos e rejeição de
v3.15.40; o contrato CI passou 4/4 e o contrato de superfície 4/4. Artefato:
.agent/artifacts/CVG-003-helm-executable-gate-2026-08-26.md;
ledgers VFY-CVG-003-HELM-EXECUTABLE-001 e
VFY-CVG-003-HELM-EXECUTABLE-FINAL-001.

QB-ARC-01 permanece PARTIAL: a execução GitHub e o render contra Kubernetes
target ainda não foram observados; não há promoção para rollout, rollback ou
go-live.

### Addendum final — Helm executável — 2026-08-26

A rechecagem atualizada passou `node --test
tests/unit/infra/validate-helm-script.test.mjs` em 5/5. O teste inclui
ausência do executável, ordem static-before-render, rejeição de `v3.15.40` e
rejeição de metadata malformada `v3.15.4+.`. O binário oficial v3.15.4 foi
executado via `HELM_BIN` explícito e passou lint/template nos overlays dev,
staging e prod. Os contratos CI e deploy-surface passaram 8/8 no total;
`pnpm validate:deploy-surface`, `deploy:check`, OpenAPI, YAML, Prettier e
`git diff --check` também passaram. O resultado continua `PASS_BOUNDED`; a
execução remota, target e rollout permanecem fora da prova. A revisão
independente final de Averroes foi `CONDITIONAL PASS`: os achados HIGH/MEDIUM
foram resolvidos; restam somente as limitações de target/remote e o risco
menor de constantes Helm duplicadas.
