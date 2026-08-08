# 0349 - PLANO EXECUTIVO PARA FECHAMENTO DO GAP RUMO A 96 - 2026-04-24

**Taxonomia:** `CANONICO`
**Papel no sistema documental:** plano executivo para elevar `Enterprise core`, `Paridade Vetus comercial` e `Aderencia docs vs codigo` para `96/100`
**Ler em conjunto com:** `0348-RELATORIO-AUDITORIA-DOCS-VS-CODIGO-2026-04-24.md`, `0350-ROADMAP-FECHAMENTO-GAP-96-2026-04-24.md`, `0351-BACKLOG-FECHAMENTO-GAP-96-2026-04-24.md`, `0100-EXECUTION-TRACKER.md`

**Data UTC:** `2026-04-24`

---

## 1. Baseline e alvo

| Dimensao | Nota atual | Alvo | Gap |
|---|---:|---:|---:|
| Enterprise core | 92 | 96 | 4 |
| Paridade Vetus comercial inicial | 51 | 96 | 45 |
| Aderencia geral docs Enterprise vs codigo | 89 | 96 | 7 |

Objetivo executivo: transformar a frente Vetus comercial de superficie parcial em capacidade operacional persistida, reduzir placeholders prioritarios, fechar validação de plataforma e reancorar a documentação com evidência executável.

---

## 2. Principios de execucao

- Nenhuma nota sobe por narrativa: cada avanço exige código, contrato, teste e registro documental.
- Priorizar lacunas que afetam múltiplas notas ao mesmo tempo.
- Fechar primeiro API/persistencia antes de ampliar telas.
- Reduzir placeholders por dominio, não por tela isolada.
- Manter o score `96/100` antigo como histórico da fase `0346`, mas usar `0348` como baseline atual da nova frente.

---

## 3. Objetivos mensuráveis por eixo

### Enterprise core: `92 -> 96`

Necessário:

- `pnpm validate:helm` em `PASS` no ambiente de validação;
- reexecução de `pnpm typecheck`, `pnpm test`, `pnpm test:integration`, `pnpm test:e2e:spa` ou equivalente documentado;
- RLS/tenant isolation cobrindo as novas tabelas comerciais;
- auditoria final revalidando que o core não regrediu durante a expansão Vetus.

### Paridade Vetus comercial: `51 -> 96`

Necessário:

- módulo backend para fidelidade, tabelas de preço e sincronização PDV;
- rotas API e OpenAPI publicadas;
- SPA consumindo API real;
- jobs de sincronização PDV persistidos e observáveis;
- eliminação ou substituição dos placeholders comerciais mais relevantes;
- testes unitários, API, integração e UI cobrindo fluxos felizes, erro, vazio e isolamento por tenant.

### Aderencia docs vs codigo: `89 -> 96`

Necessário:

- atualizar tracker, backlog e scorecard a cada lote;
- fechar divergência entre docs Vetus e implementação real;
- manter um relatório final de evidências com gates verdes;
- classificar explicitamente o que fica fora de escopo para não contaminar o score.

---

## 4. Sequencia executiva recomendada

| Onda | Foco | Resultado esperado | Nota alvo acumulada |
|---|---|---|---|
| A | API comercial e persistencia | Vetus comercial deixa de ser tela local | Core 93, Vetus 70, Geral 91 |
| B | SPA integrada e contratos OpenAPI | Telas novas passam a operar dados reais | Core 94, Vetus 82, Geral 93 |
| C | Placeholders prioritarios e fluxos Vetus | Estoque/financeiro/fiscal comercial reduzem gaps visiveis | Core 95, Vetus 90, Geral 94 |
| D | Plataforma, Helm, RLS e QA premium | Gates enterprise fecham sem excecao ambiental | Core 96, Vetus 93, Geral 95 |
| E | Auditoria final e documentacao viva | Todas as notas reavaliadas e sustentadas | Core 96, Vetus 96, Geral 96 |

---

## 5. Gates obrigatórios para declarar `96/100`

| Gate | Criterio minimo |
|---|---|
| Código | módulos, rotas e telas sem mock operacional em fluxo principal |
| Banco | migrations aplicadas em banco de teste limpo e RLS/tenant isolation validado |
| OpenAPI | contrato validado e cobrindo novas rotas comerciais |
| Testes | unit/API/integracao/UI verdes para a frente nova |
| E2E | pelo menos um fluxo comercial Vetus ponta a ponta |
| Plataforma | `validate:helm` em `PASS` ou execução equivalente em runner com `helm` instalado |
| Documentação | README, tracker, backlog e relatório final atualizados |

---

## 6. Decisoes executivas

1. A prioridade imediata é `VETUS-COM-005` e `VETUS-COM-006`: API persistida e integração real da SPA.
2. A validação Helm é bloqueador de promoção do core para `96`.
3. Placeholders financeiros, fiscais e de estoque têm prioridade maior que novos módulos periféricos.
4. O fechamento final exige uma nova auditoria após implementação, não reaproveitamento automático da nota `0346`.

---

## 7. Riscos de execução

| Risco | Probabilidade | Impacto | Mitigacao |
|---|---|---|---|
| Expandir telas sem backend | Alta | Alto | bloquear score enquanto API/OpenAPI não existir |
| Migration comercial sem RLS explícita | Media | Alto | criar testes de isolamento antes do fechamento |
| Helm continuar indisponivel | Media | Medio | instalar no runner ou validar em ambiente CI dedicado |
| Frente Vetus crescer sem corte | Alta | Alto | limitar esta fase à paridade comercial priorizada |
| Docs voltarem a superestimar estado real | Media | Alto | atualizar score somente após gates executados |

---

## 8. Definicao de pronto

A fase só pode ser considerada concluída quando:

- `Enterprise core >= 96`;
- `Paridade Vetus comercial >= 96`;
- `Aderencia docs vs codigo >= 96`;
- backlog `0351` sem item P0/P1 aberto;
- relatório final publicado com evidências executadas na mesma rodada.

## 9. Atualizacao executiva pos-P0 - 2026-04-24

Status: os bloqueadores `P0` do backlog `0351` foram executados e fechados. A onda `P1` tambem foi fechada com substituicao dos placeholders priorizados por telas reais API-backed ou decisao formal de escopo. A fase completa ainda nao esta pronta porque faltam gates `P2` de e2e/integracao/smoke, revalidacao documental final e nova auditoria.

Entregas fechadas:

- API persistida de fidelidade, saldo, pontuacao e resgate.
- API persistida de tabelas de preco e itens.
- API persistida de jobs de sincronizacao PDV.
- SPA integrada a API real nas telas de fidelidade, tabelas de preco e sincronizacao PDV.
- RLS/tenant isolation para tabelas comerciais via `0022_commercial_rls`.
- OpenAPI atualizado e validado.
- `pnpm validate:helm` em `PASS` no runner atual com fallback estatico quando o binario `helm` nao existe.

Gates executados:

- `pnpm --filter @cvg-his-v2/module-commercial run build` - PASS.
- `pnpm --filter @cvg-his-v2/module-commercial run test` - PASS.
- `pnpm --filter @cvg-his-v2/api run typecheck` - PASS.
- `pnpm --filter @cvg-his-v2/api run build` - PASS.
- `node --test apps/api/dist/routes/commercial-routes.test.js` - PASS.
- `pnpm --filter @cvg-his-v2/spa run typecheck` - PASS.
- testes SPA comerciais direcionados - PASS (`5/5`).
- teste RLS comercial - PASS (`16/16`, executado fora do sandbox por necessidade de conexao local ao PostgreSQL).
- `pnpm validate:openapi` - PASS (`184 paths`).
- `pnpm validate:helm` - PASS.

Pendencias executivas:

- Rodar e registrar `pnpm test:integration` completo em ambiente com PostgreSQL local acessivel.
- Rodar e registrar `pnpm test:e2e:spa` ou smoke equivalente em ambiente onde o `webServer` Playwright suba API e SPA corretamente.
- Publicar auditoria final com re-score formal antes de declarar as tres notas em `96/100`.

## 10. Atualizacao executiva pos-P2 parcial - 2026-04-24

Status: a proxima onda implementou a cobertura E2E Vetus comercial e fechou a revisao de dados locais remanescentes, mas ainda nao autoriza promocao final para `96/100` porque os gates de execucao completa continuam bloqueados pelo ambiente atual.

Entregas fechadas ou implementadas:

- `e2e/spa/vetus-commercial-flow.spec.ts` cobre o caminho comercial Vetus por API e SPA: criacao de tutor real, programa de fidelidade, pontuacao, resgate, tabela de preco, item de tabela e job PDV concluido.
- `e2e/spa/fixtures/spa-fixture.ts` recebeu `ApiCall.patch()` para permitir transicoes de status nos fluxos E2E.
- A varredura de rotas P0/P1 confirmou ausencia de `PlaceholderPage` nos alvos priorizados.
- A varredura de dados locais nas telas comerciais/operacionais encontrou apenas configuracoes de UI, mocks de teste e catalogo base estavel, sem mock operacional no fluxo principal.

Gates executados:

- `pnpm exec playwright test --config playwright-spa.config.ts --list | rg "Vetus Comercial|vetus-commercial"` - PASS.
- `pnpm --filter @cvg-his-v2/spa run typecheck` - PASS.

Bloqueios remanescentes:

- `pnpm test:integration` segue bloqueado no sandbox por `EPERM` ao conectar em `127.0.0.1:5433`/`::1:5433`.
- `pnpm test:smoke` segue bloqueado porque o processo de `webServer` do Playwright encerra antes do teste.
- O scorecard final deve aguardar execucao verde desses gates, para evitar inflar artificialmente as notas.
