# Triple-A — 10 Performance

**Status:** DIAGNOSTICS IMPLEMENTED / SLO CERTIFICATION OPEN

O benchmark k6 mantém thresholds congelados e agora publica breakdown por
endpoint e um snapshot de diagnóstico de baixa cardinalidade com CPU, memória,
cgroup, pool e PostgreSQL quando disponível. O watcher é best-effort e não
transforma indisponibilidade de observabilidade em PASS.

Fontes: `benchmarks/k6/api-benchmark.js`, `benchmarks/k6/parse-results.js`,
`scripts/capture-performance-diagnostics.mjs` e
[`docs/operations/PERFORMANCE_DIAGNOSTICS.md`](../operations/PERFORMANCE_DIAGNOSTICS.md).

O CI `#135` passou a coleta/finalização do diagnóstico, mas falhou no gate SLO
do k6. A reprodução local do perfil exato passou 9/9; isso não identifica por
si só a causa no runner remoto. Nenhum threshold foi relaxado e a certificação
permanece `NOT PROVEN`.

## Registro obrigatório do prompt

| Campo              | Registro                                                                                                          |
| ------------------ | ----------------------------------------------------------------------------------------------------------------- |
| Problema           | Explicar regressões de latência sem mascarar SLO ou alterar o perfil.                                             |
| Estado anterior    | O k6 falhava intermitentemente sem breakdown suficiente do runner/DB.                                             |
| Decisão            | Adicionar diagnóstico de baixa cardinalidade e manter thresholds congelados.                                      |
| Implementação      | Watcher, amostras intervalares, snapshot terminal e métricas por endpoint/health.                                 |
| Arquivos alterados | `scripts/capture-performance-diagnostics.mjs`, `benchmarks/k6/api-benchmark.js`, `parse-results.js`, workflow CI. |
| Testes             | Testes do collector, contrato do workflow e reprodução local 9/9.                                                 |
| Evidências         | CI #135: coleta/finalização PASS, SLO k6 FAIL.                                                                    |
| Riscos residuais   | Causa SQL/pool ainda não isolada e target/soak não certificados.                                                  |

## Atualização do candidato funcional — 2026-09-12T02:53:43Z

A implementação foi avaliada no SHA funcional `1e0077a3d8f7a10ea5e53d7d9f8f0fdee2dca689`. O [CI #137](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34667412200) terminou verde com 16/16 jobs, mas o gate local estrito permaneceu `BLOCKED`, score `54`, critical `54`, `16` P0 e claim `NOT PROVEN`. O pacote `artifacts/triple-a` continua fail-closed; provas de target, autoridade humana, UAT e produção só serão promovidas com envelopes vinculados e verificáveis.
