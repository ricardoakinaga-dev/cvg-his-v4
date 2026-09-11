# State of Art — rastreabilidade das 76 fases

Fonte da missão desta execução: [prompt State of Art preservado](./MASTER_PROMPT_STATE_OF_ART.md).
O quality bar mantém como fonte congelada o [prompt histórico](./MASTER_PROMPT.md),
declarado em `QUALITY_BAR_V1.json`; o gate valida o caminho e o SHA declarados
pelo próprio quality bar. Os dois documentos são preservados deliberadamente:
o primeiro contém a missão expandida desta execução e o segundo mantém a
proveniência da régua congelada sem misturar candidatos ou alterar thresholds.
A tabela mantém o escopo completo. “NOT PROVEN” significa que a aceitação
integral da fase não foi demonstrada no candidato corrente; não significa
que o código esteja ausente. Evidência local, CI e alvo são avaliados separadamente.
A implementação corrente `ecd75335381cd85ee7e20fb3f97302f769a0b539` adiciona
evidência local para F15/F16/F47/F50/F52/F54/F55: os dois specs clínicos passam
localmente, os gauges clínicos são compostos no `/metrics` sem labels de tenant
e a página de workflow mantém relações ARIA estáveis. Essas provas continuam
abaixo da aceitação integral porque o CI do SHA está em execução e ainda faltam
target, governança, UAT e autoridade de release.
A [fotografia atual](./15-current-baseline.md) contém SHA, CI e lacunas medidas.

| ID | Requisito do prompt | Estado integral | Próxima prova de aceitação |
| --- | --- | --- | --- |
| F00 | BASELINE FRESCO | PARTIAL | Baseline fresco registrado; fechar inventário por evidência corrente |
| F01 | GREEN MAIN | NOT PROVEN | Todos os jobs obrigatórios verdes no mesmo SHA |
| F02 | CI DETERMINISM | NOT PROVEN | Executar e revisar todos os itens desta fase no boundary exigido |
| F03 | CROSS-PLATFORM CI | NOT PROVEN | Executar e revisar todos os itens desta fase no boundary exigido |
| F04 | BRANCH GOVERNANCE | NOT PROVEN | Executar e revisar todos os itens desta fase no boundary exigido |
| F05 | RELEASE EVIDENCE BY SHA | NOT PROVEN | Executar e revisar todos os itens desta fase no boundary exigido |
| F06 | SCORECARD CLEANUP | PARTIAL | Scorecard sem mistura de candidatos; histórico preservado |
| F07 | CLINICAL WORKFLOW ASSURANCE | NOT PROVEN | Executar e revisar todos os itens desta fase no boundary exigido |
| F08 | WORKFLOW POSTGRES TESTS | NOT PROVEN | Executar e revisar todos os itens desta fase no boundary exigido |
| F09 | WORKFLOW CONCURRENCY | NOT PROVEN | Executar e revisar todos os itens desta fase no boundary exigido |
| F10 | LEASE / FENCING | NOT PROVEN | Executar e revisar todos os itens desta fase no boundary exigido |
| F11 | WORKER CRASH RECOVERY | NOT PROVEN | Executar e revisar todos os itens desta fase no boundary exigido |
| F12 | RETRY POLICY | NOT PROVEN | Executar e revisar todos os itens desta fase no boundary exigido |
| F13 | DLQ ASSURANCE | NOT PROVEN | Executar e revisar todos os itens desta fase no boundary exigido |
| F14 | CLINICAL CRITICALITY MATRIX | NOT PROVEN | Executar e revisar todos os itens desta fase no boundary exigido |
| F15 | GOLDEN CLINICAL PATH | NOT PROVEN | Executar e revisar todos os itens desta fase no boundary exigido |
| F16 | NEGATIVE GOLDEN PATH | NOT PROVEN | Executar e revisar todos os itens desta fase no boundary exigido |
| F17 | CLINICAL SAFETY INVARIANTS | NOT PROVEN | Executar e revisar todos os itens desta fase no boundary exigido |
| F18 | RLS RUNTIME PROOF | NOT PROVEN | Executar e revisar todos os itens desta fase no boundary exigido |
| F19 | DATABASE ROLE MATRIX | NOT PROVEN | Executar e revisar todos os itens desta fase no boundary exigido |
| F20 | DATABASE INVARIANTS | NOT PROVEN | Executar e revisar todos os itens desta fase no boundary exigido |
| F21 | BILLING CONCURRENCY | NOT PROVEN | Executar e revisar todos os itens desta fase no boundary exigido |
| F22 | AUTH SESSION ASSURANCE | NOT PROVEN | Executar e revisar todos os itens desta fase no boundary exigido |
| F23 | API SECURITY | NOT PROVEN | Executar e revisar todos os itens desta fase no boundary exigido |
| F24 | WEBHOOK SECURITY | NOT PROVEN | Executar e revisar todos os itens desta fase no boundary exigido |
| F25 | ATTACHMENT SECURITY | NOT PROVEN | Executar e revisar todos os itens desta fase no boundary exigido |
| F26 | SECRET SECURITY | NOT PROVEN | Executar e revisar todos os itens desta fase no boundary exigido |
| F27 | SUPPLY CHAIN | NOT PROVEN | Executar e revisar todos os itens desta fase no boundary exigido |
| F28 | IMAGE ATTESTATION | NOT PROVEN | Executar e revisar todos os itens desta fase no boundary exigido |
| F29 | CONTAINER SCAN | NOT PROVEN | Executar e revisar todos os itens desta fase no boundary exigido |
| F30 | PROVENANCE | NOT PROVEN | Executar e revisar todos os itens desta fase no boundary exigido |
| F31 | PERFORMANCE REHEARSAL | NOT PROVEN | Executar e revisar todos os itens desta fase no boundary exigido |
| F32 | PERFORMANCE SLO | NOT PROVEN | Executar e revisar todos os itens desta fase no boundary exigido |
| F33 | REALISTIC HOSPITAL LOAD | NOT PROVEN | Executar e revisar todos os itens desta fase no boundary exigido |
| F34 | QUERY PERFORMANCE | NOT PROVEN | Executar e revisar todos os itens desta fase no boundary exigido |
| F35 | CONNECTION POOL | NOT PROVEN | Executar e revisar todos os itens desta fase no boundary exigido |
| F36 | SOAK 24H | NOT PROVEN | 24 horas reais medidas e sem crescimento não limitado |
| F37 | SOAK 72H | NOT PROVEN | 72 horas reais após 24h verdes, ou justificativa formal conforme DoD |
| F38 | BACKUP | NOT PROVEN | Executar e revisar todos os itens desta fase no boundary exigido |
| F39 | RESTORE DRILL | NOT PROVEN | Executar e revisar todos os itens desta fase no boundary exigido |
| F40 | RPO / RTO | NOT PROVEN | Executar e revisar todos os itens desta fase no boundary exigido |
| F41 | CORRUPT BACKUP | NOT PROVEN | Executar e revisar todos os itens desta fase no boundary exigido |
| F42 | DEPLOY REHEARSAL | NOT PROVEN | Executar e revisar todos os itens desta fase no boundary exigido |
| F43 | ROLLBACK | NOT PROVEN | Executar e revisar todos os itens desta fase no boundary exigido |
| F44 | MIGRATION SAFETY | NOT PROVEN | Executar e revisar todos os itens desta fase no boundary exigido |
| F45 | API OBSERVABILITY | NOT PROVEN | Executar e revisar todos os itens desta fase no boundary exigido |
| F46 | WORKER OBSERVABILITY | NOT PROVEN | Executar e revisar todos os itens desta fase no boundary exigido |
| F47 | CLINICAL OBSERVABILITY | NOT PROVEN | Executar e revisar todos os itens desta fase no boundary exigido |
| F48 | ALERTING | NOT PROVEN | Executar e revisar todos os itens desta fase no boundary exigido |
| F49 | SLO / ERROR BUDGET | NOT PROVEN | Executar e revisar todos os itens desta fase no boundary exigido |
| F50 | FRONTEND E2E | NOT PROVEN | Executar e revisar todos os itens desta fase no boundary exigido |
| F51 | VISUAL REGRESSION | NOT PROVEN | Executar e revisar todos os itens desta fase no boundary exigido |
| F52 | ACCESSIBILITY | NOT PROVEN | Executar e revisar todos os itens desta fase no boundary exigido |
| F53 | PATIENT 360 | NOT PROVEN | Executar e revisar todos os itens desta fase no boundary exigido |
| F54 | WORKFLOW UX | NOT PROVEN | Executar e revisar todos os itens desta fase no boundary exigido |
| F55 | HANDOVER | NOT PROVEN | Executar e revisar todos os itens desta fase no boundary exigido |
| F56 | HUMAN UAT | NOT PROVEN | Participantes humanos autorizados e aceite nominal |
| F57 | UAT SCENARIOS | NOT PROVEN | Feedback e defeitos reais dos cenários UAT |
| F58 | ARCHITECTURE BOUNDARIES | NOT PROVEN | Executar e revisar todos os itens desta fase no boundary exigido |
| F59 | COMPOSITION ROOT | NOT PROVEN | Executar e revisar todos os itens desta fase no boundary exigido |
| F60 | WORKFLOW REPOSITORY COMPLEXITY | NOT PROVEN | Executar e revisar todos os itens desta fase no boundary exigido |
| F61 | CONTRACT SCALABILITY | NOT PROVEN | Executar e revisar todos os itens desta fase no boundary exigido |
| F62 | DEPENDENCY GOVERNANCE | NOT PROVEN | Executar e revisar todos os itens desta fase no boundary exigido |
| F63 | REPOSITORY HYGIENE | NOT PROVEN | Executar e revisar todos os itens desta fase no boundary exigido |
| F64 | DOCUMENTATION GOVERNANCE | NOT PROVEN | Executar e revisar todos os itens desta fase no boundary exigido |
| F65 | DOCUMENTATION DRIFT | NOT PROVEN | Executar e revisar todos os itens desta fase no boundary exigido |
| F66 | SECURITY CRITIC | NOT PROVEN | Executar e revisar todos os itens desta fase no boundary exigido |
| F67 | CLINICAL CRITIC | NOT PROVEN | Executar e revisar todos os itens desta fase no boundary exigido |
| F68 | DATABASE CRITIC | NOT PROVEN | Executar e revisar todos os itens desta fase no boundary exigido |
| F69 | OPERATIONS CRITIC | NOT PROVEN | Executar e revisar todos os itens desta fase no boundary exigido |
| F70 | UX CRITIC | NOT PROVEN | Executar e revisar todos os itens desta fase no boundary exigido |
| F71 | RELEASE GATE | NOT PROVEN | Executar e revisar todos os itens desta fase no boundary exigido |
| F72 | FRESHNESS POLICY | PARTIAL | `scripts/run-triple-a-release-gate.mjs` rejeita envelopes expirados e timestamps futuros; a política padrão é 7 dias com skew de 5 minutos. Revalidar em cada candidato e completar as regras específicas de target/soak. |
| F73 | FINAL ARTIFACT | NOT PROVEN | Executar e revisar todos os itens desta fase no boundary exigido |
| F74 | FINAL SCORE | NOT PROVEN | Score calculado de evidências válidas: 97/95/zero P0 |
| F75 | TRIPLE-A VERIFIED | NOT PROVEN | Todos os gates e autoridade satisfeitos no mesmo candidato |

## Política de fechamento

Cada fase só muda para PASS com links aos comandos/artefatos, timestamp, ambiente,
issuer/revisor, SHA e resultado. Evidência de worktree modificado permanece
précommit; não é promovida ao commit final. Envelopes ausentes, skips e falhas
não são aceitos. A ordem obrigatória do prompt permanece vinculante.

Aprovações de críticos nesta rodada são limitadas aos arquivos julgados; não
substituem os críticos finais de segurança, clínica, banco, operação e UX,
nem o UAT humano ou a autoridade de liberação.
