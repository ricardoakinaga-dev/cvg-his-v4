# Evidência terminal — CI #217

## Identidade observada

- Run: [CI #217](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/35215228039)
- SHA executado: `f5710e7e8fad7023359c5a475ba278b2e34a3d68`
- Relação: o SHA executado é descendente exclusivamente documental do
  candidato funcional `dfa6d0b4ea60d6e7fbbe42521793b9fad273f702`; os
  Repository Guards aceitaram a identidade e nenhum source change indevido foi
  detectado.
- Estado terminal: `failure` em `2026-09-17T11:57:58Z`.
- Resultado: `16/17` jobs passaram; somente Performance/k6 falhou.

## Gates confirmados

| Job | Resultado | Evidência observada |
| --- | --- | --- |
| Critical Coverage Gate | `success` | Unit: `269` arquivos/`2945` testes; integração: `105` arquivos/`933` testes; `R05-010 status=PASS`, `errors=[]`, `consumerErrors=[]`, `manifestSqlCount=178`. |
| Repository Guards / segurança / estrutura | `success` | Guards, SAST, Secret Scan, Dependency Audit, Typecheck, OpenAPI, Lint, Build e Coverage passaram no run exato. |
| API Contract / Unit / Integration | `success` | Contratos, unitários e integração passaram no run exato. |
| Critical Process Runner (Windows) | `success` | Job remoto passou. |
| E2E SPA | `success` | `424 passed` no SPA e `2 passed` na API clínica canônica. O pacote registrou Enterprise readiness `92/100` com `28 PASS`, `3 WARN` e `1 FAIL`; Vetus parity continua não provada. |
| Visual Regression | `success` | `29 passed`. |

## Performance/k6

O job passou `7/9` SLOs. Os thresholds continuam congelados:

| Métrica | Atual | Limite | Resultado |
| --- | ---: | ---: | --- |
| API p95 | `192,29 ms` | `200 ms` | PASS |
| API p99 | `242,49 ms` | `500 ms` | PASS |
| Auth p95 | `28,20 ms` | `300 ms` | PASS |
| Query p95 | `217,00 ms` | `150 ms` | FAIL |
| Write p95 | `212,00 ms` | `300 ms` | PASS |
| Billing p95 | `208,95 ms` | `250 ms` | PASS |
| Inventory p95 | `203,23 ms` | `200 ms` | FAIL |
| Erros / disponibilidade | `0,000% / 100,000%` | `0,1% / 99,5%` | PASS |

A execução terminou com `2342` iterações, `60` VUs, `0,000%` de erro e
`100,000%` de disponibilidade. O diagnóstico reportou `45` amostras e o
cruzamento somente de `query_latency_ms` e `inventory_latency_ms`. Nenhum
threshold, denominador, escopo ou aplicabilidade foi reduzido.

## Decisão

O snapshot continua `BLOCKED / NOT PROVEN`: a cobertura crítica e os gates
funcionais estão verdes, mas o CI agregado não está verde por causa dos dois
SLOs de performance. Target, UAT, recovery/restore, RPO/RTO, attestation,
governança de branches e autoridade final de release continuam sem prova.

O artefato remoto de performance é `performance-k6-report`, ID `10494728813`,
digest `sha256:6e08482af8b0b762763027e52a94c1e1c2bc4b1921bdc99ed0ac7fda0d6bd1dc`.
O artefato de cobertura crítica é o ID `10494954202`, digest
`sha256:dca56025369e0d91834b34248b687de6086425444af637eae8476acc71547664`.
