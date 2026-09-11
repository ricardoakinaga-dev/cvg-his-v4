# Auditoria independente de performance — escopo delimitado

## Candidato atual — CI #129

**SHA avaliado:** `68600d6a55dcf18bd04c28ff3ee7528cc686efdb`
**CI:** [run #129](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34650926250)
**Resultado:** `NOT PROVEN / BLOCKED`

O run terminou `failure` em 25m35s com 15/16 jobs aprovados. Unit, Integration,
E2E SPA, Visual, API Contract, segurança, typecheck, lint, build, Coverage,
Repository Guards e o contrato Windows passaram; Performance (k6 SLOs) foi o
único job falho, nos passos `Run k6 benchmark` (exit 99) e `Check SLO results`
(exit 1). O artefato remoto
[`performance-k6-report`](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34650926250/artifacts/10283694358)
tem digest `sha256:02545b5f8db2c53c5421edd62281b50f8b073e0345ecc8a3d6dd3838bd4f3460`;
seus arquivos detalhados não puderam ser baixados sem credencial autenticada
nesta sessão.

Não há métrica p95 verificável para este SHA neste parecer. O benchmark remoto
continua sendo a evidência vinculada ao candidato e não autoriza transferir os
números do CI #128. Nenhuma threshold, carga ou comportamento de produto foi
alterado para contornar a falha. A causa raiz permanece não comprovada; uma
reexecução autenticada deve preservar o artefato e capturar breakdown por
check/endpoint, pressão do pool, `pg_stat_activity`, CPU/cgroup e I/O.

## Histórico — CI #128

**SHA avaliado:** `55ff8a5250d20f2dbd26c4572095599be485fb69`
**CI:** [run #128](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34644942985)
**Artefato:** `performance-k6-report`, digest `sha256:4d2b2acab28c07373d706a94abe1f1f021a5ac16d48f9c4f0be9b62f77cd42c4`
**Resultado:** `NOT PROVEN / BLOCKED`

O perfil `operational-minimum-v1` usou 60 VUs, PostgreSQL pool
`min=8/max=60`, k6 `v0.55.0`, Node `v22.23.2` e runner Linux com 4 CPUs.

No artefato remoto, os SLOs de latência falharam nestes valores:

| Métrica | p95 | Alvo |
| --- | ---: | ---: |
| API | 232,29 ms | < 200 ms |
| Query | 250,55 ms | < 150 ms |
| Write | 311,55 ms | < 300 ms |
| Billing | 274,55 ms | < 250 ms |
| Inventory | 276,47 ms | < 200 ms |

Autenticação (26,84 ms), p99 da API (302,81 ms), erros HTTP (0%),
disponibilidade (100%) e o contador de erros da API passaram. Houve 132
checks falhos em 37.920 checks, mas o formato do relatório não informa qual
check nominal produziu cada falha.

Uma reprodução local do mesmo perfil, com PostgreSQL/Redis reais, 4 CPUs e o
mesmo limite de pool, passou 9/9 SLOs. Essa reprodução é histórica do SHA
`55ff8a52` e não substitui a execução remota do candidato `68600d6a`.

**Decisão histórica:** não alterar thresholds, carga ou comportamento de
produto para mascarar a falha; a variação não demonstrou defeito determinístico
no código ou no banco.

## Verificação documental — CI #130

O commit documental `3054d638` foi executado pelo [CI #130](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34653388064), que terminou `failure` com `15/16` jobs aprovados. O único job falho foi `Performance (k6 SLOs)`, no [job 103443316221](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34653388064/job/103443316221), nos passos do benchmark e da verificação de SLO. Os demais checks publicados passaram. O artefato detalhado não foi promovido sem acesso autenticado; thresholds permaneceram intactos.
