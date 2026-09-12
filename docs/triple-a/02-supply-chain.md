# Triple-A — 02 Supply Chain

**Status:** PARTIAL / RELEASE EVIDENCE OPEN

## Problema

Uma release enterprise precisa provar a origem das actions, dependências,
imagens, SBOM, proveniência e assinaturas no mesmo SHA. A presença de uma
política no repositório não prova que um artefato publicado foi verificado.

## Estado e decisão

Os workflows ativos usam referências imutáveis para actions e as bases Docker
canônicas são verificadas por digest. O guard local
`pnpm validate:supply-chain` passou para 113 referências de actions e seis
imagens. Mantemos o gate fail-closed para evidência de publicação, em vez de
promover uma execução local a prova de registry ou de assinatura.

## Arquivos e evidências

- Política: [`docs/security/SUPPLY_CHAIN_POLICY.md`](../security/SUPPLY_CHAIN_POLICY.md).
- Guard: `scripts/validate-supply-chain.mjs` e o job `Repository Guards`.
- Proveniência/SBOM: `scripts/generate-image-attestation-evidence.mjs` e o
  workflow de release.
- Candidato observado: `c7336ac0f6a909c10d07797c36814f0b321c6d5c`.

## Verificação

`pnpm validate:supply-chain`, `pnpm security:secrets` e os guards de release
passaram localmente. O CI remoto do candidato ainda não fornece uma
attestation verificável de imagens publicada no target.

## Risco residual

Scan atual de registry, SBOM assinado, provenance SLSA, verificação Cosign e
licença/abandono de dependências continuam `NOT PROVEN` para uma release.

## Registro obrigatório do prompt

| Campo              | Registro                                                                                                     |
| ------------------ | ------------------------------------------------------------------------------------------------------------ |
| Problema           | Provar origem, integridade e assinatura dos artefatos de release.                                            |
| Estado anterior    | Havia pins e guards, mas os envelopes de registry não estavam ligados ao candidato.                          |
| Decisão            | Manter o gate fail-closed e não transferir PASS local para publicação.                                       |
| Implementação      | Pins imutáveis, guard central e workflow de provenance/SBOM.                                                 |
| Arquivos alterados | `.github/workflows`, `scripts/validate-supply-chain.mjs`, `scripts/generate-image-attestation-evidence.mjs`. |
| Testes             | `pnpm validate:supply-chain`; secret scan; guards de release.                                                |
| Evidências         | Resultado local no SHA `c7336ac0`; CI #135 nos jobs de segurança.                                            |
| Riscos residuais   | Registry scan, assinatura, licença/abandono e attestation de imagem ainda sem prova externa.                 |

## Atualização do candidato funcional — 2026-09-12T02:53:43Z

A implementação foi avaliada no SHA funcional `1e0077a3d8f7a10ea5e53d7d9f8f0fdee2dca689`. O [CI #137](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34667412200) terminou verde com 16/16 jobs, mas o gate local estrito permaneceu `BLOCKED`, score `54`, critical `54`, `16` P0 e claim `NOT PROVEN`. O pacote `artifacts/triple-a` continua fail-closed; provas de target, autoridade humana, UAT e produção só serão promovidas com envelopes vinculados e verificáveis.
