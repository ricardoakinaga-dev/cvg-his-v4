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

## Avaliação corrente no candidato `1434514c`

O gate também avalia os critérios do `QUALITY_BAR_V1.json` a partir das
evidências do candidato. O arquivo congelado não é alterado: o artefato inclui
`frozen_status` e o novo `quality_bar.evaluation`, evitando que status históricos
sejam confundidos com prova corrente. A avaliação entra na decisão do gate e
não reduz os thresholds de `97`, `95` e `open_p0=0`.

No candidato `1434514c4e0ce88bc29d0feda28b09a61a08670f`, com execução externa
explicitamente pulada, o agregado operacional foi `BLOCKED`, score `42`, score
crítico `20` e `28` P0 abertos. A avaliação direta dos 16 critérios congelados
foi score `19`, score crítico `17` e `8` P0 abertos. O resultado é diagnóstico,
fail-closed e não autoriza publicação.
