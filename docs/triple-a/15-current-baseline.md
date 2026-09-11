# Baseline corrente — State of Art

Observado em 2026-09-11T14:53:11Z. O HEAD corrente é
`e8d7eaec35004c9492db78920c8652c8171bfd1e`; o código funcional foi preservado
nos commits anteriores. `main` e `origin/main` estão sincronizados. O run #116
do HEAD exato falhou apenas em Performance (k6 SLOs). A execução local corrente de
PostgreSQL, processos críticos e k6 está detalhada em
[17-current-execution-evidence.md](./17-current-execution-evidence.md). Esta
entrada separa o candidato local, o remoto e os resultados de CI; nenhum
resultado de outro SHA é transferido.

## Estado do candidato atual

| Campo | Evidência atual |
| --- | --- |
| current_sha | `e8d7eaec35004c9492db78920c8652c8171bfd1e` |
| main_sha | `e8d7eaec35004c9492db78920c8652c8171bfd1e` |
| origin/main | `e8d7eaec35004c9492db78920c8652c8171bfd1e` |
| worktree | Limpo para arquivos rastreados; artefatos locais estão ignorados |
| ci_run | [#34609488994](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34609488994), `failure`, 15/16 jobs; Performance (k6 SLOs) falhou no HEAD `e8d7eaec` |
| overall_score | gate estrito local em `e8d7eaec`: 34; mínimo congelado 97 |
| critical_score | gate estrito local em `e8d7eaec`: 23; mínimo congelado 95 |
| open_p0 | gate estrito local em `e8d7eaec`: 27; máximo congelado 0 |
| implemented | Frescor de envelopes externos com fail-closed, identidade de prompt declarada no quality bar, tabs acessíveis no seletor de clientes, ações sem controles aninhados, região acessível para criação de execução e alvo de toque de 44px no modal |
| verified_local | Testes focados SPA 3/3 e 33/33, design-system 5/5, lint/typecheck dos dois pacotes, gate 15/15, docs:validate e diff check passaram; evidência bounded de PostgreSQL 66/66, processos 11/11 e k6 local 9/9 permanece limitada ao snapshot documentado |
| verified_remote | Run #116 no HEAD `e8d7eaec`: 15/16 jobs passaram; `Run k6 benchmark` falhou (exit 99) e `Check SLO results` falhou (exit 1) |
| verified_target | NOT PROVEN |
| blocked | Performance falhou no CI do HEAD; quality bar e gate estrito continuam abaixo do limiar; branch governance, ambiente alvo, recuperação/soak, UAT, attestation e autoridade de release permanecem sem prova |
| not_proven | Quality bar 97/95/zero P0, Windows nativo fora do runner Linux, RLS/DB runtime no alvo, deploy/rollback, restore/RPO/RTO, attestation, observabilidade operacional e provas humanas |

## Evidência corrente

As execuções locais descartáveis desta fotografia estão em [17-current-execution-evidence.md](./17-current-execution-evidence.md). Elas são evidência de implementação e runtime local; não substituem o boundary remoto ou o alvo exigido pelo quality bar.

O gate estrito `pnpm release:triple-a` foi executado com a execução pesada desabilitada no HEAD `e8d7eaec` e produziu `BLOCKED / NOT PROVEN`, score `34`, critical `23` e `27` P0 abertos. O JSON temporário não foi promovido a artefato de release.

### Candidato atual — `bb16a47f`

O CI [#34593912427](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34593912427) terminou no SHA exato `bb16a47f` com 15/16 jobs em `success`; Performance (k6 SLOs) falhou. O run #110 foi supersedido após `Repository Guards` detectar o hash antigo de `packages/modules/billing/src/index.ts`; o manifesto foi atualizado antes desta execução. O caminho de estimativa de billing usa leitura record-only e preserva o subtotal persistido quando os itens não são carregados; os testes locais do módulo, API, workspace e identidade crítica passaram. O artefato de performance observado é `performance-k6-report`, digest `sha256:212cd76b10ac0d746fa3f576d35876791016c5dfef3e2ca2282d382cae269cac`; logs detalhados não estão disponíveis sem autenticação administrativa.

### Evidência histórica — `5b036836`

O CI [#34587238104](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34587238104) executou no SHA exato `5b036836bf71bc3a6c62bd151a2b19f235d3e2fc` e terminou `failure` com 14/16 jobs aprovados. Unit Tests e Performance (k6 SLOs) falharam; Integration, E2E SPA, Visual, Windows, API Contract e os checks preparatórios passaram. Os artefatos observados incluem `e2e-spa` com digest `sha256:e9904403f4b88207463562f5c6c0ea90725c253a6778e1ac1f51366ee0405c20`, `performance-k6-report` com `sha256:7c48e9055ae1d7866d4010594d181b314ea5a7d66359524780a02f5860851bcc`, `visual-regression-report` com `sha256:eae9d0244c2f92cfe43c4b97c070b49f878d3f354f9b8513ca8da5e1185cda4d`, `coverage-report` com `sha256:60605ee4083121d22c520e534ee09c0763bff3b66883fb28f67486026e8b1468` e `security-evidence` com `sha256:9ce1d6e7c6f195d1c2d06677e18a1c6d755ab0bb5aefd8832cb7fbd4e27e752c`.

O run remoto deste candidato é terminal, mas não verde: Unit Tests e Performance falharam. Os logs detalhados dos jobs falhos não estão disponíveis pela API pública sem autenticação administrativa; nenhuma causa é inventada e nenhum run anterior transfere PASS para este SHA.

O benchmark k6 remoto deste SHA falhou novamente; os thresholds não foram relaxados. A reprodução local do perfil operacional mínimo e os contratos de recuperação permanecem evidência limitada e não substituem o runner CI pinned nem certificam ambiente alvo. A nova validação de restore aceita corretamente bundles database-only quando `storageIncluded=false`, e o Helm de produção exige digest OCI válido; nenhum desses checks prova restore live, deploy ou autoridade humana.

Os checks locais vinculados a `5b036836` passaram dentro dos limites registrados no ledger; Docker e o binário Helm não estão disponíveis neste ambiente, portanto não há claim de restore live ou render alvo. A evidência de segurança/SBOM, provenance e os checks estáticos permanece limitada ao que foi executado.

O CI exato do SHA `5b036836` produziu `BLOCKED` por falhas em Unit Tests e Performance; o score diagnóstico histórico `56/32/15` não é reutilizado. O gate permanece fail-closed e não autoriza publicação.

O prompt integral continua byte a byte em [MASTER_PROMPT_STATE_OF_ART.md](./MASTER_PROMPT_STATE_OF_ART.md), SHA-256 872014ed989fa4b565bbab5293009c13ef6437104204cbf39c876e64a593f745. O [QUALITY_BAR_V1.json](./QUALITY_BAR_V1.json) permanece congelado em 97/95/zero P0. O gate agora escreve o mesmo envelope no bundle operacional `artifacts/release/TRIPLE_A_RELEASE_EVIDENCE.json` e no caminho canônico exigido `artifacts/triple-a/TRIPLE_A_RELEASE_EVIDENCE.json`; nenhum envelope atual foi promovido como certificação.

Os pareceres correntes estão em [final-security-critic.md](./final-security-critic.md), [final-clinical-critic.md](./final-clinical-critic.md), [final-database-critic.md](./final-database-critic.md), [final-operations-critic.md](./final-operations-critic.md) e [final-ux-critic.md](./final-ux-critic.md). Todos permanecem BLOCKED / NOT PROVEN e listam a evidência necessária para fechamento.

## Decisão corrente

**BLOCKED / NOT PROVEN.** O merge permanece reversível, mas a certificação Triple-A, o release e o claim TRIPLE-A VERIFIED continuam bloqueados enquanto o CI exato não termina verde e as evidências externas, operacionais e humanas permanecem ausentes.

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
