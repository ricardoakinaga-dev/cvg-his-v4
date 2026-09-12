# Triple-A — 00 Baseline

## Snapshot vigente — 2026-09-12T13:02:52Z

O baseline autoritativo do candidato atual está em
[`15-current-baseline.md`](./15-current-baseline.md) e
[`17-current-execution-evidence.md`](./17-current-execution-evidence.md):
`6462323f0a8f311f57da201e35e3d66994996391`, commit de hardening conjunto de logging, workflow e tenant. A documentação corrente sucede o candidato de assurance
`0d475dee358eab9621e5497db9929b7010ed09eb`; `HEAD == main == origin/main`,
com rollback preservado. O gate local estrito histórico permanece `BLOCKED`
com `55/57/15` (score/critical/open P0) e claim `NOT PROVEN`.

O [CI #155](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34695557227) pertence ao commit documental anterior e não tem resultado terminal aceito para `a258b3ce`. A reconciliação desta fotografia deve gerar uma nova execução CI com os
guards vinculados ao SHA correto. Nenhum resultado parcial ou histórico é
promovido; target, recovery, UAT, attestation, governança e autoridade de
release continuam `NOT PROVEN`.

## Registro obrigatório do prompt

| Campo              | Registro                                                                                                                                                                                                                                                   |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Problema           | Estabelecer arquitetura, forças, dívidas e riscos antes da implementação.                                                                                                                                                                                  |
| Estado anterior    | Baselines misturavam candidatos e não distinguiam local, CI e target.                                                                                                                                                                                      |
| Decisão            | Usar este índice histórico com o snapshot corrente em `15-current-baseline.md`.                                                                                                                                                                            |
| Implementação      | Prompt preservado, quality bar congelado, matriz e ledger append-only.                                                                                                                                                                                     |
| Arquivos alterados | `docs/triple-a/MASTER_PROMPT.md`, `QUALITY_BAR_V1.json`, `15-current-baseline.md`, `17-current-execution-evidence.md`, `.github/workflows/ci.yml`.                                                                                                         |
| Testes             | `pnpm docs:validate`; gate local e verificações de qualidade do candidato.                                                                                                                                                                                 |
| Evidências         | CI #151 com `15/16` jobs passando e falha exclusiva de Performance/k6, CI #147 `16/16` verde em outro descendente, gate local `55/57/15` do HEAD documental `c1059e6c`, seed/k6 locais e artefato estrito `BLOCKED`; gates de target permanecem sem prova. |
| Riscos residuais   | Evidência de target, recovery, governança, UAT e autoridade humana ausente.                                                                                                                                                                                |

## Reconciliação corrente — 2026-09-11T22:12:14Z

- Snapshot atual: `68600d6a55dcf18bd04c28ff3ee7528cc686efdb` (código funcional; documentação de reconciliação acompanha o candidato); `main`, `HEAD` e `origin/main` coincidem, com rollback remoto preservado e sem force-push.
- Esta fotografia vincula a evidência ao SHA exato e não transfere resultados históricos para commits documentais posteriores.
- CI atual: [#129](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34650926250) terminou `failure` com 15/16 jobs aprovados; somente Performance falhou em `Run k6 benchmark`/`Check SLO results`. O artefato está vinculado ao run, mas as métricas detalhadas não foram baixadas sem credencial.
- Veredicto: **BLOCKED / NOT PROVEN**. O prompt exige CI verde, quality bar, evidência operacional/humana atual e zero P0; nenhum score histórico é reutilizado e a publicação não é autorizada.
- Gate estrito local: `pnpm release:triple-a` retornou `BLOCKED`, score `54`, critical `54`, `16` P0 abertos e `publication_allowed=false`; a avaliação derivada do quality bar foi `31/33/7`.
- Checks locais de documentação, namespaces, migration source, OpenAPI, RLS estático, deploy surface, Helm estático, supply chain, dependências, schema clínico, secrets, complexidade, typecheck, lint e build passaram. A suíte de cobertura passou com 2.525 testes e 1 skipped.
- O artefato de performance e a limitação de acesso estão documentados em [`critic-performance-assurance-20260911.md`](./critic-performance-assurance-20260911.md). Nenhum threshold foi relaxado e nenhuma evidência de outro SHA foi transferida.
- O prompt e o quality bar mantêm os hashes registrados. O claim `TRIPLE-A VERIFIED` permanece proibido.

## Fotografia histórica da Fase 0

## Resultado histórico da fotografia inicial da Fase 0

| Classe                                                                                          | Situação atual                                                                                                | Prioridade              |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------- |
| Fundamentos de workspace, contratos, OpenAPI, migrations, RLS estático, typecheck, lint e build | Confirmados por comandos locais com exit 0                                                                    | PASS parcial            |
| Complexidade                                                                                    | `AppointmentsListPage.vue` excede o limite em 106 linhas                                                      | P0 aberto na fotografia |
| Helm                                                                                            | Só validação estática; binário ausente                                                                        | P1 aberto               |
| Testes completos                                                                                | `pnpm test` passou com exit 0 na fotografia inicial; SPA 211 arquivos/1862 testes e API 576 testes reportados | PASS local              |
| Release Triple-A                                                                                | Não existia gate agregador, evidence JSON ou scorecard final                                                  | P0 aberto na fotografia |
| DR/RPO-RTO/performance/chaos/supply chain                                                       | Implementações parciais, sem prova de release atual                                                           | P1 aberto               |
| Clinical criticality/safety invariants                                                          | Matriz consolidada ainda não existia                                                                          | P0 aberto na fotografia |
| UX/design                                                                                       | Base existente, mas certificação visual/UX desta missão ainda não executada                                   | P1 aberto               |

## Classificação de risco

- **Projeto:** `BROWNFIELD`
- **Tier:** `T4_CRITICAL`
- **Risco:** `CRITICAL`
- **Blast radius:** `CROSS_SYSTEM`
- **Trilho preservado:** monólito modular atual; sem V5/microserviços/rail paralelo.

## Decisão

O programa segue para implementação controlada. Não há autorização nem evidência para publicar `TRIPLE-A VERIFIED`, fazer deploy produtivo ou considerar os artefatos legados como prova. O baseline detalhado e as limitações estão em [`TRIPLE_A_BASELINE.md`](../engineering/TRIPLE_A_BASELINE.md), e a próxima ação persistida é `TRIPLE-A-BASELINE-RECORD`.

## Delta de implementação — 2026-09-09

- `pnpm complexity:check`, `pnpm validate:supply-chain`, typecheck e lint passam no worktree atual; a validação final deve ser repetida no commit publicado.
- O gate `pnpm release:triple-a` agora verifica worktree limpo, quality bar, thresholds, manifest por digest, SBOM/security evidence, supply chain, Helm/deploy identity e autoridade externa; sem essas provas, decide `BLOCKED / NOT PROVEN`.
- O replay idempotente grava e compara o ator, falha fechado para legado sem ator e revalida permissões nas famílias críticas mapeadas; runtime PostgreSQL/HTTP revogado ainda está aberto.
- Diagnósticos, prontuário, atendimento e agenda receberam correções de contexto, anexos binários, semântica de tabs, erros visíveis e ações para itens ocultos; browser/Axe/UAT ainda não foram executados.

## Atualização do candidato — 2026-09-10T11:47:12-03:00

- O código candidato local/remoto observado é `1434514c4e0ce88bc29d0feda28b09a61a08670f`; o worktree está limpo e `origin/main` coincide.
- O conjunto hospital-personas direcionado passou `5/5` em `35.2s`; os testes direcionados de controle de release passaram `20/20`; `pnpm test` concluiu sem falha observada na sessão local. Isso não prova HTTP autenticado com roles canônicas, RLS em runtime, auditoria genérica, jornada clínica completa, recovery ou UAT.
- CI #70 ([run 34490757429](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34490757429)) está `in_progress` no SHA exato; `Release Artifacts` #50 foi pulado enquanto CI não está verde.
- O gate local estrito com execução externa pulada retornou `BLOCKED`, com `score=42`, `critical_score=20`, `open_p0=28`, `claim=NOT PROVEN` e `publication_allowed=false`.

Nenhuma dessas evidências autoriza `TRIPLE-A VERIFIED`. O PostgreSQL usado pela E2E era descartável e foi encerrado após o teste.

## Atualização do candidato corrente — 2026-09-10T08:23:05Z

- `HEAD` e `origin/main` coincidem em `a4a5658aa66200a70be709e986152fe61ffc0fe5`, com worktree limpo antes desta atualização documental.
- O candidato corrige a invocação Windows do `pnpm.cmd` no runner (`cmd /d /c call` com argumentos separados). O contrato crítico Linux passou `24/24` e `pnpm lint` passou localmente.
- A execução local de `pnpm test` com PostgreSQL descartável não foi classificada como PASS: falhou na preparação de permissões do banco (`permission denied for table tenants/accounts`). Isso não substitui a execução CI nem prova o workflow PostgreSQL de release.
- CI #58 (`https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34454422885`) está em execução para o SHA corrente. O run #57 foi cancelado quando esse push mais novo o substituiu; seus failures parciais não são evidência do candidato atual.
- O gate estrito com execução externa explicitamente pulada retornou `BLOCKED`, `score=43`, `critical_score=23`, `open_p0=27`, `claim=NOT PROVEN` e `publication_allowed=false`. A execução pulada não autoriza release.
- Permanecem não provados: governança remota de `main`, restore/RPO/RTO, soak/performance alvo, observabilidade entregue, deploy/rollback, imagem assinada, UAT clínico e certificação visual corrente.

## Reconciliação terminal do CI #58 e candidato local — 2026-09-10T08:53:47Z

- O candidato local corrente é `0dc4809b3e06c8334667f39bf51c33e33c3c0f9`, quatro commits à frente de `origin/main` (`a4a5658aa66200a70be709e986152fe61ffc0fe5`). A documentação desta reconciliação ainda não foi publicada remotamente.
- O CI #58 ([run 34454422885](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34454422885)), vinculado ao SHA `a4a5658aa66200a70be709e986152fe61ffc0fe5`, terminou não verde: Typecheck, Dependency Audit, Secret Scan, SAST, Coverage, Repository Guards, Lint, Validate OpenAPI, Build e API Contract Tests passaram; Unit Tests, E2E, Visual Regression, Integration Tests, Windows Critical Process Runner e Performance falharam.
- Unit Tests falhou em duas datas da página de loyalty por formatação dependente de UTC; a correção local fixa `America/Sao_Paulo`.
- Integration Tests executou `65 passed, 1 failed` e `606 passed, 1 failed`; a falha foi a resposta concorrente de billing com `updatedAt` divergente. A correção local torna a atualização condicional e relê a linha autoritativa antes da resposta HTTP.
- O contrato do package manager Windows passou, mas quatro testes do supervisor de processo falharam porque o alvo Node recebeu `-e` e o script como um único argumento. A correção local preserva os limites dos argumentos no PowerShell.
- Visual Regression falhou em 29 snapshots coerentes com a UI consolidada; os 29 `actual.png` do artefato real foram inspecionados e promovidos localmente como baselines versionados para a próxima execução.
- Performance teve disponibilidade 100%, erros HTTP 0% e quatro SLOs de latência acima do alvo; o candidato local explicita pool de PostgreSQL de 60 conexões e mínimo 8 para o perfil de 60 VUs, sem relaxar thresholds.
- E2E SPA executou 422 testes: `387 passed` e `35 failed`. As cinco falhas funcionais foram registradas para correção: três controles/formulários nas personas hospitalares, uma permissão efetiva de diagnóstico, a auditoria master de `/api-keys` e `/api-client` retornando 401, e o botão `Fechamento` no walkthrough; as outras 29 falhas foram visuais.
- O gate local estrito no SHA `0dc4809b` terminou `BLOCKED`, `score=68`, `critical_score=54`, `open_p0=16`, `claim=NOT PROVEN` e `publication_allowed=false`. O Docker local continua indisponível por permissão no socket; nenhum resultado de PostgreSQL local bloqueado foi promovido a PASS.

Nenhum desses resultados autoriza `TRIPLE-A VERIFIED`, release ou deploy. O próximo candidato só será avaliado após os fixes funcionais e uma execução remota nova, vinculada ao SHA publicado.
