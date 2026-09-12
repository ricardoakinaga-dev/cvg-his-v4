# Triple-A — 01 Green Main

**Status:** PASS FOR CI #137 / RELEASE NOT PROVEN

No candidato funcional `1e0077a3d8f7a10ea5e53d7d9f8f0fdee2dca689`, `HEAD` e
`origin/main` coincidem e não houve force-push. A política em
[`docs/engineering/GREEN_MAIN_POLICY.md`](../engineering/GREEN_MAIN_POLICY.md)
exige todos os checks obrigatórios verdes no mesmo SHA.

O [CI #137](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34667412200)
terminou com 16/16 jobs verdes no mesmo SHA, incluindo unit, integração,
E2E SPA/usabilidade, visual e Performance/k6. Isso comprova o gate remoto
desse candidato; não comprova branch protection, target, UAT, recovery ou
release Triple-A.

## Registro obrigatório do prompt

| Campo              | Registro                                                                                     |
| ------------------ | -------------------------------------------------------------------------------------------- |
| Problema           | Fazer a main bloquear regressões e aceitar somente checks obrigatórios verdes.               |
| Estado anterior    | O candidato anterior tinha checks locais fortes, mas o CI remoto de performance oscilava.    |
| Decisão            | Registrar CI #137 como verde e manter release/Triple-A separado das provas externas.         |
| Implementação      | Política Green Main, jobs pinned e diagnóstico terminal do k6.                               |
| Arquivos alterados | `.github/workflows/ci.yml`, `docs/engineering/GREEN_MAIN_POLICY.md`, scripts de diagnóstico. |
| Testes             | Contrato de workflow, guards e CI #137 com 16/16 jobs verdes.                                |
| Evidências         | Run #137 vinculado ao SHA funcional `1e0077a3`.                                              |
| Riscos residuais   | SLO remoto, branch protection autenticada e release target.                                  |
