# Evidência de execução corrente — State of Art

Observado em `2026-09-11T18:36:24Z` no checkout
`bb03b74a513a6ab8ced2e4fb1cb2c6cf77ae276e`, com `origin/main` coincidente.

## Validações locais do candidato

| Escopo | Resultado |
| --- | --- |
| API build/lint | PASS |
| Suíte API | PASS — `590/590`, incluindo o provider de métricas clínicas `2/2` |
| E2E clínico | PASS — `2/2` (jornada clínica e jornada inpatient) em PostgreSQL/Redis local |
| SPA focada | PASS — `32/32` testes da página de atendimento; lint passou |
| Playwright discovery | PASS — novo spec listado sem erro |
| Diff/format dos arquivos novos | PASS — `git diff --check` e Prettier passaram; o único alerta de Prettier restante é formatação histórica não relacionada em `server.ts` |

O E2E local usou PostgreSQL e Redis locais adaptados; o banco não é a instância
efêmera do CI. A evidência comprova o comportamento exercitado, mas não prova
RLS, governança ou o ambiente alvo.

## Performance e CI

A última execução local bounded do perfil k6 passou `9/9` SLOs, com erros `0%`,
disponibilidade `100%` e gauges de pool sem espera; ela foi executada no SHA
anterior `b953ff3384596b7b0ebd486ec9cb2b43f71bb85e` e permanece explicitamente
fora da evidência do candidato atual. Não houve relaxamento de thresholds.

O CI exato [#124](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34634177739)
está `pending`. O run #123 do snapshot documental anterior falhou na identidade
de fontes críticas; o manifesto foi corrigido e o teste local `2/2` passou.

## Gate estrito

`TRIPLE_A_SKIP_EXECUTION=1 pnpm release:triple-a` retornou `BLOCKED`, score
`34`, critical `23`, `27` P0 e `publication_allowed=false`. Nenhum envelope
local foi promovido como release.

## Limitações

Continuam sem prova no mesmo boundary de release: CI terminal verde no SHA
atual, logs autenticados do benchmark, branch protection, runtime RLS no alvo,
deploy/rollback, restore/RPO/RTO, attestation de imagem, soak 24/72h, UAT
humano e autoridade de release. O claim `TRIPLE-A VERIFIED` permanece proibido.
