# CVG-HIS V4 — Current Assurance Report

**Documentation snapshot:** `main@3054d6388becd9a262b2cd45fadbabc086c1ed75`
**Functional candidate:** `68600d6a55dcf18bd04c28ff3ee7528cc686efdb`
**Observed:** `2026-09-11T22:45:00Z`
**Repository state:** `HEAD` e `origin/main` coincidem; o rollback remoto
continua preservado e nenhum force-push foi usado.
**Verdict:** **BLOCKED / NOT PROVEN**

O gate local estrito com `TRIPLE_A_RUN_TESTS=1` passou as validações estáticas,
typecheck, lint, build e a suíte workspace, mas terminou com score `55`,
critical `57`, `15` P0 abertos e `publication_allowed=false`. O quality bar
congelado exige `97/95/zero P0`; a avaliação derivada permanece `31/33/7`.

A execução local adicional passou `66/615` testes PostgreSQL críticos, `11/11`
cenários de processo com Redis local e `2/2` jornadas clínicas canônicas. Essas
provas fortalecem a implementação e permanecem bounded ao ambiente local; não
são promovidas como CI, target produtivo, UAT ou autoridade.

O [CI #129](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34650926250)
do candidato funcional terminou com 15/16 jobs aprovados e falhou somente em
Performance. O [CI #130](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34653388064)
do commit documental repetiu o padrão; o job falho foi [Performance (k6
SLOs)](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34653388064/job/103443316221).
Nenhum threshold foi relaxado e nenhuma evidência de SHA diferente foi
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
