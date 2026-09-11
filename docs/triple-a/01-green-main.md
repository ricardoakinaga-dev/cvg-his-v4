# Triple-A — 01 Green Main

**Status:** NOT PROVEN

Observado em `2026-09-11T19:39:53Z` no candidato
`b77539c9891eef89cbbe8160bf6e30a0fb369d48`. `HEAD`, `main` e `origin/main`
coincidem e a atualização preservou o rollback remoto sem force-push.

O CI exato [#126](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34635843119)
terminou `failure` com 14/16 jobs aprovados. Performance e o contrato do
Critical Process Runner Windows falharam; os demais checks obrigatórios
publicados no run passaram. A API pública não fornece os logs detalhados dos
jobs falhos sem autenticação administrativa, portanto a causa não foi
inferida nem escondida por alteração de threshold.

`docs/engineering/GREEN_MAIN_POLICY.md` exige que todos os checks obrigatórios
estejam verdes no mesmo SHA. Por isso este documento não autoriza release,
deploy produtivo ou o claim `TRIPLE-A VERIFIED`.
