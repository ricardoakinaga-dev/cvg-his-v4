# Evidência terminal — CI #215

## Identidade observada

- Run: [CI #215](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/35207494520)
- SHA documental executado: `4d4ec251024678e594afe1afb21d3a60178fcfb4`
- Candidato funcional a que o run está vinculado: `a4f2ef6705cebca552b07f20ebd3d596d5714079`
- Relação: `4d4ec251` é descendente exclusivamente documental do candidato funcional; o binding do CI registrou `disallowedPaths=[]`.
- Estado terminal: `failure`
- Jobs: `16/17` concluídos com sucesso; apenas Performance/k6 falhou.

## Gates confirmados

| Job | Resultado | Evidência observada |
| --- | --- | --- |
| Critical Coverage Gate | `success` | R05-010 retornou `status=PASS`, `errors=[]`, `measuredOnly=true`; unit `269` arquivos/`2945` testes e integração crítica `105` arquivos/`933` testes. |
| Repository Guards / Coverage / Build | `success` | Gates estruturais e de build passaram no run exato. |
| API Contract / Unit / Integration | `success` | Contratos, unitários e integração passaram no run exato. |
| Critical Process Runner (Windows) | `success` | Job remoto passou. |
| E2E SPA | `success` | `424 passed`; a API clínica canônica também registrou `2 passed`. A matriz Vetus/Enterprise continua não sendo uma prova de paridade completa. |
| Visual Regression | `success` | `29 passed`; a instalação determinística de Noto Sans e `--disable-lcd-text` foram aplicados. |

## Performance/k6

O job passou `7/9` SLOs. Os thresholds continuam congelados:

| Métrica | Atual | Limite | Resultado |
| --- | ---: | ---: | --- |
| API p95 | `193,82 ms` | `200 ms` | PASS |
| API p99 | `247,34 ms` | `500 ms` | PASS |
| Auth p95 | `30,80 ms` | `300 ms` | PASS |
| Query p95 | `222,00 ms` | `150 ms` | FAIL |
| Write p95 | `216,00 ms` | `300 ms` | PASS |
| Billing p95 | `212,00 ms` | `250 ms` | PASS |
| Inventory p95 | `205,53 ms` | `200 ms` | FAIL |
| Erros / disponibilidade | `0,000% / 100,000%` | `0,1% / 99,5%` | PASS |

O diagnóstico remoto registrou `45` amostras e cruzamento somente nos limiares
de query e inventory. Isso mantém o release em `BLOCKED / NOT PROVEN`; nenhum
threshold, denominador, escopo ou aplicabilidade foi reduzido.

## Limitações e decisão

Este run é evidência remota atual do candidato funcional e de seu descendente
documental, mas não prova target, UAT, recovery/restore, RPO/RTO, attestation,
governança de branches ou autoridade final de release. A aprovação do R05-010
não transforma o CI agregado em verde: a falha de performance permanece aberta
até reprodução/fix e nova execução exata.

## Baseline local descartável

Para separar regressão funcional de variância de ambiente, o mesmo perfil
`operational-minimum-v1` foi executado localmente contra uma API compilada com
PostgreSQL e Redis descartáveis, pool `min=8/max=60` e `GOMAXPROCS=1`. A
execução terminou com `3254` iterações, erro `0,000%`, disponibilidade `100%` e
`9/9` SLOs aprovadas: API p95 `105,27 ms`/p99 `199,55 ms`, auth p95 `124,50
ms`, query p95 `109,00 ms`, write p95 `118,00 ms`, billing p95 `93,00 ms` e
inventory p95 `102,81 ms`. Os diagnósticos por endpoint também passaram:
patients-list `92,00 ms`, patient-detail `84,35 ms`, inventory read `91,08 ms`
e create `117,90 ms` (todos p95).

Esse baseline é evidência local limitada: demonstra que o código não falhou no
mesmo perfil fora do runner remoto, mas não prova variância conclusiva, não
substitui o rerun do CI e não autoriza alterar thresholds ou o denominador.
