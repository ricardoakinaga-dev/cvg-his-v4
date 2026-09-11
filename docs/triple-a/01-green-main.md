# Triple-A — 01 Green Main

**Status:** NOT PROVEN

Observado em `2026-09-11T20:19:59Z` no snapshot
`68bea151102c01ee54a3c782b5cf4b1c3ad631f5`, cujo pai funcional é
`b77539c9891eef89cbbe8160bf6e30a0fb369d48`. `HEAD`, `main` e `origin/main`
coincidem no snapshot publicado e nenhum force-push foi usado.

O CI exato [#127](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34641292826)
terminou `failure` com 15/16 jobs aprovados. Apenas Performance falhou; o
contrato do Critical Process Runner Windows passou. A API pública não fornece
os logs detalhados do job falho sem autenticação administrativa, portanto a
causa não foi inferida nem escondida por alteração de threshold.

`docs/engineering/GREEN_MAIN_POLICY.md` exige que todos os checks obrigatórios
estejam verdes no mesmo SHA. Por isso este documento não autoriza release,
deploy produtivo ou o claim `TRIPLE-A VERIFIED`.
