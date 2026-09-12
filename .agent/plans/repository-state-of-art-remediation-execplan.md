# Remediação do repositório para ERP State of Art — ExecPlan

<!-- engineering-framework: active_action_id=TRIPLE-A-RELEASE-CONTROL:INTEGRATE-REMEDIATION-20260912 -->

## Purpose / Big Picture

Corrigir os GAPs da auditoria de 12/09/2026 em ordem de risco, produzir evidência atual nas fronteiras reais e manter o release bloqueado até que a régua Triple-A 97/95/zero-P0 e as autoridades externas sejam satisfeitas. O resultado observável imediato é um programa rastreável com correções locais P0 integradas e testadas; o resultado terminal exige target, UAT e decisão externa.

## Progress

- [x] (2026-09-12T00:00:00-03:00) Auditoria do HEAD `31fde3c4dc8daa658e46c2fd4fe415cfaeae2e44` concluída com 69/100 e FAIL.
- [x] (2026-09-12T00:00:00-03:00) Relatório, roadmap e backlog de remediação publicados em `docs/`.
- [x] (2026-09-12T14:43:35-03:00) Integrados e aprovados por críticos frescos os slices de OpenAPI/auth, supply chain/release, pacote visual e higiene do typecheck; regressão ampla passou após eliminar uma corrida temporal do outbox.
- [ ] Executar os marcos M2–M6 do roadmap; manter bloqueios externos explícitos.

## Surprises & Discoveries

- Observation: o estado `.agent` ainda identifica `e8d7eaec`, enquanto o repositório está em `31fde3c4`.
  Evidence: `.agent/state.json`; `git rev-parse HEAD`.
  Impact: a evidência anterior permanece histórica e o ponteiro precisa de reconciliação.
- Observation: o run `.gauntlet` `frontend-premium-20260907` é ativo, mas seu estado contém campos e fase rejeitados pelo helper atual.
  Evidence: `gauntlet_state.py validate --repo .`.
  Impact: preservar os arquivos, não sobrescrever o run e tratar a recuperação do controller como GAP-GOV-01.
- Observation: a régua visual exige browser, screenshots e crítico fresco; leitura de fonte não pode aprovar UX.
  Evidence: `design-director/references/visual-qa.md`.
  Impact: o lane visual atual é diagnóstico; aprovação continua bloqueada até render atual.

## Decision Log

- Decision: usar o modo multi-workstream com dois implementadores de arquivos disjuntos e um scout visual read-only.
  Context: OpenAPI, workflow de release e diagnóstico visual não compartilham arquivos nem contratos mutáveis.
  Alternatives: execução totalmente sequencial.
  Reason: reduz tempo do caminho crítico sem permitir escritores concorrentes nos controles compartilhados.
  Consequences: o lead inspeciona diffs, executa regressão integrada e críticos frescos não aprovam o próprio trabalho.
  Date/Author: 2026-09-12 / lead.
- Decision: não alterar SLO, RPO/RTO, exposição operacional ou comportamento de produto sem owner/autoridade.
  Context: esses valores mudam risco e operação do sistema.
  Alternatives: inferir metas técnicas locais.
  Reason: a auditoria identificou ausência de aprovação e evidência target.
  Consequences: correções locais avançam; gates externos continuam `BLOCKED / NOT PROVEN`.
  Date/Author: 2026-09-12 / lead.

## Outcomes & Retrospective

A primeira onda local foi integrada sem baixar a régua: API-01 e CICD-01 receberam `APPROVE` independente, o pacote visual recebeu `APPROVE` como infraestrutura de evidência (não como aprovação da UI), typecheck/lint e a regressão ampla passaram. Uma falha intermitente do outbox revelou duas leituras de relógio no mesmo evento; a captura única de `createdAt` estabilizou 3/3 repetições e a suíte completa subsequente. O programa permanece bloqueado por evidência exata do candidato, PostgreSQL/browser, k6, recuperação, target, UAT e autoridades externas.

## Context and Orientation

O repositório é um monorepo pnpm com API em `apps/api`, SPA em `apps/spa`, worker em `apps/worker`, módulos em `packages`, CI em `.github/workflows` e controles T4 em `.agent`. A auditoria corrente é `docs/2026-09-12-auditoria-repositorio-cvg-his-v4.md`; o roadmap e o backlog documental adjacentes definem marcos e cobertura de GAPs. `.agent/backlog.json` é a fonte operacional de status.

## Scope and Constraints

- In scope: documentação, contratos, testes, código/configuração local, integração e verificações seguras de todos os GAPs listados.
- Out of scope sem nova autoridade: deploy de produção, mutação de branch rules, credenciais/providers reais, PHI, drills destrutivos em infraestrutura compartilhada e certificação final.
- Applicable instructions: skills `gauntlet-loop`, `orchestrate`, `engineering-framework` e `design-director`, mais documentos de governança citados em `.agent/state.json`.
- Requirements/decisions: auditoria, roadmap, backlog, `docs/triple-a/MASTER_PROMPT_STATE_OF_ART.md` e Quality Bar existente.
- Tier/risk/blast radius: `T4_CRITICAL`, `CRITICAL`, `CROSS_SYSTEM` por dados clínicos/financeiros, segurança e release.
- Authorization constraints: somente mudanças locais e verificações reversíveis; decisões humanas/externas permanecem bloqueantes.

## Architecture and Interfaces

Preservar o monólito modular API/SPA/worker, isolamento tenant/RLS, transações, idempotência, autenticação, contratos HTTP e publicação por digest. Os primeiros slices atacam duas fronteiras estáveis: `auth runtime ↔ OpenAPI` e `gate/scan ↔ push de imagem`. Mudanças de hotspots serão incrementais, por domínio, depois de contratos e cobertura crítica estabilizados.

## Milestones

### Milestone 1 — Baseline e controles reconciliados

- Outcome: documentos e ponteiros descrevem o candidato atual sem apagar histórico.
- Scope/dependencies: docs, `.agent`, controller Gauntlet legado.
- Demonstration: validação estrutural dos documentos agora; `pnpm docs:validate`, checker do engineering-framework e validação Gauntlet após congelar um commit candidato.
- Acceptance/evidence: REM-001/002; snapshot stale e controller histórico inválido permanecem bloqueios explícitos até existir candidato commitado e recuperação real.

### Milestone 2 — Contratos e release fail-closed

- Outcome: auth crítica está no OpenAPI; scan precede a publicação de quarentena e nenhum tag/manifesto/pacote de release é consumível antes do gate final.
- Scope/dependencies: REM-003/004; arquivos disjuntos.
- Demonstration: validators e testes known-bad focados.
- Acceptance/evidence: nenhum endpoint crítico omitido; somente quarentena pode ser publicada antes do gate e nenhum artefato de release consumível existe antes do PASS.

### Milestone 3 — Dados, produto e operação comprovados

- Outcome: REM-005–011 e REM-013–029 produzem evidência de runtime/target nas fronteiras aplicáveis.
- Scope/dependencies: sequência M2–M5 do roadmap.
- Demonstration: PostgreSQL, browser, k6, recovery, provider sandbox, Helm/container e observabilidade.
- Acceptance/evidence: zero skip crítico, zero Critical/High e evidência no mesmo SHA/digest.

### Milestone 4 — Recertificação e decisão

- Outcome: o candidato é aprovado ou honestamente bloqueado por condições externas restantes.
- Scope/dependencies: todos os marcos anteriores.
- Demonstration: gate Triple-A completo e críticas independentes frescas.
- Acceptance/evidence: >=97, críticas >=95, P0=0 e autoridade formal.

## Plan of Work

Primeiro integrar os slices OpenAPI e supply chain, corrigir achados de críticos e restaurar validação documental. Depois fechar coverage e PostgreSQL crítico antes de paridade, UX e performance, pois esses dependem de dados e contratos confiáveis. Em seguida homologar providers e operação no target. Por último congelar o SHA, recertificar e solicitar os aceites humanos. Cada slice segue `BUILD → focused test → critic → fix → regression → integrate`.

## Concrete Steps

From `/home/ricardo/cvg-his-v4`:

1. [TRIPLE-A-RELEASE-CONTROL:INTEGRATE-REMEDIATION-20260912] Inspecionar e integrar os diffs dos lanes OpenAPI e supply chain; executar validators, testes known-bad, `docs:validate` e regressão proporcional; registrar qualquer falha sem baixar a Quality Bar.
2. Submeter os artefatos integrados a críticos frescos read-only e corrigir o maior GAP material.
3. Avançar para coverage/PostgreSQL crítico conforme REM-006/007, sem executar target ou efeito externo sem autoridade.

## Validation and Acceptance

| Criterion | Required | Procedure/environment | Expected observation | Evidence destination |
| --- | --- | --- | --- | --- |
| QB-AAA-01 | Yes | gate estrito no SHA candidato | global>=97, critical>=95, P0=0 | artefato Triple-A corrente |
| QB-DOCS-01 | Yes | estrutura documental no worktree; `pnpm docs:validate` após commit candidato | estrutura PASS agora; snapshot stale bloqueia até poder ser vinculado ao SHA candidato | `.agent/verification.jsonl` |
| QB-API-01 | Yes | OpenAPI validator + known-bad + runtime contract | equivalência auth crítica | `.agent/verification.jsonl` |
| QB-CICD-01 | Yes | supply-chain validator + workflow tests | scan antes da quarentena; manifesto/pacote somente após o gate | `.agent/verification.jsonl` |
| QB-UX-01 | Yes | Playwright/render/inspection/critic | matriz atual sem Critical/High | pacote visual SHA-bound |
| QB-OPS-01 | Yes | k6/restore/game day/soak no target | metas aprovadas observadas | pacote operacional target |

## Risks and Human Decisions

| Risk/decision | Evidence/confidence | Controls | Residual/authority | Trigger |
| --- | --- | --- | --- | --- |
| Publicação ou deploy indevido | workflow audit, alta | local-only, fail-closed, sem push | autoridade de release | antes de registry/deploy |
| Alterar SLO/RPO/RTO sem negócio | auditoria, alta | thresholds congelados | OPS/Produto | antes de benchmark/drill final |
| Evidência de outro SHA | histórico `.agent`, alta | hash/digest e freshness | lead/QA | qualquer mudança material |
| UI aprovada por fonte | visual QA contract, alta | screenshots + crítico fresco | UX/Produto/UAT | após render atual |

## Idempotence and Recovery

Antes de retomar, ler `.agent/state.json`, este plano, `.agent/backlog.json`, tails dos ledgers e `git status`. Não repetir push, deploy, migration ou provider call por ausência de log. Os validators locais e testes são reexecutáveis; recursos de banco/browser devem usar identidade descartável e cleanup verificado. Em falha parcial, preservar diff/log, diagnosticar e avançar somente o próximo passo singular.

## Artifacts and Evidence

- `docs/2026-09-12-auditoria-repositorio-cvg-his-v4.md`: baseline 69/100 e GAPs; não é aprovação.
- `docs/2026-09-12-roadmap-erp-state-of-art-triplo-aaa.md`: marcos/dependências.
- `docs/2026-09-12-backlog-correcao-gaps-triplo-aaa.md`: contrato executivo REM-001–030.
- `.agent/verification.jsonl`: resultados atuais; evidência anterior ao diff não prova o candidato final.

Plan revision note, 2026-09-12: plano criado após auditoria independente do repositório e recuperação do controle persistente; substitui o ponteiro operacional antigo sem apagar o plano histórico.
