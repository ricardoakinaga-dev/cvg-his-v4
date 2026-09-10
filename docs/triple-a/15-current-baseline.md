# Baseline corrente — State of Art

Observado em 2026-09-10T18:32:36.528517+00:00. Perfil brownfield, monólito modular, T4 crítico; atividade AUDIT/VERIFY.

| Campo | Evidência atual |
| --- | --- |
| current_sha | `b85b03ea029b9ffe2186dc0021ddf7f6c65e37f3` |
| main_sha | `b85b03ea029b9ffe2186dc0021ddf7f6c65e37f3` (local e `git ls-remote origin refs/heads/main`) |
| origin/main | `b85b03ea029b9ffe2186dc0021ddf7f6c65e37f3` |
| worktree | Limpo na descoberta; agora contém a cópia do novo prompt e reconciliação documental |
| ci_run | [34509025262](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34509025262), terminal `failure` |
| overall_score | NOT PROVEN para o candidato atual |
| critical_score | NOT PROVEN para o candidato atual |
| open_p0 | Inventário abaixo; contagem integral depende do gate atual |
| open_p1 | Inventário abaixo; contagem integral ainda não comprovada |
| open_p2 | Inventário abaixo; zero não inferido |
| implemented | API/SPA/worker, workflow durável, gate de release e contratos presentes no source |
| verified_local | Hash do novo prompt e identidade Git; demais provas históricas não transferidas |
| verified_remote | 13/16 jobs CI aprovados no SHA atual; três falharam |
| verified_target | NOT PROVEN |
| blocked | Certificação/release; main não verde, provas operacionais e humanas pendentes |
| not_proven | Qualidade global 97/95, zero P0, ambiente alvo, UAT, soak e autoridade |

## Fonte e evidência

Novo prompt preservado byte a byte em `MASTER_PROMPT_STATE_OF_ART.md`, SHA-256
`872014ed989fa4b565bbab5293009c13ef6437104204cbf39c876e64a593f745`.
`QUALITY_BAR_V1.json` permanece inalterado (97/95/zero P0).
Os oito workflows ativos foram inventariados; os resultados abaixo vêm da API pública do GitHub.
JSON bruto local: `artifacts/release/baseline-b85b03ea/github-jobs.json` e `github-runs.json`.
A última evidência agregada preexistente era do SHA `c375b72b9c09b398c593a6185c655a51434f6414`,
portanto **STALE / INVALID_EVIDENCE** para este candidato; seu score não é reutilizado.

## CI por job

| Job | Resultado |
| --- | --- |
| Secret Scan | success |
| Dependency Audit (CVE Scan) | success |
| Typecheck | success |
| SAST (Semgrep) | success |
| Repository Guards | success |
| Lint | success |
| Coverage | success |
| Validate OpenAPI | success |
| Build | success |
| API Contract Tests | success |
| Integration Tests | success |
| Critical Process Runner (Windows contract) | failure |
| E2E Tests (SPA) | failure |
| Visual Regression | success |
| Performance (k6 SLOs) | failure |
| Unit Tests | success |

## Plano P0 / P1 / P2

P0 (ordem de execução; aberto até prova específica):

1. Main verde: diagnosticar e corrigir Windows, E2E SPA e performance sem relaxar contratos.
2. E2E crítico completo verde; identificar falhas funcionais no relatório bruto atual.
3. Governança real da branch (required checks, PR/review, bypass, force-push/deletion).
4. Workflow PostgreSQL (CRUD/transições/retry/DLQ/replay/events/idempotência/isolamento).
5. Concorrência workflow; fencing após lease expirada; crash/reclaim sem duplicação.
6. RLS runtime para API/worker e integridade imutável da auditoria.
7. Concorrência billing: pagamento/settlement/invoice sem efeito duplicado.
8. Golden path clínico completo e negativos, com estoque/faturamento/permissões/tenant.
9. Evidência vinculada ao SHA e restore production-like; nenhum claim AAA sem prova.

P1: segurança runtime e anexos/webhooks/secrets; supply chain/attestations;
SLO/load/pool/EXPLAIN; UX responsive/a11y/Patient 360/workflow/handover;
backup/restore/corrupção/RPO/RTO; deploy/rollback descartáveis; observabilidade/alertas;
soak 24h e 72h; UAT humano e críticos independentes; gate final e autoridade.

P2: avaliar hotspots de composição/repository/contracts somente com evidência;
higiene e classificação documental, drift e governança de dependências.

Esta lista preserva as 76 fases do prompt; grupos não significam fases concluídas.
O plano existente `.agent/plans/external-assurance-closure-execplan.md` segue como
ponto de continuidade. O próximo trabalho é MAIN-001; grandes features aguardam
resolução do stop-the-line de main vermelho.

## Recuperação

O estado durável citava `1434514c` e CI #70; o Git e a API remota contradizem essa
fotografia. Ela foi preservada no histórico e substituída por esta observação.
A interrupção anterior não forneceu handle vivo verificável; nenhuma execução
foi reiniciada com base apenas em logs/estado. O run corrente está terminal.
A `.gauntlet/` existente pertence ao frontend anterior; não foi sobrescrita nem
usada como evidência desta missão.

## Coleta local de diagnóstico

`TRIPLE_A_RELEASE_OUTPUT_DIR=artifacts/release/baseline-b85b03ea TRIPLE_A_RUN_BUILD=0 pnpm release:triple-a`
terminou com exit 1, BLOCKED, score 62, crítico 43, 20 P0 abertos. É diagnóstico
do worktree modificado baseado em b85b03ea, **não score certificado do commit**.
Os 12 validators locais passaram; Helm foi somente estático (binário ausente).
Build/typecheck/lint/full unit não executados nessa coleta, envelopes externos ausentes.
O próprio gate rejeitou a integridade do candidato porque o worktree estava sujo.

Inventário exato de critérios abertos nessa coleta:

- P0 (20 critérios no gate): `CMD-01` (FAIL), `CMD-14` (NOT_RUN), `CMD-15` (NOT_RUN), `CMD-16` (NOT_RUN), `CMD-17` (NOT_RUN), `RELEASE-MANIFEST` (NOT_RUN), `SECURITY-EVIDENCE` (NOT_RUN), `BACKUP-DRILL` (NOT_RUN), `CI-REMOTE` (NOT_RUN), `CRITICAL-TESTS` (NOT_RUN), `E2E` (NOT_RUN), `WORKFLOW-POSTGRES` (NOT_RUN), `RLS-RUNTIME` (NOT_RUN), `WORKER-CRASH` (NOT_RUN), `CLINICAL-E2E` (NOT_RUN), `AUDIT-INTEGRITY` (NOT_RUN), `HOSPITAL-UAT` (NOT_RUN), `IMAGE-ATTESTATIONS` (NOT_RUN), `BRANCH-PROTECTION` (NOT_RUN), `RELEASE-AUTHORITY` (NOT_RUN).

- P1 (3 critérios no gate): `PERFORMANCE` (NOT_RUN), `DEPLOY-TARGET` (NOT_RUN), `HELM-TARGET` (NOT_RUN).

- P2 (0 critérios no gate): nenhum neste gate; cobertura integral do prompt ainda não provada.
