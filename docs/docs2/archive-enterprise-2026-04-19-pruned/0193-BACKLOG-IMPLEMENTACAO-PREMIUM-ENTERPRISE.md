# 0193 - Backlog de Implementacao Premium Enterprise

**Status:** vivo
**Data de validacao:** 2026-04-12
**Escopo:** backlog operacional do plano completo
**Fonte primaria:** `0190`, `0191`, `0192`, `0206`, `0207`, `200`, `301`, `315`, `PLANO-F4`

---

## 1. Regras do backlog

- cada item precisa gerar evidencia executavel ou documental verificavel
- nenhum item sobe de status sem artefato de aceite
- prioridade `P0` bloqueia score e prontidao
- prioridade `P1` endurece a plataforma
- prioridade `P2` prepara escala e longo prazo

---

## 2. Backlog imediato - Recuperacao Executavel (`69 -> 80`)

| ID | Prioridade | Fase | Trilha | Item | Saida esperada | Dependencias | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-001 | P0 | R0 | Build | Corrigir tipagem do design system | `pnpm typecheck` verde | nenhuma | DONE |
| IMP-002 | P0 | R0 | Build | Corrigir barrel e exports do design system | `pnpm build` verde | IMP-001 | DONE |
| IMP-003 | P0 | R0 | SPA | Corrigir regressao de `NotificationsPage` | teste alinhado ao contrato real | nenhuma | DONE |
| IMP-004 | P0 | R0 | SPA | Alinhar `SkeletonLoader` e suite de testes | contrato unico componente/teste | nenhuma | DONE |
| IMP-005 | P0 | R1 | QA | Levar coverage global para `15%` | `pnpm test:coverage` verde no threshold atual | IMP-001, IMP-002 | TODO |
| IMP-006 | P0 | R1 | QA | Criar testes em `prescriptions` | coverage e comportamento cobertos | IMP-005 | TODO |
| IMP-007 | P0 | R1 | QA | Criar testes em `fiscal` | coverage e comportamento cobertos | IMP-005 | TODO |
| IMP-008 | P1 | R0 | Docs | Corrigir conflito de frontend canonico nas docs vivas | docs sem ambiguidade `apps/spa` x `apps/web` | nenhuma | DONE |
| IMP-009 | P1 | R0 | Docs | Corrigir links quebrados do legado residual | rastreabilidade documental limpa | IMP-008 | DONE |
| IMP-010 | P1 | R1 | API | Abrir extracao inicial de rotas de `server.ts` | primeiro corte por dominio feito | IMP-001 | TODO |
| IMP-011 | P0 | R1 | Release | Revalidar `release:check` | caminho basico de entrega novamente confiavel | IMP-001 a IMP-005 | DONE |

### Atualizacao executada em `2026-04-12` para `ERP-001` a `ERP-004`

- `ERP-001`: o escopo de `pnpm test:coverage` foi corrigido para medir apenas suites compatíveis e reproduzíveis do produto, removendo ruído de `node_modules` aninhados e do runner inadequado para `node:test`; resultado validado com `19` arquivos e `394` testes verdes.
- `IMP-005` continua `TODO` no aspecto numérico: o gate agora é honesto, mas a cobertura global ainda está em `6.73%`, abaixo do alvo documental de `15%`.
- `ERP-002` foi fechado em `2026-04-13`: `pnpm build`, `pnpm test:e2e:spa:docker` e `pnpm release:check` passaram no runner atual após corrigir os seletores Playwright em strict mode, alinhar o bootstrap visual de owner temporário e rebaselinar os snapshots da SPA contra o estado real do gate Docker.
- o drift entre `packages/modules/scheduling/package.json` e `pnpm-lock.yaml` permanece corrigido, o build Docker `spa-e2e` segue aceitando `pnpm install --frozen-lockfile --prod=false`, e os antigos blockers de lockfile, portas, shell/orquestração e login/bootstrap E2E deixaram de reproduzir neste executor.
- `IMP-011` passa a `DONE`: o caminho básico de entrega voltou a ficar defensável de ponta a ponta, com `release:check` atravessando guardrail, deploy-check, build, coverage e `pnpm test:e2e:spa:docker` sem bloqueio residual. O residual da fase `R1` volta a ficar concentrado em cobertura (`IMP-005/006/007`) e extração inicial de `server.ts` (`IMP-010`), não mais no gate de release.
- `ERP-003`: o runtime crítico ficou menos dependente de demo ao exigir `DATABASE_URL` em ambiente production-like, remover hardcode de `acc_cvg_demo` do bootstrap principal e não pré-carregar seeds locais quando há repositórios reais.
- `IMP-601` avançou materialmente: `session` e `encounterTimeline` deixaram de ser fallback puro em memória quando o DB está saudável; o residual crítico migrou para warm cache síncrono de auth e para módulos `cache hydrated` ainda documentados em `0196`/`0207`.

---

## 3. Backlog de Configuracao e Security Baseline

| ID | Prioridade | Fase | Trilha | Item | Saida esperada | Dependencias | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-101 | P0 | R2 | Config | Inventariar variaveis de ambiente por app | mapa unico de env vars obrigatorias | IMP-011 | DONE |
| IMP-102 | P0 | R2 | Config | Implementar schema Zod central para API | bootstrap validado | IMP-101 | DONE |
| IMP-103 | P0 | R2 | Config | Implementar schema Zod para worker | bootstrap validado | IMP-101 | DONE |
| IMP-104 | P0 | R2 | Config | Implementar schema Zod para SPA | build validando env critica | IMP-101 | DONE |
| IMP-105 | P0 | R2 | Config | Falha obrigatoria em configuracao invalida | fail-fast em runtime e CI | IMP-102, IMP-103, IMP-104 | DONE |
| IMP-106 | P0 | R2 | Security | Implementar CORS com allowlist por ambiente | fim de modo permissivo fora do local | IMP-105 | DONE |
| IMP-107 | P0 | R2 | Security | Revisar headers e defaults de seguranca HTTP | baseline de hardening documentada | IMP-106 | DONE |
| IMP-108 | P0 | R2 | Security | Ativar secret scanning obrigatorio no CI | pipeline falha ao detectar segredo | IMP-105 | DONE |
| IMP-109 | P1 | R2 | Security | Criar politica de rotacao de segredos | runbook e calendario de rotacao | IMP-108 | DONE |
| IMP-110 | P1 | R2 | Docs | Atualizar docs de ambiente e deploy | docs coerentes com schemas | IMP-105 | DONE |

---

## 4. Backlog de Observabilidade e Operacao Auditavel

| ID | Prioridade | Fase | Trilha | Item | Saida esperada | Dependencias | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-201 | P0 | R3 | Observability | Introduzir OpenTelemetry SDK | infraestrutura base de tracing enterprise | IMP-105 | DONE |
| IMP-202 | P0 | R3 | Observability | Configurar OTLP exporter | traces exportados para collector | IMP-201 | DONE |
| IMP-203 | P0 | R3 | Observability | Instrumentar HTTP e middleware principal | spans por request | IMP-202 | DONE |
| IMP-204 | P0 | R3 | Observability | Instrumentar DB e worker | spans por acesso critico e jobs | IMP-202 | DONE |
| IMP-205 | P1 | R3 | Observability | Correlacionar trace id com logs estruturados | RCA ponta a ponta | IMP-203, IMP-204 | DONE |
| IMP-206 | P1 | R3 | Ops | Atualizar dashboards e runbooks de tracing | operacao guiada por evidencia | IMP-205 | DONE |
| IMP-207 | P0 | R3 | Ops | Automatizar backup de banco e artefatos criticos | backup recorrente validado | IMP-105 | DONE |
| IMP-208 | P0 | R3 | Ops | Executar restore drill com evidencia | restore funcional documentado | IMP-207 | DONE |
| IMP-209 | P1 | R3 | Ops | Atualizar runbooks de DR, backup e restauracao | operacao auditavel | IMP-208 | DONE |
| IMP-210 | P1 | R3 | Compliance | Mapear evidencia para trilha SOC2 operacional | evidencias automatizaveis | IMP-205, IMP-209 | DONE |

---

## 5. Backlog de Runtime Premium

| ID | Prioridade | Fase | Trilha | Item | Saida esperada | Dependencias | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-301 | P1 | R4 | Runtime | Migrar rate limiter para Redis | limiter distribuido e escalavel | IMP-105 | TODO |
| IMP-302 | P1 | R4 | Runtime | Validar fallback seguro do limiter | protecao contra falha de Redis | IMP-301 | TODO |
| IMP-303 | P1 | R4 | Runtime | Sistema interno de feature flags com governanca | rollout controlado por ambiente via `@cvg-his-v2/shared-feature-flags` + `DatabaseFeatureFlagRepository` + catalog via `GET /flags` | IMP-105 | ✅ DONE (sistema proprio em vez de Unleash; ver `0319` e `0325`) |
| IMP-304 | P1 | R4 | Runtime | Definir governanca de flags | naming, owner, expurgo e auditoria | IMP-303 | TODO |
| IMP-305 | P0 | R4 | QA | Levar coverage global para `40%` | threshold intermediario sustentado | IMP-005, IMP-006, IMP-007 | TODO |
| IMP-306 | P1 | R4 | QA | Levar coverage global para `60%` | qualidade de medio prazo | IMP-305 | TODO |
| IMP-307 | P1 | R4 | API | Extrair mais dominios de `server.ts` | API menos centralizada | IMP-010 | TODO |
| IMP-308 | P1 | R4 | Release | Fixar gates de release sem excecao manual | trilha de entrega endurecida | IMP-305 | ✅ DONE (coverage threshold CI: `vitest.config.ts` com `coverage.thresholds` em 60%; `pnpm test:coverage` falha com exit code 1 se qualquer metrica cair abaixo; ver `0303-PLANO-CORRECAO-GAPS-ROADMAP-BACKLOG-2026-04-14.md` GAP-07) |

---

## 6. Backlog de Plataforma Premium de Longo Prazo

| ID | Prioridade | Fase | Trilha | Item | Saida esperada | Dependencias | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-401 | P1 | R5 | Architecture | Criar ADR de avaliacao Fastify | decisao formal de migrar ou nao migrar | IMP-307 | TODO |
| IMP-402 | P2 | R5 | Platform | Criar Helm chart da API | deploy padronizado em k8s | IMP-105 | TODO |
| IMP-403 | P2 | R5 | Platform | Criar Helm chart do worker | deploy padronizado em k8s | IMP-105 | TODO |
| IMP-404 | P2 | R5 | Platform | Criar Helm chart da SPA | deploy padronizado em k8s | IMP-105 | TODO |
| IMP-405 | P2 | R5 | Platform | Definir values `dev`, `staging`, `prod` | trilha multiambiente pronta | IMP-402, IMP-403, IMP-404 | TODO |
| IMP-406 | P2 | R5 | Security | Criar ADR de secrets manager dedicado | decisao formal de Vault ou equivalente | IMP-109 | TODO |
| IMP-407 | P2 | R5 | Security | Planejar migracao de `.env` para manager dedicado | transicao controlada | IMP-406 | TODO |
| IMP-408 | P2 | R5 | Architecture | Criar roadmap event-driven por dominio | mapa de eventos oficiais | IMP-307 | TODO |
| IMP-409 | P2 | R5 | Architecture | Definir contratos, retries e DLQ governados | base padronizada de eventos | IMP-408 | TODO |
| IMP-410 | P0 | R5 | QA | Levar coverage global para `80%` | target premium atingido | IMP-306 | TODO |

---

## 7. Backlog de documentacao e governanca

| ID | Prioridade | Fase | Trilha | Item | Saida esperada | Dependencias | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-501 | P0 | R0 | Docs | Consolidar roadmap e backlog como fonte de verdade | trilha viva coerente | nenhuma | DONE |
| IMP-502 | P1 | R2 | Docs | Atualizar deploy guide para config fail-fast e security baseline | docs operacionais alinhadas | IMP-105, IMP-106 | DONE |
| IMP-503 | P1 | R3 | Docs | Atualizar runbooks com tracing, backup e restore | operacao auditavel | IMP-206, IMP-209 | DONE |
| IMP-504 | P1 | R4 | Docs | Atualizar guia de release com gates endurecidos | release previsivel | IMP-308 | TODO |
| IMP-505 | P2 | R5 | Docs | Atualizar arquitetura alvo com Helm, secrets e event-driven | alvo premium formalizado | IMP-405, IMP-407, IMP-409 | TODO |

---

## 7.1 Backlog complementar - profundidade funcional e produção real

| ID | Prioridade | Fase | Trilha | Item | Saida esperada | Dependencias | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-601 | P0 | R1.5 | Prod | Reduzir seeds, `acc_cvg_demo` e modos `in-memory` em runtime crítico | baseline mais defensável para produção real | IMP-011 | PARTIAL |
| IMP-602 | P0 | R1.5 | Laboratório | Fechar backend real do laboratório e reduzir fallback/local catalogs | domínio laboratorial mais próximo da profundidade Vetus | IMP-011 | DONE |
| IMP-603 | P0 | R1.5 | Fiscal | Criar API fiscal dedicada e mover a service layer da SPA para contratos reais | domínio fiscal deixa de ser frontend-local | IMP-011 | DONE |
| IMP-604 | P1 | R2.5 | Financeiro | Aprofundar financeiro administrativo com AR/AP, fluxo de caixa, bancos e DRE | backoffice financeiro mais próximo da profundidade Vetus | IMP-011 | TODO |
| IMP-605 | P1 | R2.5 | RH/Marketing | Fechar comissões, folgas, cadastros administrativos e campanhas/templates | RH clássico e marketing saem do estado raso | IMP-011 | TODO |
| IMP-606 | P1 | R2.5 | Relatórios | Criar hubs analíticos por área operacional e administrativa | grupo Relatórios deixa de ser superficial | IMP-011 | TODO |

---

## 7.2 Backlog derivado do plano ERP Enterprise Premium Vetus-Based

O detalhamento canônico desta frente agora vive em:

- `docs/Enterprise/0206-PLANO-MESTRE-CONSTRUCAO-ERP-ENTERPRISE-PREMIUM-VETUS-BASED-2026-04-12.md`
- `docs/Enterprise/0207-BACKLOG-DERIVADO-ERP-ENTERPRISE-PREMIUM-VETUS-BASED-2026-04-12.md`
- `docs/Enterprise/0208-PROMPTS-COMPLETOS-EXECUTORES-FASE-1-ERP-ENTERPRISE-PREMIUM-2026-04-12.md`

Frentes prioritárias ativas derivadas dessa trilha:

- `ERP-001` a `ERP-004` — qualidade e produção real
- `ERP-010` a `ERP-013` — fiscal real (`ERP-010` a `ERP-012` fechados; `ERP-013` em andamento)
- `ERP-020` a `ERP-022` — laboratório real fechados; `ERP-023` em andamento como ponte diagnóstica
- `ERP-030` a `ERP-033` — agenda premium DONE em `2026-04-12`, com jornada agenda -> fila -> atendimento fechada sobre contrato real
- `ERP-040` a `ERP-042` — tutores completos
- `ERP-050` a `ERP-052` — animais completos

Regra de governança:

- novos executores devem partir desta trilha antes de abrir novas expansões amplas;
- qualquer mudança de status relevante dessas frentes deve refletir nesta documentação e nos documentos `0194` e `0196`.

---

## 8. Backlog por ordem recomendada de ataque

### Lote 1 - 2 semanas

- IMP-001
- IMP-002
- IMP-003
- IMP-004
- IMP-008
- IMP-009
- IMP-011

### Lote 2 - 4 semanas

- IMP-005
- IMP-006
- IMP-007
- IMP-010
- IMP-601
- IMP-602
- IMP-603
- IMP-101
- IMP-102
- IMP-103
- IMP-104
- IMP-105

### Lote 3 - 8 semanas

- IMP-106
- IMP-107
- IMP-108
- IMP-109
- IMP-110
- IMP-201
- IMP-202
- IMP-203
- IMP-204
- IMP-205

### Lote 4 - 12 semanas

- IMP-206
- IMP-207
- IMP-208
- IMP-209
- IMP-210
- IMP-604
- IMP-605
- IMP-606
- IMP-301
- IMP-302
- IMP-303
- IMP-304

### Lote 5 - 16-24 semanas

- IMP-305
- IMP-306
- IMP-307
- IMP-308
- IMP-401
- IMP-402
- IMP-403
- IMP-404
- IMP-405

### Lote 6 - 24+ semanas

- IMP-406
- IMP-407
- IMP-408
- IMP-409
- IMP-410
- IMP-505

---

## 9. Definicao de pronto por prioridade

| Prioridade | Definicao de pronto |
| --- | --- |
| P0 | comando verde, artefato criado e impacto no score evidente |
| P1 | funcionalidade operacional entregue e documentada |
| P2 | estrutura de longo prazo formalizada com ADR, template ou runbook |

---

## 10. Resultado esperado do backlog

Este backlog entrega:

- um caminho curto para `80/100`
- um plano de endurecimento para plataforma enterprise real
- um trilho longo para `90/100` sem inflar a maturidade artificialmente
