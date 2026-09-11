# CVG-HIS V4 — Current Assurance Report

**Code candidate:** "main@fe5406c23c515585629060e0dc01b91f2d113d65"
**Observed:** 2026-09-11T03:45:00Z
**Merge:** fast-forward para "main"; "origin/main", "origin/HEAD" e a branch de origem apontam para o mesmo SHA.
**Verdict:** **BLOCKED / NOT PROVEN**

Este relatório é o snapshot documental pós-merge. O commit que o registra altera o SHA do branch sem alterar o código; por isso o SHA final precisa de uma nova execução CI antes de qualquer decisão de release. O run abaixo é evidência do candidato de código do merge e não é promovido como prova do snapshot documental posterior.

O prompt vigente está preservado byte a byte em [MASTER_PROMPT_STATE_OF_ART.md](./MASTER_PROMPT_STATE_OF_ART.md), com SHA-256 872014ed989fa4b565bbab5293009c13ef6437104204cbf39c876e64a593f745. O quality bar congelado exige score geral mínimo 97, score crítico mínimo 95, zero P0, main verde e evidência atual. Nenhuma regra foi relaxada.

## Evidência ligada ao SHA atual

- O CI [#34556230892](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34556230892) terminou com 15/16 jobs aprovados. O único failure foi [Performance (k6 SLOs)](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34556230892/job/103131906730), com API p95 223,42 ms, query 239 ms, billing 272,35 ms e inventory 261,29 ms acima dos alvos; erros HTTP ficaram em 0% e disponibilidade em 100%.
- O benchmark local, executado com PostgreSQL e Redis efêmeros, k6 v0.55.0, 60 VUs e o perfil operational-minimum-v1, passou 9/9 SLOs. Essa prova fica limitada ao ambiente local.
- Validações locais atuais passaram: documentação, OpenAPI, workflow clínico, testes focados 65/65, contratos workflow/infra 44/44, API 587/587, build SPA, workflow PostgreSQL efêmero 16/16 e SIGKILL 1/1.
- A comparação entre o run atual e o run verde anterior mostra variância de runner/contenção; a medição remota não deve ser convertida em PASS por repetição informal. A recomendação é repetir o mesmo SHA 2–3 vezes, mantendo thresholds e diagnósticos.
- Os cinco pareceres correntes de segurança, clínica, banco de dados, operações e UX estão em [final-security-critic.md](./final-security-critic.md), [final-clinical-critic.md](./final-clinical-critic.md), [final-database-critic.md](./final-database-critic.md), [final-operations-critic.md](./final-operations-critic.md) e [final-ux-critic.md](./final-ux-critic.md); todos mantêm o veredito BLOCKED / NOT PROVEN.

## Lacunas que mantêm o bloqueio

O score atual, o score crítico e a contagem de P0 não podem ser declarados porque não há envelope TRIPLE_A_RELEASE_EVIDENCE.json atual no caminho exigido. Permanecem sem prova suficiente branch protection/required checks, Windows nativo, RLS e isolamento runtime no alvo, crash/recovery e soak 24/72h, restore/RPO/RTO, deploy/rollback, imagem/attestation, observabilidade operacional, UAT clínico e autoridade humana de release. O run verde [34551458338](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34551458338) pertence a checkout anterior e é mantido apenas como histórico.

O claim TRIPLE-A VERIFIED não é emitido. O relatório anterior foi preservado em [scorecard-history/2026-09-10-before-b85b03ea-FINAL_REPORT.md](./scorecard-history/2026-09-10-before-b85b03ea-FINAL_REPORT.md); seus números não são evidência do candidato atual.
