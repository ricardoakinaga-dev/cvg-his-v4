# Triple-A — 00 Baseline

**Fotografia inicial:** 2026-09-09 · **HEAD:** `main@696d7dd5` · **Status:** `NOT PROVEN`

**Reconciliação atual:** 2026-09-10T00:35:15-03:00 · **código candidato:** `main@cd7399f91bf3c3eda53e4598443acdbc9ff6d3b1` · **Status:** `BLOCKED / NOT PROVEN`

O candidato atual contém as correções clínicas, de integração, observabilidade, backup, gate de SBOM e limpeza de processos publicadas após a fotografia inicial. O CI #49 terminou com failures em cinco jobs; artefatos e resultados ligados a SHAs anteriores permanecem históricos e não são reutilizados como prova atual.

O prompt integral está salvo em [`MASTER_PROMPT.md`](./MASTER_PROMPT.md) e o hash conferido é `95270384800c87fcbe7e823a41a7b57834ddaac274914226745f7fdc5137197a`. O quality bar congelado antes da implementação está em [`QUALITY_BAR_V1.json`](./QUALITY_BAR_V1.json).

## Resultado da fotografia inicial da Fase 0

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

## Atualização do candidato — 2026-09-10T00:35:15-03:00

- O código candidato local/remoto observado foi `cd7399f91bf3c3eda53e4598443acdbc9ff6d3b1`; worktree limpo e `origin/main` coincidente.
- A suíte PostgreSQL descartável do workflow clínico passou `9/9`, mas os críticos atuais confirmam que isso não prova HTTP autenticado com roles canônicas, RLS em runtime, auditoria genérica ou a jornada clínica completa.
- CI #49 (`https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34431492523`) terminou com failures em Unit, Performance/k6, Visual Regression, E2E SPA e Windows contract; main não é green.
- O gate local atual retornou `PASS_WITH_CONDITIONS`, com `score=43`, `critical_score=23`, `open_p0=27` e `publication_allowed=false`.

## Atualização do candidato corrente — 2026-09-10T08:23:05Z

- `HEAD` e `origin/main` coincidem em `a4a5658aa66200a70be709e986152fe61ffc0fe5`, com worktree limpo antes desta atualização documental.
- O candidato corrige a invocação Windows do `pnpm.cmd` no runner (`cmd /d /c call` com argumentos separados). O contrato crítico Linux passou `24/24` e `pnpm lint` passou localmente.
- A execução local de `pnpm test` com PostgreSQL descartável não foi classificada como PASS: falhou na preparação de permissões do banco (`permission denied for table tenants/accounts`). Isso não substitui a execução CI nem prova o workflow PostgreSQL de release.
- CI #58 (`https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34454422885`) está em execução para o SHA corrente. O run #57 foi cancelado quando esse push mais novo o substituiu; seus failures parciais não são evidência do candidato atual.
- O gate estrito com execução externa explicitamente pulada retornou `BLOCKED`, `score=43`, `critical_score=23`, `open_p0=27`, `claim=NOT PROVEN` e `publication_allowed=false`. A execução pulada não autoriza release.
- Permanecem não provados: governança remota de `main`, restore/RPO/RTO, soak/performance alvo, observabilidade entregue, deploy/rollback, imagem assinada, UAT clínico e certificação visual corrente.
