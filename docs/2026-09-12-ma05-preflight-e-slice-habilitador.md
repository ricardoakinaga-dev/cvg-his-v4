---
document_status: proposed
document_kind: coverage_preflight_proposal
effective_date: 2026-09-12
owner: Engenharia
source_audit: artifacts/remediation/MA-06-R1/attempt-1/REPORT.md
---

# MA-05-PREP — Preflight de coleta crítica e primeiro slice habilitador

> **PROPOSTA DE SLICE — NÃO AUTORIZA IMPLEMENTAÇÃO.**
> Documento de reconhecimento produzido pelo Agente 3 (MA-05-PREP). Nenhum coletor,
> manifesto, gate, workflow, teste ou dependência foi alterado. O status canônico permanece
> em `.agent/**`, sob o Agente 1. A ativação do slice depende de despacho do Lead.

## 0. Escopo, data e limites da inspeção

- Data UTC: 2026-09-12; HEAD: `324099e5a54537ca1349f3310639c3a12afbae36`.
- Método: leitura de manifesto, coletores, configs, scripts de build/cleanup e histórico Git;
  preflight de ferramentas/portas/serviços **sem executar** install, build, coverage, banco,
  docker, reset ou remoção. Não houve repetição da comparação v3/v4 nem da equivalência de
  globs do MA-06-R1 (inputs inalterados).
- Fora do escopo: implementar coletores, alterar thresholds, editar manifesto/gate/CI,
  iniciar serviços, liberar MA-33 ou aprovar release.

## 1. Coordenação, locks e recursos

| Item | Estado observado |
| --- | --- |
| Lock DEPENDENCIES | **Sem lock ativo registrado.** MA-06/R1 encerrou sem novos installs; `package.json` e `pnpm-lock.yaml` continuam com os hashes de MA-06. Nesta tarefa não há escrita de dependências. |
| Processos da frente Agente 3 | Nenhum. Apenas `MiniBrowser` headless residual pré-existente (não iniciado por esta frente; não será encerrado). |
| Recursos reservados pela frente | `artifacts/remediation/MA-06/**`, `MA-06-R1/**`, `MA-33/attempt-1/**` (evidência, sem serviço) e cópias isoladas em `/tmp/opencode/ma06-baseline`, `/tmp/opencode/ma06-after`, `/tmp/opencode/r1`. Nenhuma porta/banco/fila. |
| Outras frentes | Agente 1 em MA-03-R2 (`artifacts/remediation/MA-03-R2`, `.agent/**`); Agente 2 com MA-04/MA-08 documentados. Concorrência de docs observada em `docs/engineering/critical-coverage-scope.json` (refresh MA-02 de 19:31Z). |
| Autoridade | Slice, grafo e implementação: Lead. IDENTITY: Agente 1 (executionInputs). CI-CONFIG: MA-07. |

## 2. Matriz dos cinco shards (PREP-01)

Fonte primária: `docs/engineering/critical-coverage-scope.json` (`requiredShards`, `thresholds`
85, `components`, `files` 348 javascript-metrics + 193 pending, `vitestTests` 322,
`nativeTests` 85 (73 API + 12 worker, revisão 3), `processTests` 11, `executionInputs` 2119) e os runners reais. Correção de contagem: a redação original indicava 83/72; o manifesto revisão 2 continha 82 nativos (71 API + 11 worker) e a descoberta apontava 85; **MA-02-F-NATIVE reconciliou a revisão 3 pelo tooling** (ver `artifacts/remediation/MA-02-F-NATIVE/attempt-20260912T2210Z/REPORT.md`), sem decisão de coverage.

### 2.1 vitest-unit

| Dimensão | Observado |
| --- | --- |
| Comando | `node scripts/run-critical-coverage-shard.mjs vitest-unit` → `pnpm exec vitest run --config vitest.critical-coverage.config.ts` com `CRITICAL_COVERAGE_SHARD=vitest-unit` e `CRITICAL_COVERAGE_RUN_ID=<uuid>`. |
| Config | `vitest.critical-coverage.config.ts` (API v4.1.11); `include` = `manifest.vitestTests` sem `tests/integration/`; coverage include = brace das 348 fontes; `pool:'forks'`, `maxWorkers:1`, `fileParallelism:false`. |
| Fontes/testes | 348 fontes; suíte unit do manifesto (inclui `packages/modules/diagnostics/src/laboratory-postgres.integration.test.ts`, que é integração disfarçada de unit — ver §5). |
| Denominador/threshold | 348 fontes; 85% por componente via `scripts/check-critical-coverage.mjs` (não dentro do runner). |
| Plataforma/ferramentas | Linux, Node >=22, pnpm, git, TypeScript. Sem binários de banco nativos. |
| Banco/Redis | `tests/setup/global-setup.ts` tenta PostgreSQL (`DATABASE_URL_TEST`/`.env`); sem banco, avisa e segue. O teste de diagnóstico exige `REQUIRE_TEST_DB=1` para rodar; sem isso, **skip**. |
| Inputs/raw | `executionInputs` congelados + hashes; V8 do Vitest convertido no processo pelo provider; sem source maps externos. |
| Identidade | `manifest.head == HEAD`; `executionInputHashes`; `sourceHashes` por fonte; `manifestSha256`; `coverageSha256`; `testResultSha256`; `runId`/`shard`. |
| Outputs | `artifacts/consolidacao-2026-09-05/coverage-scope/vitest-unit/<runId>/{invocation.json, coverage-final.json, test-result.json}`; **publicação top-level** `.../vitest-unit/shard.json` (+ cópia `previous-shard.json`). Diferente dos demais, publica sem modo candidato. |
| Skip/falha/timeout | Reporter `onTestRunEnd` reprova qualquer skip/todo/falha/teste ausente/erro não tratado; runner reprova mudança de inputs/HEAD e exit != 0. Timeout do Vitest (config). |
| Bootstrap/cleanup | Global setup pode criar/resetar/dropar banco efêmero; com URL explícita preserva. Sem `docker down`. |

### 2.2 vitest-integration

| Dimensão | Observado |
| --- | --- |
| Comando | Mesmo runner com `vitest-integration`; `include` = `manifest.vitestTests` sob `tests/integration/`. |
| Config | Mesma config crítica (branch por shard). |
| Fontes/testes | 102 testes de integração do manifesto; `REQUIRE_TEST_DB=1` presente em parte das suítes. |
| Banco/Redis | **Requer PostgreSQL** (efêmero ou explícito); sem banco, setup falha fechado nas suítes marcadas e skips/erros nas demais. Redis apenas onde a suíte exigir. |
| Restante | Identidade, formato raw, outputs e regras de skip/falha iguais ao vitest-unit; publication top-level pelo mesmo runner. |

### 2.3 native-api

| Dimensão | Observado |
| --- | --- |
| Comando | `node scripts/run-native-critical-coverage.mjs native-api`; exige `NATIVE_POSTGRES_BIN` e `NATIVE_POSTGRES_SHARE` (opcional `NATIVE_POSTGRES_LIB`). |
| Build | `pnpm --filter @cvg-his-v2/api... --filter @cvg-his-v2/worker... build` (timeout 300s), evidência em `build-result.json`. |
| Testes | `manifest.nativeTests['native-api']` = 73 arquivos na revisão 3 (reconciliado por MA-02-F-NATIVE). Arquivos `node:test` compilados em `apps/api/dist/**/*.test.js`; inventário validado contra o disco e contra `.map` 1:1. |
| Banco | PostgreSQL privado via `withPrivatePostgres`: `initdb` em `mkdtemp`, `listen_addresses=''`, socket no diretório, **porta fixa 55439**, usuário `cvg_native_admin`; banco `cvg_his_v2_test_native` criado por `migrate` + `seed` (`preparePrivateApiDatabase`), com verificação de inventário de migrations e seed admin. |
| Raw/inputs | `NODE_V8_COVERAGE=/proc/<pid>/fd/<dirfd>` (procfs); conversão por `native-v8-conversion.mjs` com source maps e snapshot de artefatos gerados; original autenticado por `beforeInputs`. |
| Outputs | `.../native-api/<runId>/{build-result,invocation,v8/,database-preparation,database-lifecycle,native-observation,coverage-final,test-result,shard}.json` — **candidato only** (sem publicação top-level). |
| Skip/falha/timeout | Inventário congelado; exit/observation validados; artefatos gerados não podem mudar; timeout de teste 120s; falha de migração/seed aborta. |
| Cleanup | Servidor privado encerrado; **dados retidos para inspeção** (não destrutivo). |

### 2.4 native-worker

| Dimensão | Observado |
| --- | --- |
| Comando | `node scripts/run-native-critical-coverage.mjs native-worker`. |
| Requisitos | Linux/procfs, Node, pnpm, git. **Não exige** `NATIVE_POSTGRES_*` no runner (o guard de binários só se aplica a `native-api`). |
| Build/testes | Build `@cvg-his-v2/worker...`; `manifest.nativeTests['native-worker']` = 12 arquivos `node:test` na revisão 3; inventário e source maps como no API. |
| Serviços | Inspeção indica testes autossuficientes (asserções de `DATABASE_URL` ausente; `pg` apenas como tipo). **A confirmar em execução no slice**; se algum teste exigir serviço, parar e escalar a MA-11 em vez de mockar. |
| Outputs/cleanup | Mesma estrutura candidata do native-api, sem banco privado. |

### 2.5 critical-process

| Dimensão | Observado |
| --- | --- |
| Comando | `node scripts/run-process-critical-coverage.mjs`; exige `NATIVE_POSTGRES_BIN/SHARE` (+`LIB`), `REDIS_SERVER_BIN`, `REDIS_CLI_BIN` (+`REDIS_SERVER_LIBRARY_PATH`). |
| Build/suíte | Build api+worker (300s); `node infra/scripts/run-critical-process-suite.mjs` (timeout 900s) com `CVG_CRITICAL_PROCESS_RUNNER=1`; PostgreSQL privado + Redis fornecidos por binário. |
| Testes | `manifest.processTests` = 11 suítes; inventário validado por `--list`; cada suíte deve gerar exatamente um `success-report.json` validado. |
| Raw/identidade | Captura V8 por descriptor procfs + preload de fonte; originais terminais + artefatos gerados congelados; conversão em `collectProcessCoverage`. |
| Outputs | `.../critical-process/<runId>/{build-result,invocation,child,database-lifecycle,suite-outcome,suite-report-verification,collection-verification,coverage-final,test-result,shard}.json` — candidato only. |
| Cleanup | `cleanupOwnedProcess` com orçamento finito; fila/Redis efêmeros; servidor privado encerrado e pasta retida. |

## 3. Contrato de agregação proposto (PREP-02)

O contrato **já existe** e está implementado em `scripts/check-critical-coverage.mjs`
(com 9 testes em `scripts/check-critical-coverage.test.mjs`, incluindo shard ausente, hash de
fonte/input stale, provenance inválida e normalização de paths). A proposta é adotá-lo como
especificação de MA-05, sem substituí-lo:

1. **Normalização de identidade:** cada caminho do manifesto é resolvido com
   `resolveContainedPath` (realpath; escape/symlink rejeitados) e conferido por `sha256`
   contra `file.sha256`. Chaves raw podem ser relativas ou absolutas; são normalizadas para a
   mesma identidade real; duplicata ou caminho fora do root reprova o shard inteiro.
2. **Compatibilidade de mapas:** cada `coverage-final.json` precisa ser objeto válido com
   `statementMap/s`, `fnMap/f`, `branchMap/b` consistentes; `validateRawCoverageEntry` valida
   schema, localização e contadores **antes** de qualquer normalização Istanbul. O shard
   malformado é rejeitado como um todo (não se mescla dado inválido).
3. **Junção de hits:** somente mapas compatíveis são `merge`ados em um único
   `CoverageMap`; o denominador é a união das fontes instrumentadas do manifesto (348),
   nunca a soma de percentuais. Contadores mesclados precisam ser inteiros seguros >= 0.
4. **Rejeição fail-closed:** shard ausente/duplicado; `metadata.shard` divergente; `status`
   != passed; `head`/`manifestSha256`/`finalizedAfterExit`/`exitCode`/`signal` inválidos;
   `executionInputHashes` ou `sourceHashes` divergentes; `coverageSha256`/
   `testResultSha256` divergentes; `test-result.json` com runId/shard/status inválidos;
   fonte aplicável ausente; instrumentação vazia sem reexport runtime; branch/função
   executável sem instrumentação; counter/map incompletos ou overflow.
5. **Componentes:** para cada um dos 10 componentes, soma-se a métrica das fontes do
   componente e exige-se >= `max(85, manifest.thresholds)` em lines/statements/functions/
   branches. Componente sem medição reprova (`total` zero).
6. **Reprodução:** `node scripts/check-critical-coverage.mjs` recalcula tudo a partir dos
   artefatos brutos e hashes; PASS/FAIL é derivado, não aceito como declaração do produtor.

**Gates separados (não fundir):** o gate global de **82%** é `pnpm test:coverage`
(`vitest.config.ts`, 82/82/82/82, escopo de `coverageSourceFiles`) e segue **BLOCKED** por
MA-06-R1; o gate crítico de **85%** é este contrato + manifesto + cinco shards. Nenhum
substitui o outro; qualquer mudança de escopo exige decisão formal do Lead (opções em
MA-06-R1 §3).

**Lacuna dura do gate crítico:** o manifesto tem **193 fontes
`pending-specialized-instrumentation`** (168 `packages/db/migrations`, 25 `apps/spa/src`) e o
checker reprova qualquer aplicabilidade diferente de `javascript-metrics`
(`check-critical-coverage.mjs:43`). Portanto os cinco shards, sozinhos, **não** produzem PASS
crítico: é preciso evidência especializada/aceite formal para essas fontes. Isso é pré-requisito
de MA-05 completo, não do primeiro slice.

## 4. Preflight de ambiente — MA-11 (PREP-04)

| Item | Observado | Proposta para execução futura |
| --- | --- | --- |
| Node/pnpm/git/Linux/procfs | Presentes (v24.20.0, 10.0.0, Linux, `/proc` ok) | Manter; fixar Node 22/24 do CI |
| PostgreSQL (`psql`, `initdb`, `postgres`, `pg_ctl`) | **Ausentes** do PATH e de `/usr/lib/postgresql`; `NATIVE_POSTGRES_*` não definidos | Provisionar diretório privado versionado (bin+share) e exportar `NATIVE_POSTGRES_BIN/SHARE/LIB` por execução |
| Redis (`redis-server`, `redis-cli`) | Binários **ausentes** do PATH; há um `redis-server` compartilhado escutando em `127.0.0.1:6379` (pid 1905), fora do controle da frente | Provisionar binários privados e instância efêmera exclusiva; nunca reutilizar 6379 |
| Docker | Binário presente, socket `root:docker`; **permission denied** para o usuário | Não depender de `test:db:start`/compose; usar banco privado dos runners |
| Porta 55439 | **Já ocupada** (`ss` mostra listener) — é a porta fixa de `withPrivatePostgres` | Alocar porta/socket por execução (parametrizar) e/ou confirmar liberação; nunca reutilizar serviço alheio |
| Portas 3111/3112/5433/6380 | Sem listeners observados nesta janela | Alocar portas/recursos exclusivos por tentativa |
| `/tmp` | Muitos `cvg-3a-af-*` e nenhum `/tmp/cvg-native-pg-*` nesta janela | Diretórios por runId, retenção acordada; não remover resíduos de terceiros |
| Disco | `/` com ~508G livres | Suficiente; retenção de raw/outputs em `artifacts/` (ignorado pelo Git) |
| Defaults perigosos | `test:db:start/stop` usam docker compose e `down -v`; wrappers e2e usam `fuser -k` em 3111/3112; soak/game-day mexem em banco | Não executar sem janela/lock; preferir runners privados candidatos |

## 5. Investigação dos quatro executionInputs inexistentes (PREP-03)

Paths exatos (únicos ausentes entre 2116; não estão em `files`):
`packages/design-system/stories/DsBadge.stories.vue`, `DsButton.stories.vue`,
`DsCard.stories.vue`, `DsInput.stories.vue`.

- **Histórico (evidência forte de renomeação):** commit `696d7dd5` registra
  `R090 .vue→.ts` (Badge), `R086` (Card), `R091` (Input) e `A DsButton.stories.ts` +
  `D DsButton.stories.vue`. Os quatro sucessores `.ts` existem no disco.
- **Omissão adicional:** o manifesto já contém `packages/design-system/src/stories/Ds*.stories.ts`
  (outro diretório) nos inputs, mas **não** contém `packages/design-system/stories/Ds*.stories.ts`
  (os renomeados). Não há registro em `retiredArchivedSources`/`legado/` para os `.vue`.
- **Conclusão:** renomeação não refletida no inventário, com omissão dos sucessores; não é
  "arquivo aposentado". `UNKNOWN` somente para a intenção de tratamento (incluir os `.ts` ou
  apenas remover os `.vue`), que cabe ao owner IDENTITY.
- **Impacto:** `snapshotInputs` é chamado pelo início de **todos** os cinco runners
  (`run-critical-coverage-shard.mjs`, `run-native-critical-coverage.mjs`,
  `run-process-critical-coverage.mjs`) e pelo checker via `executionInputs`; hoje qualquer
  coleta falha em `execution input ...: path does not exist` antes de executar.
- **Correção proposta (Agente 1/IDENTITY):** regenerar `executionInputs` pelo tooling
  (`scripts/refresh-critical-source-manifest.mjs`/`critical-source-identity.mjs`),
  substituindo os 4 `.vue` pelos 4 `.ts` (ou removendo com justificativa), com entrada em
  `scopeHistory` e sem tocar `files`/thresholds. **Não remover entradas mecanicamente.**
- **Teste de completude proposto:** adicionar caso em `scripts/critical-source-manifest.test.mjs`
  que exija existência e hash de todo `executionInput` e que um input removido/renomeado
  sem refresh falhe (known-bad), preservando a procedência.

## 6. Ordem recomendada e primeiro slice (PREP-05)

Ordem por dependência real (menor superfície primeiro):

1. **D1 — Reparar os 4 executionInputs** (Agente 1, IDENTITY). Destrava os cinco runners.
2. **S1 — Coleta candidata do shard `native-worker`** (Agente 3/QA). Não exige binários de
   banco/Redis; exercita build→inventário→V8 procfs→conversão→finalize e a verificação
   independente, sem publicar `shard.json` top-level.
3. **S2 — `native-api` candidato** (MA-11: binários PostgreSQL privados; resolver colisão 55439).
4. **S3 — `vitest-unit` candidato + higiene do skip crítico** (MA-33 habilitador aprovado pelo
   Lead: realocar/condicionar o teste de diagnóstico com falha fechada) e então
   `vitest-integration` (PostgreSQL efêmero).
5. **S4 — `critical-process` candidato** (MA-11: PostgreSQL + Redis privados).
6. **S5 — Agregação dos cinco shards** via `check-critical-coverage.mjs` + decisão sobre as 193
   fontes especializadas + revisão independente; só depois revisitar AC05 global (MA-06).

### Proposta do slice único para autorização imediata

| Campo | Proposta |
| --- | --- |
| ID | **MA-05-S1** |
| Objetivo | Produzir o primeiro shard candidato verificável (`native-worker`) com o tooling já validado, sem publicar `shard.json` top-level e sem declarar cobertura crítica. |
| Pré-requisito | **D1** concluído e registrado pelo Agente 1 (4 inputs). Sem D1, S1 nem inicia (fail-closed). |
| Dependências pendentes | Confirmar em execução que os 11 testes `node:test` do worker são autossuficientes. Se exigirem serviço, **parar** e escalar MA-11. |
| Allowlist | Para despacho S1 após F-INPUTS: cópia isolada com fontes/configs/inputs atuais identificados por hashes; outputs `artifacts/consolidacao-2026-09-05/coverage-scope/native-worker/<runId>/`, novo diretório `artifacts/remediation/MA-05/` e derivados de instalação/build somente nessa cópia. Sem edição de produto/manifesto/gate, sem promoção top-level e sem consumo como evidência aprovada. Ownership e recursos precisam ser confirmados no início. Ver atualização no status consolidado. |
| Owner/locks | Execução: Agente 3 (QA/DX). IDENTITY: Agente 1 (D1). Nenhum lock novo; não rodar em concorrência com MA-03-R2/build de outros. |
| Comandos | `node scripts/run-native-critical-coverage.mjs native-worker` (requer D1; Linux/procfs; sem `NATIVE_POSTGRES_*`); verificação independente: recomputar hashes de `coverage-final.json`/`test-result.json` e conferir `shard.json` candidato; `node --test scripts/critical-source-manifest.test.mjs`. |
| Ambiente | Node v24.20.0, pnpm 10.0.0, /tmp com espaço; sem docker; sem banco/Redis; build worker (300s) incluso no runner. |
| Resultado esperado | Diretório candidato `artifacts/consolidacao-2026-09-05/coverage-scope/native-worker/<runId>/` com build/inventário/V8/coverage/test-result/shard candidatos; `status=passed` **ou** BLOCKED documentado com o erro exato; nenhuma conclusão sobre cobertura crítica/global. |
| Testes positivos | (1) inventário do worker = 11 arquivos congelados; (2) `coverage-final.json` não vazio e apenas com fontes do manifesto; (3) `test-result.json` com 11 suítes aprovadas; (4) `shard.json.status=passed` com hashes coerentes. |
| Testes negativos | (1) rodar sem D1 deve falhar em `snapshotInputs` (known-bad atual); (2) adulterar um hash de fonte em cópia descartável deve reprovar; (3) um skip/falha em teste nativo deve produzir `status=failed`. |
| Artefatos/retenção | Candidato + logs em `artifacts/remediation/MA-05/attempt-1/`; artefatos ignorados pelo Git retidos até revisão; sem credenciais. |
| Cleanup/rollback | Nenhum serviço criado. Remover apenas o diretório candidato da tentativa em caso de reexecução; não tocar recursos compartilhados. |
| Critério de parada | Candidato produzido e verificado por revisor diferente do executor **ou** BLOCKED com causa exata (pré-requisito, teste que exige serviço, ferramenta ausente). |

## 7. Decisões necessárias e responsáveis

| # | Decisão | Responsável |
| --- | --- | --- |
| D1 | Reparar os 4 executionInputs renomeados e adicionar guarda de completude | Agente 1 (IDENTITY), consulta Agente 3 |
| D2 | Autorizar MA-05-S1 e registrar no grafo (ou rejeitar) | Lead |
| D3 | Higiene do skip crítico do diagnóstico (`test.skipIf` em unit) com falha fechada | Lead despacha MA-33 habilitador; owner QA/DX |
| D4 | Provisionar binários privados e alocação de porta PostgreSQL (colisão 55439) | MA-11/Plataforma |
| D5 | Tratamento das 193 fontes `pending-specialized-instrumentation` | MA-05/QA + Lead |
| D6 | Escopo do gate global de 82% (decisão herdada de MA-06-R1; **não** é redução automática) | Lead/QA/Segurança |
| D7 | Publicação top-level do runner vitest vs candidato-only dos demais | MA-05 + Lead |

## 8. Validação desta preparação

A executar após a gravação deste documento, em janela sem concorrência de build/teste:
`pnpm docs:validate` e `git diff --check` (ambos read-only). Links locais deste documento
foram restritos a caminhos existentes; resultados e eventuais falhas por concorrência
documental de outras frentes serão reportados sem correção fora da allowlist.

Evidência do preparo: este documento é a única escrita da tarefa.

## Atualização — MA-02-F-NATIVE concluído (revisão 3)

Estado em 2026-09-12T22:10Z: a divergência de inventário que bloqueava MA-05-S1 foi
reconciliada pelo tooling de refresh (`--reconcile-native native-worker --reconcile-native
native-api`) com descoberta AST canônica compartilhada. Manifesto revisão 3: native-worker 12,
native-api 73, executionInputs 2119, `executionInputsSha256 530835b4…`; `files`/`sourceSet`,
`requiredShards`, `processTests`, thresholds (82/85) e as 193 fontes especializadas inalterados.
`--check` detecta divergência sem escrever; segunda execução é noop. Pacote:
`artifacts/remediation/MA-02-F-NATIVE/attempt-20260912T2210Z/` (IMPLEMENTED / REVIEW REQUIRED).

Ressalva para a coleta: `scripts/run-native-critical-coverage.test.mjs` (modo `pass`) tem falha
pré-existente no assert de branch zero-hit, reproduzida com a versão anterior do inventário;
verificar antes de interpretar cobertura nativa como completa.

Próxima ação: revisão independente de MA-02-F-NATIVE; depois, novo MA-05-S1 (novo runId,
candidato sincronizado). Nenhum shard foi promovido e o release permanece BLOCKED.
