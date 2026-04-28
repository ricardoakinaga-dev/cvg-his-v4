# Relatorio de Auditoria do Programa: `cvg-his-v2` vs Vetus/Enterprise

**Data da auditoria:** 2026-04-27
**Relatorio base lido:** `docs/2026-04-26-relatorio-avaliacao-vetus-enterprise.md`
**Codigo auditado:** `apps/spa/src`, `apps/api/src`, `packages/db`, `packages/modules`, `tests`, `e2e`
**Auditor:** Codex CLI

---

## 1. Resumo Executivo

O `cvg-his-v2` segue como uma base Enterprise tecnicamente forte: SPA canonica com 161 paginas Vue, API com OpenAPI valida em 217 paths, 40 modulos de dominio, 42 migrations SQL, RLS/multi-tenancy, LGPD, MFA, WebAuthn, auditoria, observabilidade e integracoes externas.

A reauditoria confirma o avanco robusto em Atendimento, Laboratorio e Estoque, mas corrige um ponto importante do relatorio anterior: o router da SPA ainda possui **36 chamadas a `placeholderRoute(...)`**, nao apenas uma ocorrencia material. Esses placeholders estao concentrados em Financeiro, Marketing, RH, Administracao e Relatorios, o que reduz a nota de paridade Vetus e de Frontend em relacao ao score otimista anterior.

Leitura consolidada desta rodada:

- **Enterprise Core:** 92/100
- **Paridade Vetus operacional/comercial:** 77/100
- **Aderencia docs vs codigo:** 88/100
- **Nota consolidada ponderada:** 85/100

---

## 2. Evidencias Coletadas

| Evidencia | Resultado |
|---|---|
| `pnpm validate:openapi` | PASS - 217 paths, 34 tags, 187 schemas |
| `pnpm --filter @cvg-his-v2/api run typecheck` | PASS |
| `pnpm --filter @cvg-his-v2/spa run typecheck` | PASS |
| `pnpm --filter @cvg-his-v2/api run test` | PASS - 33 arquivos/subtestes Node, 0 falhas |
| `pnpm --filter @cvg-his-v2/spa run test` | PASS - 126 arquivos, 758 testes, 0 falhas |
| Rotas SPA mapeadas em `routes.ts` | 208 ocorrencias de `path:` |
| Paginas Vue em `apps/spa/src/pages` | 161 |
| Chamadas diretas a `placeholderRoute(...)` | 36, concentradas em Financeiro, Marketing, RH, Administracao e Relatorios |
| OpenAPI | 217 paths |
| Routers API | 41 arquivos `*-routes.ts` |
| Modulos de dominio | 40 diretorios em `packages/modules` |
| Migrations SQL | 42 arquivos `.sql` em `packages/db/migrations` |
| Specs E2E | 12 specs Playwright sob `e2e` |
| Arquivos `.test.ts` auditados | 307 no workspace relevante |

---

## 3. Notas por Item Avaliado

| # | Item avaliado | Nota | Justificativa |
|---|---|---:|---|
| 1 | Governanca Documental (Fonte da Verdade) | 94 | Documentacao extensa, com workflow Vetus, Enterprise, backlog, scorecards e trilha de decisoes. Perde pontos porque ha baselines historicos concorrentes e o relatorio anterior registrava uma contagem imprecisa de placeholders. |
| 2 | Paridade Vetus - Navbar e Estrutura Macro | 88 | Navbar segue a ordem macro Vetus: Inicio, Atendimento, Laboratorio, Estoque, Financeiro, Marketing, RH e Relatorios. A estrutura esta correta, mas varios itens navegam para placeholders. |
| 3 | Paridade Vetus - Atendimento > Cadastros | 95 | Clientes, Animais, Servicos, Importacao, Termos, Racas, Especies, Cores, Grupos, Boxes e Webhooks estao implementados com telas e APIs relevantes. |
| 4 | Paridade Vetus - Atendimento > Agenda | 92 | Agenda Vetus-like com aliases, filtros e fluxos operacionais. Mantem pequenos riscos de paridade visual/fina e depende de validacao E2E real continua. |
| 5 | Paridade Vetus - Prontuario Clinico | 94 | Cockpit clinico estruturado, rail de paciente/tutor, ficha de atendimento e integracoes com exames, receituario, comanda e historico. |
| 6 | Paridade Vetus - Laboratorio | 93 | Exames, laudos, hemogramas, urina, bioquimico, equipamentos, tipos de laudo e valores de referencia estao cobertos. Risco residual: logica ainda vive em `module-diagnostics` e `laboratory-routes`, nao em modulo `laboratory` isolado. |
| 7 | Paridade Vetus - Estoque > Controles | 89 | Controles principais possuem telas e testes SPA. A nota cai porque compras, transferencias e coletores ainda aparentam depender de composicao/estado operacional nao plenamente persistido como fluxo transacional de saldo. |
| 8 | Paridade Vetus - Estoque > Cadastros | 91 | Produtos, fornecedores, estoques, fabricantes, grupos, setores, unidades e tabelas de preco estao presentes. Ponto de venda existe como sincronizacao/operacao, mas ainda nao como cadastro completo de PDV. |
| 9 | Paridade Vetus - Financeiro | 76 | PIX, cards, caixa, despesas, centros de custo, bancos, formas de pagamento e recebiveis existem. Ha placeholders claros para split, pagamento antecipado, contas adm. cartao, timeline, maquininhas, simulador/exportador de split, dashboard de pagamentos e rotas financeiras avancadas. |
| 10 | Paridade Vetus - Marketing | 54 | Infra de notificacoes, WhatsApp e campanhas basicas existe, mas SMS simples, layout de email de vacina e configuracoes de SMS seguem como placeholder; modulo ainda nao reproduz operacionalmente Marketing Vetus. |
| 11 | Paridade Vetus - RH | 64 | Usuarios, grupos de acesso, profissionais, comissoes e folgas existem. Profissoes ainda e placeholder e escalas/disponibilidade/comissoes operacionais completas ainda exigem fechamento fino. |
| 12 | Paridade Vetus - Relatorios | 56 | Existem hubs e algumas paginas reais de relatorios, mas ha muitos placeholders em auditoria, financeiro, cadastros, atendimento e estoque. O modulo continua sendo um dos maiores gaps. |
| 13 | Paridade Vetus - Inicio / Dashboard | 70 | Dashboard existe, mas a documentacao ainda aponta necessidade de validar blocos reais do Inicio Vetus contra cards, lembretes, comandas, aniversariantes e atalhos. |
| 14 | Backend API e Contratos | 93 | API valida, 217 paths, 41 routers e typecheck/testes API verdes. Perde pontos por runtime HTTP manual grande e por lacunas de contratos dedicados em fluxos Vetus avancados. |
| 15 | Frontend SPA | 89 | SPA ampla, typecheck verde, 161 paginas e suite SPA verde com 126 arquivos/758 testes. A nota cai pela presenca confirmada de 36 placeholders. |
| 16 | Banco de Dados e Migrations | 92 | 42 migrations SQL, schema modular, multi-tenancy, RLS, LGPD, fiscal, prontuario, estoque e comercial. Perde pontos porque a auditoria nao aplicou migrations em banco real nesta rodada. |
| 17 | Modulos de Dominio | 90 | 40 modulos em `packages/modules`, boa separacao geral e repositories por dominio. Debito: laboratorio segue sob diagnostics e alguns fluxos comerciais/financeiros ainda nao tem modulo tao maduro quanto billing/commercial. |
| 18 | Testes e QA | 90 | API testou verde, SPA testou verde, typechecks verdes, 307 arquivos `.test.ts` e 12 specs E2E. A nota cai porque integration/e2e com banco/Playwright nao foram reexecutados nesta rodada. |
| 19 | Seguranca e Compliance | 93 | Auth, MFA, WebAuthn, RBAC/ABAC, LGPD, RLS, audit trail, API keys e secrets management existem. Mantem risco operacional em rotacao real de segredos, Vault e provas de isolamento em producao. |
| 20 | Observabilidade e Infraestrutura | 88 | Health/readiness, metrics, SLOs, tracing, Docker/Helm e scripts de deploy existem. Nao foi reexecutado gate Helm nem ambiente Docker nesta rodada. |
| 21 | Integracoes Externas | 89 | Email, SMS, WhatsApp, PIX, Google Calendar, webhooks e bridge de laboratorio existem com rotas/testes. Validacao definitiva depende de credenciais e ambiente real. |
| 22 | Autenticacao e Controle de Acesso | 95 | Login, MFA, OIDC/WebAuthn, RBAC, ABAC, sessoes e hardening estao entre as areas mais maduras do sistema. |
| 23 | Paridade Vetus Geral (Consolidada) | 77 | Atendimento, Laboratorio e Estoque sustentam boa cobertura. Financeiro avancado, Marketing, Relatorios, parte de RH, Inicio e PDV completo ainda impedem nota maior. |
| 24 | Aderencia Docs Enterprise vs Codigo | 88 | O codigo reflete boa parte da documentacao, mas ha divergencias de maturidade e registros historicos otimistas. A contagem real de placeholders exige ajustar a comunicacao executiva. |

---

## 4. Principais Achados

1. **A maior correcao contra o relatorio anterior e a quantidade de placeholders.** A auditoria atual encontrou 36 chamadas a `placeholderRoute(...)`, com impacto direto em Financeiro, Marketing, RH, Administracao e Relatorios.
2. **O core tecnico continua forte.** OpenAPI, typecheck API, typecheck SPA e testes API passaram.
3. **A paridade Vetus nao deve ser comunicada como fechada.** Atendimento, Laboratorio e Estoque estao bem avancados, mas Financeiro avancado, Marketing e Relatorios ainda puxam a nota para baixo.
4. **QA automatizado e bom, mas nao suficiente para score final.** API e SPA passaram, mas testes integration/e2e com banco/Playwright funcional nao foram reexecutados.
5. **O programa e maduro como plataforma Enterprise, mas incompleto como espelho Vetus total.**

---

## 5. Gaps Prioritarios

1. Reduzir placeholders, priorizando Relatorios e Financeiro.
2. Implementar cadastro completo de Ponto de Venda, separado de sincronizacao/operacao PDV.
3. Persistir de forma transacional os fluxos avancados de estoque: transferencias, compras e coletores.
4. Fechar Marketing Vetus: SMS simples, configuracoes, layout de email de vacina, campanhas e automacoes.
5. Completar RH: profissoes, escalas, disponibilidade fina e regras operacionais de comissao.
6. Rodar integration/e2e em ambiente com banco e Playwright funcionais.
7. Modularizar laboratorio em `packages/modules/laboratory` ou documentar formalmente a decisao de manter em diagnostics.

---

## 6. Veredito

Nota consolidada recomendada nesta auditoria: **85/100**.

O sistema esta acima da media para uma plataforma Enterprise interna e tem fundacao robusta. Ainda nao esta pronto para ser declarado como paridade Vetus completa. O proximo salto de nota depende menos de arquitetura nova e mais de fechamento operacional: remover placeholders, persistir fluxos avancados, completar relatorios e executar gates E2E/integration em ambiente completo.
