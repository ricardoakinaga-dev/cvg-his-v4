# ExecPlan — CVG HIS Triple-A

<!-- engineering-framework: active_action_id=TRIPLE-A-RELEASE-CONTROL:OBSERVE-CI-1434514C -->

## Purpose / Big Picture

Elevar o ERP CVG HIS existente a um padrão operacional, clínico, de segurança, UX e entrega compatível com o quality bar Triple-A definido pelo prompt do usuário, preservando o monólito modular, a topologia atual de `apps/api`, `apps/spa`, `apps/worker` e os trilhos canônicos de deploy. Cada afirmação de qualidade deverá estar ligada a código, teste, execução ou artefato atual; documentação legada não é evidência por si só.

## Progress

- [x] (2026-09-09T23:38:05-03:00) Reconciliar o plano com o candidato `main@9d7c43cec4e5d4068c1f92f2a0ed6ceda3d092a6`, preservar `BLOCKED / NOT PROVEN` e aguardar o CI #47.
- [x] (2026-09-09T23:56:00-03:00) Reconciliar o baseline e o controle de release com o candidato `main@88857282027370aae003c62426c8b5a2aa9df8c5`; o CI #48 permanece não terminal e o estado segue `BLOCKED / NOT PROVEN`.
- [x] (2026-09-10T00:35:15-03:00) Reconciliar o baseline com `main@cd7399f91bf3c3eda53e4598443acdbc9ff6d3b1`; o CI #49 terminou com failures em Unit, Performance, Visual, E2E SPA e Windows contract; o gate permanece `BLOCKED / NOT PROVEN`.
- [x] (2026-09-10T11:47:12-03:00) Publicar os commits `c375b72b` e `1434514c`; o teste SPA focado passou `5/5`, os 20 testes do gate/manifest/evidência passaram, os validadores estáticos passaram e a suíte workspace concluiu sem falha observada. O CI #70 está em execução no SHA `1434514c`; o gate estrito continua bloqueado.

- 2026-09-09: prompt recebido e salvo integralmente em `docs/triple-a/MASTER_PROMPT.md`; hash SHA-256 conferido contra o anexo.
- 2026-09-09: repositório inspecionado em `main@696d7dd5`; nenhum arquivo rastreado modificado antes desta execução, mas há artefatos frontend não rastreados e histórico `.gauntlet` antigo.
- 2026-09-09: instruções de engineering-framework, gauntlet-loop, orchestrate e design-director lidas; execução classificada como brownfield T4 crítico/cross-system.
- 2026-09-09: validações estáticas, typecheck, lint e build executados; o limite de complexidade falhou em `AppointmentsListPage.vue`; Helm só pôde ser validado estaticamente porque o binário não está instalado.
- 2026-09-09: scout de CI/supply-chain/operações confirmou status `NOT PROVEN` para Triple-A e identificou bloqueios P0/P1 de release, DR, supply chain, identidade de imagem, caos e performance.
- 2026-09-09: baseline formal, quality bar, Green Main policy e políticas clínicas/operacionais iniciais registrados; `pnpm test` passou com exit 0.
- 2026-09-09: gate `release:triple-a`/`rc:evidence:triple-a`, evidence JSON, validator de supply chain, SHA pinning de 114 referências de actions, digest-aware Helm e runner non-root API/worker implementados.
- Em andamento: integrar o slice P0 de release control com as correções clínicas/worker/frontend e fechar sua verificação.

## Surprises & Discoveries

- O repositório já possui cobertura ampla de módulos, contratos, RLS, OpenAPI, observabilidade, backup, k6 e workflows, mas não possui um veredito de release único que agregue essas evidências.
- `.gauntlet/state.json` representa uma execução anterior de frontend (`frontend-premium-20260907`) e não pode ser reutilizado como estado desta missão.
- A infraestrutura de Helm expõe digest opcional, mas os templates observados ainda renderizam tag; os Dockerfiles de API/worker não declaram usuário não-root e usam bases mutáveis.
- A execução de `pnpm validate:helm` terminou com validação estática, não com lint/template real, pois o binário Helm não estava disponível.
- Os diretórios de evidência frontend existentes são volumosos e não rastreados; devem ser preservados e não podem ser tratados como evidência Triple-A desta execução sem vínculo e frescor.

## Decision Log

| Data | Decisão | Motivo | Impacto |
|---|---|---|---|
| 2026-09-09 | Manter o monólito modular e os trilhos de deploy atuais | Restrição explícita do prompt e compatibilidade operacional | Melhorias serão incrementais em scripts, workflows, pacotes, contratos e docs |
| 2026-09-09 | Usar T4_CRITICAL com revisão independente e evidência atual | O sistema manipula dados clínicos, identidade, auditoria, integrações e release | Nenhum gate crítico será aprovado com inferência ou evidência stale |
| 2026-09-09 | Separar o estado desta missão do `.gauntlet` legado | O estado antigo tem objetivo, schema e fase diferentes | Novo controle vive em `.agent/` e `docs/triple-a/` |
| 2026-09-09 | Não publicar `TRIPLE-A VERIFIED` antes de score, P0/P1, main green e evidência completos | Requisito explícito do prompt e invariantes do gauntlet | Status atual permanece `NOT PROVEN` |

## Outcomes & Retrospective

### Resultado esperado

Ao final, o repositório deverá possuir uma release candidata reproduzível, com gate agregador, identidade imutável, evidência de segurança/recuperação/performance, invariantes clínicas explícitas, UX crítica validada, scorecard e relatório final. O resultado só será considerado completo quando todas as condições do prompt forem comprovadas ou formalmente roteadas para uma autoridade humana identificada.

### Retrospectiva contínua

Ainda não há resultado final. Os pontos de atenção para a retrospectiva são: tempo de recuperação de evidência, divergência entre docs e código, custo dos drills, falsos positivos em gates e qualquer mudança de escopo necessária para manter o monólito modular.

## Context and Orientation

O projeto é um brownfield TypeScript/Pnpm com workspaces em `apps/*`, `packages/*` e `packages/modules/*`. O deploy canônico declarado é `docker-compose.v2.yml`/`.env.v2` para operação local e `infra/helm/cvg-his-v2` para Kubernetes. A API, SPA e worker compartilham contratos, banco, segurança, contexto de tenant, observabilidade e módulos clínicos/comerciais.

O prompt fonte está em `docs/triple-a/MASTER_PROMPT.md`. O quality bar congelado está em `docs/triple-a/QUALITY_BAR_V1.json`. O estado operacional desta execução está em `.agent/state.json`, o backlog em `.agent/backlog.json` e os ledgers append-only em `.agent/*jsonl`.

## Scope and Constraints

### Dentro do escopo

- Auditoria e implementação incremental de release gate, main green, supply chain, segurança, clinical safety, worker reliability, tenant/RLS, auditoria, recuperação, observabilidade, performance, UX/design system, documentação e governança.
- Testes e validadores que possam ser executados de forma determinística no workspace.
- Evidência versionável, com timestamps, commit, ambiente, limitações e vínculo ao critério.

### Fora do escopo sem autoridade humana explícita

- Deploy em produção, alteração de branch protection ou secrets de organização.
- Testes contra pacientes reais, PHI real, PIX real, provedores externos reais ou dados não descartáveis.
- Drills destrutivos em infraestrutura compartilhada, rotação/revogação de credenciais externas e mudanças irreversíveis em banco/infra.
- Reescrita V5, migração de stack, microserviços, API/SPA paralelos ou troca do rail canônico.

## Architecture and Interfaces

- **Apps:** `apps/api`, `apps/spa`, `apps/worker`.
- **Pacotes de plataforma:** `packages/db`, `packages/shared`, `packages/contracts`, `packages/rbac`, `packages/security`, `packages/tenant-context`, `packages/secrets`, `packages/design-system`.
- **Módulos de domínio:** `packages/modules/*`, mantendo contratos e limites atuais.
- **Entrega:** GitHub Actions, Docker/Compose, Helm, manifestos de release e scripts `pnpm`.
- **Evidência:** `docs/triple-a/`, `artifacts/release/`, `.agent/`.

Interfaces críticas a preservar: contratos OpenAPI, migrations canônicas em `packages/db`, RLS/contexto de tenant, eventos e consumidores, idempotência de pagamentos, auditoria, health/readiness e identidade de imagens.

## Milestones

### M0 — Baseline e controle

Concluir Fase 0, classificar P0/P1/P2 e manter o quality bar congelado.

### M1 — Main/release/supply chain

Gate Triple-A, manifest/evidence, ações pinadas, scanners, imagens e deploy por digest.

### M2 — Clinical/data/worker assurance

Matriz de criticidade, invariantes, idempotência, retry/DLQ, tenant/RLS/auditoria.

### M3 — Recovery/observability/performance

RPO/RTO, drills, game day, SLO/error budget, capacidade e soak.

### M4 — UX/design/frontend

Fluxos críticos, Patient 360, acessibilidade, responsividade, visual QA e limite de complexidade.

### M5 — Verify/certify

Críticos independentes, regressão completa, scorecard, relatório e decisão de release.

## Plan of Work

O trabalho segue BUILD → RUN → CRITIQUE → FIX → RETEST → INTEGRATE. Cada milestone inicia com inspeção de fontes reais, implementa somente mudanças ligadas ao backlog, executa os checks afetados e registra limitações. O lead integra as mudanças no workspace compartilhado; scouts e critics não escrevem no repositório.

## Concrete Steps

1. [TRIPLE-A-RELEASE-CONTROL:OBSERVE-CI-1434514C] Observar o CI #70 do candidato `1434514c`, registrar a conclusão por job e então reexecutar o gate estrito atual.
2. Confirmar a resolução da Baseline Fase 0 com evidência fresca e manter `NOT PROVEN` enquanto P0s operacionais estiverem abertos.
3. Corrigir os bloqueios P0 de main/release e atualizar `GREEN_MAIN_POLICY.md` com critérios executáveis.
4. Fechar hardening de runtime, digest de imagem, permissões de workflow e verificação de artefatos.
5. Implementar os documentos e gates clínicos, de worker, eventos, idempotência, tenant, RLS e auditoria.
6. Implementar recuperação, RPO/RTO, drills descartáveis e evidência de observabilidade/performance.
7. Corrigir dívida de complexidade e executar a trilha frontend/design com renders reais e revisão visual independente.
8. Rodar regressão, críticos frescos, scorecard e certification; reabrir qualquer critério cujo evidence ref fique stale.

## Validation and Acceptance

- O prompt salvo deve permanecer byte-a-byte idêntico ao anexo original.
- O baseline deve refletir o HEAD/ambiente observados e distinguir `PASS`, `FAIL`, `PARTIAL`, `NOT_RUN` e `NOT_PROVEN`.
- Cada gate deverá possuir critério, evidência, limitação, frescor e revalidação; nenhum `PASS` pode depender apenas de documentação.
- `pnpm typecheck`, `pnpm lint`, `pnpm build`, testes aplicáveis, validadores de contrato e o gate de release devem ser executáveis no commit candidato.
- A decisão final só pode ser `TRIPLE-A VERIFIED` se o score objetivo atingir o limiar do prompt, não houver P0 aberto, main estiver green e a autoridade de release estiver representada por evidência atual.

## Risks and Human Decisions

- **Risco clínico:** mudanças em criticidade, prontuário, prescrição, internação, triagem e pagamentos exigem revisão independente e teste de não regressão.
- **Risco de dados:** drills de restore/RLS/tenant e migrations em banco compartilhado devem usar ambiente descartável ou aprovação explícita.
- **Risco de release:** publicação, branch protection, secrets, assinatura de artefato e deploy exigem autoridade humana do ambiente alvo.
- **Risco de evidência:** artefatos antigos, screenshots e estados `.gauntlet` não são prova atual sem reexecução e vínculo ao commit.

Decisões humanas pendentes serão registradas em `.agent/authority.jsonl`; não há autorização humana de produção registrada nesta fase.

## Idempotence and Recovery

Todos os scripts novos devem aceitar reexecução segura, usar diretórios de trabalho versionados por run, não sobrescrever evidência de outro commit e deixar manifestos com hash/commit/ambiente. Em falha, o próximo passo deve ser recuperável a partir de `.agent/state.json`, `.agent/backlog.json` e do último evento do execution log. Drills destrutivos devem exigir alvo descartável e cleanup explícito.

## Artifacts and Evidence

- `docs/triple-a/MASTER_PROMPT.md`: prompt fonte, SHA-256 `95270384800c87fcbe7e823a41a7b57834ddaac274914226745f7fdc5137197a`.
- `docs/triple-a/QUALITY_BAR_V1.json`: quality bar congelado antes da implementação.
- `docs/engineering/TRIPLE_A_BASELINE.md`: baseline narrativo e matriz de gaps.
- `docs/triple-a/00-baseline.md`: registro resumido da Fase 0.
- `.agent/state.json`: estado corrente T4.
- `.agent/backlog.json`: backlog priorizado e próxima ação singular por item.
- `.agent/execution-log.jsonl`: eventos append-only da execução.
- `.agent/verification.jsonl`: procedimentos executados e evidência fresca.
- `.agent/authority.jsonl`: decisões humanas de autoridade, quando existirem.
