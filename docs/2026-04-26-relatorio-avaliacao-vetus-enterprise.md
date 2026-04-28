# Relatório de Avaliação: `cvg-his-v2` vs Fonte da Verdade Vetus/Enterprise

**Data da análise:** 2026-04-26
**Base documental:** `docs/2026-04-26-vetus-parity-workflow-e-plano.md`, `docs/Enterprise/*`, `docs/vetus/guides/*`
**Código inspecionado:** `apps/spa/src`, `apps/api/src`, `packages/db`, `packages/modules`, `e2e`
**Responsável pela auditoria:** Kimi Code CLI

---

## 1. Resumo Executivo

O projeto `cvg-his-v2` possui uma **base Enterprise robusta e executável**: SPA canônica, API ampla (217 paths OpenAPI), banco com 36 migrations, arquitetura modular com 40+ módulos de domínio, testes unitários/API/SPA passando, RLS, LGPD, MFA e observabilidade.

A frente de **paridade Vetus** avançou significativamente nas áreas de **Atendimento (Cadastros + Agenda + Prontuário)**, **Laboratório (completo)** e **Estoque (Controles + Cadastros)**. O principal gap remanescente está nos macro-módulos **Financeiro (parcial)**, **Marketing**, **RH (parcial)** e **Relatórios**, além de algumas ações operacionais de estoque que ainda não persistem estado durável.

---

## 2. Notas por Eixo de Avaliação (0-100)

| # | Item Analisado | Nota | Justificativa |
|---|----------------|------:|---------------|
| 1 | **Governança Documental (Fonte da Verdade)** | **95** | Documentação Enterprise extensa, versionada e organizada (trackers, roadmaps, backlogs, scorecards, relatórios de auditoria). O `vetus-parity-workflow` é atualizado a cada tarefa. Perde pontos por alguns documentos ainda carregarem baseline histórico (`96/100` da fase anterior) que pode causar confusão sem leitura contextual. |
| 2 | **Paridade Vetus – Navbar e Estrutura Macro** | **88** | 208 rotas mapeadas no router, navbar alinhado com os 8 macro-módulos do Vetus (Início, Atendimento, Laboratório, Estoque, Financeiro, Marketing, RH, Relatórios). Ainda há rotas que dependem de `PlaceholderPage` ou não possuem tela real implementada em módulos periféricos. |
| 3 | **Paridade Vetus – Atendimento > Cadastros** | **95** | Clientes, Animais, Serviços, Importar Serviços, Termos de Responsabilidade, Raças, Espécies, Cores/Pelagens, Grupos de Clientes, Boxes de Internação e Webhooks estão implementados com API, SPA (lista/form/detalhe), migrations, testes e aliases PT-BR. |
| 4 | **Paridade Vetus – Atendimento > Agenda** | **92** | Revisão profunda Vetus-like concluída: calendário FullCalendar, filtros laterais, toolbar, fluxo de criação por cliente, check-in, no-show, cancelamento. Documentação ainda registra pequenos gaps de paridade visual/fluxo que podem ser refinados. |
| 5 | **Paridade Vetus – Prontuário Clínico** | **94** | Reconstruído como cockpit Vetus-like com rail fixo do paciente/tutor, ficha estruturada de atendimento (anamnese, exame físico, plano terapêutico, receituário), cards integrados (últimos atendimentos, exames, comanda, histórico). |
| 6 | **Paridade Vetus – Laboratório (Completo)** | **93** | Exames, Laudos, Hemogramas, Urina, Bioquímico, Equipamentos, Tipos de Laudo, Vlr. Ref. Hemograma e Vlr. Ref. Bioquímico implementados. API, SPA, migrations, testes. Perde pontos porque alguns itens foram construídos por artefatos observacionais (Cloudflare bloqueou acesso direto) e não por observação 100% direta. Também há débito técnico: a lógica de laboratório está esparsa entre `routes/laboratory-routes.ts` e `packages/modules/diagnostics/`, sem isolamento completo em `packages/modules/laboratory`. |
| 7 | **Paridade Vetus – Estoque > Controles** | **90** | 11/11 itens implementados: Consulta de Preços, Entrada NF, Transação no Estoque, Requisição à Farmácia, Validade, Auditoria de Estoque, Auditoria de Preços, Transferência, Compras, Reajuste de Preços, Coletores de Dados. Telas ricas e navegáveis. Perde pontos porque Transferência, Compras e Coletores ainda não persistem saldo/estado durável (registram apenas em runtime). |
| 8 | **Paridade Vetus – Estoque > Cadastros** | **92** | Produtos, Importar Produtos, Fornecedores, Estoques, Fabricantes, Grupos de Produtos, Setores da Empresa, Unidades de Medida e Tabelas de Preço implementados com CRUD completo, migrations, RLS e testes. Faltam apenas o cadastro completo de **Ponto de Venda** (existe apenas sincronização PDV, não o cadastro de PDV propriamente dito). |
| 9 | **Paridade Vetus – Financeiro** | **78** | PIX, cartões, caixa, despesas, centros de custo, contas a receber, reconciliação e NFS-e estão presentes. Ainda existem placeholders ou lacunas para: contas a pagar (fluxo completo), split de pagamentos, cheques, fluxo de caixa avançado, IPI, IBS/CBS e relatórios financeiros drill-down. |
| 10 | **Paridade Vetus – Marketing** | **55** | Módulo ainda não mapeado em profundidade no Vetus. Existem telas placeholder ou infraestrutura básica (email, SMS, WhatsApp), mas campanhas, lembretes automáticos e comunicados ainda não foram espelhados operacionalmente. |
| 11 | **Paridade Vetus – RH** | **62** | Staff, usuários, access-control e profissionais existem. Escalas, disponibilidade detalhada, comissões e permissões operacionais ainda são parciais ou não espelhados na ordem Vetus. |
| 12 | **Paridade Vetus – Relatórios** | **58** | Relatórios administrativos e alguns operacionais existem. Mas a grande maioria dos relatórios Vetus por domínio (atendimento, produção, fiscal, vacinas, exportações) ainda são placeholders ou não foram implementados. |
| 13 | **Paridade Vetus – Início / Dashboard** | **70** | Dashboard existe no `cvg-his-v2`, mas ainda não foi validado finamente contra os blocos reais do Início Vetus (cards de comandas, lembretes, aniversariantes, atalhos). |
| 14 | **Backend API e Contratos** | **94** | 217 paths na OpenAPI (validada: 34 tags, 187 schemas), 42 routers, typecheck passa, 165 testes de API passando. Módulo `commercial` com repository pattern e persistência real. Perde pontos por alguns endpoints de estoque ainda usarem composição somente leitura em vez de APIs dedicadas. |
| 15 | **Frontend SPA** | **90** | 161 páginas Vue, typecheck passa, 118 testes SPA + dezenas de testes específicos de inventory/lab. Design system existente. Perde pontos por algumas telas comerciais ainda usarem dados locais (embora a documentação 0352 indique que isso foi corrigido para P0/P1) e por placeholders remanescentes. |
| 16 | **Banco de Dados e Migrations** | **93** | 36 migrations canônicas, schema com 85+ tabelas, RLS em core e tabelas comerciais (`0022_commercial_rls`), multi-tenancy (`account_id`), LGPD, fiscal, prontuário e integridade. Seeds por conta. Perde pontos por `0036` ainda não ter sido validada em produção. |
| 17 | **Módulos de Domínio** | **90** | 40+ módulos em `packages/modules` (auth, billing, cash, commercial, inventory, laboratory, scheduling, etc.). Boa separação de concerns, repositories, testes. Módulo `commercial` é exemplo de maturidade. |
| 18 | **Testes e QA** | **91** | 165 testes API + ~118 SPA + testes de módulos. Typecheck e build passam. OpenAPI validada. Perde pontos porque `test:integration` e `test:smoke`/`test:e2e:spa` estão bloqueados no ambiente atual (PostgreSQL/playwright webServer), impedindo validação ponta a ponta real. Além disso, apenas 4 specs E2E para 161 páginas é cobertura mínima. |
| 19 | **Segurança e Compliance** | **94** | MFA (TOTP/WebAuthn), RLS, LGPD (consent pipeline), SOC2, audit trail (`audit_events`), secrets management, secretlint, API keys, access-control. Perde pontos por risco residual de operação real (Vault, rotação de segredos, cenários reais de ABAC). |
| 20 | **Observabilidade e Infraestrutura** | **89** | Docker Compose, Helm charts, health/readiness, metrics, SLOs, tracing. `validate:helm` passa agora (conforme 0349). Perde pontos por Docker não estar ativo no momento da inspeção e por alguns gates de infra não terem sido reexecutados nesta rodada. |
| 21 | **Integrações Externas** | **90** | Email, SMS, WhatsApp, PIX, Google Calendar, Webhooks, API keys, equipment bridge. Testes existem para a maioria. Perde pontos por dependerem de credenciais e operação real para validação definitiva. |
| 22 | **Autenticação e Controle de Acesso** | **95** | Login, MFA, OIDC, WebAuthn, RBAC, ABAC, sessão, revogação, hardening operacional. Módulos `auth`, `access-control` e `mfa` maduros e testados. |
| 23 | **Paridade Vetus Geral (Consolidada)** | **78** | Avanço expressivo em Atendimento, Laboratório e Estoque. Ainda faltam: Financeiro (parte avançada), Marketing (quase todo), RH (parcial), Relatórios (quase todo), Início (validação fina) e Ponto de Venda (cadastro). |
| 24 | **Aderência Docs Enterprise vs Código** | **91** | O código reflete fielmente a documentação de escopo. Cada módulo espelhado tem migration, API, SPA, testes e registro documental. Perde pontos por alguns documentos ainda registrarem baseline antigo e por gates bloqueados no ambiente atual. |

---

## 3. Médias e Scorecards

| Dimensão | Nota |
|:---|:---:|
| **Enterprise Core** (itens 1, 14-22) | **92/100** |
| **Paridade Vetus Comercial/Operacional** (itens 2-13) | **78/100** |
| **Aderência Geral Docs vs Código** (itens 1, 23-24) | **89/100** |
| **Nota Consolidada Ponderada** | **85/100** |

---

## 4. Evidências Técnicas Coletadas

| Evidência | Resultado |
|---|---|
| `pnpm --filter @cvg-his-v2/spa run typecheck` | ✅ PASS |
| `pnpm --filter @cvg-his-v2/api run typecheck` | ✅ PASS |
| `pnpm --filter @cvg-his-v2/api run test` | ✅ PASS (165 testes) |
| `pnpm validate:openapi` | ✅ PASS (217 paths, 34 tags, 187 schemas) |
| Rotas SPA mapeadas | 208 |
| Componentes/Páginas Vue | 161 |
| Routers API | 42 |
| Migrations duráveis | 36 (até `0036`) |
| Módulos de domínio | 40+ |
| `PlaceholderPage` no router | 1 ocorrência direta (rotas placeholder reduzidas drasticamente) |
| Docker Compose | Inativo no momento da inspeção |
| `test:integration` | ⚠️ BLOQUEADO (PostgreSQL local inacessível) |
| `test:smoke` / `test:e2e:spa` | ⚠️ BLOQUEADO (Playwright webServer encerra cedo) |
| Specs E2E existentes | 4 specs para 161 páginas |

---

## 5. Principais Gaps Identificados

1. **Financeiro avançado:** Contas a pagar, split, cheques, fluxo de caixa, IPI/IBS/CBS.
2. **Marketing completo:** Campanhas, lembretes automáticos, comunicados.
3. **RH completo:** Escalas, comissões, disponibilidade detalhada.
4. **Relatórios:** Quase todos os relatórios operacionais Vetus ainda não espelhados.
5. **Ponto de Venda (cadastro):** Existe apenas sincronização PDV, não o cadastro de pontos de venda.
6. **Ações de estoque sem persistência durável:** Transferência, Compras e Coletores registram apenas em runtime.
7. **Testes E2E/Integration bloqueados:** `test:integration` e `test:smoke`/`e2e:spa` impedidos por limitações do ambiente atual (PostgreSQL/Playwright webServer).
8. **Início/Dashboard:** Precisa de validação fina contra o Vetus real.
9. **Modularização do Laboratório:** Lógica esparsa entre `routes/laboratory-routes.ts` e `packages/modules/diagnostics/`. Recomenda-se extrair para `packages/modules/laboratory`.
10. **API runtime custom:** `server.ts` com ~206KB e routing manual é difícil de manter. Considerar migração futura para framework enxuto (Fastify/Hono).

---

## 6. Recomendações Imediatas

1. **Próximo item pela ordem do navbar Vetus:** `Estoque > Cadastros > Ponto de Venda` (conforme documento mestre).
2. **Fechar APIs persistidas** para as ações de estoque que ainda operam em runtime (transferência, compras, coletores).
3. **Validar o Início Vetus** e comparar com o Dashboard atual do `cvg-his-v2`.
4. **Executar `test:integration` e `test:e2e:spa`** em ambiente com PostgreSQL e Playwright funcionais para desbloquear o scorecard final.
5. **Iniciar onda de placeholders financeiros** (contas a pagar, fluxo de caixa) antes de abrir novos macro-módulos.
6. **Manter a disciplina documental:** atualizar o `2026-04-26-vetus-parity-workflow-e-plano.md` ao final de cada tarefa, incluindo commit e status.

---

## 7. Conclusão

O `cvg-his-v2` é um sistema **Enterprise maduro e bem arquitetado**. A paridade Vetus avançou de forma impressionante nas áreas críticas (Atendimento, Laboratório, Estoque), mas ainda há uma frente considerável em Financeiro, Marketing, RH e Relatórios antes de se declarar o espelhamento completo.

A base técnica sustenta nota **Enterprise Core 92/100**, mas a **Paridade Vetus geral está em 78/100**.
