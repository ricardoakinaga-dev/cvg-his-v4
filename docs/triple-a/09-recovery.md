# Triple-A — 09 Recovery

**Status:** POLICY READY / REAL DRILL BLOCKED

As políticas de disaster recovery, RPO/RTO, FMEA e os scripts de backup/restore
estão versionados. `pnpm ops:backup:check` passou os testes e guards estáticos.

Fontes: [`docs/operations/DISASTER_RECOVERY.md`](../operations/DISASTER_RECOVERY.md),
[`docs/operations/RPO_RTO_POLICY.md`](../operations/RPO_RTO_POLICY.md),
`infra/scripts/backup-v2.sh`, `infra/scripts/restore-drill-v2.sh` e
`scripts/create-restore-drill-fixture.mjs`.

O drill fixture e o representative não puderam iniciar neste ambiente porque o
Docker daemon recusou acesso ao socket. Não foi gerado bundle `PASS`, e não se
declara RPO/RTO, restore destrutivo, corrupção ou migration mismatch como
comprovados.

## Registro obrigatório do prompt

| Campo              | Registro                                                                                                             |
| ------------------ | -------------------------------------------------------------------------------------------------------------------- |
| Problema           | Recuperar banco, storage e configuração com integridade e tempos medidos.                                            |
| Estado anterior    | Políticas e scripts existiam; o Docker local não permitiu o drill real.                                              |
| Decisão            | Validar contratos estáticos, mas manter restore externo como bloqueador.                                             |
| Implementação      | Backup/restore v2, RPO/RTO, DR e FMEA versionados.                                                                   |
| Arquivos alterados | `infra/scripts/backup-v2.sh`, `restore-drill-v2.sh`, `scripts/create-restore-drill-fixture.mjs`, docs de operations. |
| Testes             | `pnpm ops:backup:check`: 4 testes e 15 guards.                                                                       |
| Evidências         | Saída local bounded; ausência de bundle real registrada.                                                             |
| Riscos residuais   | Restore destrutivo, corrupção, mismatch, RPO/RTO, storage e game day.                                                |

## Atualização do candidato funcional — 2026-09-12T02:53:43Z

A implementação foi avaliada no SHA funcional `1e0077a3d8f7a10ea5e53d7d9f8f0fdee2dca689`. O [CI #137](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34667412200) terminou verde com 16/16 jobs, mas o gate local estrito permaneceu `BLOCKED`, score `54`, critical `54`, `16` P0 e claim `NOT PROVEN`. O pacote `artifacts/triple-a` continua fail-closed; provas de target, autoridade humana, UAT e produção só serão promovidas com envelopes vinculados e verificáveis.
