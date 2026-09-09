# Triple-A — 04 Supply Chain

**Status:** PARTIAL

Os `uses:` dos workflows foram fixados em SHA completo, as seis bases Docker foram fixadas por digest e `pnpm validate:supply-chain` verifica as 114 referências de actions e as bases observadas. A política está em [`SUPPLY_CHAIN_POLICY.md`](../security/SUPPLY_CHAIN_POLICY.md).

Ainda faltam evidência atual de scanners de dependência/imagem, assinatura/verificação de imagens, licença/abandono e vínculo desses resultados ao manifest do candidato.
