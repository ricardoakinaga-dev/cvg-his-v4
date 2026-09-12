# State of Art — rastreabilidade das 76 fases

Fonte da missão desta execução: [prompt State of Art preservado](./MASTER_PROMPT_STATE_OF_ART.md).
O quality bar mantém como fonte congelada o [prompt histórico](./MASTER_PROMPT.md),
declarado em `QUALITY_BAR_V1.json`; o gate valida o caminho e o SHA declarados
pelo próprio quality bar. O [crosswalk normativo](./18-master-prompt-crosswalk.md)
liga cada uma das 61 fases do prompt congelado às 76 linhas operacionais desta
matriz e valida os hashes, títulos, trechos e requisitos explícitos. Os dois documentos são preservados deliberadamente:
o primeiro contém a missão expandida desta execução e o segundo mantém a
proveniência da régua congelada sem misturar candidatos ou alterar thresholds.
A tabela mantém o escopo completo. “NOT PROVEN” significa que a aceitação
integral da fase não foi demonstrada no candidato corrente; não significa que o
código esteja ausente. Evidência local, CI e alvo são avaliados separadamente.
A fotografia vigente é o candidato de código
`6462323f0a8f311f57da201e35e3d66994996391`, com hardening conjunto de logging, workflow e tenant;
a documentação sucede o candidato de assurance `0d475dee` e o candidato
funcional/workflow `553078be60c963ffb7cab5c45c130912e5e299b8`. O [CI #155](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34695557227) pertence ao commit documental anterior e não possui resultado terminal aceito para `a258b3ce`. O
último CI terminal histórico passou os guards e falhou exclusivamente em
Performance/k6; não há CI verde atual, target, governança, UAT ou autoridade de
release comprovados. A [fotografia atual](./15-current-baseline.md) contém SHA,
CI e lacunas medidas.

## Reconciliação histórica do candidato funcional — 2026-09-12

O candidato funcional vigente é `1e0077a3d8f7a10ea5e53d7d9f8f0fdee2dca689`.
O [CI #137](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34667412200)
terminou `success` com 16/16 jobs, incluindo Performance/k6, E2E SPA/usabilidade,
Integration, Unit e Visual. O candidato também endurece a validação de envelopes
de evidência, fecha loops de readiness após timeout e corrige o contrato de
artefatos do release.

Isso atualiza F01 apenas para a dimensão de execução do CI. A aceitação integral
permanece `NOT PROVEN`: o gate local `pnpm release:triple-a` retornou
`BLOCKED`, score `54`, critical `54`, `16` P0 abertos e `publication_allowed=false`.
Continuam ausentes provas autenticadas de governança, RLS/roles no target,
worker/recovery, restore, deploy/rollback, soak, attestation, UAT e autoridade
de release. Resultados históricos não são transferidos entre SHAs.

| ID  | Requisito do prompt            | Estado integral | Próxima prova de aceitação                                                                                                                                                                                                |
| --- | ------------------------------ | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F00 | BASELINE FRESCO                | PARTIAL         | Baseline fresco registrado; fechar inventário por evidência corrente                                                                                                                                                      |
| F01 | GREEN MAIN                     | NOT PROVEN      | Todos os jobs obrigatórios verdes no mesmo SHA                                                                                                                                                                            |
| F02 | CI DETERMINISM                 | NOT PROVEN      | Executar e revisar todos os itens desta fase no boundary exigido                                                                                                                                                          |
| F03 | CROSS-PLATFORM CI              | NOT PROVEN      | Executar e revisar todos os itens desta fase no boundary exigido                                                                                                                                                          |
| F04 | BRANCH GOVERNANCE              | NOT PROVEN      | Executar e revisar todos os itens desta fase no boundary exigido                                                                                                                                                          |
| F05 | RELEASE EVIDENCE BY SHA        | NOT PROVEN      | Executar e revisar todos os itens desta fase no boundary exigido                                                                                                                                                          |
| F06 | SCORECARD CLEANUP              | PARTIAL         | Scorecard sem mistura de candidatos; histórico preservado                                                                                                                                                                 |
| F07 | CLINICAL WORKFLOW ASSURANCE    | NOT PROVEN      | Executar e revisar todos os itens desta fase no boundary exigido                                                                                                                                                          |
| F08 | WORKFLOW POSTGRES TESTS        | NOT PROVEN      | Executar e revisar todos os itens desta fase no boundary exigido                                                                                                                                                          |
| F09 | WORKFLOW CONCURRENCY           | NOT PROVEN      | Executar e revisar todos os itens desta fase no boundary exigido                                                                                                                                                          |
| F10 | LEASE / FENCING                | NOT PROVEN      | Executar e revisar todos os itens desta fase no boundary exigido                                                                                                                                                          |
| F11 | WORKER CRASH RECOVERY          | NOT PROVEN      | Executar e revisar todos os itens desta fase no boundary exigido                                                                                                                                                          |
| F12 | RETRY POLICY                   | NOT PROVEN      | Executar e revisar todos os itens desta fase no boundary exigido                                                                                                                                                          |
| F13 | DLQ ASSURANCE                  | NOT PROVEN      | Executar e revisar todos os itens desta fase no boundary exigido                                                                                                                                                          |
| F14 | CLINICAL CRITICALITY MATRIX    | NOT PROVEN      | Executar e revisar todos os itens desta fase no boundary exigido                                                                                                                                                          |
| F15 | GOLDEN CLINICAL PATH           | NOT PROVEN      | Executar e revisar todos os itens desta fase no boundary exigido                                                                                                                                                          |
| F16 | NEGATIVE GOLDEN PATH           | NOT PROVEN      | Executar e revisar todos os itens desta fase no boundary exigido                                                                                                                                                          |
| F17 | CLINICAL SAFETY INVARIANTS     | NOT PROVEN      | Executar e revisar todos os itens desta fase no boundary exigido                                                                                                                                                          |
| F18 | RLS RUNTIME PROOF              | NOT PROVEN      | Executar e revisar todos os itens desta fase no boundary exigido                                                                                                                                                          |
| F19 | DATABASE ROLE MATRIX           | NOT PROVEN      | Executar e revisar todos os itens desta fase no boundary exigido                                                                                                                                                          |
| F20 | DATABASE INVARIANTS            | NOT PROVEN      | Executar e revisar todos os itens desta fase no boundary exigido                                                                                                                                                          |
| F21 | BILLING CONCURRENCY            | NOT PROVEN      | Executar e revisar todos os itens desta fase no boundary exigido                                                                                                                                                          |
| F22 | AUTH SESSION ASSURANCE         | NOT PROVEN      | Executar e revisar todos os itens desta fase no boundary exigido                                                                                                                                                          |
| F23 | API SECURITY                   | NOT PROVEN      | Executar e revisar todos os itens desta fase no boundary exigido                                                                                                                                                          |
| F24 | WEBHOOK SECURITY               | NOT PROVEN      | Executar e revisar todos os itens desta fase no boundary exigido                                                                                                                                                          |
| F25 | ATTACHMENT SECURITY            | NOT PROVEN      | Executar e revisar todos os itens desta fase no boundary exigido                                                                                                                                                          |
| F26 | SECRET SECURITY                | NOT PROVEN      | Executar e revisar todos os itens desta fase no boundary exigido                                                                                                                                                          |
| F27 | SUPPLY CHAIN                   | NOT PROVEN      | Executar e revisar todos os itens desta fase no boundary exigido                                                                                                                                                          |
| F28 | IMAGE ATTESTATION              | NOT PROVEN      | Executar e revisar todos os itens desta fase no boundary exigido                                                                                                                                                          |
| F29 | CONTAINER SCAN                 | NOT PROVEN      | Executar e revisar todos os itens desta fase no boundary exigido                                                                                                                                                          |
| F30 | PROVENANCE                     | NOT PROVEN      | Executar e revisar todos os itens desta fase no boundary exigido                                                                                                                                                          |
| F31 | PERFORMANCE REHEARSAL          | NOT PROVEN      | Executar e revisar todos os itens desta fase no boundary exigido                                                                                                                                                          |
| F32 | PERFORMANCE SLO                | NOT PROVEN      | Executar e revisar todos os itens desta fase no boundary exigido                                                                                                                                                          |
| F33 | REALISTIC HOSPITAL LOAD        | NOT PROVEN      | Executar e revisar todos os itens desta fase no boundary exigido                                                                                                                                                          |
| F34 | QUERY PERFORMANCE              | NOT PROVEN      | Executar e revisar todos os itens desta fase no boundary exigido                                                                                                                                                          |
| F35 | CONNECTION POOL                | NOT PROVEN      | Executar e revisar todos os itens desta fase no boundary exigido                                                                                                                                                          |
| F36 | SOAK 24H                       | NOT PROVEN      | 24 horas reais medidas e sem crescimento não limitado                                                                                                                                                                     |
| F37 | SOAK 72H                       | NOT PROVEN      | 72 horas reais após 24h verdes, ou justificativa formal conforme DoD                                                                                                                                                      |
| F38 | BACKUP                         | NOT PROVEN      | Executar e revisar todos os itens desta fase no boundary exigido                                                                                                                                                          |
| F39 | RESTORE DRILL                  | NOT PROVEN      | Executar e revisar todos os itens desta fase no boundary exigido                                                                                                                                                          |
| F40 | RPO / RTO                      | NOT PROVEN      | Executar e revisar todos os itens desta fase no boundary exigido                                                                                                                                                          |
| F41 | CORRUPT BACKUP                 | NOT PROVEN      | Executar e revisar todos os itens desta fase no boundary exigido                                                                                                                                                          |
| F42 | DEPLOY REHEARSAL               | NOT PROVEN      | Executar e revisar todos os itens desta fase no boundary exigido                                                                                                                                                          |
| F43 | ROLLBACK                       | NOT PROVEN      | Executar e revisar todos os itens desta fase no boundary exigido                                                                                                                                                          |
| F44 | MIGRATION SAFETY               | NOT PROVEN      | Executar e revisar todos os itens desta fase no boundary exigido                                                                                                                                                          |
| F45 | API OBSERVABILITY              | NOT PROVEN      | Executar e revisar todos os itens desta fase no boundary exigido                                                                                                                                                          |
| F46 | WORKER OBSERVABILITY           | NOT PROVEN      | Executar e revisar todos os itens desta fase no boundary exigido                                                                                                                                                          |
| F47 | CLINICAL OBSERVABILITY         | NOT PROVEN      | Executar e revisar todos os itens desta fase no boundary exigido                                                                                                                                                          |
| F48 | ALERTING                       | NOT PROVEN      | Executar e revisar todos os itens desta fase no boundary exigido                                                                                                                                                          |
| F49 | SLO / ERROR BUDGET             | NOT PROVEN      | Executar e revisar todos os itens desta fase no boundary exigido                                                                                                                                                          |
| F50 | FRONTEND E2E                   | NOT PROVEN      | Executar e revisar todos os itens desta fase no boundary exigido                                                                                                                                                          |
| F51 | VISUAL REGRESSION              | NOT PROVEN      | Executar e revisar todos os itens desta fase no boundary exigido                                                                                                                                                          |
| F52 | ACCESSIBILITY                  | NOT PROVEN      | Executar e revisar todos os itens desta fase no boundary exigido                                                                                                                                                          |
| F53 | PATIENT 360                    | NOT PROVEN      | Executar e revisar todos os itens desta fase no boundary exigido                                                                                                                                                          |
| F54 | WORKFLOW UX                    | NOT PROVEN      | Executar e revisar todos os itens desta fase no boundary exigido                                                                                                                                                          |
| F55 | HANDOVER                       | NOT PROVEN      | Executar e revisar todos os itens desta fase no boundary exigido                                                                                                                                                          |
| F56 | HUMAN UAT                      | NOT PROVEN      | Participantes humanos autorizados e aceite nominal                                                                                                                                                                        |
| F57 | UAT SCENARIOS                  | NOT PROVEN      | Feedback e defeitos reais dos cenários UAT                                                                                                                                                                                |
| F58 | ARCHITECTURE BOUNDARIES        | NOT PROVEN      | Executar e revisar todos os itens desta fase no boundary exigido                                                                                                                                                          |
| F59 | COMPOSITION ROOT               | NOT PROVEN      | Executar e revisar todos os itens desta fase no boundary exigido                                                                                                                                                          |
| F60 | WORKFLOW REPOSITORY COMPLEXITY | NOT PROVEN      | Executar e revisar todos os itens desta fase no boundary exigido                                                                                                                                                          |
| F61 | CONTRACT SCALABILITY           | NOT PROVEN      | Executar e revisar todos os itens desta fase no boundary exigido                                                                                                                                                          |
| F62 | DEPENDENCY GOVERNANCE          | NOT PROVEN      | Executar e revisar todos os itens desta fase no boundary exigido                                                                                                                                                          |
| F63 | REPOSITORY HYGIENE             | NOT PROVEN      | Executar e revisar todos os itens desta fase no boundary exigido                                                                                                                                                          |
| F64 | DOCUMENTATION GOVERNANCE       | NOT PROVEN      | Executar e revisar todos os itens desta fase no boundary exigido                                                                                                                                                          |
| F65 | DOCUMENTATION DRIFT            | NOT PROVEN      | Executar e revisar todos os itens desta fase no boundary exigido                                                                                                                                                          |
| F66 | SECURITY CRITIC                | NOT PROVEN      | Executar e revisar todos os itens desta fase no boundary exigido                                                                                                                                                          |
| F67 | CLINICAL CRITIC                | NOT PROVEN      | Executar e revisar todos os itens desta fase no boundary exigido                                                                                                                                                          |
| F68 | DATABASE CRITIC                | NOT PROVEN      | Executar e revisar todos os itens desta fase no boundary exigido                                                                                                                                                          |
| F69 | OPERATIONS CRITIC              | NOT PROVEN      | Executar e revisar todos os itens desta fase no boundary exigido                                                                                                                                                          |
| F70 | UX CRITIC                      | NOT PROVEN      | Executar e revisar todos os itens desta fase no boundary exigido                                                                                                                                                          |
| F71 | RELEASE GATE                   | NOT PROVEN      | Executar e revisar todos os itens desta fase no boundary exigido                                                                                                                                                          |
| F72 | FRESHNESS POLICY               | PARTIAL         | `scripts/run-triple-a-release-gate.mjs` rejeita envelopes expirados e timestamps futuros; a política padrão é 7 dias com skew de 5 minutos. Revalidar em cada candidato e completar as regras específicas de target/soak. |
| F73 | FINAL ARTIFACT                 | NOT PROVEN      | Executar e revisar todos os itens desta fase no boundary exigido                                                                                                                                                          |
| F74 | FINAL SCORE                    | NOT PROVEN      | Score calculado de evidências válidas: 97/95/zero P0                                                                                                                                                                      |
| F75 | TRIPLE-A VERIFIED              | NOT PROVEN      | Todos os gates e autoridade satisfeitos no mesmo candidato                                                                                                                                                                |

## Política de fechamento

Cada fase só muda para PASS com links aos comandos/artefatos, timestamp, ambiente,
issuer/revisor, SHA e resultado. Evidência de worktree modificado permanece
précommit; não é promovida ao commit final. Envelopes ausentes, skips e falhas
não são aceitos. A ordem obrigatória do prompt permanece vinculante.

Aprovações de críticos nesta rodada são limitadas aos arquivos julgados; não
substituem os críticos finais de segurança, clínica, banco, operação e UX,
nem o UAT humano ou a autoridade de liberação.
