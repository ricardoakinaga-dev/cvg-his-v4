# CVG-HIS V4 — matriz de requisitos e evidências

## Propósito

Esta matriz transforma a Quality Bar congelada em uma superfície de decisão
auditável. Cada requisito aponta para um comportamento observável, uma forma de
rejeição, um artefato e uma entrada do ledger de verificação. Um arquivo,
endpoint, screenshot ou score de presença sozinho não é evidência de release.

`PASS_BOUNDED` significa somente que o escopo descrito na linha foi exercitado
no ambiente indicado. `PARTIAL`, `BLOCKED` e ausência de evidência continuam
impedindo promoção. A worktree atual é mista; os IDs do ledger e os artefatos
registram a observação, mas não concedem autorização de commit, push, deploy ou
go-live.

Os 30 subcritérios detalhados do `.gauntlet/state.md` estão indexados em
[`GAUNTLET_SUBCRITERIA_EVIDENCE.md`](./GAUNTLET_SUBCRITERIA_EVIDENCE.md), com a
mesma disciplina de comportamento rejeitante, evidência e limite honesto.

## Matriz vigente

| ID         | Comportamento exigido                                                                                                           | Código/fontes vigentes                                                                                                        | Evidência rejeitante / observável                                                                                                                           | Artefato + ledger                                                                                                                                                                                                                                                                             | Estado honesto / próximo gate                                                                                           |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| QB-ARC-01  | Uma identidade de release e uma superfície canônica de deploy, sem trilhas concorrentes silenciosas.                            | `package.json`, `docker-compose.v2.yml`, `infra/helm/cvg-his-v2`, `docs/engineering/ARCHITECTURE_AUDIT.md`                    | Render/lint dos manifests falha ou diverge quando a identidade, imagem, porta ou track não é determinístico; o segundo track Helm ainda precisa de decisão. | `docs/engineering/CVG_HIS_V4_CONSOLIDATION_REPORT.md`; `VFY-CVG-002C6-HELM-RENDER-001`                                                                                                                                                                                                        | `PARTIAL` — render local comprovado; identidade de release e target deploy ainda não liberam.                           |
| QB-DB-01   | Migrations canônicas têm checksum, repetição idempotente e falha fechada em drift.                                              | `packages/db/src/migrate.ts`, `packages/db/src/migration-integrity.ts`, `scripts/check-migration-source-of-truth.mjs`         | Nome/hash divergente falha antes de aplicar; comando histórico ou artefato stale não pode virar segunda fonte.                                              | `docs/engineering/CVG_HIS_V4_CONSOLIDATION_REPORT.md`; `VFY-CVG-002C6-DB-SOURCE-OF-TRUTH-001`, `VFY-CVG-002C6-DB-SOURCE-ARTIFACT-FINAL-001`                                                                                                                                                   | `BOUNDED PASS` local — migration positiva em staging e drift operacional do alvo ainda abertos.                         |
| QB-DB-02   | Role runtime não escapa tenant/RLS; owner, grants e `NOBYPASSRLS` precisam ser testados no banco.                               | `packages/db/migrations/0144_force_rls_tenant_tables.sql`, `tests/integration/rls`, `infra/scripts/restore-drill-v2.sh`       | Usuário sem contexto não lê dados, tenant B não lê A, owner não bypassa `FORCE RLS`, e o restore probe precisa reportar `false,false` antes das assertions. | `.agent/artifacts/CVG-002C6-force-rls-catalog-2026-08-25.md`, `.agent/artifacts/CVG-002C6-restore-representative-2026-08-25.md`; `VFY-CVG-002C6-FORCE-RLS-FINAL-002`, `VFY-CVG-002C6-RESTORE-REPRESENTATIVE-FINAL-001`                                                                        | `BOUNDED PASS` local — catálogo, ownership/grants e cross-tenant do PostgreSQL alvo permanecem pendentes.               |
| QB-OPS-01  | API/worker iniciam, ficam ready e encerram drenando listener, DB e observabilidade.                                             | `apps/api/src`, `apps/worker/src`, `tests/integration/process`, Compose/Helm probes                                           | Processo real falha em readiness, repete shutdown, perde exit code ou deixa recurso aberto; probes divergentes são rejeitados.                              | `.agent/artifacts/CVG-001-runtime-bootstrap-harness-2026-08-23.md`; `VFY-CVG-001-SETUP-FINAL-001`, `VFY-CVG-002C6-CRITICAL-PROCESS-SUITE-001`                                                                                                                                                 | `BOUNDED PASS` local — DB/Redis, rollout e capacidade do ambiente alvo ainda não liberam.                               |
| QB-OPS-02  | Backup restaura globals, banco e storage com integridade verificável e tempos persistidos.                                      | `infra/scripts/backup-v2.sh`, `infra/scripts/restore-drill-v2.sh`, `infra/scripts/create-restore-drill-fixture.mjs`           | Checksum, TOC, globals, tabela/graph cardinality, role RLS ou listing de storage divergente encerra com erro.                                               | `.agent/artifacts/CVG-002C6-restore-representative-2026-08-25.md`; `VFY-CVG-002C6-RESTORE-REPRESENTATIVE-FINAL-001`                                                                                                                                                                           | `BOUNDED PASS` local — bundle homologado, retenção, RTO/RPO, failover e Game Day do alvo não são substituídos.          |
| QB-SEC-01  | Secrets, setup, autenticação, tenant, autorização e audit falham fechados e deixam trilha imutável.                             | `apps/api/src/setup-provisioning.ts`, `packages/db/migrations/0103_installation_state.sql`, `packages/secrets`, RLS/ACL tests | Input inválido, segredo ausente, actor sem capability, tenant cruzado ou update/delete de audit deve ser rejeitado sem vazar dado sensível.                 | `.agent/artifacts/CVG-001-startup-fail-closed-2026-08-23.md`; `.agent/artifacts/CVG-003-access-control-audit-cache-2026-08-26.md`; `VFY-CVG-001-SETUP-HTTP-INPUTS-001`, `VFY-CVG-002C6-API-PERSISTENCE-RLS-001`, `VFY-CVG-003-ACCESS-AUDIT-CACHE-001`                                         | `PARTIAL` — provas locais fortes, incluindo cache/audit; política/target/homologação externa ainda abertos.             |
| QB-CLIN-01 | Owner→Patient→Encounter→care→inpatient→billing→stock→receipt fecha atomicamente, com audit, outbox, replay e isolamento.        | `apps/api/src/routes`, `packages/modules/*`, PostgreSQL integration/HTTP tests                                                | Failpoint, retry, replay, concorrência, restart ou tenant B deixa órfão, duplicata, saldo desequilibrado ou efeito fora do tenant.                          | `.agent/artifacts/CVG-002C6-clinical-financial-audit-2026-08-23.md`; `.agent/artifacts/CVG-002C6-critical-base-regression-2026-08-26.md`; `VFY-CVG-002C6-CONSOLIDATION-CLINICAL-HTTP-002`, `VFY-CVG-002C6-INPATIENT-CROSS-DOMAIN-FAILPOINT-001`, `VFY-CVG-002C6-CRITICAL-BASE-REGRESSION-001` | `PARTIAL` — há conditional passes locais; target, PIX/webhook completo, provider e aceitação clínica continuam abertos. |
| QB-PAR-01  | Parity Vetus é comportamento executado por domínio, não inventário de telas ou arquivos.                                        | `docs/vetus`, auditoria de paridade, report workbench e journeys PostgreSQL/SPA                                               | Cenário sem resultado persistido, sem tenant A/B, com skip/retry ou baseado só em existência não conta como verde.                                          | `docs/2026-08-07-backlog-roadmap-resolucao-auditoria-cvg-his-v4.md`; `VFY-CVG-002C6-REPORTS-WORKBENCH-EXPORT-REVIEW-002`, `VFY-CVG-002C6-SPA-CLINICAL-FINAL-001`                                                                                                                              | `PARTIAL — 4/11` — onze domínios gerais e três clínicos ainda não estão certificados.                                   |
| QB-REL-01  | CI bloqueia migrations, RLS, OpenAPI, Helm, backup, lifecycle e testes DB-backed obrigatórios.                                  | `.github/workflows/ci.yml`, repository-guards, validators e testes críticos                                                   | Guard ausente, `REQUIRE_TEST_DB` desativado, workflow apontando para rail histórica ou contrato sem execução falha o gate.                                  | `.agent/artifacts/CVG-002C6-force-rls-catalog-2026-08-25.md`; `.agent/artifacts/CVG-002C6-critical-base-regression-2026-08-26.md`; `VFY-CVG-002C6-FORCE-RLS-CI-001`, `VFY-CVG-002C6-RESTORE-REPRESENTATIVE-FINAL-001`, `VFY-CVG-002C6-CRITICAL-BASE-FINAL-001`                                | `BOUNDED PASS` de composição local — execução GitHub, retenção de artefatos e capacidade remota permanecem abertas.     |
| QB-REL-02  | Providers reais têm sandbox, callback autenticado, replay/idempotência, retry/DLQ, reconciliação e outage behavior homologados. | payment, fiscal, laboratório, comunicação e storage integration boundaries                                                    | Sem decisão de provider/sandbox, callback assinado e reconciliação observada, a integração é bloqueada e não recebe score de release.                       | `docs/engineering/RISK_REGISTER.md` (R-006, R-007, R-018); sem ledger `PASS` de homologação externa                                                                                                                                                                                           | `BLOCKED` — requer decisão humana, credenciais e ambiente de provider; existência de adapters não libera.               |
| QB-UX-01   | Jornadas SPA críticas funcionam com loading/empty/error/recovery, teclado, foco, responsividade e WCAG 2.2 AA.                  | `apps/spa`, design system, Playwright/axe e specs de setup/critical flows                                                     | Browser construído falha sem retry/skip, foco/teclado, tenant, persistência ou acessibilidade; mock visual não substitui backend.                           | `.agent/artifacts/CVG-001-runtime-bootstrap-harness-2026-08-23.md`; `VFY-CVG-001-SETUP-BROWSER-FINAL-001`, `VFY-CVG-002C6-SPA-DOCKER-FINAL-001`                                                                                                                                               | `PARTIAL` — setup e flows selecionados verdes; auditoria global WCAG/parity ainda não libera.                           |
| QB-ARCH-01 | Módulos evoluem por fronteiras estáveis, sem novo crossing de domínio ou composition root sem controle.                         | `docs/engineering/ARCHITECTURE_AUDIT.md`, package boundaries, route registries e guards                                       | Import proibido, dependência circular, handler cross-domain sem port/UoW ou duplicação de fonte canônica deve ser rejeitado.                                | `docs/engineering/CVG_HIS_V4_CONSOLIDATION_SPEC.md`, `docs/engineering/ARCHITECTURE_AUDIT.md`; revisão de arquitetura registrada no ledger histórico                                                                                                                                          | `PARTIAL` — guardrails incrementais existem; refatoração/graph global e decisão de release permanecem abertas.          |

## Regra de uso

Uma linha só pode mudar de `PARTIAL`/`BLOCKED` para `PASS_BOUNDED` quando o
ledger contiver procedimento, ambiente, resultado, artefato e limitações
reproduzíveis. A matriz não converte `PASS_BOUNDED` em `DONE`: target,
provider, parity, operações e autorização humana continuam gates independentes.

## QB-ARC-01 — atualização de evidência — 2026-08-26

O contrato de identidade de release e superfície de deploy foi implementado e
retestado localmente. `infra/helm/cvg-his-v2` é o track canônico; `charts/helm`
é legado retido e não-executável. `pnpm validate:deploy-surface` passou com 68
arquivos e rejeitou referência ativa ao track legado; o guard está conectado ao
`repository-guards`. `pnpm validate:helm` passou apenas na camada estática por
ausência do binário Helm, e `deploy:check`/OpenAPI permaneceram verdes.

Artefato: `.agent/artifacts/CVG-003-release-identity-deploy-surface-2026-08-26.md`.
Ledger: `VFY-CVG-003-RELEASE-IDENTITY-SURFACE-001`;
controle final: `VFY-CVG-003-RELEASE-IDENTITY-SURFACE-FINAL-001`.
Estado honesto: `PARTIAL`; target, render/lint executável, CI remoto, rollout,
rollback e decisão física sobre o legado continuam sem evidência.

## QB-ARC-01 — gate Helm executável — 2026-08-26

O validator de Helm agora tem dois modos explícitos: fallback estático local e
modo obrigatório com REQUIRE_HELM=1, que exige v3.15.4. O repository-guards
baixa o arquivo oficial, verifica o SHA-256 pinado e executa lint/template nos
overlays dev, staging e prod. O guard de superfície rejeita drift no
versionamento, checksum e comando obrigatório.

Artefato:
.agent/artifacts/CVG-003-helm-executable-gate-2026-08-26.md.
Ledgers VFY-CVG-003-HELM-EXECUTABLE-001 e
VFY-CVG-003-HELM-EXECUTABLE-FINAL-001. Estado honesto: PARTIAL; execução
remota, cluster target, rollout/rollback e identidade efetiva de imagem/porta
continuam sem evidência.

### Rechecagem final QB-ARC-01 — 2026-08-26

O gate Helm executável passou 5/5 no validator e 8/8 nos contratos CI e
deploy-surface. A prova local usou o binário oficial v3.15.4 por `HELM_BIN`,
com lint/template dos três overlays e SHA-256 reproduzido; o workflow exige o
caminho `/usr/local/bin/helm` e modo obrigatório. `QB-ARC-01` permanece
`PARTIAL`: GitHub Actions, cluster target, identidade efetiva, rollout e
rollback ainda não têm evidência.
