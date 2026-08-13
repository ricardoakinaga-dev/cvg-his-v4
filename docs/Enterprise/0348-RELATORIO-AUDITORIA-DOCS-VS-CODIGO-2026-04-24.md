# 0348 - RELATORIO DE AUDITORIA DOCS ENTERPRISE VS CODIGO - 2026-04-24

> **Documento histórico (24/04/2026).** O OpenAPI atual foi validado posteriormente com 293 paths; os números e scores deste relatório não representam sozinhos o estado de 11/08/2026.

**Taxonomia:** `CANONICO`
**Papel no sistema documental:** comparacao entre a linha mestra `docs/Enterprise` e o estado construido do programa
**Ler em conjunto com:** `0346-RELATORIO-AUDITORIA-FINAL-96-2026-04-22.md`, `0347-RELATORIO-CICLO-VETUS-PARIDADE-COMERCIAL-2026-04-24.md`, `0100-EXECUTION-TRACKER.md`, `200-BACKLOG-MASTER.md`, `301-RISK-REGISTER.md`

**Data UTC:** `2026-04-24`

---

## 1. Metodo

A auditoria cruzou:

- documentos vivos em `docs/Enterprise`;
- rotas SPA em `apps/spa/src/router/routes.ts`;
- navegacao SPA em `apps/spa/src/navigation.ts`;
- OpenAPI em `apps/api/src/openapi.yaml`;
- modulos em `packages/modules`;
- migrations em `packages/db/migrations`;
- infraestrutura em `infra`;
- testes e gates executados nesta rodada.

As notas abaixo medem aderencia do que esta construido hoje contra o que os documentos Enterprise declaram. `100` significa construido, integrado, testado e sem gap material conhecido. Notas abaixo de `90` indicam gap relevante para release premium ou paridade Vetus.

---

## 2. Evidencias reexecutadas nesta auditoria

| Evidencia | Resultado |
|---|---|
| `pnpm validate:openapi` | `PASS` - `175 paths`, `33 tags`, `178 schemas` |
| `node infra/scripts/check-cutover-readiness.mjs` | `PASS` |
| `pnpm --filter @cvg-his-v2/spa exec vitest run src/pages/inventory/__tests__/PriceTablesAndPosPage.test.ts src/pages/loyalty/LoyaltyPage.test.ts src/router/routes.test.ts src/navigation.test.ts` | `PASS` - `4 arquivos`, `19 testes` |
| `pnpm validate:helm` | `FAIL` ambiental - `spawnSync helm ENOENT` |

Evidencias herdadas da rodada imediatamente anterior, sem alteracao de codigo de runtime apos ela:

- `pnpm typecheck` -> `PASS`
- `pnpm test` -> `PASS`, incluindo `apps/spa` com `619` testes e `apps/api` com `139` testes
- migration `0021_commercial_loyalty_price_pdv` aplicada no banco de teste `cvg_his_v2_test`

---

## 3. Notas por eixo Enterprise

| Item analisado | Nota | Leitura objetiva |
|---|---:|---|
| Governanca documental | 94 | A linha mestra esta coerente e agora registra o ciclo Vetus em `0347`; perdeu pontos por ainda manter o score historico `96/100` como baseline ao lado de uma nova frente parcial. |
| Aderencia codigo vs docs | 88 | O core Enterprise esta bem refletido, mas a propria documentacao registra placeholders e ausencia de APIs persistidas para a fatia Vetus comercial. |
| Frontend SPA canonico | 88 | `apps/spa` e o frontend oficial, com muitas telas reais e testes; ainda ha 20 rotas placeholder e telas Vetus novas com dados locais. |
| Backend API | 91 | API ampla, modular e testada; OpenAPI valida com `175 paths`; lacuna atual esta nos endpoints de fidelidade, tabelas de preco e jobs PDV. |
| OpenAPI e contratos | 94 | Contrato valida estruturalmente e cobre o core; nao cobre ainda a nova base comercial da migration `0021`. |
| Autenticacao e sessao | 96 | Rotas, testes e documentacao sustentam login, MFA, sessao, revogacao e hardening operacional. |
| MFA, OIDC e WebAuthn | 94 | Maturidade alta, com testes compostos; ainda exige cautela operacional para segredos e rotação em ambiente real. |
| RBAC, ABAC e governanca de acesso | 94 | Modulo de access-control, auditoria e isolamento contextual existem; nota nao chega a 100 por depender de validacao continua em cenarios reais. |
| Multi-tenancy e RLS | 92 | Trilhas de RLS e tenant context estao presentes; a migration `0021` tem `account_id`, mas ainda nao demonstra politicas RLS proprias para as novas tabelas. |
| Banco e migrations | 91 | Migrations canonicas incluem multi-tenancy, RLS, LGPD, fiscal, prontuario e `0021`; aplicacao da `0021` foi provada no banco de teste, nao em producao. |
| Clinico core | 92 | Prontuario, triagem, encounters, internacao, prescricoes e diagnosticos existem com suites; score reduzido por falta de nova auditoria funcional completa nesta rodada. |
| Agenda e scheduling | 90 | Agenda, fila, recomendacao de duracao e testes estao presentes; documentacao Vetus de agenda ainda sugere melhorias de paridade visual/fluxo. |
| Financeiro e fiscal | 89 | Receivables, aging, reconciliacao, PIX, cards e NFS-e estao cobertos; ainda existem placeholders para contas a pagar, split, cheques, fluxo de caixa, IPI e IBS/CBS. |
| Estoque e comercial | 78 | Produtos, estoque, fabricantes, grupos e novas telas de preco/PDV existem; compras, transferencias, NF, farmacia, auditoria e APIs das novas telas ainda estao incompletas. |
| Vendas, comandas, orcamentos e pacotes | 86 | Existem telas e modulos relevantes para vendas, counter-sales, quotes e packages; maturidade ainda depende de fechamento completo de fluxos Vetus e persistencia ponta a ponta. |
| Laboratorio e diagnostics | 91 | Catalogos, pedidos, resultados, equipamentos, referencia e bridge diagnostics/lab estao implementados; mantem risco de paridade fina com os laudos Vetus especificos. |
| Integracoes externas | 92 | Email, SMS, WhatsApp, cards, Google Calendar, webhooks, API keys e equipment bridge existem com testes; depende de credenciais e operacao real por ambiente. |
| AI/ML aplicado | 88 | Smart scheduling, OCR fiscal, forecasting e anomalias existem; nota reduzida por maturidade de modelo, calibracao e valor operacional ainda exigirem ciclo de dados real. |
| Observabilidade e SLOs | 91 | Health, readiness, metrics, SLOs, alertas, tracing e dashboards existem; precisa de prova recorrente em ambiente implantado. |
| Plataforma, deploy e Helm | 80 | Docker, charts, values e cutover readiness existem; `validate:helm` falha no ambiente atual por falta do binario `helm`, impedindo nota maior. |
| Seguranca e segredos | 92 | Modulos de secrets, startup validation, Vault provider e secretlint existem; risco residual depende de operacao real de Vault/rotacao. |
| QA, testes e gates | 93 | Suite global passou na rodada anterior e checks direcionados passaram agora; nota abaixo de 100 por nao termos reexecutado coverage/e2e/helm completo nesta auditoria. |
| Paridade Vetus geral | 63 | A frente Vetus esta aberta e extensa; a fatia comercial inicial foi entregue, mas a maioria dos documentos Vetus ainda exige ondas de implementacao. |

**Nota consolidada ponderada:** `89/100`

Leitura correta: o baseline Enterprise permanece forte, mas o estado atual do programa, considerando a nova ambicao Vetus documentada, e melhor descrito como `89/100` de aderencia codigo-docs no momento desta auditoria.

---

## 4. Notas por item Vetus comercial (`VETUS-COM-*`)

| Item | Nota | Status real |
|---|---:|---|
| `VETUS-COM-001` - Fidelidade e resgate de pontos | 65 | Rota e tela existem, com teste; falta API persistida, OpenAPI e servico de dominio. |
| `VETUS-COM-002` - Tabelas de preco | 65 | Rota, tela e navegacao existem; falta CRUD/API, contratos e persistencia conectada. |
| `VETUS-COM-003` - Pontos de venda e sincronizacao | 60 | Tela e feedback de sincronizacao existem; falta worker/API real, fila operacional e processamento persistido. |
| `VETUS-COM-004` - Base relacional comercial | 88 | Migration existe e foi aplicada no banco de teste; falta validacao de producao e RLS explicita para as novas tabelas. |
| `VETUS-COM-005` - API/OpenAPI comercial | 20 | OpenAPI nao possui endpoints de loyalty, price tables ou POS sync. |
| `VETUS-COM-006` - Integracao real SPA/API | 25 | Telas novas usam dados locais; ainda nao consomem endpoints persistidos. |
| `VETUS-COM-007` - Validacao Helm da rodada | 35 | Infra Helm existe, mas a validacao falha no ambiente por ausencia de `helm`. |

**Media Vetus comercial:** `51/100`

---

## 5. Gaps materiais encontrados

| Gap | Impacto | Evidencia |
|---|---|---|
| 20 rotas ainda usam `PlaceholderPage` | Alto para paridade Enterprise/Vetus | `apps/spa/src/router/routes.ts` inclui cadastros, estoque, financeiro, fiscal, marketing, RH, relatorios e dashboards como placeholders. |
| Novas tabelas comerciais nao tem API | Alto | `apps/api/src/openapi.yaml` nao contem `/loyalty`, `/price-tables` ou `/pos-sync`. |
| Telas Vetus comerciais usam dados locais | Alto | As paginas novas passam nos testes de UI, mas nao consomem servicos persistidos. |
| Migration `0021` nao foi aplicada em producao | Medio/Alto | Aplicacao confirmada apenas em `cvg_his_v2_test`. |
| Helm nao validado no ambiente | Medio | `pnpm validate:helm` falha com `spawnSync helm ENOENT`. |
| Score historico `96/100` pode ser lido fora de contexto | Medio | `0346` fecha a fase Enterprise anterior; `0347` abre nova frente parcial Vetus. |

---

## 6. Conclusao

O programa tem base Enterprise real e executavel: SPA canonica, API ampla, modulos de dominio, migrations, testes, observabilidade, seguranca, integracoes e deploy readiness.

O ponto critico e documental e operacional agora e outro: a entrada da frente Vetus aumentou o escopo de produto. Contra esse escopo novo, o sistema nao deve ser comunicado como `100/100` nem como ERP Vetus completo.

Nota recomendada para comunicacao executiva em `2026-04-24`:

- **Enterprise core:** `92/100`
- **Paridade Vetus comercial inicial:** `51/100`
- **Aderencia geral docs Enterprise vs codigo atual:** `89/100`

---

## 7. Proximas acoes recomendadas

1. Implementar API e modulo de dominio para `loyalty`, `price_tables` e `pos_sync_jobs`.
2. Atualizar OpenAPI com esses contratos e testes de rota.
3. Conectar as telas novas aos endpoints reais.
4. Criar politicas/validacoes de isolamento para as tabelas da migration `0021`.
5. Instalar `helm` no runner ou mover `validate:helm` para ambiente com toolchain completo.
6. Reduzir placeholders por ondas, priorizando financeiro, estoque avancado e fiscal.
