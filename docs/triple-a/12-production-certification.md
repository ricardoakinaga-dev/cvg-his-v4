# Triple-A — 12 Production Certification

**Status:** RUNBOOK READY / CERTIFICATION BLOCKED

O runbook de certificação cobre preflight, funcional, confiabilidade,
recovery, performance, segurança e soak:
[`docs/operations/TRIPLE_A_PRODUCTION_CERTIFICATION.md`](../operations/TRIPLE_A_PRODUCTION_CERTIFICATION.md).

O comando `pnpm evidence:triple-a:package` também produz os 16 envelopes da
closure em `artifacts/triple-a/`, marcando cada item ausente como
`NOT_PROVEN` e vinculando tudo ao SHA observado.

O gate `pnpm release:triple-a` é fail-closed e produz o envelope ignorado
`artifacts/release/TRIPLE_A_RELEASE_EVIDENCE.json`. No candidato
`c7336ac0f6a909c10d07797c36814f0b321c6d5c`, a execução estrita registrou
`BLOCKED`, score `50`, critical `46`, `19` P0 abertos e claim `NOT PROVEN`.

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
| Evidências         | `TRIPLE_A_RELEASE_EVIDENCE.json` atual: `BLOCKED`, `50/46/19`.                                       |
| Riscos residuais   | Target, restore, deploy/rollback, soak, UAT, attestation e autoridade.                               |
