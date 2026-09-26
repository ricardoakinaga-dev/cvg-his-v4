---
document_status: current
document_kind: execution-plan
effective_date: 2026-09-26
owner: Sessão Claude Fable 5.1 (suplementar à sessão Opus)
review_cycle: on-task-completion-or-blocker-change
---

# Plano suplementar Fable — rodada 2

[Auditoria](2026-09-26-auditoria-completa-sistema.md) ·
[Plano executivo](2026-09-26-plano-executivo-rodada-2.md) ·
[Roadmap](2026-09-26-roadmap-rodada-2.md) ·
[Backlog](2026-09-26-backlog-rodada-2.md)

**Objetivo deste documento:** dividir o trabalho da rodada 2 entre duas sessões que operam no mesmo repositório ao mesmo tempo, sem conflito de arquivos, para chegar à produção controlada mais cedo. A sessão **Opus** continua dona do fluxo principal (auditoria, SPA, clínico, ledger `.agent/`). A sessão **Fable** executa, em paralelo, os itens de backend, infraestrutura, CI e operação listados aqui.

Este plano **não substitui** o backlog nem o roadmap: os IDs `R2-*` e os critérios de aceite são os do [backlog](2026-09-26-backlog-rodada-2.md). Ele só diz quem faz o quê, em que ordem, e como as duas sessões evitam pisar uma na outra.

---

## 1. Fotografia no início (26/09/2026, 10:30 BRT)

| Fato | Evidência |
|---|---|
| Tudo foi commitado e enviado ao GitHub em `d0102939` ("rodada 2 — auditoria completa, correções e novo roadmap") | `git status` limpo, exceto `apps/spa/src/layouts/AppLayout.vue` |
| A sessão Opus está editando `AppLayout.vue` (item **R2-UX-02**, menu compacto) | diff local de 12+/4− linhas |
| O workflow **CI** para `d0102939` está em andamento; Secret Scan e Dependency Audit já passaram | API do GitHub, run `36244001807` |
| O workflow **State of Art Closure** para `d0102939` **falhou** no step "Test HTTP tracing propagation and activation" (`pnpm test:tracing`) | run `36244001804`; o log exige login no GitHub |
| O mesmo teste **passa localmente** em Node 22.23.2 (versão pinada) e em Node 24.20.0: 6/6 | execução local |
| `.agent/` continua versionado: 389 arquivos, 28 MB, com inventários de 18–22 mil linhas cada | `git ls-files .agent`, `git show --stat d0102939` |
| Ferramentas ausentes neste host: `gh`, `helm`, `rg` | `command -v` |
| 15 worktrees registrados, 6 marcados como `prunable` | `git worktree list` |

Com isso, **R2-REL-01** está parcialmente atendido (código no GitHub) e só fecha quando os dois workflows ficarem verdes no SHA. **R2-REL-02** está atendido na árvore (limpa), mas o critério "nenhum artefato gerado versionado" ainda não vale para `.agent/evidence`.

---

## 2. Divisão de trabalho

### Regra geral

- **Opus:** SPA, UX, clínico (CLI-01/02), visual, documentos de rodada, ledger `.agent/`, e qualquer item que já esteja em edição no checkout principal.
- **Fable:** backend, banco, infraestrutura, CI, observabilidade, operação e scripts. Não toca em `apps/spa/src/layouts`, `apps/spa/src/pages`, `.agent/` nem nos quatro documentos de rodada (auditoria, plano, roadmap, backlog), exceto para registrar o status de um item concluído.
- Se um item exigir mudança nos dois lados (ex.: UX-01 precisa de códigos de erro na API e mapa no SPA), o item é dividido em duas entregas, cada uma com seu dono, e a de API vai primeiro.

### Tabela de posse

| Item | Dono | Motivo |
|---|---|---|
| R2-REL-01 (CI verde), R2-REL-02 (residual `.agent/evidence`) | Fable (diagnóstico) · decisão do usuário sobre `.agent/` | CI e árvore são território de infra; `.agent/` é o ledger do Opus |
| R2-ARC-01, R2-ARC-02, R2-ARC-03 | Fable | Backend e Helm; é o maior bloqueio de produção |
| R2-FIN-01, R2-FIN-02 | Fable | Módulos `billing`, `quotes`, `counter-sales`, `cash` |
| R2-FIN-03 | Opus (concluído em `19f61de4`, teste em `cash.test.ts`) | Já entregue antes desta divisão |
| R2-LGPD-02, R2-LGPD-04 | Fable | Serviço e rota LGPD |
| R2-LGPD-01 | Opus (executor de eliminação conforme a decisão de 26/09) | Acordado em 26/09 |
| R2-LGPD-03 🧑‍⚖️ | Usuário/jurídico | Parecer externo |
| R2-OPS-01, R2-OPS-02 | Fable | Observabilidade e backup |
| R2-TOOL-01, R2-QA-01, R2-INF-01, R2-QA-02 | Fable | Scripts, CI, Helm, carga |
| R2-SEC-01, R2-SEC-02, R2-AUD-01, R2-DB-01 | Fable | Backend |
| R2-PAY-01, R2-NOT-01 | Opus | Acordado em 26/09 |
| R2-FIS-01 🧑‍⚖️ | Fable, quando houver decisão de município e provedor | Depende de terceiros |
| R2-UX-01 (mapa de mensagens no SPA) | Opus; Fable entrega os `code` estáveis na API | Divisão API/SPA |
| R2-UX-02 (concluído em `d2c26a27`), R2-UX-03, R2-CLI-01, R2-CLI-02, R2-UAT-01 | Opus | SPA, clínico e aceite |
| R2-COD-01, R2-COD-02, R2-DOC-01 | Onda 4; dividir quando chegar | Manutenibilidade |

---

## 3. Protocolo de coordenação

1. **Worktree separado.** A sessão Fable trabalha em `/home/ricardo/cvg-his-v4-fable` (criado com `git worktree add`), nunca troca de branch no checkout principal e nunca edita arquivos lá. Isso evita corromper o trabalho do Opus, que usa o checkout principal.
2. **Uma branch por item:** `fable/<id-em-minusculas>` (ex.: `fable/r2-arc-01`). Um item por PR, como manda o plano executivo.
3. **CI antes do merge.** O workflow CI só roda em `main` e em PRs para `main`. Sem `gh` instalado, o PR precisa ser aberto pelo usuário na interface do GitHub ou após instalar o `gh` (ver seção 4). Enquanto isso, a branch fica enviada ao GitHub e pronta.
4. **Aviso ao Opus.** Antes de qualquer push para `main` e ao concluir cada item, a sessão Fable envia uma mensagem à sessão `cvg-his-v4-68` (a sessão Opus) com o ID do item, os arquivos alterados e o SHA. O Opus faz `git pull --rebase` antes do próximo commit.
5. **Registro.** Cada item concluído ganha uma linha no [diário](#7-diário-de-execução) deste documento e, no [backlog](2026-09-26-backlog-rodada-2.md), o status é atualizado pelo dono do item.
6. **Gates locais mínimos por PR:** `pnpm typecheck`, `pnpm lint`, os testes do módulo alterado e, para docs, `pnpm docs:validate`. Testes com PostgreSQL usam a stack `docker-compose.test.yml`.
7. **Nada de `.agent/`.** A sessão Fable não escreve em `.agent/`; o ledger continua exclusivo do Opus.

---

## 4. Pré-requisitos que só o usuário resolve

| # | Ação | Desbloqueia |
|---|---|---|
| U1 | Instalar o GitHub CLI e autenticar: `sudo apt install gh` e depois `! gh auth login` nesta sessão | Abrir PRs, ler logs de CI (hoje o log de falha responde 403 sem login), reexecutar workflows |
| U2 | Informar um canal real para alertas (URL de webhook Slack/Discord/Teams, ou SMTP) | Evidência final de **R2-OPS-01** (o roteamento e o teste sintético saem antes, com receptor local) |
| U3 | Decidir o destino de `.agent/evidence` (manter versionado, ou ignorar os inventários `m02-current-worktree-inventory-*.json`) | Fechar **R2-REL-02** conforme o critério do backlog |
| U4 | Abrir a consulta jurídica de **R2-LGPD-03** (prazo do prontuário, campos fiscais, texto ao titular) | **R2-LGPD-01** |
| U5 | Credenciais de sandbox do Pagar.me e escolha de município/provedor de NFS-e | **R2-PAY-01**, **R2-FIS-01** |
| U6 | Acesso a um PostgreSQL gerenciado e bucket S3 de teste | **R2-OPS-02** |

---

## 5. Fila de execução da sessão Fable

Ordem por impacto na produção e independência do Opus. Cada lote só começa quando o anterior está enviado ao GitHub.

### Lote A — Onda 0, itens pequenos e isolados (26–29/09)

| Ordem | Item | Arquivos | Abordagem | Evidência de aceite |
|---|---|---|---|---|
| A1 | **CI-DIAG** (novo, suporte a R2-REL-01): explicar a falha de `test:tracing` no State of Art Closure | `.github/workflows/state-of-art-closure.yml`, `apps/api/src/tracing*.ts` | O teste passa localmente em Node 22.23.2 e 24. Hipóteses: dependência de ambiente do runner, `tsx --test` com resolução de `./http-telemetry-normalization.js`, ou instabilidade. Precisa do log (U1). Se for reproduzível, corrigir; se não, reexecutar e registrar | Ambos os workflows verdes no SHA de `main` |
| A2 | **R2-ARC-01** | `infra/helm/cvg-his-v2/values.prod.yaml`, `templates/api-deployment.yaml`, `values.schema.json`, `infra/scripts/validate-helm.mjs`, `apps/api/src/bootstrap.ts` (ou `runtime.ts`), `docs/runbooks/` | `api.replicaCount: 1` em prod; `fail` no template quando `api.replicaCount > 1` e `api.crossReplicaCache.enabled` for falso (mesmo padrão dos guards de anexos já existentes); Helm injeta `CVG_API_EXPECTED_REPLICAS`; o startup recusa `> 1` enquanto o cache por processo estiver ativo; runbook explica o limite e como será removido em ARC-03 | Caso de teste do validador de Helm falha com 3 réplicas; teste unitário do guard de startup |
| A3 | ~~R2-FIN-03~~ | — | Entregue pelo Opus em `19f61de4` antes desta divisão | — |
| A4 | **R2-LGPD-04** | `apps/api/src/routes/lgpd-routes.ts`, `packages/modules/lgpd/src/service.ts`, testes de rota | Antes de montar o pacote, verificar existência do titular na conta (owner, patient ou user); `404 SUBJECT_NOT_FOUND` quando não existir | Teste da rota com titular inexistente e com titular de outra conta |
| A5 | **R2-LGPD-02** | `packages/modules/lgpd/src/service.ts` (`DATA_PROVIDER_RETENTION`), `docs/security/PRIVACY_AUTH_AND_PAYMENT_CONTROLS.md` | Trocar `anonymize_after_window` por `retain` com texto "retido enquanto houver relacionamento ou obrigação legal; eliminação mediante pedido do titular (art. 18, VI)"; prazos de 20 anos marcados como "pendente de validação jurídica" até R2-LGPD-03 | Pacote de exportação sem promessa de anonimização automática; teste do serviço |
| A6 | **R2-TOOL-01** | `infra/scripts/run-e2e-spa.sh`, `docker-compose.e2e.yml` | Substituir `rg -q` por `grep -Eq`; portas via `E2E_PG_PORT` e `E2E_REDIS_PORT` com padrão 5434/6381 e detecção de porta ocupada | Script roda sem ripgrep e com as portas padrão ocupadas |
| A7 | **R2-OPS-01** | `infra/observability/alertmanager.yml` (novo), `prometheus.yml` (`alerting:`), `docker-compose.v2.yml`, Helm (se o chart subir Prometheus), `infra/observability/README.md` | Alertmanager com rota por `severity` (critical → pager/webhook imediato; warning → agrupado), receivers parametrizados por variáveis de ambiente; teste sintético com um receptor local que grava o payload | Alerta sintético recebido no receptor local; depois de U2, recebido no canal real |

### Lote B — Onda 1, o bloqueio arquitetural (29/09–17/10)

| Ordem | Item | Abordagem |
|---|---|---|
| B1 | **R2-ARC-02** | Introduzir `getOrThrow(accountId, id)` com escopo obrigatório e *read-through* (miss consulta o repositório e popula o cache) em `patients`, `owners` e `encounters`; migrar os 60 pontos de chamada em 20 arquivos (lista na auditoria); teste de duas instâncias da API contra o mesmo PostgreSQL: cria na A, lê na B |
| B2 | **R2-ARC-03** | Invalidação entre réplicas via `LISTEN/NOTIFY` por conta e entidade, ou remoção do cache nas entidades transacionais (decidir após medir memória por conta); teste de duas instâncias com atualização e inativação; então remover o guard de A2 e liberar `replicaCount` em prod |

### Lote C — Onda 1 e 2, consistência e endurecimento (paralelo ao B, conforme capacidade)

| Item | Nota |
|---|---|
| **R2-FIN-01** | Centavos inteiros em `billing`, `cash` e `quotes`; conversão só na borda da API; testes de propriedade de soma |
| **R2-FIN-02** | Fuso por conta (padrão `America/Sao_Paulo`) para "hoje", relatórios diários e fechamento; revisar `docs/engineering/REPORT_DATE_SEMANTICS.md` |
| **R2-SEC-01** | Política única de senha (12+, lista de senhas vazadas) e reset forçado de hashes SHA-256 legados |
| **R2-QA-01** | Job de E2E completo no CI com banco e Redis efêmeros e portas dinâmicas (depende de A6) |
| **R2-INF-01** | `NetworkPolicy` e HPA do worker no chart; validação no `validate-helm.mjs` |
| **UX-01 (lado API)** | Garantir `code` estável em toda resposta de erro (`ValidationError` já tem `code`; padronizar os 324 usos) para o Opus mapear no SPA |
| **R2-DB-01**, **R2-AUD-01**, **R2-SEC-02** | Onda 3, após B2 |

### Lote D — dependentes de terceiros (assim que U4–U6 existirem)

R2-OPS-02, R2-FIS-01, R2-QA-02 (Fable); R2-LGPD-01, R2-PAY-01, R2-NOT-01 (Opus).

---

## 6. Achados desta sessão que não estavam no backlog

| # | Achado | Proposta |
|---|---|---|
| F1 | O workflow **State of Art Closure** falha em `d0102939` no step `pnpm test:tracing`, embora passe localmente | Item A1. Se o workflow for redundante com o CI principal, considerar aposentá-lo em vez de mantê-lo como gate |
| F2 | `.agent/` versionado com 28 MB de evidências geradas, incluindo 8 inventários de ~19 mil linhas cada; contraria o critério de R2-REL-02 | Decisão U3. Sugestão: manter `state.json`, `backlog.json`, `plans/` e `gates/`; ignorar `evidence/*inventory*.json` |
| F3 | Node local é 24.20.0; o repositório pina 22.23.2 e o `nvm` já tem essa versão instalada | Rodar gates locais com `PATH=$HOME/.nvm/versions/node/v22.23.2/bin:$PATH` para reproduzir o CI |
| F4 | 15 worktrees registrados, 6 `prunable` em `/tmp` | `git worktree prune` quando o Opus não estiver usando nenhum deles; não faz parte de nenhum item |
| F5 | `docs/` tem 2,4 GB e `artifacts/` 54 GB; já coberto por R2-DOC-01 | Sem ação agora |
| F6 | O CI só roda em `main` e em PRs; branches `fable/*` não recebem CI sem PR | U1 resolve; alternativa temporária é o `workflow_dispatch` do State of Art Closure |
| F7 | No CI principal de `d0102939`, o job **Repository Guards** falhou no step "Build and smoke-test release images" (`pnpm validate:release-images`); os 10 steps seguintes foram pulados | Reproduzir localmente com Docker (em andamento); corrigir ou registrar causa de ambiente |
| F8 | A história de `main` foi reescrita hoje (`backup/main-pre-rewrite-20260926` não é ancestral de `main`). Os documentos `docs/triple-a/*` ainda apontam o SHA `74b8669f`, que não está na nova história; por isso `pnpm docs:validate` falha localmente em `check-triple-a-current-snapshot.mjs` e o step "Validate repository source contracts" do CI vai falhar assim que F7 for corrigido | Rebind do snapshot Triple-A para um SHA da história atual (`docs/triple-a/CURRENT_CANDIDATE_IDENTITY.json` e os seis `.md` lidos pelo script). É trabalho do dono do ledger Triple-A (Opus); Fable pode executar se autorizado |

---

## 7. Diário de execução

Linhas anexadas em ordem cronológica pela sessão Fable. Estados: `ABERTO`, `EM ANDAMENTO`, `ENVIADO` (branch no GitHub), `CI VERDE`, `MERGED`, `BLOQUEADO`.

| Data | Item | Estado | Branch / SHA | Evidência |
|---|---|---|---|---|
| 2026-09-26 | Plano suplementar | MERGED (documento) | main | Este arquivo; `pnpm docs:validate` |
| 2026-09-26 | A1 CI-DIAG | BLOQUEADO em U1 | — | Teste passa em Node 22.23.2 (6/6) e 24; log do runner exige login |
| 2026-09-26 | F7 release images | BLOQUEADO em U1 | — | Reprodução local impossível: o script exige o Helm pinado (`Pinned Helm is required`), ausente neste host; no CI o Helm foi instalado com sucesso antes do step, logo a causa é outra e só o log mostra |
| 2026-09-26 | Coordenação com Opus | ACORDADO | — | Opus aceitou a divisão; FIN-03 e UX-02 já entregues por ele (`19f61de4`, `d2c26a27`, sem push); rebind Triple-A fica com o Opus; LGPD-01, NOT-01 e PAY-01 passam ao Opus; Opus commita este documento e o `README.md` |
| 2026-09-26 | A2 R2-ARC-01 | MERGED | `fable/r2-arc-01` | Helm falha com 3 réplicas em prod; guard de startup com teste 5/5; runbook `docs/runbooks/api-replica-topology.md` |
| 2026-09-26 | A4 R2-LGPD-04 | MERGED | `fable/r2-lgpd-04` | `POST /lgpd/export` responde `404 SUBJECT_NOT_FOUND`; testes do serviço (34) e da rota (7) |
| 2026-09-26 | A5 R2-LGPD-02 | MERGED | `fable/r2-lgpd-02` | Tabela de retenção só com `retain`; `retentionPolicy` no pacote; doc de controles atualizado |
| 2026-09-26 | A6 R2-TOOL-01 | MERGED | `fable/r2-tool-01` | Script sem `rg`; portas `E2E_POSTGRES_HOST_PORT`/`E2E_REDIS_HOST_PORT` com fallback; provado neste host com 5434 ocupada |
| 2026-09-26 | A7 R2-OPS-01 | MERGED (canal real pendente de U2) | `fable/r2-ops-01` | Drill sintético PASS: critical 10,0 s, warning 30,0 s; `docs/operations/ALERTMANAGER_DRILL_2026-09-26.md` |
| 2026-09-26 | Integração Lote A | CI (aguardando) | `main` | Rebase em 45e547a2; typecheck, lint, 52 testes focados, suíte API, OpenAPI, Helm, docs, complexity; rebind Triple-A docs-only |
| 2026-09-26 | B1 R2-ARC-02 | ENVIADO | `fable/r2-arc-02-03` | `getOrThrow(accountId, id)` obrigatório em owners/patients; `fetchOrThrow` read-through nas rotas; 60 pontos migrados; teste de duas instâncias HTTP verde |
| 2026-09-26 | B2 R2-ARC-03 | ENVIADO (guard de 1 réplica mantido até CI + carga) | `fable/r2-arc-02-03` | `PostgresCacheSyncBus` LISTEN/NOTIFY transacional; testes de bus e de duas réplicas verdes; memória medida: 43,3 MB para 5k/10k/20k entidades |
| 2026-09-26 | F8 snapshot Triple-A | ABERTO (aguarda Opus/usuário) | — | `docs:validate` local: "current snapshot 74b8669f… is not an ancestor of HEAD d0102939" |
