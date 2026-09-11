# CVG-HIS V4 — Current Assurance Report

**Code candidate:** "main@4ca6e79364d892444dc29d9f2b1a2004300b6ab6"
**Observed:** 2026-09-11T04:37:28Z
**Merge:** fast-forward para "main"; "origin/main" e "origin/HEAD" apontam para o SHA atual, com a branch de origem preservada para rollback.
**Verdict:** **BLOCKED / NOT PROVEN**

Este relatório registra o candidato atual e sua execução CI terminal. O resultado não autoriza release porque a performance falhou e as provas externas, operacionais e humanas exigidas continuam ausentes.

O prompt vigente está preservado byte a byte em [MASTER_PROMPT_STATE_OF_ART.md](./MASTER_PROMPT_STATE_OF_ART.md), com SHA-256 872014ed989fa4b565bbab5293009c13ef6437104204cbf39c876e64a593f745. O quality bar congelado exige score geral mínimo 97, score crítico mínimo 95, zero P0, main verde e evidência atual. Nenhuma regra foi relaxada.

## Evidência ligada ao SHA atual

- O CI [#34560856450](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34560856450) terminou com 15/16 jobs aprovados. O único failure foi [Performance (k6 SLOs)](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34560856450/job/103145389086), com exit 99 no benchmark e exit 1 na verificação de SLO. O artefato `performance-k6-report` é o ID `10184658898`, digest `sha256:d6b36e6cc2c91ed269a5080b938c128118b64c584c9c29dce5b785746996bb06`.
- O benchmark local, executado com PostgreSQL e Redis efêmeros, k6 v0.55.0, 60 VUs e o perfil operational-minimum-v1, terminou 4/9 SLOs: API p95 224,21 ms, query 248 ms, write 303,2 ms, billing 306 ms e inventory 261,17 ms falharam; p99 367,11 ms, auth 17,97 ms, erros HTTP 0% e disponibilidade 100% passaram. Essa prova é local e parcial.
- Validações locais atuais passaram: documentação, OpenAPI, segurança/SBOM de 199 componentes, workflow clínico, testes focados 14/14, suíte unitária do gate, build, workflow PostgreSQL efêmero 16/16 e SIGKILL 1/1. O gate estrito produziu score 72, crítico 60, 14 P0, `claim=NOT PROVEN` e `publication_allowed=false`.
- O run verde [34551458338](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34551458338) pertence a checkout anterior e permanece histórico; thresholds não foram alterados.
- Os cinco pareceres correntes de segurança, clínica, banco de dados, operações e UX estão em [final-security-critic.md](./final-security-critic.md), [final-clinical-critic.md](./final-clinical-critic.md), [final-database-critic.md](./final-database-critic.md), [final-operations-critic.md](./final-operations-critic.md) e [final-ux-critic.md](./final-ux-critic.md); todos mantêm o veredito BLOCKED / NOT PROVEN.

## Lacunas que mantêm o bloqueio

O gate local é diagnóstico e não substitui o envelope exigido em `artifacts/triple-a/TRIPLE_A_RELEASE_EVIDENCE.json`; o artefato gerado em `artifacts/release/` é ignorado e não é promovido como prova. Permanecem sem prova suficiente branch protection/required checks, Windows nativo, RLS e isolamento runtime no alvo, crash/recovery e soak 24/72h, restore/RPO/RTO, deploy/rollback, imagem/attestation, observabilidade operacional, UAT clínico e autoridade humana de release.

O claim TRIPLE-A VERIFIED não é emitido. O relatório anterior foi preservado em [scorecard-history/2026-09-10-before-b85b03ea-FINAL_REPORT.md](./scorecard-history/2026-09-10-before-b85b03ea-FINAL_REPORT.md); seus números não são evidência do candidato atual.
