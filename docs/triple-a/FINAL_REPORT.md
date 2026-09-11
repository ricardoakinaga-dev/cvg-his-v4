# CVG-HIS V4 — Current Assurance Report

**Code candidate:** "main@5a079ceca57b246e17ecb0214ed1e2b9e9e23500"
**Observed:** 2026-09-11T08:40:00Z
**Repository state:** `main` e `origin/main` coincidem no HEAD documental; os commits posteriores ao candidato funcional são metadata-only e a origem do merge permanece preservada para rollback.
**Verdict:** **BLOCKED / NOT PROVEN**

Este relatório registra o candidato funcional e sua execução CI terminal. O resultado não autoriza release porque a performance falhou e as provas externas, operacionais e humanas exigidas continuam ausentes.

O prompt vigente está preservado byte a byte em [MASTER_PROMPT_STATE_OF_ART.md](./MASTER_PROMPT_STATE_OF_ART.md), com SHA-256 872014ed989fa4b565bbab5293009c13ef6437104204cbf39c876e64a593f745. O quality bar congelado exige score geral mínimo 97, score crítico mínimo 95, zero P0, main verde e evidência atual. Nenhuma regra foi relaxada.

## Evidência ligada ao SHA atual

- O CI [#34577711985](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34577711985) terminou 15/16: somente Performance (k6 SLOs) falhou. O artefato `performance-k6-report` tem digest `sha256:539d88b7a070ae5a3e0d18693ad04edf943b379d002b3bafb973f2879bbac5b2`; o relatório agora inclui `performance-provenance.json` para registrar runner e versão sem expor segredos.
- Validações locais atuais passaram: `pnpm test` completo, documentação, lint, supply-chain, 20 testes focados de release, 5 de provenance e runner PostgreSQL limpo 3/3 (workflow clínico, SIGKILL/fencing e auditoria append-only). O gate diagnóstico pós-fix marcou score 56, crítico 32 e 15 P0; publicação segue proibida.
- O run verde anterior pertence a checkouts anteriores e permanece histórico; thresholds não foram alterados.
- Os cinco pareceres correntes de segurança, clínica, banco de dados, operações e UX estão em [final-security-critic.md](./final-security-critic.md), [final-clinical-critic.md](./final-clinical-critic.md), [final-database-critic.md](./final-database-critic.md), [final-operations-critic.md](./final-operations-critic.md) e [final-ux-critic.md](./final-ux-critic.md); todos mantêm o veredito BLOCKED / NOT PROVEN.

## Lacunas que mantêm o bloqueio

O gate local é diagnóstico e gera o envelope em `artifacts/release/` e no caminho canônico `artifacts/triple-a/TRIPLE_A_RELEASE_EVIDENCE.json`; nenhum envelope foi promovido como prova. Permanecem sem prova suficiente CI verde, branch protection/required checks, Windows nativo, RLS e isolamento runtime no alvo, crash/recovery e soak 24/72h, restore/RPO/RTO, deploy/rollback, imagem/attestation, observabilidade operacional, UAT clínico e autoridade humana de release.

O claim TRIPLE-A VERIFIED não é emitido. O relatório anterior foi preservado em [scorecard-history/2026-09-10-before-b85b03ea-FINAL_REPORT.md](./scorecard-history/2026-09-10-before-b85b03ea-FINAL_REPORT.md); seus números não são evidência do candidato atual.
