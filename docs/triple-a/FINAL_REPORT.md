# CVG-HIS V4 — Current Assurance Report

**Code candidate:** `main@5b036836bf71bc3a6c62bd151a2b19f235d3e2fc`
**Observed:** 2026-09-11T10:35:44Z
**Repository state:** `main` e `origin/main` coincidem no snapshot de controle documental; o candidato funcional observado é `5b036836` e a origem do merge permanece preservada para rollback.
**Verdict:** **BLOCKED / NOT PROVEN**

Este relatório registra o candidato funcional e sua execução CI terminal. O resultado não autoriza release porque Unit Tests e Performance falharam e as provas externas, operacionais e humanas exigidas continuam ausentes.

O prompt vigente está preservado byte a byte em [MASTER_PROMPT_STATE_OF_ART.md](./MASTER_PROMPT_STATE_OF_ART.md), com SHA-256 872014ed989fa4b565bbab5293009c13ef6437104204cbf39c876e64a593f745. O quality bar congelado exige score geral mínimo 97, score crítico mínimo 95, zero P0, main verde e evidência atual. Nenhuma regra foi relaxada.

## Evidência ligada ao SHA atual

- O CI [#34587238104](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34587238104) terminou 14/16: Unit Tests e Performance (k6 SLOs) falharam. Integration, E2E SPA, Visual, Windows, API Contract e os checks preparatórios passaram. Artefatos observados incluem E2E `sha256:e9904403f4b88207463562f5c6c0ea90725c253a6778e1ac1f51366ee0405c20` e k6 `sha256:7c48e9055ae1d7866d4010594d181b314ea5a7d66359524780a02f5860851bcc`.
- Validações locais bounded do SHA passaram: `pnpm test` completo exit 0, sintaxe, documentação, Helm estático, backup/restore 4/4 mais 15 checks, contrato Helm 9/9 e restore focado 16/16. Nenhum score histórico 56/32/15 é transferido.
- O run verde anterior pertence a checkouts anteriores e permanece histórico; thresholds não foram alterados.
- Os cinco pareceres correntes de segurança, clínica, banco de dados, operações e UX estão em [final-security-critic.md](./final-security-critic.md), [final-clinical-critic.md](./final-clinical-critic.md), [final-database-critic.md](./final-database-critic.md), [final-operations-critic.md](./final-operations-critic.md) e [final-ux-critic.md](./final-ux-critic.md); todos mantêm o veredito BLOCKED / NOT PROVEN.

## Lacunas que mantêm o bloqueio

O gate local é diagnóstico e gera o envelope em `artifacts/release/` e no caminho canônico `artifacts/triple-a/TRIPLE_A_RELEASE_EVIDENCE.json`; nenhum envelope foi promovido como prova. Permanecem sem prova suficiente CI verde, logs autenticados dos jobs falhos, branch protection/required checks, Windows nativo, RLS e isolamento runtime no alvo, crash/recovery e soak 24/72h, restore/RPO/RTO, deploy/rollback, imagem/attestation, observabilidade operacional, UAT clínico e autoridade humana de release.

O claim TRIPLE-A VERIFIED não é emitido. O relatório anterior foi preservado em [scorecard-history/2026-09-10-before-b85b03ea-FINAL_REPORT.md](./scorecard-history/2026-09-10-before-b85b03ea-FINAL_REPORT.md); seus números não são evidência do candidato atual.
