# Baseline corrente — State of Art

Observado em 2026-09-11T03:45:00Z. O candidato de código do merge é o "main@fe5406c23c515585629060e0dc01b91f2d113d65" após merge fast-forward. Esta reconciliação documental é registrada separadamente e, por alterar o SHA do branch, exige uma nova execução CI antes de qualquer decisão de release. Este bloco é a fonte corrente. As seções posteriores são históricas e não transferem resultados para outro SHA.

## Estado do candidato atual

| Campo | Evidência atual |
| --- | --- |
| current_sha | "fe5406c23c515585629060e0dc01b91f2d113d65" ("main", "origin/main" e "origin/fix/state-of-art-ci-assurance") |
| main_sha | "fe5406c23c515585629060e0dc01b91f2d113d65" |
| origin/main | "fe5406c23c515585629060e0dc01b91f2d113d65" |
| worktree | Limpo para arquivos rastreados; artefatos locais estão ignorados |
| ci_run | [#34556230892](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34556230892), terminal "failure", 15/16 jobs aprovados |
| overall_score | NOT PROVEN — gate de release atual não autoriza certificação |
| critical_score | NOT PROVEN |
| open_p0 | NOT PROVEN — não há envelope de release atual válido para contar P0 |
| implemented | API/SPA/worker, workflow durável, contratos, validadores, gate de release e correções de CI presentes no source |
| verified_local | docs, OpenAPI, workflow clínico, testes focados, contratos de infraestrutura, API 587/587, build SPA, PostgreSQL efêmero 16/16, SIGKILL 1/1 e k6 local 9/9 |
| verified_remote | 15/16 jobs no SHA atual; Performance falhou; os outros 15 passaram |
| verified_target | NOT PROVEN |
| blocked | Performance remoto no run atual, evidência de release atual ausente, branch governance, ambiente alvo, recuperação/soak, UAT e autoridade de release |
| not_proven | Quality bar 97/95/zero P0, Windows nativo fora do runner Linux, RLS/DB runtime no alvo, deploy/rollback, restore/RPO/RTO, attestation, observabilidade operacional e provas humanas |

## Evidência corrente

O CI atual executou no SHA exato acima. O job [Performance (k6 SLOs)](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34556230892/job/103131906730) terminou com exit 99; o passo de verificação de SLO terminou com exit 1. Secret Scan, Dependency Audit, Typecheck, SAST, Repository Guards, Lint, Coverage, OpenAPI, Build, API Contract Tests, Integration Tests, Unit Tests, E2E SPA, Visual Regression e o contrato Windows passaram. O artefato remoto de performance é o ID 10183097282; seu conteúdo não está autenticado para download neste workspace.

A investigação comparativa registrou no relatório remoto: API p95 223,42 ms, query 239 ms, billing 272,35 ms e inventory 261,29 ms falharam; write 296,35 ms, auth 28,33 ms, erros HTTP 0% e disponibilidade 100% passaram. O run [34551458338](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34551458338) passou 16/16 em outro checkout e é histórico, não prova do SHA atual. A diferença é classificada como variância de runner/contenção; os thresholds permanecem congelados.

No ambiente local efêmero, com PostgreSQL/Redis descartáveis, k6 v0.55.0 e perfil operational-minimum-v1 (60 VUs), a execução terminou 9/9: API p95 51,46 ms, query 56 ms, write 63 ms, billing 61 ms, inventory 56,64 ms, auth 19,13 ms, erros 0% e disponibilidade 100%. Isso é evidência local reproduzível, não certificação remota ou de ambiente alvo.

O prompt integral continua byte a byte em [MASTER_PROMPT_STATE_OF_ART.md](./MASTER_PROMPT_STATE_OF_ART.md), SHA-256 872014ed989fa4b565bbab5293009c13ef6437104204cbf39c876e64a593f745. O [QUALITY_BAR_V1.json](./QUALITY_BAR_V1.json) permanece congelado em 97/95/zero P0. O prompt exige artifacts/triple-a/TRIPLE_A_RELEASE_EVIDENCE.json, enquanto o gate implementado escreve em artifacts/release/TRIPLE_A_RELEASE_EVIDENCE.json; nenhum envelope atual vinculado a este SHA existe em qualquer dos dois caminhos, e o artefato ignorado antigo não é promovido como prova.

Os pareceres correntes estão em [final-security-critic.md](./final-security-critic.md), [final-clinical-critic.md](./final-clinical-critic.md), [final-database-critic.md](./final-database-critic.md), [final-operations-critic.md](./final-operations-critic.md) e [final-ux-critic.md](./final-ux-critic.md). Todos permanecem BLOCKED / NOT PROVEN e listam a evidência necessária para fechamento.

## Decisão corrente

**BLOCKED / NOT PROVEN.** O merge foi seguro e reversível, mas a certificação Triple-A, o release e o claim TRIPLE-A VERIFIED continuam bloqueados até CI verde no SHA candidato e até a obtenção das evidências externas, operacionais e humanas exigidas pelo prompt.

## Registros históricos

## Execução remota anterior — candidato `5470b4f5` (histórico)

O run [34542095726](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34542095726)
terminou com 15 de 16 jobs em `success`. Typecheck, SAST, Secret Scan, Dependency
Audit, Lint, OpenAPI, Repository Guards, Coverage, Build, API Contract, Unit,
Windows, Integration, E2E SPA e Visual passaram. O único job em `failure` foi
Performance (k6 SLOs), porque o perfil remoto de 60 VUs mediu 5/9 SLOs:

| Métrica | P95 observado | Alvo | Resultado |
| --- | ---: | ---: | --- |
| API | 215,98 ms | < 200 ms | FAIL |
| Query | 231 ms | < 150 ms | FAIL |
| Write | 273,25 ms | < 300 ms | PASS |
| Billing | 259 ms | < 250 ms | FAIL |
| Inventory | 245,30 ms | < 200 ms | FAIL |
| Auth | 26,02 ms | < 300 ms | PASS |
| API errors | 0 | < 0,1% | PASS |
| Availability | 100% | >= 99,5% | PASS |

O relatório preservou as métricas agregadas do contrato e adicionou diagnósticos
por endpoint: `inventory_create_latency_ms` P95 272,63 ms,
`inventory_read_latency_ms` 184,34 ms, `query_patients_list_latency_ms`
193,25 ms e `query_patient_detail_latency_ms` 187,25 ms. A otimização do caminho
de criação de inventário melhorou a cauda em relação ao run anterior, mas não
produziu certificação do SLO sob a contenção deste runner. O relatório completo
está no artefato `performance-k6-report` (ID `10178201156`, digest acima).

O artefato E2E (ID `10178424097`, digest acima) contém 422 testes esperados,
zero skipped, zero unexpected e zero flaky; a validação de inventário confirmou
151 rotas e 302 navegações no ambiente `ci-postgresql`, Chromium 145.0.7632.6,
Playwright 1.58.2, locale `pt-BR` e timezone `America/Sao_Paulo`. O relatório
enterprise associado ao mesmo run permanece `Mode: advisory`, com
`PASS: 10 | WARN: 2 | FAIL: 2`: readiness 92/100 e Vetus parity continuam
falhando; backup/deploy reais continuam sem evidência externa. O modo advisory
não converte esses FAILs em PASS.

Esse run prova a execução remota vinculada ao candidato, mas não prova o quality
bar 97/95/zero-P0, governança da branch, runtime RLS, crash/recovery do worker,
golden path clínico completo, soak 24/72h, UAT humano, restore production-like,
deploy no ambiente alvo, attestation de imagem ou autoridade de release.

## Execução remota anterior — candidato `ef30673f` (histórico de contenção)

O run [34546979414](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34546979414)
terminou com 15 de 16 jobs em `success`: Typecheck, SAST, Secret Scan,
Dependency Audit, Lint, OpenAPI, Repository Guards, Coverage, Build, API
Contract, Unit, Windows, Integration, E2E SPA e Visual passaram. O único job em
`failure` foi Performance (k6 SLOs). O limite de bootstrap do supervisor Windows
foi exercitado no runner hospedado e passou com cleanup completo; o ajuste de
30s para 60s não relaxou o limite de execução do processo nem o cleanup.

O perfil remoto de 60 VUs mediu 4/9 SLOs nesta rodada:

| Métrica | P95 observado | Alvo | Resultado |
| --- | ---: | ---: | --- |
| API | 270,80 ms | < 200 ms | FAIL |
| Query | 285 ms | < 150 ms | FAIL |
| Write | 351,85 ms | < 300 ms | FAIL |
| Billing | 332 ms | < 250 ms | FAIL |
| Inventory | 315,35 ms | < 200 ms | FAIL |
| Auth | 27,91 ms | < 300 ms | PASS |
| API errors | 0 | < 0,1% | PASS |
| Availability | 100% | >= 99,5% | PASS |

Os diagnósticos por endpoint foram `inventory_create_latency_ms` P95 351,47 ms,
`inventory_read_latency_ms` 249,56 ms, `query_patients_list_latency_ms` 240,85
ms e `query_patient_detail_latency_ms` 248,85 ms. A rodada imediatamente
anterior, no mesmo runner e sem relaxar limiares, passou 9/9; esta diferença é
registrada como variância de contenção, não como certificação. O artefato
`performance-k6-report` (ID `10179866930`, digest
`sha256:5cad7f84f2930d9cc3d85b59501e97963750719c6353ea76feb3117503131ec2`)
é a fonte dos números acima.

O artefato E2E (ID `10180087681`, digest
`sha256:ddd6dd04e6d3a9095856fdac5dffd26f2b505919289ebcfa17f68ff30e9a7ab0`)
contém 422 testes esperados, zero skipped, zero unexpected e zero flaky; a
validação de inventário confirmou 151 rotas e 302 navegações no ambiente
`ci-postgresql`, Chromium 145.0.7632.6, Playwright 1.58.2, locale `pt-BR` e
timezone `America/Sao_Paulo`. O merge SHA registrado no metadata é
`29e5c32b6f2904525b40859d7a404e5fa0fba0a1` e o inventory digest é
`d2ca0efa69c4261a9854d2f1bd111d2f3c881fc839ab6faa9efa79dae1122872`.
O relatório enterprise permanece advisory, `PASS: 10 | WARN: 2 | FAIL: 2`:
readiness 92/100 e Vetus parity não verificado; backup/deploy reais seguem sem
evidência externa.

Esta execução confirma o fix Windows no candidato, mas não prova o quality bar
97/95/zero-P0, governança da branch, runtime RLS, crash/recovery do worker,
golden path clínico completo, soak 24/72h, UAT humano, restore production-like,
deploy no ambiente alvo, attestation de imagem ou autoridade de release.

## Execução final remota — revisão documental `8360a615`

O run [34551458338](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34551458338)
terminou com **16/16 jobs em `success`** no checkout que carrega o scorecard
atual. Typecheck, SAST, Secret Scan, Dependency Audit, Lint, OpenAPI, Guards,
Coverage, Build, API Contract, Unit, Windows, Integration, E2E SPA, Visual e
Performance passaram. O candidato de comportamento permanece
`ef30673f871b29638c2bab9b6ede90776cf59e10`; a revisão `8360a615` é documental.

O perfil remoto de 60 VUs passou 9/9 SLOs:

| Métrica | P95 observado | Alvo | Resultado |
| --- | ---: | ---: | --- |
| API | 140,41 ms | < 200 ms | PASS |
| Query | 133 ms | < 150 ms | PASS |
| Write | 234,70 ms | < 300 ms | PASS |
| Billing | 248,70 ms | < 250 ms | PASS |
| Inventory | 197,62 ms | < 200 ms | PASS |
| Auth | 26,65 ms | < 300 ms | PASS |
| API errors | 0 | < 0,1% | PASS |
| Availability | 100% | >= 99,5% | PASS |

Os diagnósticos foram `inventory_create_latency_ms` P95 234,91 ms,
`inventory_read_latency_ms` 98,14 ms, `query_patients_list_latency_ms` 114,70
ms e `query_patient_detail_latency_ms` 106 ms. O artefato
`performance-k6-report` (ID `10181401056`, digest
`sha256:b772a7a377be6c14eb407561ba74e226b7ad88aed6e5f45c5f85d4040384c926`)
preserva o relatório completo.

O artefato E2E (ID `10181554140`, digest
`sha256:c5784d41ea92cf94bd9a83cf8413ddd5bb9b89959e2a6b7a5644f047322e7978`)
contém 422 testes esperados, zero skipped, zero unexpected e zero flaky; a
validação confirmou 151 rotas, 302 navegações, ambiente `ci-postgresql`,
Chromium 145.0.7632.6, Playwright 1.58.2, locale `pt-BR` e timezone
`America/Sao_Paulo`. O merge SHA do artefato é
`74c7bbbe076c90d2f6a0a11dd60715f9c406ba5b` e o inventory digest é
`d1d4b7dea08ef141ef504a99cc46486e671a3845f6760ae265f46792079e2a03`.
O enterprise report continua advisory `PASS: 10 | WARN: 2 | FAIL: 2`: readiness
92/100 e Vetus parity seguem não verificados; backup/deploy reais seguem sem
evidência externa.

Esta execução comprova CI verde e SLO k6 no checkout final, mas não eleva o
claim para Triple-A: permanecem abertos o quality bar 97/95/zero-P0, governança
autenticada da branch, runtime RLS, crash/recovery distribuído, golden path
clínico completo, soak 24/72h, UAT humano, restore production-like, deploy no
ambiente alvo, attestation de imagem e autoridade de release.

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

## Coleta local de diagnóstico histórica

`TRIPLE_A_RELEASE_OUTPUT_DIR=artifacts/release/baseline-b85b03ea TRIPLE_A_RUN_BUILD=0 pnpm release:triple-a`
terminou com exit 1, BLOCKED, score 62, crítico 43, 20 P0 abertos. É diagnóstico
histórico do worktree modificado baseado em b85b03ea, **não score certificado do
candidato `5470b4f5`**. O run remoto acima também não autoriza reutilizar esse
score como certificação.
Os 12 validators locais passaram; Helm foi somente estático (binário ausente).
Build/typecheck/lint/full unit não executados nessa coleta, envelopes externos ausentes.
O próprio gate rejeitou a integridade do candidato porque o worktree estava sujo.

Inventário exato de critérios abertos nessa coleta:

- P0 (20 critérios no gate): `CMD-01` (FAIL), `CMD-14` (NOT_RUN), `CMD-15` (NOT_RUN), `CMD-16` (NOT_RUN), `CMD-17` (NOT_RUN), `RELEASE-MANIFEST` (NOT_RUN), `SECURITY-EVIDENCE` (NOT_RUN), `BACKUP-DRILL` (NOT_RUN), `CI-REMOTE` (NOT_RUN), `CRITICAL-TESTS` (NOT_RUN), `E2E` (NOT_RUN), `WORKFLOW-POSTGRES` (NOT_RUN), `RLS-RUNTIME` (NOT_RUN), `WORKER-CRASH` (NOT_RUN), `CLINICAL-E2E` (NOT_RUN), `AUDIT-INTEGRITY` (NOT_RUN), `HOSPITAL-UAT` (NOT_RUN), `IMAGE-ATTESTATIONS` (NOT_RUN), `BRANCH-PROTECTION` (NOT_RUN), `RELEASE-AUTHORITY` (NOT_RUN).

- P1 (3 critérios no gate): `PERFORMANCE` (NOT_RUN), `DEPLOY-TARGET` (NOT_RUN), `HELM-TARGET` (NOT_RUN).

- P2 (0 critérios no gate): nenhum neste gate; cobertura integral do prompt ainda não provada.
