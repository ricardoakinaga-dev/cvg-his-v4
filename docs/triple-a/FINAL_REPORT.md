# CVG-HIS V4 — Current Assurance Report

**Code candidate:** `main@ecd75335381cd85ee7e20fb3f97302f769a0b539`
**Observed:** `2026-09-11T18:19:59Z`
**Repository state:** o candidato funcional foi publicado em `main` por fast-forward, sem force-push; este relatório é um snapshot documental posterior.
**Verdict:** **BLOCKED / NOT PROVEN**

O candidato publicado adiciona a jornada canônica de internação, métricas
clínicas agregadas ligadas ao `/metrics` e uma correção de acessibilidade nas
abas de workflow. A validação local passou API `590/590`, E2E clínico `2/2` e
SPA focada `32/32`.

O CI exato [#122](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34632644376)
ainda está `in_progress`. O run anterior #121 pertence ao SHA anterior e
falhou somente em Performance; nenhum resultado é transferido entre commits.
O gate estrito local do candidato é `BLOCKED`, score `34`, critical `23`,
`27` P0 e `publication_allowed=false`.

O quality bar congelado exige score geral mínimo `97`, score crítico mínimo `95`,
zero P0 e main verde no mesmo candidato. Permanecem sem prova suficiente
governança da branch, RLS no runtime alvo, recovery/restore, deploy/rollback,
soak, attestation, UAT humano e autoridade de release. Este relatório não emite
`TRIPLE-A VERIFIED`.

O prompt está preservado em [MASTER_PROMPT_STATE_OF_ART.md](./MASTER_PROMPT_STATE_OF_ART.md),
com SHA-256 `872014ed989fa4b565bbab5293009c13ef6437104204cbf39c876e64a593f745`.
O histórico de scorecards está em [scorecard-history](./scorecard-history).
