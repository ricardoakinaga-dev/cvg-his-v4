# Triple-A — 13 Final Scorecard

**Candidato avaliado:** `e793345ab71441298bdb2cb2de2755dc5921b115`

**Decisão atual:** `BLOCKED / NOT PROVEN`

## Candidato corrente — 2026-09-10T08:23:05Z

`a4a5658aa66200a70be709e986152fe61ffc0fe5` é o SHA corrente publicado em
`main`, com `origin/main` coincidente. O contrato crítico Linux passou `24/24`
e `pnpm lint` passou localmente. A execução completa local de `pnpm test` não
foi classificada como PASS por falha de permissões no banco descartável
(`permission denied for table tenants/accounts`).

O CI #58 ([run 34454422885](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34454422885)) ainda está em execução; o run #57 foi cancelado pela concorrência e não fornece evidência do SHA atual. O gate estrito com execução externa pulada permanece `BLOCKED / NOT PROVEN`, `score=43`, `critical=23`, `open_p0=27`, `publication_allowed=false`.

| Critério | Estado atual |
|---|---|
| Código, contratos e checks locais | PASS |
| Workflow clínico, invariantes e concorrência | PASS local; PostgreSQL/runtime aberto |
| API, worker, idempotência e auditoria | PASS local; integração alvo aberta |
| UX clínica e acessibilidade | Implementado; browser/UAT aberto |
| Supply chain e identidade de release | Controles implementados; imagens/attestations publicadas abertas |
| CI remoto, branch protection e autoridade | Não comprovado |
| DR/RPO/RTO/performance/deploy | Não comprovado |
| Release gate strict | BLOCKED — score 38, critical 25, 21 P0 abertos |

Os thresholds de 97/95/zero P0 permanecem congelados em [`QUALITY_BAR_V1.json`](./QUALITY_BAR_V1.json). Este scorecard não contém claim de certificação.

## Reconciliação terminal — CI #58 / candidato local `0dc4809b`

O run [34454422885](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34454422885) terminou `failure` para o SHA anterior `a4a5658aa66200a70be709e986152fe61ffc0fe5`. Dez jobs passaram; falharam Unit, E2E, Visual Regression, Integration, Windows Critical Process Runner e Performance.

| Evidência | Resultado terminal | Tratamento no candidato local |
|---|---|---|
| Unit | 2 datas de loyalty divergentes por timezone | Corrigido com timezone explícito de São Paulo |
| Integration | 2 falhas em concorrência de billing (`updatedAt`) | Corrigido com update condicional e releitura autoritativa |
| Windows runner | 4 falhas de limite de argumentos; package-manager contract passou | Corrigido no supervisor PowerShell |
| E2E SPA | 387/422 pass; 35 falhas (5 funcionais + 29 visuais) | Funcionais em correção; baselines visuais reais promovidos |
| Performance | 100% disponibilidade, 0% erros, 4 SLOs de latência falhos | Capacidade do pool explicitada; precisa de CI novo |

O gate strict local no SHA `0dc4809b3e06c8334667f39bf51c33e33c3c0f9` permanece `BLOCKED / NOT PROVEN`, score `68`, crítico `54`, `open_p0=16`, sem autorização de publicação. Portanto este scorecard não contém claim de certificação.

## Candidato de fechamento externo publicado

`b429e1bb410bb8d374f4b8a043308461497b7bca` — `BLOCKED / NOT PROVEN`; gate
strict `score=43`, `critical_score=23`, `open_p0=27`. A execução CI pública
`34404434195` estava pendente no momento da atualização. O incremento do score
reflete contratos/documentação e não substitui execução de PostgreSQL, browser,
UAT humano, recovery, performance, deploy, branch governance ou autoridade.

## Candidato corrente — `dcb731a196b499db246c5c53884c40547ec9e028`

O candidato corrente está publicado em `main`, com worktree limpo e baseline
externo atualizado. O gate local permanece `BLOCKED / NOT PROVEN` (`score=43`,
`critical=23`, `open_p0=27`). O CI `34418126020` / run 38 estava em execução
no momento da observação; nenhum job pendente foi contado como PASS. Os P0 de
PostgreSQL/RLS runtime, crash recovery, E2E/UAT, auditoria externa, imagens,
branch protection e autoridade continuam abertos até haver envelopes atuais,
verificáveis e vinculados ao SHA.
