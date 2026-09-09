# Triple-A — 12 Release Gate

**Status:** IMPLEMENTED / BLOCKED UNTIL EVIDENCE

Os comandos canônicos são `pnpm release:triple-a` e `pnpm rc:evidence:triple-a`. O script escreve `artifacts/release/TRIPLE_A_RELEASE_EVIDENCE.json`, separa modo advisory de strict e só emite `TRIPLE-A VERIFIED` quando todos os critérios passarem no mesmo SHA.

O gate atual é honestamente bloqueado sem manifest, security evidence, CI, testes críticos, E2E, recovery, performance e deploy target vinculados ao candidato. Nenhum modo advisory autoriza publicação.
