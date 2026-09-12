# Triple-A — 01 Green Main

**Status:** NOT PROVEN

No candidato `c7336ac0f6a909c10d07797c36814f0b321c6d5c`, `HEAD` e `origin/main`
coincidem e não houve force-push. A política em
[`docs/engineering/GREEN_MAIN_POLICY.md`](../engineering/GREEN_MAIN_POLICY.md)
exige todos os checks obrigatórios verdes no mesmo SHA.

O [CI #135](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34663821242)
terminou com 15/16 jobs verdes; somente Performance/k6 falhou. Os demais
checks, incluindo o E2E clínico canônico, passaram. Portanto a integração é
reversível e localmente validada, mas esta evidência não autoriza o claim
`main green`, release produtivo ou `TRIPLE-A VERIFIED`.

## Registro obrigatório do prompt

| Campo              | Registro                                                                                     |
| ------------------ | -------------------------------------------------------------------------------------------- |
| Problema           | Fazer a main bloquear regressões e aceitar somente checks obrigatórios verdes.               |
| Estado anterior    | O candidato tinha checks locais fortes, mas o CI remoto de performance oscilava.             |
| Decisão            | Não promover main a green enquanto um job obrigatório falhar.                                |
| Implementação      | Política Green Main, jobs pinned e diagnóstico terminal do k6.                               |
| Arquivos alterados | `.github/workflows/ci.yml`, `docs/engineering/GREEN_MAIN_POLICY.md`, scripts de diagnóstico. |
| Testes             | Contrato de workflow, guards e CI #135; performance permanece falha.                         |
| Evidências         | Run #135 vinculado ao SHA atual.                                                             |
| Riscos residuais   | SLO remoto, branch protection autenticada e release target.                                  |
