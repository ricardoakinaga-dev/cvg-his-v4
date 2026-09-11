# Baseline corrente — State of Art

Observado em `2026-09-11T18:19:59Z`. Este snapshot descreve somente o candidato
`ecd75335381cd85ee7e20fb3f97302f769a0b539`; evidência de outro SHA permanece
histórica e não é reutilizada.

| Campo | Evidência atual |
| --- | --- |
| current_sha | `ecd75335381cd85ee7e20fb3f97302f769a0b539` |
| main_sha | `ecd75335381cd85ee7e20fb3f97302f769a0b539` — candidato funcional fast-forward; este snapshot é documental |
| origin_main | `ecd75335381cd85ee7e20fb3f97302f769a0b539` verificado após o push funcional |
| worktree | Limpo; artefatos locais permanecem ignorados |
| ci_run | [#122](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34632644376), `in_progress`, SHA exato |
| overall_score | `34`; mínimo congelado `97` |
| critical_score | `23`; mínimo congelado `95` |
| open_p0 | `27`; máximo congelado `0` |
| implemented | E2E inpatient canônico, métricas clínicas tenant-aggregated sem labels, execução automática de gauges no `/metrics`, relação ARIA estável nas abas de workflow |
| verified_local | API `590/590`; teste novo de métricas `2/2`; E2E clínico combinado `2/2` em PostgreSQL/Redis local; SPA focada `32/32`; build, lint, Prettier dos arquivos novos e Playwright discovery passaram |
| verified_remote | CI #122 ainda sem resultado; CI #121 do SHA anterior falhou somente em Performance e não é transferido |
| verified_target | NOT PROVEN |
| blocked | Gate estrito abaixo de `97/95/zero P0`; CI do candidato ainda não terminal; target, governança, recovery, soak, UAT e autoridade de release sem prova |
| not_proven | Branch protection/required checks, RLS runtime no target, deploy/rollback, restore/RPO/RTO, attestation, soak 24/72h, tracing/pool no target, UAT humano e aprovação de release |

O gate local escreveu `BLOCKED / NOT PROVEN` em
`artifacts/release/TRIPLE_A_RELEASE_EVIDENCE.json` e manteve
`publication_allowed=false`. O arquivo é diagnóstico e não foi promovido ao
repositório.

O prompt integral e seu hash estão em [MASTER_PROMPT_STATE_OF_ART.md](./MASTER_PROMPT_STATE_OF_ART.md);
a régua congelada permanece byte a byte em [QUALITY_BAR_V1.json](./QUALITY_BAR_V1.json).
