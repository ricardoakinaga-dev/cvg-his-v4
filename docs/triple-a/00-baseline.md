# Triple-A — 00 Baseline

**Fotografia:** 2026-09-09 · **HEAD:** `main@696d7dd5` · **Status:** `NOT PROVEN`

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
