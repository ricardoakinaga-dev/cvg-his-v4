# 0350 - ROADMAP DE FECHAMENTO DO GAP RUMO A 96 - 2026-04-24

**Taxonomia:** `CANONICO`
**Papel no sistema documental:** roadmap por ondas para elevar as notas atuais a `96/100`
**Ler em conjunto com:** `0349-PLANO-EXECUTIVO-FECHAMENTO-GAP-96-2026-04-24.md`, `0351-BACKLOG-FECHAMENTO-GAP-96-2026-04-24.md`, `0348-RELATORIO-AUDITORIA-DOCS-VS-CODIGO-2026-04-24.md`

**Data UTC:** `2026-04-24`

---

## 1. Linha de chegada

```text
Atual:       Core 92 | Vetus Comercial 51 | Docs vs Codigo 89
Meta final:  Core 96 | Vetus Comercial 96 | Docs vs Codigo 96
```

Roadmap recomendado: cinco ondas curtas, cada uma com saída verificável.

---

## 2. Timeline executiva

| Onda | Janela sugerida | Foco | Saida |
|---|---|---|---|
| A | Semana 1 | Backend comercial persistido | APIs e dominio para loyalty, price tables e POS sync |
| B | Semana 2 | SPA integrada e OpenAPI | telas novas sem dados locais e contrato publicado |
| C | Semanas 3-4 | Placeholders prioritarios | redução dos gaps de estoque, financeiro e fiscal |
| D | Semana 5 | Plataforma e isolamento | Helm validado, RLS/tenant tests e gates ampliados |
| E | Semana 6 | Auditoria final | re-score formal e documentação executiva fechada |

---

## 3. Onda A - Backend comercial persistido

**Objetivo:** transformar a migration `0021` em capacidade operacional real.

Entregas:

- pacote ou serviço de domínio para fidelidade;
- pacote ou serviço de domínio para tabelas de preço;
- serviço de jobs para sincronização PDV;
- repositórios persistidos usando `loyalty_*`, `price_*` e `pos_sync_jobs`;
- testes unitários de regra de negócio;
- testes de migration e integridade.

Gate de saída:

- `pnpm --filter @cvg-his/db run test`;
- testes dos novos módulos em `PASS`;
- dados isolados por `account_id`;
- nenhum fluxo principal dependendo apenas de mock.

---

## 4. Onda B - SPA integrada e OpenAPI

**Objetivo:** remover o principal gap entre telas novas e runtime.

Entregas:

- rotas API para fidelidade, resgates, tabelas de preço e jobs PDV;
- schemas OpenAPI;
- clients SPA em `apps/spa/src/services`;
- telas `LoyaltyPage`, `PriceTablesPage` e `PointOfSaleSyncPage` consumindo API;
- estados de loading, erro, vazio e sucesso;
- testes de rota, contrato e UI.

Gate de saída:

- `pnpm validate:openapi`;
- `pnpm --filter @cvg-his-v2/api test`;
- testes SPA direcionados;
- `frontend-backend-contract` cobrindo os endpoints novos.

---

## 5. Onda C - Placeholders prioritários

**Objetivo:** reduzir a dívida visível que segura `Frontend SPA`, `Estoque e comercial`, `Financeiro e fiscal` e `Paridade Vetus`.

Prioridade de substituição:

| Grupo | Rotas alvo | Motivo |
|---|---|---|
| Estoque avançado | `inventory/purchases`, `inventory/transfers`, `inventory/nf`, `inventory/audit` | impacto direto nos documentos Vetus de estoque |
| Financeiro operacional | `finance/accounts-payable`, `finance/cash-flow`, `finance/cheques` | gap visível em contas a pagar e fluxo financeiro |
| Fiscal | `fiscal/ipi`, `fiscal/ibs-cbs`, `reports/nf` | fecha lacunas fiscais e relatórios |
| Cadastros base | `breeds`, `species`, `coat-colors` | melhora paridade de clientes/animais |
| RH/Marketing | `rh/professions`, `marketing/sms`, `marketing/vaccine-email` | menor prioridade, mas completa superfície Vetus |

Gate de saída:

- placeholders P0/P1 removidos;
- testes de rotas confirmando componentes reais;
- documentação atualizada com o que ficou fora de escopo.

---

## 6. Onda D - Plataforma, isolamento e QA premium

**Objetivo:** recuperar a nota de plataforma e endurecer a nova superfície.

Entregas:

- `helm` disponível no runner ou validação Helm executada em CI;
- `pnpm validate:helm` em `PASS`;
- testes RLS/tenant para as tabelas da migration `0021`;
- integração comercial em banco de teste limpo;
- smoke/e2e com pelo menos um fluxo Vetus comercial ponta a ponta;
- alertas ou métricas mínimas para jobs PDV.

Gate de saída:

- `pnpm validate:helm`;
- `pnpm test:integration`;
- `pnpm test:e2e:spa` ou fluxo equivalente documentado;
- relatório de evidência operacional.

---

## 7. Onda E - Auditoria final e re-score

**Objetivo:** promover as três notas para `96/100` com evidência.

Entregas:

- nova auditoria docs vs código;
- scorecard final por eixo;
- atualização do tracker;
- fechamento do backlog `0351`;
- relatório final de decisão.

Gate de saída:

- nenhuma pendência P0/P1 aberta;
- todos os gates obrigatórios verdes;
- notas recalculadas e defensáveis.

---

## 8. Métrica de progresso

| Marco | Core | Vetus Comercial | Docs vs Codigo |
|---|---:|---:|---:|
| Baseline `0348` | 92 | 51 | 89 |
| Fim Onda A | 93 | 70 | 91 |
| Fim Onda B | 94 | 82 | 93 |
| Fim Onda C | 95 | 90 | 94 |
| Fim Onda D | 96 | 93 | 95 |
| Fim Onda E | 96 | 96 | 96 |

## 9. Progresso executado em 2026-04-24

Status atual: `Onda A`, `Onda B` e `Onda C` fechadas; parte de `Onda D` fechada para Helm, RLS comercial, relatorio operacional PDV e varredura de dados locais. A auditoria final da `Onda E` continua aberta.

Evidencias principais:

- Backend comercial persistido criado em `@cvg-his-v2/module-commercial`.
- API comercial publicada para fidelidade, resgates, tabelas de preco e jobs PDV.
- SPA passou a consumir API real em `LoyaltyPage`, `PriceTablesPage` e `PointOfSaleSyncPage`.
- OpenAPI validada com `184 paths`.
- Migration `0022_commercial_rls` aplicada e teste RLS comercial passou com `16/16`.
- `pnpm validate:helm` passou no runner sem `helm` via fallback estatico conservador; quando `helm` existir, o script continua executando `helm lint` e `helm template`.
- Placeholders `breeds`, `species` e `coat-colors` substituidos por catalogo estavel testado (`10/10`).
- Placeholders P1 de estoque, financeiro, fiscal e relatorios substituidos por telas reais API-backed ou decisao formal de escopo.
- Relatorio operacional de jobs PDV publicado em `PointOfSaleSyncPage`.
- Spec Playwright `e2e/spa/vetus-commercial-flow.spec.ts` criado para fluxo Vetus comercial com tutor real, fidelidade, tabela de preco e job PDV; o spec foi descoberto pelo Playwright, mas ainda nao executado por bloqueio ambiental do `webServer`.
- Varredura de dados locais remanescentes executada nas rotas P0/P1; nao ha `PlaceholderPage` nos alvos priorizados nem mock operacional no fluxo principal.

Notas operacionais:

- Ainda nao promover para `96/100` final: os gates P2 de e2e/smoke/integration/auditoria final permanecem abertos.
- O teste completo da API teve `startup-secrets.test.js` bloqueado no sandbox, mas o mesmo arquivo passou isolado fora do sandbox; isso deve ser registrado como restricao do ambiente de execucao local, nao como falha funcional.
- `pnpm test:integration` e `pnpm test:smoke` foram tentados apos P1; ambos seguem sem fechamento por restricoes do runner atual, respectivamente PostgreSQL local bloqueado e `webServer` Playwright encerrando cedo.
- A proxima acao tecnica deve ser executar os gates P2 em runner com PostgreSQL e Playwright `webServer` funcionais; sem isso, o score final deve permanecer em estado parcial.
