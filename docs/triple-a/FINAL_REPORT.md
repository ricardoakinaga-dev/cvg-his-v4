# CVG-HIS V4 — Current Assurance Report

**Documentation snapshot:** `main@6fe76696240925ad550d05cd38a14a5239f50abc`
**Functional candidate:** `68600d6a55dcf18bd04c28ff3ee7528cc686efdb`
**Observed:** `2026-09-11T23:33:28Z`
**Repository state:** `HEAD` e `origin/main` coincidem; o rollback remoto
continua preservado e nenhum force-push foi usado.
**Verdict:** **BLOCKED / NOT PROVEN**

O gate local estrito com `TRIPLE_A_RUN_TESTS=1`, executado no checkout de código equivalente `3054d638`, passou as validações estáticas,
typecheck, lint, build e a suíte workspace, mas terminou com score `55`,
critical `57`, `15` P0 abertos e `publication_allowed=false`. O quality bar
congelado exige `97/95/zero P0`; a avaliação derivada permanece `31/33/7`.

A execução local adicional passou `66/615` testes PostgreSQL críticos, `11/11`
cenários de processo com Redis local e `2/2` jornadas clínicas canônicas. Essas
provas fortalecem a implementação e permanecem bounded ao ambiente local; não
são promovidas como CI, target produtivo, UAT ou autoridade.

O [CI #131](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34656290327)
do SHA documental terminou `success` com `16/16` jobs verdes, incluindo
Performance, Integration, E2E SPA, Unit, Visual, API Contract e o contrato
Windows. Os CIs #129 e #130 dos SHAs anteriores falharam somente em Performance;
nenhum threshold foi relaxado e nenhuma evidência de SHA diferente foi
transferida.

Permanecem sem prova suficiente manifest/security evidence de publicação,
branch protection, RLS/runtime alvo, workflow PostgreSQL de release, crash
recovery em envelope externo, backup/restore/RPO-RTO, deploy/rollback,
attestation, soak, observabilidade no target, UAT humano e autoridade de
release. O relatório não emite `main green`, release produtivo ou
`TRIPLE-A VERIFIED`.

O prompt byte a byte preservado é [MASTER_PROMPT.md](./MASTER_PROMPT.md), com
SHA-256 `95270384800c87fcbe7e823a41a7b57834ddaac274914226745f7fdc5137197a`.
A régua está em [QUALITY_BAR_V1.json](./QUALITY_BAR_V1.json) e o ledger atual em
[EXECUTION_LOG.md](./EXECUTION_LOG.md).
