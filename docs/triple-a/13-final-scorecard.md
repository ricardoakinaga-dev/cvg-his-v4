# Triple-A — Current Scorecard

| Campo | Estado |
| --- | --- |
| CURRENT SNAPSHOT | `3054d6388becd9a262b2cd45fadbabc086c1ed75` (documentação; código funcional avaliado em `68600d6a`) |
| MAIN / ORIGIN | Coincidem em `3054d638`; atualização foi fast-forward, sem force-push |
| CURRENT CI | [#130](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34653388064): `failure`; apenas Performance falhou |
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

O CI #130 aprovou os checks de código e falhou somente em `Performance (k6
SLOs)`, no [job 103443316221](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34653388064/job/103443316221).
O CI #129 do SHA funcional teve o mesmo padrão. Thresholds não foram alteradas
e não há transferência de evidência entre SHAs.

O scorecard não emite `main green` nem `TRIPLE-A VERIFIED`. As limitações
operacionais, humanas, de target e de governança continuam registradas em
[17-current-execution-evidence.md](./17-current-execution-evidence.md).
