# ExecPlan — Consolidação CVG-HIS V4

**Estado:** IN_PROGRESS — slices bounded CVG-003 e CVG-012 reconciliados
**Tier:** T4_CRITICAL  
**Última atualização:** 2026-08-30
**Fonte:** missão de consolidação + `docs/engineering/*`

## Objetivo

Reduzir a ambiguidade arquitetural e elevar a confiabilidade operacional do CVG-HIS sem rewrite, mantendo PostgreSQL, Vue, módulos existentes, RLS, auditoria e compatibilidade de migrations.

## Estado atual verificável

- typecheck, lint e build completos passaram em 2026-08-25;
- discovery encontrou 70 pacotes, 65 V2/5 legacy, duas casas de DB, dois tracks Helm e composição API centralizada;
- quality bar global continua PARTIAL; parity funcional é 4/11;
- risks P0/P1 estão registrados em `docs/engineering/RISK_REGISTER.md`;
- nenhum arquivo foi alterado antes dos artefatos de discovery/spec.

## Tarefas

- [x] ler missão, instruções, state, backlog, logs, gates e plano anterior;
- [x] auditar topologia, namespaces, runtime, DB/migrations/RLS, CI, Helm, parity, testes e docs;
- [x] publicar auditoria, riscos, dívida, PRD, SPEC, quality bar e plano;
- [x] implementar S1 checksum fail-fast com TDD;
- [x] implementar S2 healthcheck Compose explícito;
- [x] implementar S3 shutdown API/worker com drain;
- [x] validar focused/process/full regressions;
- [x] obter crítica independente;
- [x] fechar o boundary de namespace canônico CVG-012 com guardrail no CI;
- [ ] planejar guardrails residuais de identidade/Helm/CI;
- [ ] fechar núcleo clínico e parity por evidência;
- [ ] executar DR e validação de ambiente alvo;
- [ ] publicar relatório final de consolidação.

## Decisões e limites

1. A superfície atual `docker-compose.v2.yml` + `packages/db` é operacionalmente canônica até cutover formal.
2. V2→V4 será migração de identidade, não rename global imediato.
3. `packages/shared/database` continua runtime client, mas seus comandos de migration são control surface a retirar.
4. `infra/helm/cvg-his-v2` é o track Helm validado; `charts/helm` não é release evidence.
5. Não há PASS sem evidência executada; ambiente externo bloqueado fica explícito.

## Log de execução

| Data       | Evento                                                                      | Evidência                                                                                                                                                                                                          |
| ---------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-08-25 | discovery e baseline                                                        | `ARCHITECTURE_AUDIT.md`, typecheck/lint/build PASS                                                                                                                                                                 |
| 2026-08-25 | riscos convergentes por três scouts independentes                           | relatórios de arquitetura, DB/ops e clinical/parity                                                                                                                                                                |
| 2026-08-25 | plano/spec congelados                                                       | `QUALITY_BAR.md`, `...SPEC.md`                                                                                                                                                                                     |
| 2026-08-25 | S1–S3 implementados e revisados                                             | focused 22/22, process 2/2, PostgreSQL migration integrity 1/1 sobre 142 migrations aplicáveis                                                                                                                     |
| 2026-08-25 | guardrails CI adicionados                                                   | `repository-guards`, PostgreSQL isolado, CI contract test                                                                                                                                                          |
| 2026-08-25 | concorrência do setup observada                                             | colisão `ALTER ROLE` entre bancos efêmeros; lock administrativo adicionado e validado com marketing+staff 19/19                                                                                                    |
| 2026-08-25 | limite de recurso do harness corrigido e revalidado                         | `docker-compose.test.yml` reserva `shm_size: '1gb'`; `pnpm test` concluiu 70 projetos, PostgreSQL `OOM=false`, `exit=0`                                                                                            |
| 2026-08-25 | contrato final do CI hardenizado                                            | `unit-tests` sobe/desce DB, exige `REQUIRE_TEST_DB=1`; 5 serviços PostgreSQL GitHub recebem `--shm-size 1g`; focused 22/22                                                                                         |
| 2026-08-25 | prova viva local de RLS/roles promovida ao CI                               | isolation/access/runtime ACL 19/19; production-like bootstrap 6/6; `repository-guards` passa a executar os dois contratos                                                                                          |
| 2026-08-25 | vertical clínico-financeiro promovido ao CI e núcleo Owner/Patient ampliado | vertical 11/11; cenário adicional cria Owner→Patient→Encounter via HTTP e leva os mesmos registros até inpatient/billing/stock/receipt com replay, audit e tenant boundary                                         |
| 2026-08-25 | rollback cross-domain e revisão final reconciliados                         | route 24/24, medical-records 17/17, inpatient 17/17, API boundary 366/366, typecheck/build PASS, vertical 11/11; Noether CONDITIONAL_PASS sem blocker/high/medium; dívida separada na fixture API `db-persistence` |
| 2026-08-30 | CVG-012 namespace canônico fechado bounded                               | AST guard `validate:namespaces`, RBAC `@cvg-his-v2/rbac`, fiscal stale dependency removida; 10/10 guard/CI, access-control 39/39, fiscal 18/18, API 519/519; crítica independente encontrou gaps, corrigidos e retestados; sem aprovação pós-correção |

## Próxima ação

Observar o workflow remoto com o orçamento de shared memory e repetir a prova de RLS/roles no catálogo alvo; em seguida repetir a cadeia Owner/Patient/Encounter→receipt no ambiente autorizado e executar restore com bundle representativo, medindo RTO/RPO. O fixture restore drill local passou com checksums/TOC, globals, banco e storage. A fixture API `db-persistence` agora passou localmente 17/17 dentro de `test:all`, e o runner SPA DB-backed passou 60/60 em Docker, mas ambos continuam bounded até haver evidência de ambiente alvo; commits locais desta continuação foram autorizados pelo usuário, sem push automático.

## Checkpoint — CVG-012 namespace canônico — 2026-08-30

O slice `CVG-012-NAMESPACE-CANONICAL-BOUNDARY` foi reconciliado como
`COMPLETE_BOUNDED/PASS_BOUNDED`. O catálogo RBAC foi migrado para
`@cvg-his-v2/rbac`, referências ativas e lockfile foram alinhados, a dependência
legada não usada de `module-fiscal` foi removida e o guardrail AST
`validate:namespaces` foi conectado ao `repository-guards` com regressão de
manifest, import nomeado/side-effect, export, `import()`, `require`, template,
`require.resolve` e falsos positivos de comentários/strings.

A crítica independente inicial encontrou false negatives do guard e claims de
estado órfãos. A análise foi substituída por AST TypeScript, o teste passou
10/10 e task/gate/artifact/state foram reconciliados. A revisão independente
pós-correção não retornou aprovação; isso permanece limitação explícita. O
resultado não promove o ERP global, parity, target, providers, produção,
deployment ou release.

## Checkpoint — SPA DB-backed Docker — 2026-08-25

O runner Docker passou de um primeiro RED de bootstrap (signer laboratorial e
roles runtime ausentes) por correções de seed/Compose/role até um GREEN
bounded. A primeira suíte pós-correção marcou 59/60 por um stub visual que
comparava `/queue` enquanto a SPA chamava `/api/queue`; o harness foi corrigido
com teste de contrato e o baseline preservado. A repetição oficial passou
60/60 com PostgreSQL/Redis, migrations, seed, restart/rehydration e cash
settlement persistente.

O próximo passo continua condicionado ao escopo autorizado: RLS/FORCE RLS,
restore/RTO-RPO, Redis/failover, provider, parity, coverage, operações e
release. O worktree permanece misto e não deve ser publicado sem escopo
explícito.

## Checkpoint — API persistence/RLS bounded correction — 2026-08-25

O RED da fixture de persistência confirmou uma dívida concreta: IDs textuais
eram enviados para colunas/FKs UUID e os repositories eram chamados sem
contexto de tenant/principals provisionados. O GREEN passou a semear uma conta
efêmera com IDs UUID, papéis/principals, staff, owner/patient/encounter e a
executar as chamadas dentro de `runWithTenantContext`.

Também foram corrigidos IDs UUID de notifications, o timestamp persistido de
triage e os caminhos de persistência inpatient, surgery, diagnostics e
medical-records para transações tenant-scoped. O fallback de prontuários ficou
restrito ao fake sem pool em `NODE_ENV=test`; o caminho de produção exige
contexto e falha fechado. As dependências workspace e o lockfile foram
sincronizados.

Evidência fresca: banco PostgreSQL descartável resetado até a migration 0143,
API `test:all` 371/371, database-persistence 17/17, notifications 10/10,
medical-records 17/17, diagnostics 27 pass + 1 skip intencional, inpatient
17/17, surgery 9/9, builds afetados, Prettier direcionado e `git diff --check`.
Noether fez revisão independente pós-fix e retornou `CONDITIONAL_PASS`, sem
blocker/HIGH; permanece um risco MEDIUM de compatibilidade porque o
repositório de diagnósticos conserva mas não usa o `DatabaseClient` injetado,
além de observações LOW de defesa em profundidade.

O resultado é bounded e não promove gates globais. Próximo trabalho local
autorizado: catálogo RLS/FORCE RLS do ambiente alvo ou restore/RTO-RPO
representativo; depois provider/Redis/CI/parity/WCAG/coverage/operations/release.

## Checkpoint — DB-001 migration source of truth — 2026-08-25

O RED do guardrail falhou porque ainda não existia uma validação executável da
fonte única de migration. O GREEN adicionou `scripts/check-migration-source-of-truth.mjs`,
o bloqueador explícito `scripts/reject-legacy-db-command.mjs`, contrato unitário
RED/GREEN e contrato CI. `packages/db` conserva `db:migrate`/`db:seed` como
runner/seed canônicos; `packages/db` e `packages/shared/database` não expõem
mais `drizzle-kit`, e os comandos alternativos falham fechado. Os 30 SQL
históricos do shared-database foram preservados.

CI, Compose, Helm, cutover e bootstrap de teste apontam para a trilha
`packages/db`; a chamada CI foi tornada explícita com `pnpm exec tsx`. Evidência
fresca: `pnpm validate:migration-source`, contratos focados 5/5, builds dos dois
pacotes, bloqueios negativos dos comandos legados, install offline congelado,
Prettier e `git diff --check`. Aristotle fez crítica read-only independente e
aprovou a barra DB-001 sem P0/P1; o gap documental nominal foi LOW.

O resultado é bounded local: migration positiva nova em staging, catálogo
RLS/FORCE RLS, restore/RTO-RPO, GitHub Actions, provider/Redis, parity, WCAG,
cobertura, operações e release permanecem abertos. O artefato rastreado
`packages/db/src/migrate.js` e a configuração histórica ficam para mudança
própria; nenhum commit/push foi feito.

## Checkpoint — DB-002 stale migration artifacts — 2026-08-25

O RED do novo contrato confirmou que `packages/db/src/migrate.js` ainda
existia e divergia do runner TypeScript. O mapeamento de consumidores encontrou
apenas `packages/db/dist/migrate.js` em Compose/Helm e nenhum consumidor ativo do
JS fonte ou de `drizzle.config.ts`; referências restantes estão no guardrail,
teste, documentação de auditoria ou arquivo histórico arquivado.

O segundo RED, provocado pelo scout independente, confirmou que os companions
`packages/db/src/migrate.d.ts`, `migrate.js.map` e `migrate.d.ts.map` também eram
stale e órfãos. O GREEN ampliou o guardrail/teste para os cinco artefatos,
removeu somente essa família source-level e preservou integralmente as
migrations SQL. `packages/db` e `@cvg-his-v2/shared-database` compilaram, o dist
runner passou `node --check`, o guardrail passou e a suíte migration/CI passou
15/15. A revisão independente de Huygens aprovou o escopo anterior DB-002-A–E;
a revisão da extensão está pendente. O gap P1 conhecido é que os novos
guardrails/docs/testes e a limpeza permanecem untracked/unstaged até uma
publicação Git autorizada.

O resultado é bounded local e não promove migration positiva em staging,
catálogo RLS/FORCE RLS, restore/RTO-RPO, CI remoto, providers, Redis, parity,
WCAG, cobertura, operações ou release. Não houve staging, commit ou push.

## Checkpoint — CVG-001 setup-to-session across two hot APIs — 2026-08-25

O RED da prova real retornou `503` porque as roles de login `NOINHERIT` não
ativavam implicitamente a membership `cvg_installer` ao chamar a capability de
setup. O GREEN adicionou um boundary explícito `BEGIN`/`SET LOCAL ROLE`/`COMMIT`
em `setup-provisioning.ts`, preservando o modelo de least privilege e o
rollback em caso de falha.

O processo `tests/integration/process/setup-installation-to-session.test.ts`
inicia duas APIs reais contra o mesmo PostgreSQL descartável. A execução final
passou 1/1: status inicial nas duas réplicas, instalação única, propagação do
sentinel, login/session cruzado, rotação e rejeição do refresh antigo, logout,
revogação nas duas réplicas e `409` na segunda instalação. Não houve segredo em
resposta ou log capturado. Regressões passaram setup 26/26, instalação/ACL 9/9,
CI/roles 15/15, cleanup 5/5, typecheck 70/70 e diff-check.

A revisão independente de segurança/confiabilidade aprovou o slice bounded
após as correções de cleanup, SIGKILL, cookie, revogação e rollback. CVG-001
continua `IN_PROGRESS`: wizard Playwright/axe, inputs inválidos/oversize,
target RLS/FORCE RLS, Redis/failover, cobertura, produção e release continuam
sem promoção. Nenhum commit ou push foi feito.

## Checkpoint — CVG-001 setup wizard hint accessibility — 2026-08-25

Um RED de componente confirmou que `DsInput` renderizava hints visuais sem
`id`/`aria-describedby`. O GREEN adicionou IDs estáveis para hint/erro e um
target computado compartilhado por `input`, `textarea` e `select`; quando há
erro, somente a mensagem visível é referenciada.

O contrato final passou 9/9 no `DsInput`; o design-system passou 26/26 em sete
arquivos e o SetupPage passou 8/8. Typecheck do design-system, `vue-tsc` da
SPA, lint TypeScript, Prettier e diff-check passaram. A revisão independente
encontrou inicialmente dívida de cobertura para textarea/select e precedência
de erro, fechada com testes adicionais e aprovada bounded.

O resultado não promove Playwright/axe real, teclado/mobile, invalid/oversize
HTTP, target RLS/FORCE RLS, Redis/failover, cobertura global ou release.

## Checkpoint — CVG-001 setup HTTP negative matrix — 2026-08-25

Antes do caminho válido, o processo real agora envia JSON malformado, payload
não-objeto, token inválido, campos inválidos e corpo acima de
`SETUP_MAX_BODY_BYTES`. A execução final em duas APIs e PostgreSQL passou 1/1;
as respostas foram `400 INVALID_JSON_BODY`, `400 INVALID_SETUP_PAYLOAD`, `401
INVALID_SETUP_TOKEN` sem eco do token e `413 SETUP_PAYLOAD_TOO_LARGE`. O status
permaneceu `setupRequired=true` depois de todas as rejeições, e o fluxo válido
continuou passando setup/login/refresh/logout.

O primeiro RED do teste esperava detalhe interno do parser; a correção passou a
afirmar a mensagem pública genérica. A revisão independente aprovou a matriz
contra a ordem de validação em `setup-routes.ts`. Browser Playwright/axe,
target RLS/FORCE RLS, Redis/failover, restore/RTO-RPO, cobertura e release
continuam sem promoção.

## Checkpoint — CVG-001 setup browser/axe final — 2026-08-25

O teste browser do wizard foi endurecido após crítica independente: status e
POST usam origem/URL exatas, método esperado, ausência de cookie e payload
exato tanto no sucesso quanto no retry. A especificação foi incluída no script
`test:e2e:spa:setup` e no conjunto SPA enterprise do CI.

Após rebuild da SPA, o comando oficial passou 4/4 em Chromium. A prova cobre
axe com tags WCAG 2.1/2.2 AA, formulário nomeado, hints/error linkage,
teclado/foco, viewport 390px, `aria-invalid`, ausência de cookies e limpeza
completa das credenciais em sucesso e falha. O contraste claro identificado no
primeiro RED foi corrigido; SetupPage 8/8, DsInput 9/9 e SPA typecheck/build
também passaram. Kepler fez a segunda revisão read-only e retornou
`APPROVE_BOUNDED` sem HIGH/MEDIUM.

Este é um `PASS_BOUNDED` local do wizard, não uma promoção de WCAG global,
RLS/FORCE RLS de alvo, Redis/failover, restore/RTO-RPO, parity, coverage,
operations ou release. O próximo gap autorizado é ampliar jornadas browser
críticas; as provas de ambiente alvo continuam condicionadas à autorização.

## Checkpoint — restore drill com tempos — 2026-08-25

O drill descartável já provava checksums, TOC, globals, banco e storage, mas
não retinha duração. O RED/GREEN adicionou timestamps e métricas de duração
total/fases ao relatório JSON/texto. A execução fresca passou com 2 tabelas, 2
arquivos, `storageListingMatch=true`, `elapsedMs=8657` e fases
checksum/runtime/database/storage de `995/6961/581/14 ms`.

O resultado é bounded local; o próximo gate operacional continua sendo bundle
representativo, retenção e RTO/RPO no ambiente autorizado, sem inferir
produção a partir da fixture pequena.

## Checkpoint — catálogo local FORCE RLS — 2026-08-25

O teste de catálogo começou RED com 123 tabelas tenant sem `FORCE RLS` e uma
exceção prevista (`installation_state`). A migration `0144` fechou a lacuna de
ownership no catálogo local; o contrato passou 2/2 e a regressão conjunta de
RLS/setup passou 26/26. A prova é `PASS_BOUNDED`; o próximo passo é repetir a
consulta de catálogo, grants, ownership, `NOBYPASSRLS` e isolamento no ambiente
alvo/staging autorizado. O `repository-guards` agora executa o contrato de
catálogo, protegido por `tests/unit/infra/ci-contract.test.ts` (4/4).

## Checkpoint — CVG-002C6 restore representativo — 2026-08-25

O restore drill ganhou um perfil explícito `representative`, sem remover o
perfil mínimo. A fixture representativa aplica a trilha canônica de migrations
0000–0144 em PostgreSQL descartável, cria dados sintéticos do grafo
Owner→Patient→Encounter→internação→billing→estoque→ledger→outbox/audit/
documento e grava globals/storage/manifest/checksums.

O comando oficial passou ponta a ponta com 176 tabelas, 3 arquivos, 19
assertions após `SET ROLE restore_probe` (`false,false`) e `app.current_account_id`, listing idêntico e `elapsedMs=28610`.
REDs de encoding binário, readiness durante restart e cardinalidade do ledger
foram fechados. Artefato:
`.agent/artifacts/CVG-002C6-restore-representative-2026-08-25.md`.

Permanece `PASS_BOUNDED` local: RTO/RPO, retenção, bundle/ownership/grants do
alvo, failover, Game Day, CI remoto, providers, parity, cobertura, operações e
release ainda exigem ambiente/autoridade adicionais. Nenhum commit ou push foi
feito; a worktree segue mista e o `tsbuildinfo` do usuário deve ficar fora de
qualquer publicação.

## Checkpoint — CVG-003 verification spine — 2026-08-25

O contrato da matriz começou RED por ausência de
`docs/engineering/REQUIREMENT_EVIDENCE_MATRIX.md`. O GREEN criou a matriz com
uma linha para cada critério congelado da Quality Bar, incluindo comportamento
rejeitante, artefato/ledger e status honesto. O teste passou 2/2; o contrato de
CI primeiro falhou por não haver binding e depois passou 4/4 quando o
`repository-guards` passou a executar o teste com `REQUIRE_TEST_DB=1`.

O checkpoint é `IN_PROGRESS`: os critérios principais estão indexados, mas os
subcritérios detalhados do `.gauntlet/state.md` ainda precisam de uma expansão
independente antes de qualquer promoção global.

## Checkpoint — CVG-003 índice dos subcritérios Gauntlet — 2026-08-25

O índice complementar
`docs/engineering/GAUNTLET_SUBCRITERIA_EVIDENCE.md` agora cobre os 30 IDs
`QB-*` únicos encontrados no `.gauntlet/state.md`, incluindo o critério de
continuidade do harness que aparece no histórico textual e não apenas na
tabela inicial. Cada linha registra fonte, comportamento rejeitante,
referência de artefato/ledger e limite de status.

O contrato `tests/unit/infra/gauntlet-subcriteria-evidence.test.mjs` começou RED
pela ausência do documento e teve um segundo RED honesto quando a extração
limitada à tabela encontrou 29 IDs; a correção passou a indexar todos os
tokens `QB-*` congelados e o teste passou 2/2. O contrato do workflow também
passou a exigir `node --test ...gauntlet-subcriteria-evidence.test.mjs` no
`repository-guards`; a composição matrix+CI passou 2 arquivos/6 testes.

O índice é somente uma superfície de auditoria local. Os estados
`PARTIAL`, `BLOCKED`, `FAIL` e `NOT_RUN` permanecem pendentes, e
`PASS_BOUNDED` não promove produto, target, release ou go-live. A revisão
independente de Confucius foi `APPROVE_BOUNDED`, sem finding bloqueante, e os
controles finais de formatação, testes, validadores, ledgers, diff, stage e
resíduo Docker passaram. O estado do programa permanece `IN_PROGRESS`.

## Checkpoint — regressão do critical process runner — 2026-08-25

Como gap local seguinte, o runner canônico foi executado com oito bancos
efêmeros distintos após as migrations `0000`–`0144`. As oito fronteiras
passaram: setup/session `1/1`, inpatient SIGKILL/takeover `10/10`, restart
clínico-financeiro `1/1`, cash SIGKILL `1/1`, cash concurrency `1/1`, PIX
settlement `8/8`, worker entrypoint `1/1` e webhook delivery `1/1`.

O artefato
`.agent/artifacts/CVG-002C6-critical-process-regression-2026-08-25.md`
registra os tempos observados, o escopo descartável e a limpeza explícita dos
oito bancos criados pelo run. Confucius aprovou o contrato e o relatório como
`APPROVE_BOUNDED`, destacando que cleanup é uma etapa posterior separada, não
uma garantia automática do runner.

Isso fortalece somente a regressão processual local. Target, provider/Redis,
RTO/RPO, parity, WCAG/cobertura, operações e release continuam abertos.

## Checkpoint — regressão da suíte base crítica — 2026-08-26

A primeira execução da suíte PostgreSQL base encontrou um RED no teste de
marketing: `OWNER_A` e `OWNER_B` eram gerados, mas não existiam em `owners`.
Como o contrato tenant-scoped do `MarketingService` deve rejeitar Owner
inexistente, o ajuste ficou restrito ao fixture, que passou a inserir os dois
Owners na conta A. O teste focalizado passou 1/1.

A repetição completa da seleção `tests/integration/database`,
`tests/integration/setup` e `tests/integration/foundational.test.ts` passou
40/40 arquivos e 447/447 testes em 698,27 s, com migrations 0000–0144 em
PostgreSQL descartável. O banco criado foi removido explicitamente e a
consulta de suffix e a inspeção de resíduos Docker ficaram limpas.

Artefato: `.agent/artifacts/CVG-002C6-critical-base-regression-2026-08-26.md`.
Confucius retornou `APPROVE_BOUNDED`; a revisão confirmou o contrato e os
limites, registrando apenas que o artefato não anexa stdout bruto para uma
segunda verificação dos números agregados. O resultado permanece local e
bounded; target, providers/Redis, RTO/RPO, parity, cobertura, operações e
release continuam abertos.

## Checkpoint — reconciliação da spine CVG-003 — 2026-08-26

Após a regressão base crítica, a matriz de requisitos e o índice subordinado
Gauntlet foram atualizados para citar o novo artefato nos critérios
`QB-CLIN-01`/`QB-CORE-01` e `QB-REL-01`. Os estados `PARTIAL` e `BOUNDED PASS`
foram preservados.

O contrato combinado da matriz/CI passou 2 arquivos e 6 testes em 52,07 s; o
contrato Node do índice passou 2/2. O banco descartável foi removido
explicitamente. Artefato:
`.agent/artifacts/CVG-003-evidence-spine-reconciliation-2026-08-26.md`.

Confucius encontrou e aprovou a correção de uma imprecisão de escopo no
artefato: a mudança de conteúdo foi documental, enquanto os contratos
read-only já existentes são a superfície de verificação. Nenhum código de
produção, workflow ou comportamento de produto foi alterado; target, parity,
providers, operações, cobertura e release seguem abertos.

## Checkpoint — access-control/audit/cache — 2026-08-26

- Closed the bounded CVG-003 slice: awaited audit writes, pending-mutation
  fail-closed behavior, token-before/after stable snapshots with retry,
  per-account hydration coalescing, bounded audit inputs, and Vault fail-closed
  startup behavior.
- Fresh verification: access-control 32/32, API 373/373, disposable
  PostgreSQL/HTTP vertical 14/14, builds/typecheck green, and the secondary
  protected route denied access after cross-instance permission revocation.
- Independent final review: Turing `APPROVE_BOUNDED`.
- Global consolidation remains `IN_PROGRESS`/`PARTIAL`; identity/Helm/CI
  canonicalization, target/provider/RLS ownership evidence, Redis/failover,
  RTO/RPO, parity, coverage, rollout and go-live remain next gates.

## Checkpoint — identidade de release e superfície Helm — 2026-08-26

O próximo gap de maior risco local foi a ambiguidade entre os dois tracks Helm.
O slice declarou `infra/helm/cvg-his-v2` como canônico, marcou `charts/helm`
como legado não-executável, removeu instruções stale do README legado, corrigiu
metadados/links V4 e conectou `validate:deploy-surface` ao CI. O guard passou
com 68 arquivos e rejeitou uma referência ativa artificial ao track legado.

O resultado é `PASS_BOUNDED` do control plane local. `validate:helm` só teve
prova estática porque o binário não está instalado; target, render/rollout,
GitHub remoto, rollback e decisão física sobre o legado continuam pendentes.
Scouts/reviewers independentes não retornaram nesta rodada, então não há
`APPROVE_BOUNDED` novo a atribuir. Artefato:
`.agent/artifacts/CVG-003-release-identity-deploy-surface-2026-08-26.md`.

## Checkpoint — gate executável Helm e CI fail-closed — 2026-08-26

O gap seguinte foi o fallback silencioso quando o binário Helm não existia.
Foi implementado teste RED→GREEN para REQUIRE_HELM=1, exigência da versão
v3.15.4, instalação no repository-guards com SHA-256 pinado e guard contra
drift do workflow. A execução local com o binário oficial passou lint/template
nos overlays dev, staging e prod.

O resultado é PASS_BOUNDED do control plane. GitHub Actions, cluster target,
rollout/rollback, Secrets reais, identidade efetiva de imagem/porta, provider,
Redis, RTO/RPO, parity, cobertura e go-live seguem abertos. A revisão
independente está em andamento; nenhuma aprovação foi inferida.
Artefato: .agent/artifacts/CVG-003-helm-executable-gate-2026-08-26.md.

## Checkpoint final — Helm executável — 2026-08-26

Implementação e verificação local concluídas: validator 5/5, contratos CI e
deploy-surface 8/8, Helm oficial v3.15.4 por `HELM_BIN` nos três overlays,
checksum/path/version fail-closed e controles de formato/sintaxe verdes. A
revisão independente inicial encontrou gaps, que foram corrigidos e cobertos;
o follow-up de Averroes retornou `CONDITIONAL PASS` sem achados HIGH/MEDIUM
restantes. O checkpoint permanece bounded e os gates de
GitHub/target/rollout/release continuam pendentes.
