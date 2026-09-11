# CVG-HIS V4 — Current Assurance Report

**Code candidate:** `main@b77539c9891eef89cbbe8160bf6e30a0fb369d48`
**Observed:** `2026-09-11T19:39:53Z`
**Repository state:** `HEAD` e `origin/main` coincidem; o rollback remoto
continua preservado e nenhum force-push foi usado.
**Verdict:** **BLOCKED / NOT PROVEN**

O gate local estrito passou todos os checks estáticos, typecheck, lint e build,
além da suíte local de testes, mas terminou com score `54`, critical `54`,
`16` P0 abertos e `publication_allowed=false`. O quality bar congelado exige
`97/95/zero P0`; a avaliação derivada do quality bar foi `31/33/7`.

O [CI #126](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34635843119)
executou no SHA exato e terminou com 14/16 jobs aprovados. Performance e o
contrato Windows falharam. Os logs públicos não permitem determinar a causa
raiz; thresholds não foram relaxados e nenhuma evidência de outro SHA foi
transferida.

Permanecem sem prova suficiente branch protection, RLS/runtime alvo,
workflow PostgreSQL de release, crash recovery, restore/RPO/RTO,
deploy/rollback, attestation, soak 24/72h, observabilidade no target, UAT
humano e autoridade de release. O relatório não emite `main green`, release
produtivo ou `TRIPLE-A VERIFIED`.

O prompt byte a byte preservado é [MASTER_PROMPT.md](./MASTER_PROMPT.md), com
SHA-256 `95270384800c87fcbe7e823a41a7b57834ddaac274914226745f7fdc5137197a`.
A régua está em [QUALITY_BAR_V1.json](./QUALITY_BAR_V1.json) e o ledger atual
em [EXECUTION_LOG.md](./EXECUTION_LOG.md).
