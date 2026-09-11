# CVG-HIS V4 — Current Assurance Report

**Code snapshot:** `main@68600d6a55dcf18bd04c28ff3ee7528cc686efdb` (candidato funcional;
reconciliação documental vinculada a este SHA)
**Observed:** `2026-09-11T22:12:14Z`
**Repository state:** `HEAD` e `origin/main` coincidem; o rollback remoto
continua preservado e nenhum force-push foi usado.
**Verdict:** **BLOCKED / NOT PROVEN**

O gate local estrito passou todos os checks estáticos, typecheck, lint e build,
além da suíte local de testes, mas terminou com score `54`, critical `54`,
`16` P0 abertos e `publication_allowed=false`. O quality bar congelado exige
`97/95/zero P0`; a avaliação derivada do quality bar foi `31/33/7`.

O [CI #129](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34650926250)
executou no SHA exato e terminou com 15/16 jobs aprovados. Apenas Performance
falhou nos passos do benchmark/SLO; o contrato Windows passou. O artefato está
vinculado ao run, mas suas métricas detalhadas exigem credencial. Thresholds
não foram relaxados e nenhuma evidência de outro SHA foi transferida.

Permanecem sem prova suficiente branch protection, RLS/runtime alvo,
workflow PostgreSQL de release, crash recovery, restore/RPO/RTO,
deploy/rollback, attestation, soak 24/72h, observabilidade no target, UAT
humano e autoridade de release. O relatório não emite `main green`, release
produtivo ou `TRIPLE-A VERIFIED`.

O prompt byte a byte preservado é [MASTER_PROMPT.md](./MASTER_PROMPT.md), com
SHA-256 `95270384800c87fcbe7e823a41a7b57834ddaac274914226745f7fdc5137197a`.
A régua está em [QUALITY_BAR_V1.json](./QUALITY_BAR_V1.json) e o ledger atual
em [EXECUTION_LOG.md](./EXECUTION_LOG.md).
