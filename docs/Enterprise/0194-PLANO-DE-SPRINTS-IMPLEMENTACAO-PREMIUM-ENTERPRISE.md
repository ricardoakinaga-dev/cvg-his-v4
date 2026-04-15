# 0194 - Plano de Sprints de Implementacao Premium Enterprise

**Status:** vivo
**Data de validacao:** 2026-04-12
**Escopo:** transformar o backlog `IMP-*` em sprints de 2 semanas
**Base:** [0192-ROADMAP-IMPLEMENTACAO-PREMIUM-ENTERPRISE.md](./0192-ROADMAP-IMPLEMENTACAO-PREMIUM-ENTERPRISE.md), [0193-BACKLOG-IMPLEMENTACAO-PREMIUM-ENTERPRISE.md](./0193-BACKLOG-IMPLEMENTACAO-PREMIUM-ENTERPRISE.md), [0206-PLANO-MESTRE-CONSTRUCAO-ERP-ENTERPRISE-PREMIUM-VETUS-BASED-2026-04-12.md](./0206-PLANO-MESTRE-CONSTRUCAO-ERP-ENTERPRISE-PREMIUM-VETUS-BASED-2026-04-12.md) e [0207-BACKLOG-DERIVADO-ERP-ENTERPRISE-PREMIUM-VETUS-BASED-2026-04-12.md](./0207-BACKLOG-DERIVADO-ERP-ENTERPRISE-PREMIUM-VETUS-BASED-2026-04-12.md)

---

## 1. Regras de sprint

| Parametro | Valor |
| --- | --- |
| Duracao | 2 semanas |
| Cadencia | planning no dia 1, review e retro no dia 10 |
| Capacidade alvo | 6 a 10 itens por sprint, sem exceder o gate de dependencias |
| Regra principal | nao puxar item de fase seguinte sem aceite da fase atual |
| Regra de qualidade | item P0 so fecha com evidencia executavel |

### Definition of Done

- codigo mergeado sem quebrar o restante da trilha
- criterio de aceite validado
- documentacao atualizada quando aplicavel
- comando, teste ou artefato de prova anexado ao item

---

## 2. Ordem de ataque

1. recuperar o executavel
2. bater `80/100`
3. endurecer config e seguranca
4. tornar a operacao auditavel
5. evoluir runtime premium
6. fechar a trilha de longo prazo

**Leitura real em `2026-04-12`:**
- a trilha de `R2` e `R3` avancou antes do fechamento de `R0` e `R1`
- Sprints 3 e 4 estao implementadas
- Sprint 5 esta tecnicamente concluida
- Sprint 6 entrou em execucao com `IMP-207` entregue
- Sprints 1 e 2 seguem abertas e hoje representam debito estrutural de base do plano
- a partir de `0206` foi aberta uma frente canônica de ERP veterinário enterprise premium
- os três primeiros executores dessa nova frente são: fiscal real, laboratório real e agenda premium

---

## 3. Sprint 1 - Recuperacao do Executavel

**Janela:** semanas 1-2  
**Objetivo:** recuperar build, typecheck e confiabilidade minima da SPA.

**Itens:**
- `IMP-001` corrigir tipagem do design system
- `IMP-002` corrigir barrel e exports do design system
- `IMP-003` corrigir regressao de `NotificationsPage`
- `IMP-004` alinhar `SkeletonLoader` e suite de testes
- `IMP-008` corrigir conflito de frontend canonico nas docs vivas
- `IMP-009` corrigir links quebrados do legado residual

**Criterio de aceite da sprint:**
- `pnpm typecheck` passa
- `pnpm build` passa
- testes focados de notifications e skeleton passam
- docs vivas nao conflitam sobre `apps/spa` x `apps/web`

**Risco principal:**
- correcoes pontuais revelarem outras quebras encadeadas no design system

---

## 4. Sprint 2 - Entrada em 80

**Janela:** semanas 3-4  
**Objetivo:** bater o threshold minimo de coverage e revalidar o caminho basico de entrega.

**Itens:**
- `IMP-005` levar coverage global para `15%`
- `IMP-006` criar testes em `prescriptions`
- `IMP-007` criar testes em `fiscal`
- `IMP-010` abrir extracao inicial de rotas de `server.ts`
- `IMP-011` revalidar `release:check`

**Criterio de aceite da sprint:**
- `pnpm test:coverage` passa acima do threshold atual
- `release:check` volta a ser defensavel
- primeiro recorte de modularizacao da API entregue
- score operacional sustentando o patamar `80/100`

**Risco principal:**
- aumento de coverage sem atacar os pontos certos, produzindo ruido em vez de ganho real

## 4.1 Sprint 2.5 - Profundidade funcional inicial

**Janela:** complementar entre semanas 4-5  
**Status:** parcialmente executada em `2026-04-12`  
**Objetivo:** reduzir gaps onde a UI publicada ainda prometia mais do que o backend entregava.

**Itens:**
- `IMP-601` reduzir seeds, `acc_cvg_demo` e modos `in-memory`
- `IMP-602` fechar backend real do laboratório
- `IMP-603` criar API fiscal dedicada e mover a SPA para contratos reais

**Resultado atual:**
- `IMP-602` entregue com `apps/api/src/routes/laboratory-routes.ts`, `packages/modules/diagnostics/**` e `apps/spa/src/services/laboratory.ts` migrado para `/api/laboratory/*`
- `apps/spa/src/pages/clinical/DiagnosticsPage.vue` passou a registrar pedido real e usar `/diagnostics` como ponte operacional para o laboratório
- `IMP-603` entregue com superfície fiscal mínima real em `apps/api/src/routes/fiscal-routes.ts` e `packages/modules/fiscal/src/service.ts`
- `apps/spa/src/services/fiscal.ts` passou a consumir `/api/fiscal/*` em vez de importar artefatos compilados do módulo
- páginas fiscais foram reclassificadas para consulta/revisão, sem prometer CRUD inexistente
- o domínio fiscal deixou de ser frontend-local, mas continua raso e sem persistência/backoffice fiscal completo

**Pendência remanescente da sprint:**
- `IMP-601` continua aberto

---

## 5. Sprint 3 - Config Baseline

**Janela:** semanas 5-6  
**Status:** implementada em `2026-04-12`  
**Objetivo:** tirar configuracao implicita do runtime.

**Itens:**
- `IMP-101` inventariar variaveis de ambiente por app
- `IMP-102` schema Zod para API
- `IMP-103` schema Zod para worker
- `IMP-104` schema Zod para SPA
- `IMP-105` falha obrigatoria em configuracao invalida
- `IMP-110` atualizar docs de ambiente e deploy

**Criterio de aceite da sprint:**
- API, worker e SPA usam schema explicito
- bootstrap aborta em config invalida
- docs de ambiente ficam coerentes com os schemas

**Risco principal:**
- descoberta tardia de variaveis nao documentadas em fluxo real

**Resultado de implementacao:**
- inventario central de env vars publicado em `@cvg-his-v2/shared-config`
- API, worker e SPA validados por schema Zod com fail-fast
- docs de ambiente alinhadas ao bootstrap real
- validacao dedicada do pacote de config verde; typecheck completo dos apps ainda bloqueado por debito estrutural preexistente do monorepo

---

## 6. Sprint 4 - Security Baseline

**Janela:** semanas 7-8  
**Status:** implementada em `2026-04-12`  
**Objetivo:** endurecer a superficie minima de seguranca operacional.

**Itens:**
- `IMP-106` CORS com allowlist por ambiente
- `IMP-107` revisar headers e defaults de seguranca HTTP
- `IMP-108` ativar secret scanning obrigatorio no CI
- `IMP-109` criar politica de rotacao de segredos
- `IMP-502` atualizar deploy guide para config fail-fast e security baseline

**Criterio de aceite da sprint:**
- CORS permissivo removido fora de ambiente local
- pipeline falha ao detectar segredo
- baseline de seguranca documentada e executavel

**Risco principal:**
- endurecimento quebrar algum fluxo legado ou ambiente mal configurado

**Resultado de implementacao:**
- CORS saiu de `*` para allowlist explicita por ambiente
- headers HTTP receberam baseline executavel e HSTS ficou condicionado a ambiente HTTPS
- pipeline ganhou gate obrigatorio de secret scanning reproduzivel localmente
- politica de rotacao de segredos publicada com calendario e runbook operacional
- deploy guide consolidado para config fail-fast e security baseline
- secrets manager dedicado continua como trilha futura de `R5`, nao como pendencia desta sprint

---

## 7. Sprint 5 - OpenTelemetry Foundation

**Janela:** semanas 9-10  
**Status:** concluida tecnicamente em `2026-04-12`  
**Objetivo:** sair de tracing local para observabilidade enterprise real.

**Itens:**
- `IMP-201` introduzir OpenTelemetry SDK
- `IMP-202` configurar OTLP exporter
- `IMP-203` instrumentar HTTP e middleware principal
- `IMP-204` instrumentar DB e worker
- `IMP-205` correlacionar trace id com logs estruturados

**Criterio de aceite da sprint:**
- traces reais sao exportados
- spans cobrem HTTP, DB e worker
- logs e traces podem ser correlacionados por request

**Risco principal:**
- overhead de instrumentacao ou baixa qualidade dos spans gerados

**Resultado parcial:**
- `IMP-201` entregue com SDK OpenTelemetry em API e worker
- `IMP-202` entregue com exporter OTLP/HTTP configuravel por ambiente
- `IMP-203` entregue com spans HTTP ativos, atributos de request e propagacao de contexto no handler
- `IMP-204` entregue com spans de worker e spans de query no `shared-database`
- bootstrap de observabilidade passou a ser validado por schema central
- API exporta spans manuais via SDK e worker gera spans de tick
- logs estruturados passaram a normalizar `requestId` e `correlationId` e carregam `traceId` e `spanId` quando ha span ativo
- API passou a expor `x-trace-id` alem de `traceparent`, fechando o contrato observavel de correlacao por request
- `IMP-205` entregue com teste de contrato cobrindo headers de correlacao e estrutura de log correlacionavel
- fechamento operacional da Release C continua dependente da Sprint 6

---

## 8. Sprint 6 - Operacao Auditavel

**Janela:** semanas 11-12
**Status:** DONE — `IMP-206/207/208/209/210/503` entregues em `2026-04-12` com evidencia executavel em `/tmp/cvg-his-v2-restore-drills/imp208-20260412T071023Z-restore-drill-20260412T071032Z-1311985/` e runbook vivo em `docs/521-operational-runbook-enterprise.md`  
**Objetivo:** provar operacao, backup e restore com evidencia.

**Itens:**
- `IMP-206` atualizar dashboards e runbooks de tracing
- `IMP-207` automatizar backup de banco e artefatos criticos
- `IMP-208` executar restore drill com evidencia
- `IMP-209` atualizar runbooks de DR, backup e restauracao
- `IMP-210` mapear evidencia para trilha SOC2 operacional
- `IMP-503` atualizar runbooks com tracing, backup e restore

**Criterio de aceite da sprint:**
- backup roda de forma automatizada
- restore foi executado e documentado
- runbooks de operacao e DR estao consistentes
- evidencias basicas para auditoria ficam rastreaveis

**Risco principal:**
- automacao de backup existir, mas restore real revelar lacunas de recuperacao

**Resultado parcial:**
- `IMP-207` entregue com `infra/scripts/backup-v2.sh` e comando raiz `pnpm ops:backup:v2`
- backup logico do PostgreSQL validado com `pg_restore -l`
- backup do storage critico validado com archive `tar.gz` e checksum
- bundle operacional agora gera `manifest.json`, `restore-hints.txt`, checksums e metadata do compose
- retencao minima de `7` dias documentada em `.env.v2.example` e `docs/130`
- `IMP-208` entregue com `infra/scripts/restore-drill-v2.sh` e comando raiz `pnpm ops:restore:drill:v2`
- restore drill executado sobre bundle real `imp208-20260412T071023Z`, com restore de globals, dump logico e storage em runtime descartavel
- evidencia registrada em `/tmp/cvg-his-v2-restore-drills/imp208-20260412T071023Z-restore-drill-20260412T071032Z-1311985`
- drill validou `43` tabelas publicas restauradas e diff vazio no storage restaurado
- `IMP-209` entregue — runbook DR/backup/restore atualizado em `docs/521-operational-runbook-enterprise.md` com comandos reais, caminhos de arquivos, criterios de aceite e checklist operacional
- `IMP-210` entregue — mapeamento SOC2 conectando endpoints `/soc2/evidence` e `/soc2/security-score` (implementados em `apps/api/src/server.ts` linhas 1556-1628 via `soc2MfaControl`, `soc2VulnControl`, `soc2AccessControl`, `soc2DrControl`, `soc2IncidentControl`) aos criterios CC6.2, CC3.1, CC5.1, CC7.1, CC7.2, CC8.1 e controles reais documentados em `packages/modules/soc2/src/`
- `IMP-503` entregue — runbook de observabilidade (`docs/521`, `infra/observability/README.md`) integrado com backup (2.1-2.4), tracing (3.1-3.8), SOC2 (4.1-4.5), health endpoints (5) e checklist de aceite operacional (8)

---

## 9. Sprint 7 - Runtime Premium I

**Janela:** semanas 13-14  
**Objetivo:** remover dependencias locais do runtime critico.

**Itens:**
- `IMP-301` migrar rate limiter para Redis
- `IMP-302` validar fallback seguro do limiter
- `IMP-303` ✅ DONE: sistema interno de feature flags ( `@cvg-his-v2/shared-feature-flags` + `DatabaseFeatureFlagRepository` + catalog `GET /flags`)
- `IMP-304` ✅ DONE: governanca implementada com owner, scopes, expiresAt, auditRequired por flag

**Criterio de aceite da sprint:**
- rate limiter nao depende mais de memoria local
- fallback seguro cobre indisponibilidade parcial
- feature flags estao operacionais por ambiente ✅
- governanca minima de flags esta definida ✅

**Risco principal:**
- complexidade operacional adicional sem observabilidade suficiente

---

## 9.1 Sprint 2E - ERP Premium Wave 1

**Janela:** imediatamente após estabilização de `R1`  
**Status:** IN PROGRESS em `2026-04-12`  
**Objetivo:** iniciar a profundidade ERP real derivada do plano `0206`.

**Leitura atual:**
- executor fiscal fechou `ERP-010`, `ERP-011` e `ERP-012`
- `ERP-013` entrou em andamento com filtros e cobertura ampliada das tabelas fiscais prioritárias
- `ERP-001` foi fechado com escopo honesto de `pnpm test:coverage` (`19` arquivos, `394` testes)
- `ERP-002` foi fechado em `2026-04-13`: o drift de lockfile já corrigido deixou de ser a leitura vigente, o build Docker `spa-e2e` segue aceitando `--frozen-lockfile` e o gate voltou a passar de ponta a ponta no runner atual.
- a revalidação final deste lote fechou o bloco funcional/visual da suíte SPA com ajuste de seletores Playwright em strict mode (`billing`, `inpatient`, `webhook` e helpers compartilhados), alinhamento do bootstrap visual temporário e rebaseline dos snapshots auditados contra o ambiente Docker real do gate.
- `pnpm build`, `pnpm test:e2e:spa:docker` e `pnpm release:check` ficaram verdes em `2026-04-13`; `IMP-011` passa a `DONE`.
- `ERP-003` foi fechado no corte crítico com fail-fast de `DATABASE_URL` em produção e remoção do hardcode demo do bootstrap principal
- `ERP-004` foi fechado documentalmente com o mapa de módulos híbridos consolidado em `0196`
- a trilha de produção real avançou além do gate inicial: `session` e `encounterTimeline` passaram a usar repositórios DB-backed no bootstrap saudável; o residual crítico agora está no warm cache síncrono de auth e nos módulos `cache hydrated`
- laboratório foi fechado e a agenda premium foi entregue para `ERP-030`, `ERP-031`, `ERP-032` e `ERP-033`

**Itens:**
- `ERP-001` corrigir escopo de `pnpm test:coverage`
- `ERP-002` revalidar `release:check`
- `ERP-003` reduzir `acc_cvg_demo`, seeds e `in-memory` críticos
- `ERP-010` a `ERP-012` fechar fiscal real
- `ERP-020` a `ERP-022` fechar laboratório real
- `ERP-030` a `ERP-032` fechar agenda premium

**Status atual da sprint:**
- executor fiscal fechou `ERP-010`, `ERP-011` e `ERP-012`
- executor laboratório fechou `ERP-020`, `ERP-021` e `ERP-022`
- `ERP-023` entrou em andamento com `/diagnostics` formalizado como ponte operacional do laboratório
- executor agenda premium fechou `ERP-030`, `ERP-031` e `ERP-032`
- `ERP-033` foi fechado com costura real agenda -> fila -> encounter -> atendimento e retorno visual do estágio operacional na agenda
- bootstrap e runtime críticos deixaram de manter `session` e `encounterTimeline` como fallback puro em memória quando o DB está saudável

**Critério de aceite da sprint:**
- gates base voltam a ser honestos
- fiscal deixa de ser frontend-local
- laboratório deixa de depender primariamente de fallback local
- agenda premium ganha contrato real e fluxo forte
- documentação de `docs/Enterprise` permanece sincronizada

**Risco principal:**
- tentar fechar profundidade funcional antes de estabilizar o contrato dos gates básicos

---

## 10. Sprint 8 - Runtime Premium II

**Janela:** semanas 15-16  
**Objetivo:** subir o patamar de qualidade e reduzir risco estrutural da API.

**Itens:**
- `IMP-305` levar coverage global para `40%`
- `IMP-306` preparar subida para `60%`
- `IMP-307` extrair mais dominios de `server.ts`
- `IMP-308` fixar gates de release sem excecao manual
- `IMP-504` atualizar guia de release com gates endurecidos

**Criterio de aceite da sprint:**
- coverage atinge o patamar intermediario definido
- API mostra reducao objetiva de concentracao em `server.ts`
- release gate fica mais previsivel e menos manual

**Risco principal:**
- buscar cobertura numerica sem ganhar densidade real nos fluxos criticos

---

## 11. Sprint 9 - Plataforma Premium de Longo Prazo

**Janela:** semanas 17-18  
**Objetivo:** formalizar a direcao arquitetural e o runtime multiambiente.

**Itens:**
- `IMP-401` criar ADR de avaliacao Fastify
- `IMP-402` criar Helm chart da API
- `IMP-403` criar Helm chart do worker
- `IMP-404` criar Helm chart da SPA
- `IMP-405` definir values `dev`, `staging`, `prod`

**Criterio de aceite da sprint:**
- charts minimos implantaveis existem
- trilha multiambiente e documentada
- decisao inicial de runtime fica formalizada

**Risco principal:**
- produzir charts e ADRs genericos sem acoplamento ao runtime real

---

## 12. Sprint 10 - Estrutura Enterprise Final

**Janela:** semanas 19-20  
**Objetivo:** fechar a trilha premium de longo prazo com governanca de secrets, eventos e qualidade final.

**Itens:**
- `IMP-406` criar ADR de secrets manager dedicado
- `IMP-407` planejar migracao de `.env` para manager dedicado
- `IMP-408` criar roadmap event-driven por dominio
- `IMP-409` definir contratos, retries e DLQ governados
- `IMP-410` levar coverage global para `80%`
- `IMP-505` atualizar arquitetura alvo com Helm, secrets e event-driven

**Criterio de aceite da sprint:**
- direcao de secrets management formalizada
- roadmap de eventos governado por dominio existe
- target premium de coverage fica sustentado ou, se nao atingido, replanejado com baseline honesta
- arquitetura alvo enterprise fica atualizada

**Risco principal:**
- concentrar itens grandes demais em uma unica sprint final sem dividir discovery e execucao

---

## 13. Sequencia recomendada de release

| Release | Sprints | Resultado esperado |
| --- | --- | --- |
| Release A | 1-2 | repositorio executavel e entrada em `80/100` |
| Release B | 3-4 | config e security baseline enterprise |
| Release C | 5-6 | observabilidade e operacao auditavel |
| Release D | 7-8 | runtime premium e quality gates intermediarios |
| Release E | 9-10 | estrutura premium enterprise de longo prazo |

---

## 14. Quadro Semaforico Atual

### 14.1 Por sprint

| Sprint | Status | Leitura atual |
| --- | --- | --- |
| Sprint 1 | DONE | `pnpm typecheck` verde, `pnpm build` verde, testes notifications+skeleton alinhados, docs sem conflito `apps/spa` x `apps/web` |
| Sprint 2 | TODO | coverage 15% e extracao inicial de `server.ts` seguem pendentes; `IMP-011` foi fechado com `release:check` verde |
| Sprint 2E | IN PROGRESS | frente ERP premium aberta por `0206/0207/0208`; fiscal, laboratório e agenda premium já avançaram materialmente, e a trilha de produção real segue reduzindo híbridos críticos |
| Sprint 3 | DONE | config baseline implementada |
| Sprint 4 | DONE | security baseline implementada |
| Sprint 5 | DONE | OpenTelemetry, OTLP, spans HTTP/DB/worker e correlacao log-trace entregues |
| Sprint 6 | DONE | IMP-206/207/208/209/210/503 todos entregues com evidencia; runbook operacional vivo em `docs/521`; Release C fechada |
| Sprint 7 | TODO | runtime premium I ainda nao iniciado |
| Sprint 8 | TODO | runtime premium II ainda nao iniciado |
| Sprint 9 | TODO | trilha de plataforma de longo prazo ainda nao iniciada |
| Sprint 10 | TODO | fechamento enterprise final ainda nao iniciado |

### 14.2 Por release

| Release | Status | Leitura atual |
| --- | --- | --- |
| Release A | PARTIAL | Sprint 1 fechada; `pnpm --filter @cvg-his-v2/api typecheck`, `pnpm typecheck`, `pnpm build`, `pnpm test:coverage`, `pnpm test:e2e:spa:docker` e `pnpm release:check` passaram em `2026-04-13`. O drift de lockfile do `spa-e2e`, o bootstrap/login E2E e o bloco funcional/visual da suíte SPA foram fechados; `IMP-011` está `DONE`. O residual da release agora fica concentrado em `IMP-005/006/007/010`, não mais no gate de release. |
| Release B | DONE | config e security baseline entregues |
| Release C | DONE | Sprint 5 (OTel) concluida; Sprint 6 (operacao auditavel) concluida — IMP-206/207/208/209/210/503 todos DONE; evidencia executavel em `/tmp/cvg-his-v2-restore-drills/` e runbook consolidado em `docs/521` |
| Release D | TODO | depende do fechamento de Release C e da retomada disciplinada de quality gates |
| Release E | TODO | depende da consolidacao das fases anteriores |

### 14.3 Diagnostico executivo

- o plano esta **avancado em hardening**, mas **desalinhado na sequencia original**
- o maior gap hoje nao esta em observabilidade, e sim no **fundamento ainda aberto de executavel e coverage**
- a nova frente aberta em `0206` corrige outro gap estrutural: o shell ja esta forte, mas a profundidade funcional de ERP ainda nao
- a proxima decisao de governanca precisa escolher entre:
- voltar e fechar `Release A`
- ou aceitar formalmente uma execucao fora de ordem e replanejar o roadmap

---

## 15. Dependencias de governanca

- nenhuma sprint fecha sem review tecnica
- item P0 sem evidencia executavel volta para backlog
- sprint seguinte nao deve absorver debito escondido da sprint anterior
- se coverage ou build cair, a trilha volta para estabilizacao antes de seguir

---

## 16. Resultado esperado

Este plano de sprints entrega um caminho sequenciado, quinzenal e auditavel para:

- recuperar o estado executavel do repositorio
- subir com disciplina para `80/100`
- endurecer o runtime como estrutura Premium Enterprise
- preparar a plataforma para `90/100` sem inflacao documental
