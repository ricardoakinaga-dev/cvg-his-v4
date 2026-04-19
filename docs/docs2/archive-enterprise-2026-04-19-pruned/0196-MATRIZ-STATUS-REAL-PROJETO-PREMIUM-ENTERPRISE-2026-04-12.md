# 0196 - Matriz de Status Real do Projeto Premium Enterprise

**Data:** 2026-04-12  
**Base documental obrigatória:** todos os `46` arquivos de `docs/Enterprise`  
**Documento complementar canônico:** `0204-AUDITORIA-COMPARATIVA-DOCS-ENTERPRISE-VS-CODIGO-2026-04-12.md`
**Plano derivado prioritário:** `0206`, `0207` e `0208`

## 1. Veredito executivo

Leitura real do repositório em 2026-04-12:

- o produto Premium core está construído
- o baseline enterprise inicial está construído
- `pnpm test:coverage` foi corrigido para medir apenas suites compatíveis e reproduzíveis do produto; em `2026-04-12` rodou verde com `19` arquivos e `394` testes
- a agenda premium ganhou cockpit multiprofissional, contrato real de disponibilidade e fluxo rápido inline em `apps/spa/src/pages/appointments/**`, `apps/api/src/routes/scheduling-routes.ts` e `packages/modules/scheduling/**`
- `pnpm build` passou novamente no workspace em `2026-04-13`; o drift entre `packages/modules/scheduling/package.json` e `pnpm-lock.yaml` permanece corrigido e o build Docker `spa-e2e` segue aceitando `--frozen-lockfile`
- `ERP-002` foi fechado em `2026-04-13`: `pnpm test:e2e:spa:docker` e `pnpm release:check` passaram integralmente no runner atual após alinhar seletores Playwright em strict mode, o bootstrap visual temporário e os snapshots auditados da SPA
- o gate de release segue serializado com lock em `release:check` e `run-e2e-spa.sh`, removendo concorrência host-local como leitura principal
- o fiscal mínimo API-backed está fechado com páginas read-only honestas; o residual agora é persistência e backoffice fiscal
- o runtime crítico reduziu dependência de demo ao exigir `DATABASE_URL` em ambiente production-like e ao parar de pré-carregar seeds locais quando há repositórios reais
- `session` e `encounterTimeline` deixaram de ser fallback puro em memória com DB saudável: bootstrap usa repositórios DB-backed, runtime reidrata estado crítico e `/encounters/:id/timeline` já consegue lazy-load via repositório
- a transformação enterprise completa ainda não está fechada porque faltam runtime distribuído, secrets manager, governança event-driven final, AI/ML integrado e excelência operacional final

## 2. Matriz de status real

| Macrotrilha | Nota | Evidência real no código | Status real | O que falta para fechar |
| --- | --- | --- | --- | --- |
| Produto Premium core SPA | `91/100` | `apps/spa` é superfície canônica, `83` páginas Vue e `93` rotas declaradas | `DONE` | ampliar testes orientados a fluxo/UAT |
| Core de domínios de negócio | `88/100` | `36` módulos em `packages/modules/**` com cobertura real de negócio | `DONE` | continuar extração de rotas e reduzir acoplamento operacional |
| Agenda premium e recepção operacional | `89/100` | cockpit multiprofissional, overview/availability reais, stage operacional agregado no overview, fila abrindo/retomando encounter e retorno visual claro na agenda | `DONE` | ampliar testes UAT da jornada e evoluir governança administrativa de bloqueios sem regredir o fluxo |
| Corte do legado web para SPA | `93/100` | `apps/web` segue congelado e o produto evolui em `apps/spa` | `DONE` | manter o congelamento e a disciplina documental |
| Governance, access-control, auditoria e MFA | `86/100` | módulos, rotas e páginas reais em API e SPA | `DONE` | ampliar testes de regressão e trilha operacional contínua |
| LGPD e compliance funcional | `84/100` | módulo LGPD, migrations, endpoints e hub no SPA | `DONE` | modularizar melhor os blocos ainda presos ao `server.ts` |
| Multi-tenancy e RLS baseline | `82/100` | `tenant-context`, `account_id`, testes e migrations de isolamento; bootstrap principal sem hardcode demo, fail-fast de DB em produção e `session`/`encounterTimeline` DB-backed em modo saudável | `PARTIAL` | remover constantes demo ainda restritas ao modo local, reduzir warm cache síncrono de auth e migrar módulos `cache hydrated` para query-first |
| Event bus e webhooks | `87/100` | retry, DLQ, reprocessamento e superfícies reais de integração | `DONE` | formalizar governança enterprise por domínio |
| PIX | `61/100` | endpoints e fluxo de intenção/confirm existirem na API e SPA | `PARTIAL` | fechar adapter vendor real e operação de provedor |
| Config baseline e fail-fast | `94/100` | Zod, loaders por app e bootstrap validado | `DONE` | manter baseline |
| Security baseline | `88/100` | allowlists, secret scan, SAST e políticas reais | `DONE` | secrets manager dedicado segue fora do baseline |
| Observabilidade, métricas, tracing e SLO | `80/100` | tracing, OTLP, `/metrics`, `/slos`, dashboards e alertas | `DONE` | consolidar operação recorrente com evidência contínua |
| Operação auditável, backup, restore e SOC2 | `85/100` | scripts, runbook e endpoints de evidência SOC2 | `DONE` | manter exercício operacional e trilha viva |
| Quality gates de base | `92/100` | `pnpm --filter @cvg-his-v2/api typecheck`, `pnpm typecheck`, `pnpm build`, `pnpm test:coverage`, `pnpm test:e2e:spa:docker` e `pnpm release:check` estão verdes no runner atual; o `spa-e2e` builda com `--frozen-lockfile` e o gate segue serializado | `DONE` | ampliar cobertura real e manter a disciplina de snapshots/canonical data |
| Modularização da API (`server.ts`) | `62/100` | rotas extraídas em `apps/api/src/routes/*`, incluindo `scheduling-routes.ts`; `server.ts` caiu para `5360` linhas | `PARTIAL` | continuar extração por domínio até remover o risco monolítico |
| Runtime premium distribuído | `28/100` | dependências existem, mas o limiter ainda usa `Map` local | `TODO` | Redis rate limiter, fallback seguro e feature flags |
| Plataforma premium de longo prazo | `20/100` | sem materialização real de Helm charts e trilha formal de plataforma | `TODO` | ADRs e artefatos operacionais multiambiente |
| Secrets manager dedicado | `22/100` | rotação e scanning existem; manager dedicado não | `TODO` | ADR e migração operacional progressiva |
| Governança event-driven enterprise | `58/100` | event bus funciona, mas contratos e governança final por domínio não | `PARTIAL` | roadmap governado de contratos, retries e DLQ |
| AI/ML e analytics enterprise | `32/100` | `packages/modules/ml` existe, mas sem integração operacional relevante | `PARTIAL` | integrar serving, dados, UI e operação |
| Excelência final e certificação | `44/100` | há benchmarks e observabilidade base, sem fechamento final de excelência | `PARTIAL` | coverage alta, performance gates, chaos e certificação |

## 3. Leitura por releases do programa atual

| Release | Leitura real | Status |
| --- | --- | --- |
| Release A | guardrails, build, coverage, `spa-e2e` com `--frozen-lockfile` e `release:check` voltaram a ser defensáveis de ponta a ponta em `2026-04-13`; o bloco funcional/visual da suíte SPA foi fechado no runner Docker real, mas a release ainda carrega residual de Sprint 2 em `IMP-005/006/007/010` | `PARTIAL` |
| Release B | config baseline e security baseline entregues | `DONE` |
| Release C | observabilidade e operação auditável entregues | `DONE` |
| Release D | runtime premium distribuído ainda não começou de forma material | `TODO` |
| Release E | plataforma premium de longo prazo e fechamento final ainda não começaram de forma material | `TODO` |

## 4. O que falta para fechar o programa atual

1. Subir a cobertura real do produto agora que o gate mede o escopo correto e `release:check` voltou a ficar verde.
2. Continuar a extração de rotas e serviços de `apps/api/src/server.ts`.
3. Implementar rate limiter distribuído em Redis.
4. Fechar integração PIX vendor real.
5. Consolidar a taxonomia final de `/diagnostics` como ponte operacional do laboratório e reduzir acoplamentos residuais.
6. Continuar aprofundando o domínio fiscal além do baseline API-backed já fechado, adicionando persistência e operações reais de backoffice.
7. Aprofundar financeiro administrativo, RH clássico e relatórios por área.
8. Ampliar regressão/UAT da jornada agenda -> fila -> atendimento agora que `ERP-033` fechou em contrato real.
9. Transformar tutores e animais em hubs completos de ERP veterinário.

## 5. Conclusão objetiva

O repositório já sustenta um **produto Premium real** com baseline enterprise funcional. O que falta hoje não é construir o produto do zero; é **fechar gates reais, distribuir o runtime e concluir as trilhas enterprise que ainda estão só parcialmente materializadas**.

## 6. Mapa de módulos híbridos remanescentes

`session` e `encounterTimeline` já não são fallback puro em memória no bootstrap saudável. O mapa residual abaixo separa:

- dependências ainda ligadas a warm cache crítico;
- domínios `cache hydrated` em `apps/api/src/runtime.ts`;
- módulos já majoritariamente DB-backed.

| Domínio / módulo | Criticidade operacional | Estado atual | Evidência real | Ação residual |
| --- | --- | --- | --- | --- |
| Auth / `session` | crítica | DB-backed com warm cache síncrono | `apps/api/src/bootstrap.ts` usa `DatabaseSessionRepository`; `apps/api/src/runtime.ts` chama `auth.hydrateFromRepository(...)`; `authenticateAccessToken()` ainda depende do mapa interno já aquecido | migrar validação de sessão para leitura canônica/query-first ou fallback assíncrono seguro |
| Encounters / `encounterTimeline` | média | DB-backed com hidratação e lazy-load | `apps/api/src/bootstrap.ts` usa `DatabaseEncounterTimelineRepository`; `encounters.hydrateFromDatabase(...)` carrega timeline no startup e `listTimelineAsync()` busca no repositório quando o cache está frio | reduzir duplicação entre cache e repositório, evoluindo para leitura canônica por consulta |
| Cadastros core (`owners`, `patients`) | alta | cache hydrated controlado | runtime repo-backed nasce sem seed demo, mas `owners.hydrateFromDatabase(accountId)` e `patients.hydrateFromDatabase(accountId)` ainda populam mapas locais | remover warmup por conta e migrar listagens/reads para query-first |
| Governança (`users`, `staff`, `access-control`) | crítica | cache hydrated controlado | `users.hydrateFromDatabase()`, `staff.hydrateFromDatabase()` e `accessControl.hydrateFromDatabase(accountId)` continuam abastecendo estado em memória; auth depende dessa base para reidratar sessões | reduzir dependência de cache global e introduzir leituras canônicas/invalidação coerente |
| Assistencial administrativo (`diagnostics`, `laboratory`, `inventory`, `scheduling`, `triage`) | alta | cache hydrated controlado | `apps/api/src/runtime.ts` reidrata esses domínios por conta antes do uso operacional | evoluir para leitura paginada/reativa sem depender de warmup completo |
| Comercial/financeiro (`products`, `services`, `cash`, `counterSales`, `quotes`, `billing`) | alta | cache hydrated controlado | módulos continuam dependendo de `hydrateFromDatabase` e/ou `persistenceMode` híbrido | substituir bootstrap hydrated por persistência e query-first |
| Integrações e notificações (`webhook`, `notification`, `apiKey`, `outbox`) | baixa | majoritariamente DB-backed | repositórios reais são usados quando o DB existe; o residual principal está nas settings auxiliares e não no core de persistência | formalizar settings por conta em storage real |
