# Triple-A — 02 Supply Chain

**Status:** PARTIAL / RELEASE EVIDENCE OPEN

## Problema

Uma release enterprise precisa provar a origem das actions, dependências,
imagens, SBOM, proveniência e assinaturas no mesmo SHA. A presença de uma
política no repositório não prova que um artefato publicado foi verificado.

## Estado e decisão

Os workflows ativos usam referências imutáveis para actions e imagens de
serviço; Compose e imagens estáticas do Helm também são verificadas por digest,
enquanto imagens construídas localmente ficam restritas ao namespace explícito
`cvg-his-v2-*`/`cvg-his-v4-*`. O guard local
`pnpm validate:supply-chain` passou para 113 referências de actions, 13 imagens
de workflow, 15 imagens Compose, zero imagens Helm estáticas e seis bases
Docker. Mantemos o gate fail-closed para evidência de publicação, em vez de
promover uma execução local a prova de registry ou de assinatura.

O collector OpenTelemetry do Compose foi corrigido para uma referência existente
e imutável: a tag legada `0.124.1` não está disponível no registry; o digest
adotado corresponde à publicação `0.129.1` e deve ser reavaliado junto com a
configuração de observabilidade antes de um deploy.

## Arquivos e evidências

- Política: [`docs/security/SUPPLY_CHAIN_POLICY.md`](../security/SUPPLY_CHAIN_POLICY.md).
- Guard: `scripts/validate-supply-chain.mjs` e o job `Repository Guards`.
- Contrato do guard: `scripts/validate-supply-chain.test.mjs` cobre referências
  mutáveis em services, Compose e Helm e a exceção restrita de imagens locais.
- Proveniência/SBOM: `scripts/generate-image-attestation-evidence.mjs` e o
  workflow de release.
- Candidato observado: a ser reancorado no commit funcional de supply-chain; o
  snapshot anterior `c7336ac0f6a909c10d07797c36814f0b321c6d5c` é histórico.

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
