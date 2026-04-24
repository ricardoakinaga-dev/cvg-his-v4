# 0352 - RELATORIO PARCIAL ONDA P2 VETUS COMERCIAL - 2026-04-24

**Taxonomia:** `CANONICO`
**Papel no sistema documental:** evidência parcial da onda P2 antes do scorecard final
**Ler em conjunto com:** `0349-PLANO-EXECUTIVO-FECHAMENTO-GAP-96-2026-04-24.md`, `0350-ROADMAP-FECHAMENTO-GAP-96-2026-04-24.md`, `0351-BACKLOG-FECHAMENTO-GAP-96-2026-04-24.md`

**Data UTC:** `2026-04-24`

---

## 1. Escopo executado

Esta onda avançou a camada de QA e maturidade da frente Vetus comercial sem declarar fechamento final do programa.

Entregas:

- spec Playwright `e2e/spa/vetus-commercial-flow.spec.ts` para o fluxo comercial Vetus;
- criação de tutor real via API antes de pontuar/resgatar fidelidade;
- extensão da fixture E2E com `ApiCall.patch()`;
- verificação de descoberta do spec pelo Playwright;
- varredura de rotas P0/P1 contra `PlaceholderPage`;
- varredura de dados locais remanescentes nas telas P0/P1 priorizadas;
- atualização do tracker, plano, roadmap, backlog e índice Enterprise.

---

## 2. Evidências

| Gate | Resultado | Observação |
|---|---|---|
| `pnpm exec playwright test --config playwright-spa.config.ts --list \| rg "Vetus Comercial\|vetus-commercial"` | PASS | spec descoberto pelo Playwright |
| `pnpm --filter @cvg-his-v2/spa run typecheck` | PASS | sem erro de tipo na SPA |
| Varredura de placeholders P0/P1 | PASS | ausencia de matches nas rotas priorizadas |
| Varredura de dados locais | PASS operacional | exceções restritas a configuracoes de UI, mocks de teste e catalogo base estavel |
| `pnpm test:integration` | BLOQUEADO | PostgreSQL local inacessivel no sandbox por `EPERM` |
| `pnpm test:smoke` | BLOQUEADO | Playwright `webServer` encerra cedo no runner atual |

---

## 3. Status dos itens P2

| Item | Status após esta onda | Decisão |
|---|---|---|
| `GAP96-P2-001` | Implementado; bloqueado ambiente | manter aberto ate execução real do spec |
| `GAP96-P2-002` | Bloqueado ambiente | reexecutar em runner com PostgreSQL local acessivel |
| `GAP96-P2-003` | Bloqueado ambiente | reexecutar smoke/e2e com `webServer` funcional |
| `GAP96-P2-004` | Fechado | relatório operacional PDV publicado |
| `GAP96-P2-005` | Aberto | score final depende de gates verdes |
| `GAP96-P2-006` | Fechado | docs atualizados após ondas |
| `GAP96-P2-007` | Fechado | varredura executada e exceções justificadas |

---

## 4. Nota técnica parcial

As notas abaixo são leitura parcial de maturidade, não substituem o scorecard final `GAP96-P2-005`.

| Eixo | Baseline `0348` | Leitura parcial após P0/P1/P2 parcial | Condição para `96/100` |
|---|---:|---:|---|
| Enterprise core | 92 | 95 | integração, smoke/e2e e auditoria final verdes |
| Paridade Vetus comercial inicial | 51 | 95 | execução real do fluxo Vetus comercial ponta a ponta |
| Aderência docs Enterprise vs código atual | 89 | 95 | scorecard final publicado após gates P2 |

---

## 5. Decisão executiva

Não promover para `96/100` nesta rodada.

Motivo: a base já tem implementação suficiente para sustentar a leitura parcial em `95/100`, mas os gates que transformam implementação em evidência final ainda não foram executados com sucesso no ambiente atual.

Próxima ação obrigatória:

- executar `pnpm test:integration` em ambiente com PostgreSQL local liberado;
- executar `pnpm test:smoke` ou `pnpm test:e2e:spa` com `webServer` Playwright funcional;
- rodar o spec Vetus comercial real, não apenas descoberta/listagem;
- publicar novo scorecard final somente após os gates acima.
