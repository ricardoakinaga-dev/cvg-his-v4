# Triple-A — 12 Release Gate

**Status:** IMPLEMENTED / BLOCKED UNTIL EVIDENCE

Os comandos canônicos são `pnpm release:triple-a` e `pnpm rc:evidence:triple-a`. O
script escreve `artifacts/release/TRIPLE_A_RELEASE_EVIDENCE.json`, separa modo
advisory de strict e só emite `TRIPLE-A VERIFIED` quando todos os critérios
passarem no mesmo SHA. O `QUALITY_BAR_V1.json` é uma referência congelada de
thresholds e proveniência; seus estados históricos não são reciclados como
falhas do candidato atual.

O workflow de release roda uma garantia strict de pré-publicação antes do
primeiro `push: true`. Essa etapa bloqueia o candidato usando os checks locais,
políticas e security evidence disponíveis, mas não certifica imagens, deploy,
recuperação, E2E ou autoridade humana. Após a publicação, o gate strict exige
manifest por digest, security evidence e evidência externa vinculada ao SHA.
As três imagens só recebem PASS de attestation depois de o próprio `gh
attestation verify` confirmar repository, workflow, branch, digest e SHA; um
envelope JSON autoassinado genérico permanece `PARTIAL`.

No estado local atual, o gate continua honestamente bloqueado sem manifest,
security evidence, CI, testes críticos, E2E, recovery, performance e deploy
target vinculados ao candidato. Nenhum modo advisory autoriza publicação.
