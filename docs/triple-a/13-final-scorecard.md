# Triple-A — Current Scorecard

| Campo | Estado |
| --- | --- |
| CURRENT SNAPSHOT | `3fa9ad7832236e661618436b9cd68c6c145d4d51` (documentação; gate local equivalente executado em `3054d638`, código funcional em `68600d6a`) |
| MAIN / ORIGIN | Coincidiram em `3fa9ad78` no último push; atualização foi fast-forward, sem force-push |
| CURRENT CI | [#132](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34658653993): `failure`; `15/16` jobs verdes, somente Performance falhou |
| LOCAL STRICT GATE | `BLOCKED`, score `55`, critical `57`, open P0 `15`, `publication_allowed=false` |
| FROZEN QUALITY BAR | mínimo `97`, crítico `95`, máximo `0` P0 |
| QUALITY BAR ASSESSMENT | score `31`, crítico `33`, open P0 `7` antes da decisão agregada do gate |
| LOCAL VALIDATION | checks estáticos, typecheck, lint, build e `pnpm test` PASS; integração PostgreSQL `66/615`, processos críticos `11/11`, E2E canônico `2/2` |
| CURRENT VERDICT | **BLOCKED / NOT PROVEN**; nenhum release ou claim Triple-A autorizado |

O gate estrito executado com `TRIPLE_A_RUN_TESTS=1` confirmou a integridade do
checkout, passou os checks locais e registrou a suíte unitária como PASS. A
execução separada contra PostgreSQL/Redis locais também passou a integração
crítica e os onze cenários de processo. Essas provas locais fortalecem o
candidato, mas não substituem os envelopes externos exigidos pela régua.

O CI #132 do SHA documental terminou `failure` com `15/16` jobs verdes;
somente Performance falhou. Integration, E2E SPA, Unit, Visual, API Contract e
o contrato Windows passaram. O CI #131 anterior terminou verde, enquanto #130 e
#129 tiveram falha somente em Performance; esses resultados não são transferidos
e thresholds não foram alteradas.

O scorecard não emite `main green` nem `TRIPLE-A VERIFIED`. As limitações
operacionais, humanas, de target e de governança continuam registradas em
[17-current-execution-evidence.md](./17-current-execution-evidence.md).
