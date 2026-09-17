# CI #214 — evidência terminal do candidato visual

## Identidade

- Run: [CI #214](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/35204183554)
- SHA documental executado: `2aee42aa491900dcc5a491872179ea6d8459af04`
- Candidato funcional: `a4f2ef6705cebca552b07f20ebd3d596d5714079`
- Estado terminal: `failure`
- Motivo do estado geral: somente o job Performance/k6 falhou.

## Gates confirmados

| Job | Resultado |
| --- | --- |
| Critical Coverage Gate | `success` |
| Repository Guards / Coverage / Build | `success` |
| API Contract / Unit / Integration | `success` |
| Critical Process Runner (Windows) | `success` |
| E2E SPA | `424 passed` |
| Visual Regression | `29 passed` |

O Visual Regression passou integralmente com a fonte Noto Sans instalada no
runner e `--disable-lcd-text` no Chromium. Nenhuma tolerância foi ampliada e
nenhum baseline adicional foi promovido neste run.

## Performance/k6

O job passou `7/9` SLOs. Resultados relevantes:

| Métrica | Atual | Limite | Resultado |
| --- | ---: | ---: | --- |
| API p95 | 190,33 ms | 200 ms | PASS |
| API p99 | 244,21 ms | 500 ms | PASS |
| Auth p95 | 29,77 ms | 300 ms | PASS |
| Query p95 | 217 ms | 150 ms | FAIL |
| Write p95 | 212 ms | 300 ms | PASS |
| Billing p95 | 202 ms | 250 ms | PASS |
| Inventory p95 | 202,76 ms | 200 ms | FAIL |
| Erros / disponibilidade | 0% / 100% | 0,1% / 99,5% | PASS |

Diagnóstico e amostras passaram; a falha é uma medição de latência acima da
régua congelada, não uma justificativa para relaxar SLOs. O candidato continua
`BLOCKED / NOT PROVEN` e os 13 P0 não fechados permanecem abertos.
