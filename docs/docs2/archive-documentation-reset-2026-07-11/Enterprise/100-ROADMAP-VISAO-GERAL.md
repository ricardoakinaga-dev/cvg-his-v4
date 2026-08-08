# ROADMAP ENTERPRISE - CVG-HIS-V2
**Taxonomia:** `CANONICO`
**Papel no sistema documental:** roadmap vivo de ondas, gates e priorizacao macro do programa
**Ler em conjunto com:** `README.md`, `0334-PLANO-EXECUTIVO-REALINHAMENTO-ENTERPRISE-2026-04-17.md`, `0335-RELATORIO-AUDITORIA-EXTREMA-WORKSPACE-2026-04-19.md`, `200-BACKLOG-MASTER.md`, `0100-EXECUTION-TRACKER.md`

**Versao:** 2026-04-19
**Base:** `001-BLUEPRINT-ENTERPRISE.md`, `0334-PLANO-EXECUTIVO-REALINHAMENTO-ENTERPRISE-2026-04-17.md`, `0335-RELATORIO-AUDITORIA-EXTREMA-WORKSPACE-2026-04-19.md` e validacao executavel do repositorio
**Ponto de partida:** produto construido `88/100`; prontidao de release `78/100`

> **Atualizacao 19/04/2026:** este roadmap continua valido, mas deve ser lido com o `0335` como baseline tecnico-documental mais recente. O lote premium desta data fechou as integracoes remanescentes do backlog e promoveu ML aplicado para superficie executavel em API e SPA.

## Principios do roadmap

- Nao reabrir ondas ja materializadas quando o codigo atual ja superou o plano antigo.
- Priorizar fechamento de release antes de expandir superficie de produto.
- Tratar cada onda como um gate executavel com criterios objetivos.
- Promover integracoes novas e AI/ML somente apos estabilizacao operacional.

## Timeline executiva

```
Semanas 0-2    Semanas 2-6      Semanas 6-10      Semanas 10-14         Semanas 14-18
Onda 0         Onda 1           Onda 2           Onda 3                Onda 4
Release        Fechamento       Hardenizacao     Integracoes de        Escala, IA e
stabilization  enterprise       operacional      negocio prioritarias  compliance
```

## Resumo por onda

| Onda | Janela | Objetivo | Score alvo | Saida esperada |
|---|---|---|---:|---|
| 0 | Semanas 0-2 | Remover bloqueadores de release | 67 -> 75 | Gate critico verde |
| 1 | Semanas 2-6 | Fechar loops enterprise prioritarios | 75 -> 82 | Agenda, fiscal e financeiro mais confiaveis |
| 2 | Semanas 6-10 | Endurecer operacao e runtime | 82 -> 86 | Observabilidade, restore e rollout maduros |
| 3 | Semanas 10-14 | Fechar integracoes de negocio | 86 -> 88 | Email, SMS, cartoes e CRM melhor amarrados |
| 4 | Semanas 14-18 | Escalar com inteligencia e compliance | 88 -> 90+ | ML aplicado com criterio e trilha de compliance mais forte |

## Status atual da onda 1

- `17/04/2026`: `ENT-001`, `ENT-002` e `ENT-004` revalidados contra o codigo real.
- Fiscal e financeiro agora estao refletidos no contrato `apps/api/src/openapi.yaml`, eliminando drift relevante entre runtime e OpenAPI.
- Evidencia de tenancy/RLS segue verde nas suites dedicadas (`54/54`), mantendo a trilha multi-tenant ponta a ponta validada.
- `18/04/2026`: `ENT-007` e `ENT-008` fechados com contrato operacional de laboratorio/diagnostics ampliado no runtime e no OpenAPI, bridge simetrico `/laboratory` <-> `/diagnostics`, validacoes clinicas minimas no dominio e docs vivas recalibradas contra o codigo atual.
- `19/04/2026`: auditoria extrema reexecutou `typecheck`, `build`, `validate:openapi`, `test:coverage`, `test:critical:bootstrap` e `validate:helm`, confirmando o workspace atual em estado executavel no gate minimo.
- `19/04/2026`: a matriz ampliada deixou de ser bloqueio estrutural: `pnpm test:integration` foi fechado no lote de contratos/persistencia e `pnpm test:e2e` passou a `PASS (11/11)` com bootstrap Playwright auto-suficiente.
- `19/04/2026`: a Onda 4 deixou de ser puramente fundacional em ML. `ML-001` foi promovido a feature real com rota `POST /scheduling/recommendations/duration`, telemetria `smart_scheduling_*` e UX embutida no fluxo rapido de agendamento da SPA.
- `19/04/2026`: a Onda 3 foi fechada no recorte canônico atual com `INT-003`, `INT-004` e `INT-005` materializados em runtime/OpenAPI: SMS transacional, sync outbound com Google Calendar e equipment bridge laboratorial para import de resultados.
- `19/04/2026`: a Onda 4 ganhou mais três features executáveis: OCR fiscal/documental, demand forecasting e anomaly detection laboratorial, com surface publica em `/ml/*` e consumo real na SPA para agenda e laboratório.
- `19/04/2026`: o endurecimento residual da trilha de reminder de WhatsApp foi concluido no rerun amplo de `apps/api`; o contrato auditavel correto sob falha de vendor preserva o provider real no evento `whatsapp_reminder_failed`, sem impacto negativo na Onda 4.

## Detalhamento por onda

### Onda 0 - Release stabilization

**Objetivo:** tirar o projeto do estado "amplo, mas nao release-safe".

**Entregas:**
- Corrigir a divergencia de duracao em appointments no bootstrap critico.
- Revalidar `pnpm test:critical:bootstrap`.
- Reexecutar a trilha minima de typecheck, build, OpenAPI e coverage.
- Publicar checklist objetivo de release.

**Gate de saida:**
- `pnpm typecheck` PASS
- `pnpm build` PASS
- `pnpm validate:openapi` PASS
- `pnpm test:coverage` PASS
- `pnpm test:critical:bootstrap` PASS

### Onda 1 - Fechamento enterprise

**Objetivo:** reduzir os maiores gaps entre base tecnica e operacao enterprise real.

**Entregas:**
- Fechar contrato de agenda, billing e internacao nos fluxos criticos.
- Completar o ciclo fiscal prioritario: emissao, cancelamento e backoffice minimo.
- Fortalecer conciliacao financeira, aging e operacao administrativa.
- Revalidar tenancy/RLS e ABAC de ponta a ponta.
- Consolidar WhatsApp vendor-assisted para uso operacional mais previsivel.
- Fechar handover preview operacional e endurecer alta/transferencia da internacao.
- Fechar laboratorio/diagnostics para operacao com pedidos, detalhe, resultados e catalogo coerentes entre dominio, rotas e contrato.
- Eliminar drift prioritario nas docs vivas apos cada lote executado.

**Gate de saida:**
- Fluxos core sem divergencia entre testes, API e dominio.
- Evidencias de tenancy e controles de acesso cobrindo runtime real.
- Fiscal e financeiro com rotinas operaveis para o fluxo prioritario.
- Laboratorio/diagnostics e docs vivas sem drift prioritario remanescente.

### Onda 2 - Hardenizacao operacional

**Objetivo:** transformar a base tecnica em plataforma operavel e rastreavel.

**Entregas:**
- Completar OTEL collector e tracing distribuido.
- Amarrar metrics, dashboards e alert rules a SLOs claros.
- Formalizar restore drill, backup verification e cutover readiness.
- Endurecer charts Helm e receitas por ambiente.
- Melhorar governanca de feature flags e runtime distribuido.

**Gate de saida:**
- Evidencia operacional por servico: health, readiness, metrics e traces.
- Restore drill documentado e repetivel.
- Release por ambiente com configuracao previsivel.

**Atualizacao de execucao em 17/04/2026**
- `OPS-001` fechado com `otel-collector`, `prometheus` e `grafana` adicionados ao `docker-compose.v2.yml` via profile `observability`, alem de handoff assíncrono de `traceparent` no outbox para correlacao API -> worker.
- `OPS-002` fechado com snapshot operacional real em `GET /slos` e `prometheus-alerts.yml` recalibrado para os thresholds do catalogo de SLO (`p95`, `p99`, disponibilidade e erro 5xx).
- `OPS-003` fechado com `check-cutover-readiness.mjs --json`, `cutover-readiness.json` e `cutover-report.json` como trilha machine-readable do cutover.
- `OPS-004` fechado com `values.schema.json`, `ServiceAccount`, `PodDisruptionBudget`, `Service`/probes HTTP do worker, `ConfigMap` por servico e `pnpm validate:helm` cobrindo `dev`, `staging` e `prod`.
- `OPS-005` fechado com relatorio operacional de feature flags (`/flags/report`, `/flags/{key}/report`) e trilha OpenAPI para catalogo, overrides e rollout governance.
- `OPS-007` fechado com contrato operacional estruturado no worker (`/health`, `/ready`, `/live`, aliases) e alinhamento dos probes canônicos na API/worker/Helm.

### Onda 3 - Integracoes de negocio prioritarias

**Objetivo:** fechar integracoes que aumentam receita, reduzem atrito operacional ou destravam novos clientes.

**Entregas:**
- `OPS-006` fechado com coverage dirigida em agenda, financeiro e diagnostics, incluindo correcao de bug real de overpayment por receivable.
- Cartoes pela trilha segura do gateway existente, com contrato, auditoria e event catalog alinhados antes do provider real.
- Email e SMS.
- Google Calendar com sincronizacao outbound de appointments.
- Evolucao do CRM/notificacoes com cadencias e reconciliacao operacional.

**Atualizacao de execucao em 18/04/2026**
- `OPS-006` fechado com `pnpm test:coverage` em `61.39%` global, subindo materialmente a prova automatizada nas areas criticas: `packages/modules/financial/src/index.ts` para `90.94%`, `packages/modules/diagnostics/src/index.ts` para `81.29%`, `packages/modules/diagnostics/src/laboratory.ts` para `47.29%` e `packages/modules/scheduling/src/index.ts` para `78.44%`.
- A ampliacao de testes expôs e corrigiu um bug estrutural em `settleReceivable()`: o runtime agora rejeita pagamento acima do saldo da propria parcela.
- `INT-001` foi fechado com trilha operacional completa de cartoes: `POST /payments/cards/intents`, `POST /payments/cards/intents/{intentId}/capture`, `GET /payments/cards/report`, `GET /financial/reconciliation/cards`, provider `pagarme-card`/`local-card`, conciliacao minima e auditoria consistente.
- `INT-002` foi fechado com envio transacional de email em `/integrations/email/messages`, retry explicito em `/integrations/email/messages/{messageId}/retry`, relatorio operacional ampliado em `/integrations/email/messages/report`, bootstrap alinhado ao config compartilhado e prova automatizada do adapter `Resend`.
- `INT-003` foi fechado com trilha transacional de SMS (`send`, `retry`, `report`) e adapters `local/twilio`, preservando rollout controlado por ambiente.
- `INT-004` foi fechado com sincronizacao outbound de appointments para Google Calendar e relatorio operacional dedicado.
- `INT-005` foi fechado no recorte de integracao de equipamentos laboratoriais, com import idempotente de resultados externos e report operacional.
- O harness de `pnpm test:critical:bootstrap` voltou a verde em reruns consecutivos apos endurecimento do reset do banco de teste, removendo a reaplicacao indevida da migracao inicial sobre schema residual.
- A robustez do harness subiu mais um degrau: `test:critical` nao hardcode mais `DATABASE_URL_TEST`, o bootstrap usa banco efemero por execucao e o setup aplica lock administrativo por nome de banco para evitar que dois processos mutilem o mesmo schema.
- A trilha operacional local/CI agora tem cleanup canonico: `pnpm test:runner:clean` mata `vitest`/`pnpm test:*` presos no mesmo workspace pelo `cwd` real do processo e remove bancos efemeros sem conexao antes do rerun dos gates.
- Um deadlock do proprio harness foi eliminado em 18/04/2026: `resetTestDatabase()` nao fecha mais o `adminPool` enquanto o advisory lock esta ativo, o que restaurou a previsibilidade do bootstrap critico em sessoes contaminadas.
- `packages/modules/diagnostics/src/laboratory.ts` voltou a subir no gate de coverage, de `47.29%` para `72.29%`, com cenarios canônicos de fallback, filtro de resultados e segregacao por conta.
- `packages/modules/fiscal/src/service.ts` passou a ter coverage util no gate oficial, subindo de `30.25%` para `74.36%`; com isso, `packages/modules/fiscal/src` foi para `68.61%` e o gate global para `64.23%`.
- A coverage dirigida agora tambem cobre estoque e tutores no gate oficial: `packages/modules/inventory/src/index.ts` subiu de `42.95%` para `81.05%` e `packages/modules/owners/src/index.ts` de `46.89%` para `87.00%`, fortalecendo risco operacional de estoque/lotes e registry de tutores.
- `packages/modules/counter-sales/src/index.ts` subiu de `36.18%` para `41.20%` com cenarios de fechamento comercial envolvendo consumo de estoque, meios de pagamento liquidaveis e filtros operacionais.
- O gate global de `pnpm test:coverage` avancou de `64.23%` para `67.21%` sem abrir novas integracoes.
- A rodada seguinte atacou a superficie comercial remanescente e a governanca de flags no runtime: `packages/modules/counter-sales/src/index.ts` subiu de `41.20%` para `74.70%`, enquanto a superficie relevante de `feature-flags` passou de `30.29%` para `32.23%` com testes de provider, rollout, cache e fallback seguro.
- O gate global de `pnpm test:coverage` avancou de `67.21%` para `69.49%`, mantendo o foco em prova automatizada de comportamento antes de qualquer nova integracao.
- A rodada seguinte atacou o gap clinico mais agudo: `packages/modules/triage/src/index.ts` saiu de `15.33%` para `90.05%` com cobertura de validacao de paciente, versionamento, normalizacao de notas e hidratacao ordenada.
- Houve tambem correcao de raiz no runtime persistido de flags: `packages/modules/feature-flags/src/repositories/database-feature-flag.repository.ts` passou a normalizar `user_id = null` para `undefined`, e o pacote ganhou prova util de SQL/mapeamento no repositório.
- O gate global de `pnpm test:coverage` avancou de `69.49%` para `70.83%`.
- A baixa coverage remanescente em flags ficou explicitada sem drift: o `32.23%` atual pertence a `packages/shared/feature-flags/src/index.ts`, que vira o proximo alvo real antes de `encounters` e `staff`.
- A rodada seguinte corrigiu o drift de compilacao em `triage` com restauracao do import de `PatientId` e revalidou `pnpm --filter @cvg-his-v2/module-triage build` em verde.
- O alvo real de flags compartilhadas foi então atacado com cobertura de registry, regras, rollout, providers e metrics: `packages/shared/feature-flags/src/index.ts` subiu de `32.23%` para `73.98%`.
- O gate global de `pnpm test:coverage` avancou de `70.83%` para `73.17%`, deixando `encounters` e `staff` como proximos candidatos naturais.
- A rodada seguinte fechou esses dois alvos naturais sem mexer no runtime de produto: `packages/modules/encounters/src/index.ts` subiu de `47.92%` para `93.08%` e `packages/modules/staff/src/index.ts` de `50.20%` para `99.59%`.
- O gate global de `pnpm test:coverage` avancou de `73.17%` para `75.57%`, reduzindo de forma agressiva o risco residual nas superficies clinicas e operacionais de atendimento e colaborador.
- A rodada seguinte fechou o cadastro clinico e o dominio de identidade no gate oficial: `packages/modules/patients/src/index.ts` subiu de `52.63%` para `94.73%` e `packages/modules/users/src/index.ts` de `61.13%` para `96.98%`.
- O gate global de `pnpm test:coverage` avancou de `75.57%` para `77.85%`; com isso, o proximo alvo natural deixa de ser `patients/users` e passa a ser `packages/modules/mfa/src/service.ts` antes de qualquer lote em `ml`.
- A rodada seguinte executou exatamente esse alvo: `packages/modules/mfa/src/service.ts` subiu de `31.37%` para `96.83%`, e a correção de raiz eliminou o reaproveitamento indevido de recovery code consumido durante `verifyLogin()`.
- O gate global de `pnpm test:coverage` avancou de `77.85%` para `78.95%`; `ml` segue fora da trilha enquanto nao houver ganho operacional comparavel.
- A rodada seguinte fechou o restante do pacote MFA: `packages/modules/mfa/src/webauthn.ts` subiu de `7.53%` para `91.03%`, com prova util de challenge, registration options, registro persistido, assertion para credencial conhecida/desconhecida e lifecycle do repositorio.
- O gate global de `pnpm test:coverage` avancou de `78.95%` para `80.27%`; `ml` continua fora da trilha porque o ganho operacional de fechar MFA ainda era superior.
- A rodada seguinte reavaliou `ml` e manteve a frente adiada por falta de retorno operacional comparável. O melhor lote desta base estava em `apps/api/src`.
- `apps/api/src/email-gateway.ts` subiu de `0%` para `100%`, com tratamento estruturado de falha de transporte no adapter `Resend`.
- Os repositórios operacionais de API ganharam prova útil no gate oficial, destacando `apps/api/src/card-transaction-repository.ts` em `97.18%` e `apps/api/src/email-delivery-repository.ts` em `100%`.
- O gate global de `pnpm test:coverage` avancou de `80.27%` para `81.91%`.
- A rodada seguinte fechou o drift residual do gate oficial em PIX: `apps/api/src/pix-transaction-repository.ts`, que ainda estava excluido em `vitest.config.ts`, voltou para o coverage oficial com `98.18%`.
- O gate global de `pnpm test:coverage` avancou de `81.91%` para `82.38%`, e `apps/api/src` subiu para `87.59%`.
- O rerun seguinte recalibrou o numero oficial apos a auditoria do gate: a base confirmada passou a `81.91%` globais antes do proximo lote de bootstrap/runtime.
- A rodada seguinte atacou `apps/api/src/startup-secrets.ts` e os branches operacionais mais defensivos de `apps/api/src/runtime.ts`.
- `startup-secrets.ts` saiu de `0%` para `98.7%`, `runtime.ts` subiu para `86.89%` e o agregado de `apps/api/src` foi para `94.72%`.
- O gate global de `pnpm test:coverage` avancou de `81.91%` para `83.62%`.
- A rodada seguinte fechou mais dois gaps operacionais de runtime: settlement administrativo por cartao/referencia nao suportada em `apps/api/src/runtime.ts` e o gating Redis/in-memory de `apps/api/src/http/auth-rate-limiter.ts`.
- `runtime.ts` subiu de `86.89%` para `88.5%`, `apps/api/src/http` foi a `100%` e o agregado de `apps/api/src` chegou a `95.28%`.
- A rodada seguinte continuou o fechamento de `apps/api/src/runtime.ts` com tres branches de alto retorno: early-return de settlement sem `externalReferenceId`, emissao de `notification.sent` no outbox e `initialize()` sem `bootstrapAccountId`.
- Com isso, `runtime.ts` subiu para `91.2%`, o gate global de `pnpm test:coverage` foi para `83.96%` (`543/543`) e `apps/api/src` consolidou `96.21%`.
- `ml` foi reavaliado mais uma vez e permaneceu fora da trilha por retorno operacional inferior aos gaps remanescentes de runtime/API.
- A rodada seguinte fechou callbacks restantes de mudanca de status em `apps/api/src/runtime.ts`: `appointment.status_changed` e `encounter.status_changed` agora tem prova explicita de outbox/evento.
- O mesmo lote atacou uma superficie operacional fora da API com melhor ROI que `ml`: `packages/shared/logging/src/index.ts`, cobrindo redacao de payloads, espelhamento `requestId/correlationId`, serializacao de erro objeto e fallback de `createChildLogger()`.
- Com os reruns, `apps/api/src/runtime.ts` passou para `94.79%`, `packages/shared/logging/src/index.ts` para `90.44%` e o gate global de `pnpm test:coverage` foi confirmado em `84.61%` (`549/549`).
- A rodada seguinte continuou o fechamento fino de `apps/api/src/runtime.ts` com dois ramos de alto retorno residual: publicacao de `patient.created` no outbox e fallback auditavel de falha no dispatch de WhatsApp reminder.
- Fora da API, o melhor ROI desta base ficou em `packages/modules/diagnostics/src/laboratory.ts`, nao em `fiscal/service.ts` nem em `ml`: o arquivo subiu para `88.51%` com cobertura util de hidratacao de catalogo, filtros por encounter e dashboard operacional.
- Com os reruns confirmados, `apps/api/src/runtime.ts` passou para `97.12%`, `packages/modules/diagnostics/src/laboratory.ts` para `88.51%` e o gate global de `pnpm test:coverage` foi para `85.04%` (`552/552`).
- `ml` foi reavaliado de novo e permaneceu conscientemente fora da trilha por retorno operacional inferior ao de runtime/API e diagnostics.
- A rodada seguinte auditou `apps/api/src/runtime.ts` e confirmou que o ganho marginal restante era menor do que o disponível em fiscal; o lote então migrou com criterio para `packages/modules/fiscal/src/service.ts`.
- `packages/modules/fiscal/src/service.ts` subiu para `92.85%` com cobertura util do branch persistido do serviço, filtros fiscais reais, retornos nulos do ciclo NFS-e e reflexo do dashboard apos criacao de layout.
- Com os reruns confirmados, o gate global de `pnpm test:coverage` foi para `86.43%` (`555/555`), `packages/modules/fiscal/src` consolidou `78.64%` e `apps/api/src/runtime.ts` permaneceu estavel em `97.12%`.
- `ml` foi reavaliado novamente e continuou adiado, ainda sem retorno operacional superior ao eixo runtime/fiscal.
- A rodada seguinte fechou o segundo alvo fiscal com melhor ROI real: `packages/modules/fiscal/src/database-fiscal.repository.ts`.
- O adapter persistido passou a ter prova util de query building, filtros, mapeamento e ciclo de layouts NFS-e, levando o arquivo a `100%` e o agregado de `packages/modules/fiscal/src` para `95.74%`.
- Com os reruns confirmados, o gate global de `pnpm test:coverage` foi para `88.86%` (`566/566` no rerun atual), enquanto `packages/modules/fiscal/src/service.ts` permaneceu em `92.85%`.
- A rodada seguinte reavaliou os gaps remanescentes fora de fiscal e concluiu que o melhor ROI residual nao estava mais em `runtime.ts` nem em `ml`, e sim na combinacao `apps/api/src/feature-flags.ts` + `packages/tenant-context/src/middleware.ts`.
- O lote ampliou a prova do contrato publico de rollout consumido pela API, cobrindo snapshot booleano, bootstrap de multiplos flags e o rollout inbound de WhatsApp, enquanto fechou a resolucao explicita de tenant/account/correlation id no middleware de tenancy.
- Com os reruns confirmados, `apps/api/src/feature-flags.ts` foi para `96.52%`, `packages/tenant-context/src/middleware.ts` para `100%` e o gate global de `pnpm test:coverage` ficou em `88.86%` (`566/566`).
- `ml` foi reavaliado novamente e permaneceu conscientemente fora da trilha por retorno operacional inferior ao de runtime/adapters e tenancy real.
- A rodada seguinte fechou o que faltava no branch persistido de flags sem reintroduzir mock fragil: `createApiFeatureFlags()` passou a aceitar contexto opcional de `accountId/userId` e um seam de `databaseProviderFactory`, preservando o bootstrap atual e permitindo prova robusta do caminho persistido.
- O mesmo lote puxou a superficie comercial remanescente com melhor ROI do que `ml`: `packages/modules/counter-sales/src/index.ts` subiu para `85.59%` com cobertura oficial de `updateItem`, `removeItem`, `cancel` e `reopen`.
- Com os reruns confirmados, o gate global de `pnpm test:coverage` foi para `89.59%` (`569/569`), `apps/api/src/feature-flags.ts` chegou a `100%` em statements/lines e `ml` permaneceu conscientemente fora da trilha.
- `ml` foi reavaliado de novo e permaneceu conscientemente fora da trilha por retorno operacional inferior ao de fiscal/runtime.
- O gate global de `pnpm test:coverage` avancou de `83.62%` para `83.81%`.

**Gate de saida:**
- Integracoes publicadas com contrato, observabilidade e fallback minimo.
- Operacao consegue monitorar sucesso/falha sem consulta manual ao banco.

### Onda 4 - Escala, IA e compliance

**Objetivo:** adicionar inteligencia aplicada e aumentar confianca institucional sem dispersar foco.

**Entregas:**
- Smart scheduling promovido de infraestrutura para feature.
- OCR fiscal/documental, demand forecasting e anomaly detection laboratorial conectados a caso de uso executavel.
- Preparacao adicional para compliance e auditoria.
- Planejamento de HL7/FHIR apenas quando houver sponsor operacional.

**Gate de saida:**
- Casos de uso de ML com valor mensuravel.
- Roadmap de compliance e integracoes reguladas com dono claro.

**Atualizacao de execucao em 19/04/2026**
- `ML-001` foi fechado com promocao real de smart scheduling para a trilha operacional da agenda: API dedicada de recomendacao, OpenAPI atualizada, mediçao Prometheus de geracao/aplicacao e UX conectada ao `AppointmentQuickCreateForm`.
- `ML-002`, `ML-003` e `ML-004` tambem foram fechados no lote premium: OCR fiscal/documental, demand forecasting e anomaly detection laboratorial agora existem como surface publica e testada em `/ml/*`.
- A SPA passou a consumir `forecasting` na cockpit de appointments e `anomaly detection` na tela de resultados laboratoriais.
- O contrato OpenAPI do workspace passou a `175 paths`, `33 tags` e `178 schemas`.
- Validacoes executadas no lote: `pnpm validate:openapi` PASS, `pnpm --filter @cvg-his-v2/spa typecheck` PASS e `pnpm --filter @cvg-his-v2/api test` PASS (`125/125`).

## Marcos executivos

| Marco | Janela | Resultado esperado | Criterio |
|---|---|---|---|
| M0 | Semana 2 | Base release-safe | Gate critico verde |
| M1 | Semana 6 | Core enterprise mais confiavel | Fiscal, financeiro e agenda estabilizados |
| M2 | Semana 10 | Operacao endurecida | Observabilidade e restore com evidencia |
| M3 | Semana 14 | Integracoes prioritarias fechadas | Canais de negocio com contrato e operacao |
| M4 | Semana 18 | Plataforma pronta para escalar com criterio | Score 90+ com release e operacao consistentes |

## Dependencias criticas

- Onda 0 desbloqueia todas as demais.
- Onda 1 depende da estabilizacao de agenda e billing.
- Onda 2 depende da consolidacao do runtime atual e dos charts existentes.
- Onda 3 depende de contratos claros de API, webhooks e observabilidade.
- Onda 4 depende de dados confiaveis e de operacao previsivel.

## Fora do foco imediato

- Expansao ampla de ML sem sponsor de produto.
- Integracoes reguladas de alto custo antes do fechamento do core.
- Reescrever arquitetura que ja esta funcional apenas por preferencia tecnica.
