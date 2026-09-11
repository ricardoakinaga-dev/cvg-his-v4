# CVG-HIS V4 — Current Assurance Report

**Code candidate:** `main@bb16a47f`
**Observed:** 2026-09-11T12:29:58Z
**Repository state:** `main` e `origin/main` coincidem no snapshot corrente de assurance, que preserva o candidato funcional `bb16a47f`; a origem do merge permanece preservada para rollback.
**Verdict:** **BLOCKED / NOT PROVEN**

Este relatório registra o candidato funcional após o CI exato terminar com 15/16 jobs em `success`; Performance (k6 SLOs) falhou. O run anterior foi interrompido após o guard de identidade de fonte; o manifesto foi reconciliado antes do novo run. O resultado não autoriza release; as provas externas, operacionais e humanas exigidas continuam ausentes.

A execução local corrente acrescentou evidência bounded: PostgreSQL descartável passou 66/66 arquivos e 615/615 testes, o runner de processos passou 11/11 cenários com Redis local pinned e o perfil k6 passou 9/9 SLOs. Esses resultados estão detalhados em [17-current-execution-evidence.md](./17-current-execution-evidence.md) e não reclassificam o job remoto falho.

O gate estrito no snapshot `0abdf651` retornou `BLOCKED / NOT PROVEN`, score `33`, critical `20` e `28` P0 abertos, com `publication_allowed=false`; thresholds não foram relaxados.

O prompt vigente está preservado byte a byte em [MASTER_PROMPT_STATE_OF_ART.md](./MASTER_PROMPT_STATE_OF_ART.md), com SHA-256 872014ed989fa4b565bbab5293009c13ef6437104204cbf39c876e64a593f745. O quality bar congelado exige score geral mínimo 97, score crítico mínimo 95, zero P0, main verde e evidência atual. Nenhuma regra foi relaxada.

## Evidência ligada ao SHA atual

- O CI [#34593912427](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34593912427) terminou `failure` para o SHA exato: Repository Guards, Unit, Integration, E2E SPA, Visual, Windows e API Contract passaram; Performance falhou. O artefato `performance-k6-report` tem digest `sha256:212cd76b10ac0d746fa3f576d35876791016c5dfef3e2ca2282d382cae269cac`.
- Validações locais bounded do SHA passaram: `pnpm test`, typecheck, lint, OpenAPI, complexidade, RLS estático, supply chain, dependências, backup/restore e Helm estático; billing focused/API tests também passaram. Nenhum score histórico é transferido.
- O run verde anterior pertence a checkouts anteriores e permanece histórico; thresholds não foram alterados.
- Os cinco pareceres correntes de segurança, clínica, banco de dados, operações e UX estão em [final-security-critic.md](./final-security-critic.md), [final-clinical-critic.md](./final-clinical-critic.md), [final-database-critic.md](./final-database-critic.md), [final-operations-critic.md](./final-operations-critic.md) e [final-ux-critic.md](./final-ux-critic.md); todos mantêm o veredito BLOCKED / NOT PROVEN.

## Lacunas que mantêm o bloqueio

O gate local é diagnóstico e gera o envelope em `artifacts/release/` e no caminho canônico `artifacts/triple-a/TRIPLE_A_RELEASE_EVIDENCE.json`; nenhum envelope foi promovido como prova. Permanecem sem prova suficiente CI verde, logs autenticados dos jobs falhos, branch protection/required checks, Windows nativo, RLS e isolamento runtime no alvo, crash/recovery e soak 24/72h, restore/RPO/RTO, deploy/rollback, imagem/attestation, observabilidade operacional, UAT clínico e autoridade humana de release.

O claim TRIPLE-A VERIFIED não é emitido. O relatório anterior foi preservado em [scorecard-history/2026-09-10-before-b85b03ea-FINAL_REPORT.md](./scorecard-history/2026-09-10-before-b85b03ea-FINAL_REPORT.md); seus números não são evidência do candidato atual.
