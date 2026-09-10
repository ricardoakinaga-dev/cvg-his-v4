# Triple-A — Execution Log

## 2026-09-09 — Fase 0 / baseline

- Prompt fonte copiado byte-a-byte para `docs/triple-a/MASTER_PROMPT.md`; SHA-256 conferido.
- Repositório identificado como brownfield, monólito modular, `main@696d7dd5`.
- Controle T4 criado em `.agent/`, com ExecPlan, estado, backlog, execution log, verification ledger e authority ledger.
- Quality bar congelado em `docs/triple-a/QUALITY_BAR_V1.json`.
- `docs:validate`, namespaces, migration source, OpenAPI, RLS, deploy surface e secrets: PASS local.
- `typecheck`, `lint` e `build`: PASS local.
- `complexity:check`: FAIL por `AppointmentsListPage.vue` com 3216 linhas versus limite 3110.
- `validate:helm`: PARTIAL; Helm binário não disponível, apenas validação estática.
- `pnpm test`: PASS com exit 0 no workspace 67/68; SPA 211 arquivos/1862 testes, API 576 testes e worker/módulos concluídos; avisos jsdom de navegação/scrollTo não causaram falha.
- Scout independente de CI/supply-chain/operações: `NOT PROVEN`; release gate, DR, supply chain, imagem/deploy, chaos, performance e observabilidade têm gaps conforme baseline.

## 2026-09-09 — Fase 9 / control plane clínico e fila operacional

- Criado `packages/modules/workflows` com tarefa tenant-scoped, fingerprint de idempotência, estados manual/worker, eventos append-only, leases, fencing, backoff, DLQ, replay e escalonamento limitado.
- Adicionadas migrations `0166`/`0167`, schema Drizzle, RLS/foreign keys compostas, permissões RBAC e verificação estática `pnpm validate:clinical-workflow`.
- A API ganhou `/workflow-tasks` com projeção sem segredos de lease, autorização separada para replay e auditoria aguardada; a alta cria uma tarefa manual de retorno com chave determinística.
- A SPA ganhou a fila `Pendências clínicas`, com filtros, estados de erro/carregamento, contexto de paciente/atendimento e comandos de reconhecimento/conclusão/cancelamento/replay.
- Verificações direcionadas passaram: workflow (7), worker runner (3), API/discharges/workflow (5), SPA/nav/page (34), builds de API/SPA/worker/db e validadores de schema/RLS/OpenAPI/dependências/supply-chain/docs. PostgreSQL real, E2E, UAT, restore, performance e deploy continuam `NOT PROVEN`.
- O control plane passou a exigir revisão otimista monotônica, recuperação de tentativa final abandonada para DLQ, foreign key composta por tenant e trigger PostgreSQL append-only para eventos de ciclo de vida.

## 2026-09-09 — Fase 1 / implementação e revisão adversarial

- Prompt, quality bar e políticas permaneceram preservados; o gate agregador foi implementado com decisão fail-closed, thresholds, identidade de release, SBOM/security evidence e evidências externas vinculadas ao SHA.
- Actions GitHub e seis bases Docker foram fixadas em referências imutáveis; Helm passou a propagar digest para workloads e manutenção de banco, com `values.prod.yaml` alinhado ao GHCR do release.
- Idempotência recebeu binding de ator, migration `0165`, reautorização pré-replay para famílias clínicas críticas e testes unitários; a cobertura runtime PostgreSQL/HTTP continua `NOT PROVEN`.
- Worker recebeu fair scheduling por conta e a SPA recebeu correções de contexto diagnóstico, anexos com conteúdo, tabs acessíveis, erro explícito de timeline, agenda acionável e remoção do gráfico de peso fictício.
- Criticidade, frontend e release foram revisados em fresh context. O veredito permanece `BLOCKED / NOT PROVEN`: browser/DB runtime, Helm executável, backup/restore, performance/soak, deploy/rollback, branch protection e autoridade humana não foram comprovados.

## Regra de atualização

Cada nova rodada deve registrar commit, comando ou observação, resultado, limitações e artefato. Um resultado posterior não pode ser inferido a partir desta entrada; ele deve ser append-only no ledger e refletir o candidato real.

## 2026-09-09 — Fase 1 / fechamento local do candidato

- `e793345ab71441298bdb2cb2de2755dc5921b115` consolidou o control plane de workflows clínicos, a fila SPA, o produtor de follow-up da alta, heartbeat/fencing do worker, readiness compartilhado API/worker e os controles de release.
- A auditoria adversarial em contexto fresco encontrou e fechou cinco riscos P1 de UX/API e os riscos de publicação pré-gate, envelope de attestation, heartbeat/lease e divergência de schema. O gate pré-publicação agora é bloqueante e a attestation só recebe PASS após `gh attestation verify` real.
- Validação integral: `pnpm test` PASS (68 projetos; SPA 1.867 testes; API 580), `pnpm build` PASS, `pnpm lint` PASS, `pnpm typecheck` PASS; schema clínico, migration source, RLS, OpenAPI, dependências, supply chain, documentação e complexidade PASS.
- Gate strict em `e793345a`: `BLOCKED`, score `38`, critical score `25`, `open_p0=21`, claim `NOT PROVEN`, `publication_allowed=false`. Artefato: `artifacts/release/TRIPLE_A_RELEASE_EVIDENCE.json` (gerado/ignorado).
- Limitações não inferidas como PASS: CI remoto, branch protection, PostgreSQL/RLS runtime, E2E/UAT, browser visual, performance/soak, backup/restore/RPO-RTO, deploy/rollback, attestations publicadas e autoridade humana.

## 2026-09-09 — Fase 0 / external assurance closure

- O novo prompt foi salvo byte-a-byte em `docs/triple-a/MASTER_PROMPT_EXTERNAL_CLOSURE.md`; SHA-256 `d89a249f9b0b13e0da6fb9e4ee3c0e4728c11760fd435d325d48a9b8d1b5ed59`. O prompt histórico e o quality bar congelado não foram sobrescritos.
- Baseline fresco do candidato `b5ac8bf994000994a8bbcc7208433772122fa3db`: gate strict `BLOCKED`, score `38`, critical `25`, `open_p0=21`, claim `NOT PROVEN`.
- A API pública do GitHub mostrou os runs `34363819676` (CI) e `34363823720` (usability) falhando antes de jobs/check-runs; as anotações identificaram uso inválido do contexto `runner` no nível `jobs.<job>.env`.
- Corrigidos os contextos de cache/artefatos em `.github/workflows/ci.yml` e `.github/workflows/usability-certification.yml`; commit `0e8fd5d1325c419eaffedc98cfa1952c5b2779a5` foi publicado em `main`. A execução remota desse novo SHA ainda precisa ser observada.
- Criados baseline externo e contrato de governança de branch. Probes públicos retornaram `401` para branch protection e `200` com lista de rulesets vazia; ambos permanecem `NOT PROVEN`, não PASS.

## 2026-09-09 — Fase 1 / publicação e reparo do CI SAST

- O candidato `6de50ae37318ca511f7127d006d66433479a99d6` foi commitado e publicado em `main` com migration/event-governance, testes PostgreSQL/processo, matriz de roles, protocolo UAT, críticos independentes, gate externo e contrato de workflow.
- A nova execução pública `34403741057` confirmou que o planejamento de jobs e o typecheck avançaram; `Secret Scan` e `Dependency Audit` passaram, mas `SAST (Semgrep)` falhou. A reprodução local mostrou que `p/security-extended` retornava HTTP 404/código 7 no Registry atual; também havia duas regras customizadas com `PatternParseError` e o upload SARIF não tinha a permissão explícita `security-events: write`.
- Corrigidos o ruleset para `p/security-audit`, as duas regras customizadas inválidas, a permissão mínima do job SAST e o skip seguro do upload quando o SARIF não existe. Validação local do Semgrep (configuração, regras, JSON/SARIF) e `node scripts/generate-security-evidence.mjs`: PASS.
- O reparo foi publicado em `b429e1bb410bb8d374f4b8a043308461497b7bca`. O gate strict regenerado nesse SHA é `BLOCKED`, score `43`, critical `23`, `open_p0=27`, claim `NOT PROVEN`; o esqueleto UAT está vinculado ao mesmo SHA com `NOT_PROVEN/no-go`.
- A nova execução pública `34404434195` foi disparada para `b429e1bb` e estava em andamento no momento do registro. Nenhum resultado remoto posterior foi inferido como PASS.
- Limitações mantidas: PostgreSQL/RLS/roles em runtime, processo após `SIGKILL`, E2E clínico/negativo, browser/UAT humano, backup/restore, performance/soak, deploy/rollback, attestations, branch protection autenticada e autoridade de release continuam `NOT PROVEN`.

## 2026-09-09 — Fase 1 / candidato corrente e baseline reconciliado

- O commit `dcb731a196b499db246c5c53884c40547ec9e028` foi publicado em
  `main`; `git ls-remote origin refs/heads/main` confirmou o mesmo SHA e o
  worktree permaneceu limpo.
- O fixture
  `tests/integration/setup/production-like-runtime-bootstrap.test.ts` passou a
  definir temporariamente `WORKER_ACCOUNT_IDS` no caso que verifica ausência
  do delivery schema, restaurando o ambiente no `finally`; isso remove a falha
  de configuração que impedia o teste de alcançar sua asserção.
- O baseline `docs/triple-a/14-external-evidence-baseline.md` foi atualizado
  para o SHA corrente, com CI `34418126020` / run 38 registrado como em
  execução. SAST, Secret Scan e Dependency Audit foram observados sem falha;
  Typecheck estava em execução e os demais jobs aguardavam dependências.
- `TRIPLE_A_SKIP_EXECUTION=1 pnpm release:triple-a` foi executado no candidato:
  `BLOCKED`, score `43`, critical `23`, `open_p0=27`, claim `NOT PROVEN`.
- O resultado mantém a classificação fail-closed: execução PostgreSQL/RLS,
  crash recovery, E2E/UAT, DR, performance/soak, deploy/rollback, attestations,
  branch protection autenticada e autoridade de release não foram inferidos
  como PASS.

## 2026-09-10 — Fase 1 / contenção de runtime e validação de performance

- `0559f498` isolou a persistência de auditoria por escopo transacional e em
  oito lanes fora de transação, além de manter o OpenAPI YAML/spec em cache
  para remover parsing síncrono por requisição. O perfil curto local (20 VUs,
  20 s) passou 9/9 SLOs: API p95 `41,51 ms`, p99 `73,24 ms`, disponibilidade
  `100%`, erros `0%`.
- `15624c6f` adicionou locks de autorização compartilhado/exclusivo para
  leitura comum versus mutações de access-control e fez o cliente de banco
  respeitar `POSTGRES_MAX_CONNECTIONS`, `POSTGRES_POOL_MIN` e timeouts.
- Validação local: API `581/581`, worker `64/64`, auditoria `30/30`, locks/
  cliente de banco `37/37`, OpenAPI/locks Node `8/8`, lint, typecheck e builds
  direcionados: PASS. O perfil operacional escalonado até 60 VUs completou
  sem deadlock, erros ou indisponibilidade; API p95 `133,20 ms` e p99
  `229,79 ms` passaram, enquanto `query_latency_ms` (`166 ms`) e
  `billing_latency_ms` (`289 ms`) ficaram acima dos alvos locais de `150` e
  `250 ms`, respectivamente. O resultado local não substitui o CI pinned.
- O run remoto `34435619252` do SHA anterior permaneceu aberto apenas pelo
  job `E2E Tests (SPA)`; jobs concluídos registraram falha em Visual, Unit,
  Performance e Windows. Nenhum resultado desse run foi inferido como PASS;
  push posterior deve aguardar o estado terminal por causa do cancelamento de
  concorrência do workflow.
- Limitações mantidas: PostgreSQL/RLS/roles em runtime de release, E2E/UAT,
  browser visual, performance pinned em CI, backup/restore, deploy/rollback,
  attestations, branch protection autenticada e autoridade humana continuam
  `BLOCKED / NOT PROVEN`.
- `TRIPLE_A_SKIP_EXECUTION=1 pnpm release:triple-a` no candidato corrente
  permaneceu `BLOCKED`, score `43`, critical `23`, `open_p0=27`; a execução
  externa foi explicitamente pulada e nenhum P0 foi convertido em PASS.

## 2026-09-10 — Candidato `a4a5658a`

- Corrigida a invocação Windows do `pnpm.cmd` em `infra/scripts/run-critical-process-suite.mjs`, usando `cmd /d /c call` e argumentos separados. O contrato crítico Linux passou `24/24`; `pnpm lint` também passou.
- `pnpm test` com PostgreSQL descartável não foi promovido a PASS: a preparação local falhou com `permission denied for table tenants/accounts`. A limitação foi registrada sem mascarar a falha como evidência de integração.
- O CI #58 ([run 34454422885](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34454422885)) foi disparado para este SHA e estava em execução no momento do registro. O run #57 foi cancelado quando o candidato novo entrou na fila; seus failures parciais não foram atribuídos ao SHA atual.
- O gate estrito com execução externa pulada retornou `BLOCKED`, `score=43`, `critical_score=23`, `open_p0=27`, `claim=NOT PROVEN` e `publication_allowed=false`.

## 2026-09-10 — Fechamento terminal do CI #58 e correções do candidato `0dc4809b`

- O CI #58 ([run 34454422885](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34454422885)) terminou não verde no SHA `a4a5658aa66200a70be709e986152fe61ffc0fe5`: dez jobs passaram; Unit, E2E, Visual, Integration, Windows Critical Process Runner e Performance falharam.
- O E2E executou 422 testes, com `387 passed` e `35 failed`. As falhas funcionais exatas foram: recepcionista aguardando mutação em `hospital-personas-routines.spec.ts:235`; patologista sem o campo `Descrição` em `:513`; ultrassonografista com label `Arquivo` ambígua em `:644`; administrador com `diagnosticsRead.effective=false` em `:782`; auditoria master com HTTP 401 em `/api-keys` e `/api-client`; e walkthrough sem botão `Fechamento` em `operational-walkthrough.spec.ts:120`. As 29 restantes foram snapshots visuais.
- Os quatro testes do supervisor Windows falharam por colapso de `-e` + script em um argumento; o package-manager contract passou. A correção local preserva os limites no PowerShell.
- A falha de integração foi a divergência de `updatedAt` entre duas respostas concorrentes equivalentes. A rota agora relê a linha autoritativa e a persistência só atualiza uma cobrança ainda `pending`.
- Unit revelou duas datas de loyalty deslocadas por UTC; a renderização local agora usa `America/Sao_Paulo`. A capacidade do benchmark CI também foi explicitada como pool 60/min 8 para o perfil de 60 VUs.
- O gate local após as correções, no SHA `0dc4809b3e06c8334667f39bf51c33e33c3c0f9`, terminou `BLOCKED`, score `68`, crítico `54`, `open_p0=16`, `claim=NOT PROVEN`; Docker local permaneceu bloqueado por permissão no socket.
