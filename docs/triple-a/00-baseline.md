# Triple-A — 00 Baseline

## Reconciliação corrente — 2026-09-11T08:40:00Z

- Candidato funcional: `5a079ceca57b246e17ecb0214ed1e2b9e9e23500`; `main`/`origin/main` estão em `227cb79243ad0e0787b0e81539661e759aae4694`, um commit documental metadata-only. A branch de origem permanece disponível para rollback.
- Esta fotografia separa o candidato funcional do commit documental e não transfere resultados históricos para ele.
- CI atual: [#34577711985](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34577711985) terminou 15/16; apenas Performance (k6 SLOs) falhou.
- Veredicto: **BLOCKED / NOT PROVEN**. O prompt exige CI verde, quality bar, evidência operacional/humana atual e zero P0; o gate diagnóstico pós-fix marcou score 56, crítico 32 e 15 P0, sem autorizar publicação.
- Evidência local limpa: `pnpm test` completo, lint, docs, supply-chain, release 20/20, provenance 5/5 e runner PostgreSQL 3/3 passaram; a prova local foi vinculada ao SHA e rebaixada a PARTIAL quando aplicável.
- O gate pré-publicação agora usa fases explícitas e estados `NOT_APPLICABLE` para critérios posteriores, sem remover critérios externos nem alterar o quality bar pós-publicação. O bundle continua em `artifacts/release/` e `artifacts/triple-a/TRIPLE_A_RELEASE_EVIDENCE.json`; nenhum envelope foi promovido.
- O prompt e o quality bar mantêm os hashes já registrados. O claim TRIPLE-A VERIFIED permanece proibido.

## Fotografia histórica da Fase 0

## Resultado histórico da fotografia inicial da Fase 0

| Classe | Situação atual | Prioridade |
|---|---|---|
| Fundamentos de workspace, contratos, OpenAPI, migrations, RLS estático, typecheck, lint e build | Confirmados por comandos locais com exit 0 | PASS parcial |
| Complexidade | `AppointmentsListPage.vue` excede o limite em 106 linhas | P0 aberto na fotografia |
| Helm | Só validação estática; binário ausente | P1 aberto |
| Testes completos | `pnpm test` passou com exit 0 na fotografia inicial; SPA 211 arquivos/1862 testes e API 576 testes reportados | PASS local |
| Release Triple-A | Não existia gate agregador, evidence JSON ou scorecard final | P0 aberto na fotografia |
| DR/RPO-RTO/performance/chaos/supply chain | Implementações parciais, sem prova de release atual | P1 aberto |
| Clinical criticality/safety invariants | Matriz consolidada ainda não existia | P0 aberto na fotografia |
| UX/design | Base existente, mas certificação visual/UX desta missão ainda não executada | P1 aberto |

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
