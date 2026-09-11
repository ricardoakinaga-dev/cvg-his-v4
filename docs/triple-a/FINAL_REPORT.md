# CVG-HIS V4 — Current Assurance Report

**Code candidate:** "main@04864a54cdb02b5d2c1fa5e6291804d66ea4721a"
**Observed:** 2026-09-11T06:10:44Z
**Repository state:** `main` e `origin/main` coincidem; a origem do merge permanece preservada para rollback.
**Verdict:** **BLOCKED / NOT PROVEN**

Este relatório registra o candidato e sua execução CI terminal. O resultado não autoriza release porque a performance falhou e as provas externas, operacionais e humanas exigidas continuam ausentes.

O prompt vigente está preservado byte a byte em [MASTER_PROMPT_STATE_OF_ART.md](./MASTER_PROMPT_STATE_OF_ART.md), com SHA-256 872014ed989fa4b565bbab5293009c13ef6437104204cbf39c876e64a593f745. O quality bar congelado exige score geral mínimo 97, score crítico mínimo 95, zero P0, main verde e evidência atual. Nenhuma regra foi relaxada.

## Evidência ligada ao SHA atual

- O CI [#34567116409](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34567116409) terminou 15/16: somente Performance (k6 SLOs) falhou. O artefato `performance-k6-report` é o ID `10186798096`, digest `sha256:aff13018a4e8912b83bd031fd2118b1f4c89373fa37ef96486a30da812017b90`.
- Validações locais atuais passaram: documentação, lint, 23 testes unitários de release e runner PostgreSQL limpo 3/3 (workflow clínico, SIGKILL/fencing e auditoria append-only). O gate diagnóstico marcou score 65, crítico 49 e 19 P0 com build/testes completos fora dessa coleta.
- O run verde [34551458338](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34551458338) pertence a checkout anterior e permanece histórico; thresholds não foram alterados.
- Os cinco pareceres correntes de segurança, clínica, banco de dados, operações e UX estão em [final-security-critic.md](./final-security-critic.md), [final-clinical-critic.md](./final-clinical-critic.md), [final-database-critic.md](./final-database-critic.md), [final-operations-critic.md](./final-operations-critic.md) e [final-ux-critic.md](./final-ux-critic.md); todos mantêm o veredito BLOCKED / NOT PROVEN.

## Lacunas que mantêm o bloqueio

O gate local é diagnóstico e gera o envelope em `artifacts/release/` e no caminho canônico `artifacts/triple-a/TRIPLE_A_RELEASE_EVIDENCE.json`; nenhum envelope foi promovido como prova. Permanecem sem prova suficiente CI verde, branch protection/required checks, Windows nativo, RLS e isolamento runtime no alvo, crash/recovery e soak 24/72h, restore/RPO/RTO, deploy/rollback, imagem/attestation, observabilidade operacional, UAT clínico e autoridade humana de release.

O claim TRIPLE-A VERIFIED não é emitido. O relatório anterior foi preservado em [scorecard-history/2026-09-10-before-b85b03ea-FINAL_REPORT.md](./scorecard-history/2026-09-10-before-b85b03ea-FINAL_REPORT.md); seus números não são evidência do candidato atual.
