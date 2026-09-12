# Triple-A — 12 Production Certification

**Status:** RUNBOOK READY / CERTIFICATION BLOCKED

O runbook de certificação cobre preflight, funcional, confiabilidade,
recovery, performance, segurança e soak:
[`docs/operations/TRIPLE_A_PRODUCTION_CERTIFICATION.md`](../operations/TRIPLE_A_PRODUCTION_CERTIFICATION.md).

O comando `pnpm evidence:triple-a:package` também produz os 16 envelopes da
closure em `artifacts/triple-a/`, marcando cada item ausente como
`NOT_PROVEN` e vinculando tudo ao SHA observado.

O gate `pnpm release:triple-a` é fail-closed e produz o envelope ignorado
`artifacts/release/TRIPLE_A_RELEASE_EVIDENCE.json`. No candidato funcional
`1e0077a3d8f7a10ea5e53d7d9f8f0fdee2dca689`, a execução estrita registrou
`BLOCKED`, score `54`, critical `54`, `16` P0 abertos e claim `NOT PROVEN`.
O CI #137 terminou verde em 16/16 jobs, mas não substitui as provas externas.

Não houve deploy, rollback, soak 24/72h, restore real, UAT humano ou autoridade
de go/no-go nesta execução. O runbook está pronto para um ambiente autorizado;
isso não é certificação de produção.

## Registro obrigatório do prompt

| Campo              | Registro                                                                                             |
| ------------------ | ---------------------------------------------------------------------------------------------------- |
| Problema           | Converter checks técnicos em decisão de go/no-go reproduzível.                                       |
| Estado anterior    | Havia runbooks e gate, mas faltavam envelopes externos do candidato atual.                           |
| Decisão            | Release gate strict, fail-closed, sem claim sem evidência.                                           |
| Implementação      | Runbook, scorecard, evidence JSON e workflow de pré/pós-publicação.                                  |
| Arquivos alterados | `scripts/run-triple-a-release-gate.mjs`, `.github/workflows/release-artifacts.yml`, docs de release. |
| Testes             | Gate local, docs, build, testes, security e guards do candidato.                                     |
| Evidências         | `TRIPLE_A_RELEASE_EVIDENCE.json` atual: `BLOCKED`, `54/54/16`; CI #137 verde.                        |
| Riscos residuais   | Target, restore, deploy/rollback, soak, UAT, attestation e autoridade.                               |

## Atualização do candidato funcional — 2026-09-12T02:53:43Z

A implementação foi avaliada no SHA funcional `1e0077a3d8f7a10ea5e53d7d9f8f0fdee2dca689`. O [CI #137](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34667412200) terminou verde com 16/16 jobs, mas o gate local estrito permaneceu `BLOCKED`, score `54`, critical `54`, `16` P0 e claim `NOT PROVEN`. O pacote `artifacts/triple-a` continua fail-closed; provas de target, autoridade humana, UAT e produção só serão promovidas com envelopes vinculados e verificáveis.
