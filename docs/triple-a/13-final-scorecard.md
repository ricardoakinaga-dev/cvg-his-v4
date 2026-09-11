# Triple-A — Current Scorecard

| Campo | Estado |
| --- | --- |
| CURRENT CODE CANDIDATE | `bb03b74a513a6ab8ced2e4fb1cb2c6cf77ae276e` |
| MAIN / ORIGIN | O candidato funcional `ecd75335` foi fast-forward para `main`; este snapshot documental é um commit separado |
| CURRENT CI | [#124](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34634177739): `pending` no SHA exato |
| LAST TERMINAL BASELINE | [#121](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34624736494) no SHA anterior: `failure`, 15/16; somente Performance falhou |
| CURRENT SCORE | `34` no gate estrito local; mínimo congelado `97` |
| CURRENT CRITICAL SCORE | `23` no gate estrito local; mínimo congelado `95` |
| CURRENT OPEN P0 | `27` no gate estrito local; máximo congelado `0` |
| LOCAL VALIDATION | API `590/590`, E2E clínico `2/2`, SPA focada `32/32`, build/lint e Playwright discovery passaram |
| CURRENT VERDICT | **BLOCKED / NOT PROVEN**; `publication_allowed=false` |

O commit atual acrescenta a prova canônica de internação (admissão, leito,
handover, alta, auditoria e invariantes de tenant), liga as métricas clínicas
agregadas ao composition root da API e corrige a relação ARIA das abas de
workflow. Essas validações locais não substituem CI terminal verde, governança
da branch, ambiente alvo, recuperação, soak, UAT ou autoridade de release.

O gate estrito `TRIPLE_A_SKIP_EXECUTION=1 pnpm release:triple-a` no SHA atual
retornou `BLOCKED`, score `34`, critical `23` e `27` P0 abertos. Thresholds não
foram relaxados e nenhum envelope foi promovido como certificação.

O prompt preservado está em [MASTER_PROMPT_STATE_OF_ART.md](./MASTER_PROMPT_STATE_OF_ART.md),
SHA-256 `872014ed989fa4b565bbab5293009c13ef6437104204cbf39c876e64a593f745`.
O quality bar congelado continua em [QUALITY_BAR_V1.json](./QUALITY_BAR_V1.json).
Detalhes de execução estão em [15-current-baseline.md](./15-current-baseline.md),
[17-current-execution-evidence.md](./17-current-execution-evidence.md) e no
[EXECUTION_LOG.md](./EXECUTION_LOG.md). O histórico anterior está em
[scorecard-history](./scorecard-history).
