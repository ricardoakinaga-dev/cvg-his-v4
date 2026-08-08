# PLANO EXECUTIVO - REALINHAMENTO ENTERPRISE CVG-HIS-V2
**Taxonomia:** `CANONICO`
**Papel no sistema documental:** plano executivo vivo de realinhamento entre ambicao enterprise e estado efetivo do programa
**Ler em conjunto com:** `README.md`, `0335-RELATORIO-AUDITORIA-EXTREMA-WORKSPACE-2026-04-19.md`, `100-ROADMAP-VISAO-GERAL.md`, `200-BACKLOG-MASTER.md`, `0100-EXECUTION-TRACKER.md`

**Data:** 2026-04-17
**Fonte:** `docs/Enterprise/001-BLUEPRINT-ENTERPRISE.md` + auditoria completa de `docs/Enterprise` + validacao direta do codigo e dos gates executados em 2026-04-17
**Documentos vivos relacionados:** `100-ROADMAP-VISAO-GERAL.md`, `200-BACKLOG-MASTER.md`, `0100-EXECUTION-TRACKER.md`

> **Atualizacao de auditoria extrema (19/04/2026):** a linha mestra deste documento segue valida, mas a referencia executavel mais recente para o workspace passou a ser `0335-RELATORIO-AUDITORIA-EXTREMA-WORKSPACE-2026-04-19.md`. Os gates reexecutados nessa data fecharam em `PASS` para `typecheck`, `build`, `validate:openapi`, `test:coverage`, `test:critical:bootstrap` e `validate:helm`. A OpenAPI vigente do workspace passou a `175 paths`, `33 tags` e `178 schemas`, `pnpm test:integration` foi fechado, `pnpm test:e2e` passou a `11/11` e o lote premium encerrou `INT-003`, `INT-004`, `INT-005`, `ML-002`, `ML-003` e `ML-004`.

---

## 1. RESUMO EXECUTIVO

O programa CVG-HIS-V2 Enterprise ja tem uma base tecnica ampla e acima do que parte da documentacao historica ainda sugere. Hoje existe produto real em agenda, prontuario, laboratorio, financeiro, PIX, internacao, webhooks, event bus, feature flags, observabilidade, PWA, design system, MFA, OIDC, ABAC, RLS, Helm e Vault.

Ao mesmo tempo, a prontidao de release ainda nao acompanha a amplitude da plataforma. O bloqueador principal mais recente foi em `pnpm test:critical:bootstrap`, causado por divergencia entre contrato de teste e validacao do modulo de agenda. Esse bloqueador foi fechado em 17/04/2026, com trilha revalidada; continuam abertos gaps em fiscal, integracoes externas e operacao.

### Leitura executiva

| Indicador | Nota | Leitura |
|---|---:|---|
| Produto construido | 84/100 | Plataforma ampla, modular e com boa cobertura funcional |
| Prontidao de release | 67/100 | Gates de release com sucesso; permanecem gaps de maturidade enterprise |
| Qualidade da documentacao enterprise | 84/100 | Muito rica e agora com docs vivas mais alinhadas ao codigo; ainda ha historico antigo fora da linha mestra |

### Estado dos gates validados em 2026-04-18

| Gate | Status | Observacao |
|---|---|---|
| `pnpm typecheck` | PASS | Base tipada consistente |
| `pnpm build` | PASS | API, SPA e pacotes constroem; PWA gerada |
| `pnpm validate:openapi` | PASS | Spec valida com 157 paths, 32 tags e 146 schemas na rodada de 18/04; baseline atualizado em 19/04 para `164/32/159` no `0335` |
| `pnpm test:coverage` | PASS | Gate seguia verde na base validada desta rodada; cobertura global acima do baseline do CI |
| `pnpm test:critical:bootstrap` | PASS | 169/169 testes críticos em verde após ajuste no contrato da agenda |

---

## 2. MATRIZ EXECUTIVA DE MATURIDADE

| Item analisado | Nota | Leitura executiva |
|---|---:|---|
| Documentacao Enterprise | 76 | Boa profundidade, mas precisa consolidacao como fonte unica viva |
| Arquitetura modular e schema | 91 | Arquitetura forte, 38 modulos e boa separacao por dominio |
| API / OpenAPI | 90 | Superficie consistente, rotas organizadas e contrato validado |
| Frontend SPA / Shell | 91 | Shell maduro, navegacao ampla, PWA e casca enterprise reais |
| Design System / acessibilidade | 85 | Base boa, componentes e governance reais; ainda cabem refinamentos |
| Agenda / fila / internacao | 84 | Capacidade ampla, trilha integrada revalidada após correção recente |
| Clinico / prontuario / prescricoes | 86 | Bom nivel funcional com modulos reais e paginas dedicadas |
| Laboratorio / diagnostics | 87 | Contrato operacional ampliado com catalogo, detalhe de pedido, resultados e bridge simetrico entre laboratorio e diagnostics |
| Financeiro / billing / cash / PIX | 85 | Profundo para PIX e fluxo administrativo, ainda com fechamento parcial |
| Fiscal / ERP administrativo | 74 | Base tributaria boa, emissao/backoffice enterprise ainda parcial |
| Multi-tenancy / tenant context / RLS | 80 | Fundacao real, mas precisa prova operacional ponta a ponta continua |
| Seguranca / compliance | 88 | JWT, MFA, OIDC, RBAC, ABAC, Vault, SOC2 baseline e scans |
| Event bus / webhooks / API keys | 84 | Base assincrona real e operavel |
| Feature flags / Redis / runtime distribuido | 80 | Estrutura viva, mas rollout ainda nao esta maduro em toda a plataforma |
| WhatsApp / CRM notificacoes | 86 | Fluxo vendor-assisted revalidado com report operacional por agendamento e evidencias de runtime |
| Observabilidade / operacao | 84 | Health, metrics, OTEL, dashboards e alert rules presentes |
| AI/ML | 78 | Ja existe superficie executavel em agenda, OCR fiscal/documental, forecasting e anomalias laboratoriais |
| Plataforma / Helm / Vault / backup | 79 | Boa base de deploy e recuperacao, sem evidencias de fechamento enterprise completo |
| QA / CI / gates | 78 | Pipeline forte; gates críticos revalidados com sucesso |
| Prontidao de release hoje | 67 | Em curso para release-safe com G0 verde, mas sem P1/P2 completos |

---

## 3. DIRETRIZ ESTRATEGICA

O programa deve sair da logica de "construir mais superficie" e entrar em "fechar contrato, operacao e release". O foco das proximas ondas e:

1. Remover bloqueadores de release e estabilizar agenda, billing e fluxos criticos.
2. Fechar loops enterprise ainda parciais em fiscal, financeiro, notificacoes e tenancy.
3. Subir a maturidade operacional com observabilidade completa, evidencias de restore/cutover e rollout mais governado.
4. So depois disso, acelerar integracoes adicionais e AI/ML orientado a produto.

---

## 4. OBJETIVOS DOS PROXIMOS 90 DIAS

### O1 - Release readiness 67 -> 82
- Fechar o bootstrap critico em verde e confirmar trilha G0.
- Revalidar agenda, billing, internacao e notificacoes nos fluxos integrados.
- Subir a confianca operacional do pipeline de release.

### O2 - Maturidade enterprise 84 -> 88
- Fechar o ciclo fiscal prioritario.
- Fortalecer conciliacao financeira e operacao administrativa.
- Consolidar tenancy/RLS e controles de acesso com evidencias ponta a ponta.

### O3 - Operacao 84 -> 88
- Completar trilha de observabilidade distribuida.
- Formalizar restore drills, readiness operacional e evidencias por ambiente.
- Melhorar governanca de feature flags e runtime distribuido.

### O4 - Inteligencia aplicada 78 -> 84
- Consolidar smart scheduling como feature consumivel.
- Fechar OCR, forecasting e anomalias como superficie executavel com caso de uso real.
- Evitar dispersao em novas frentes de ML antes de calibracao operacional das features ja abertas.

---

## 5. PRIORIDADES EXECUTIVAS

### P0 - Bloqueadores imediatos
- Corrigir a divergencia entre teste e validacao de duracao em agendamento.
- Confirmar o verde de `pnpm test:critical:bootstrap` no trilha G0.
- Revalidar coverage e fluxos integrados apos o fix.
- Consolidar a documentacao viva para que roadmap e backlog reflitam o estado real.

### P1 - Fechamento enterprise
- Fiscal: emissao, cancelamento, backoffice e trilha administrativa.
- Financeiro: conciliacao, aging, fechamento e operacao.
- WhatsApp/CRM: fluxo vendor-assisted para operacao mais confiavel.
- Multi-tenancy/RLS: evidencias end-to-end em runtime e testes.

**Atualizacao de execucao em 17/04/2026**
- `ENT-001` fechado com contrato OpenAPI alinhado ao runtime fiscal (`summary`, `tax-preview`, `ICMS`, `PIS/COFINS`, `CFOP`, `NCM`, `ICMS matrix` e ciclo `NFS-e`).
- `ENT-002` fechado com contrato e testes para `financial-summary`, `financial-close`, receivables, aging e reconciliation.
- `ENT-004` fechado com reexecucao das suites RLS/LGPD/text-based tables (`54/54` PASS).

**Atualizacao de execucao em 18/04/2026**
- `ENT-003` fechado com trilha vendor-assisted explicita: auditoria de `scheduled/sent/failed`, correlacao reutilizada, report operacional por agendamento e prova de runtime com mock vendor (`whatsapp_reminder_sent`).
- `ENT-005` fechado com correcao estrutural do motor ABAC (`nhas`, `not_between`, resolucao de arrays templated, `sectorCodes`) e segregacao contextual em runtime via `x-sector-code` no registry de tutores.
- `ENT-006` fechado com endurecimento de internacao: alta exige motivo, transferencia exige destino, liberacao de leito em alta/transferencia e `handover preview` operacional com ultimo progresso e flag de atencao.
- `ENT-007` fechado com endurecimento de diagnostics/laboratory: validacao de `patientId` contra encounter, validacao de `examCatalogId`, exigencia de evidencia clinica para `resulted`, `GET` de detalhe por pedido, listagem de resultados liberados, catalogo de exames e bridge operacional `/diagnostics/*` espelhando `/laboratory/*`.
- `ENT-008` fechado com realinhamento das docs vivas (`0334`, `100`, `200`, `0100`) ao runtime atual e ao contrato OpenAPI validado (`157 paths`, `32 tags`, `146 schemas`).

### P2 - Escala operacional
- OTEL collector, tracing distribuido e alerting ligado a SLO.
- Backup/restore/cutover com trilha recorrente e evidencias.
- Hardenizacao dos charts Helm e receitas por ambiente.

**Atualizacao de execucao em 17/04/2026**
- `OPS-001` concluido com profile `observability` no `docker-compose.v2.yml`, `infra/observability/otel-collector-config.yaml` e correlacao async API -> worker via `payload._meta.traceparent` no outbox/event-bus.
- `OPS-002` concluido com snapshot real em `GET /slos`, calculado a partir de observacoes locais de request, e com `prometheus-alerts.yml` alinhado aos thresholds oficiais de `slos.ts`.
- `OPS-003` concluido com readiness/cutover machine-readable (`check-cutover-readiness.mjs --json`) e emissao de `cutover-readiness.json` + `cutover-report.json` no fluxo de `cutover-v2.sh`.
- `OPS-004` concluido com endurecimento do chart Helm: `values.schema.json`, `ServiceAccount`, `PodDisruptionBudget`, `ConfigMap` por servico, `worker Service` para health/metrics e guardrail `pnpm validate:helm` validando render/lint de `dev`, `staging` e `prod`.
- `OPS-005` concluido com governanca operacional de feature flags: relatorios `/flags/report` e `/flags/{key}/report`, resumo de lifecycle/override/rollout por ambiente e OpenAPI alinhado ao catalogo de flags.
- `OPS-007` concluido com contrato explicito de health/readiness/liveness no worker, aliases `/health/live` e `/health/ready`, `content-type` consistente em health aliases da API e probes canônicos `/live` + `/ready` refletidos nos charts.
- `OPS-006` concluido em 18/04/2026 com coverage dirigida nas areas mais sensiveis do core (`financial`, `diagnostics`, `scheduling` e runtime), elevando o gate oficial de `53.44%` para `61.39%` e corrigindo um bug real de overpayment por receivable em `packages/modules/financial/src/index.ts`.

### P3 - Expansao
- Cartoes, email, SMS, Google Calendar e, depois, HL7/FHIR.
- AI/ML orientado a caso de uso e nao apenas infraestrutura.

**Atualizacao de execucao em 18/04/2026**
- `INT-001` foi fechado sobre o gateway de pagamentos existente com ampliacao real de runtime: captura de cartao, provider externo equivalente (`pagarme-card`), conciliacao minima em `GET /financial/reconciliation/cards`, relatorio operacional em `GET /payments/cards/report` e liquidacao automatica via outbox consumer.
- O catalogo de eventos de pagamentos foi realinhado ao runtime (`payment.pix.intent.created`, `payment.pix.confirmed`, `payment.card.intent.created`, `payment.card.completed`, `payment.card.failed`), removendo drift entre documentacao, publisher e reconciliacao operacional.
- `INT-002` foi fechado com config compartilhado coerente (`RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_MOCK_MODE`), bootstrap alinhado ao runtime, relatorio operacional ampliado em `GET /integrations/email/messages/report` e prova automatizada real do adapter `Resend`.
- `INT-003` permanece deliberadamente fechado como backlog futuro: fallback SMS so deve ser aberto se a operacao confirmar necessidade multicanal real apos a estabilizacao de email.
- `ML-001` foi fechado em 19/04/2026 com promocao real de smart scheduling para o fluxo de agenda: rota `POST /scheduling/recommendations/duration`, telemetria `smart_scheduling_*`, OpenAPI atualizada e UX integrada ao `AppointmentQuickCreateForm`.
- O gate `pnpm test:critical:bootstrap` voltou a verde em reruns consecutivos apos correcao do reset do banco de teste; a causa raiz real era schema residual levando a colisao do enum `appointment_status`, e nao `feature_flags`.
- A robustez residual do harness tambem melhorou: `test:critical` nao fixa mais um unico `DATABASE_URL_TEST`, o bootstrap nao recria o container PostgreSQL à força e o setup passou a isolar banco por execucao quando necessario.
- A cobertura dirigida de diagnostics evoluiu com foco em `packages/modules/diagnostics/src/laboratory.ts`, agora em `72.29%`, preservando prioridade de release sem abrir novas integracoes.
- Em 18/04/2026 o tooling operacional do runner subiu mais um degrau: `pnpm test:runner:clean` passou a limpar processos `vitest`/`pnpm test:*` orfaos ou estagnados pelo `cwd` real do processo e a remover bancos efemeros sem conexao antes dos reruns criticos.
- A investigacao do travamento residual do bootstrap mostrou uma segunda causa raiz no proprio harness: `resetTestDatabase()` encerrava o `adminPool` dentro do advisory lock e travava apos `CREATE DATABASE`; isso foi corrigido em `tests/db/db-admin.ts`, restaurando previsibilidade do gate critico.
- A coverage dirigida avancou tambem em fiscal: `packages/modules/fiscal/src/service.ts` subiu de `30.25%` para `74.36%`, `packages/modules/fiscal/src` foi para `68.61%` e o gate global de `pnpm test:coverage` foi para `64.23%`.
- A rodada seguinte de coverage consolidou as superficies operacionais restantes mais fracas: `packages/modules/inventory/src/index.ts` foi de `42.95%` para `81.05%`, `packages/modules/owners/src/index.ts` de `46.89%` para `87.00%` e `packages/modules/counter-sales/src/index.ts` de `36.18%` para `41.20%`.
- O gate global de `pnpm test:coverage` passou para `67.21%`, mantendo a disciplina de elevar prova automatizada em modulos de estoque, tutor e venda antes de qualquer nova integracao.
- A rodada seguinte atacou diretamente o modulo comercial ainda mais fragil: `packages/modules/counter-sales/src/index.ts` saiu de `41.20%` para `74.70%` com prova automatizada de dashboard, hidratacao persistida, filtros e relatorios comerciais.
- `feature-flags` recebeu lote focado em comportamento de runtime, nao em cobertura cosmetica: a superficie relevante do pacote subiu de `30.29%` para `32.23%` com cenarios de provider, kill switch, allowlist, rollout percentual, cache e fallback seguro.
- O gate global de `pnpm test:coverage` passou para `69.49%`.
- `INT-003` permanece fora da trilha por disciplina de backlog e ausencia de necessidade operacional nova.
- A rodada seguinte atacou o risco clinico mais subcoberto: `packages/modules/triage/src/index.ts` saiu de `15.33%` para `90.05%` com provas de coerencia `patientId` x encounter, versionamento, normalizacao de notas e hidratacao com ordenacao temporal.
- Um bug pequeno, mas real, foi corrigido no runtime persistido de flags: `packages/modules/feature-flags/src/repositories/database-feature-flag.repository.ts` nao deixa mais `user_id = null` vazar como `null` no contrato em memoria; agora normaliza para `undefined`.
- O gate global de `pnpm test:coverage` passou para `70.83%`.
- A leitura de backlog fica corrigida sem ambiguidade: o `32.23%` baixo remanescente pertence a `packages/shared/feature-flags/src/index.ts`, que passa a ser o alvo prioritario antes de `encounters` e `staff`.
- A rodada seguinte corrigiu o drift de compilacao introduzido em `triage`: `packages/modules/triage/src/index.ts` voltou a compilar com a restauracao do import de `PatientId`, preservando a correção de dominio sem quebrar o pacote.
- O alvo correto de coverage em flags compartilhadas foi atacado de forma util: `packages/shared/feature-flags/src/index.ts` saiu de `32.23%` para `73.98%` com cobertura de validacao, registry, rollout rules, providers compostos e metrics.
- O gate global de `pnpm test:coverage` passou para `73.17%`.
- Com isso, os proximos alvos naturais da trilha ficam em `packages/modules/encounters/src/index.ts` e `packages/modules/staff/src/index.ts`; `INT-003` continua fora do escopo por disciplina de backlog.
- A rodada seguinte fechou esses dois gaps restantes com cobertura de alto valor: `packages/modules/encounters/src/index.ts` saiu de `47.92%` para `93.08%` e `packages/modules/staff/src/index.ts` de `50.20%` para `99.59%`.
- O gate global de `pnpm test:coverage` passou para `75.57%`.
- A rodada seguinte fechou tambem os gaps de cadastro clinico e identidade operacional: `packages/modules/patients/src/index.ts` saiu de `52.63%` para `94.73%` e `packages/modules/users/src/index.ts` de `61.13%` para `96.98%`.
- O gate global de `pnpm test:coverage` passou para `77.85%`.
- A rodada seguinte fechou o alvo de MFA com valor operacional real: `packages/modules/mfa/src/service.ts` saiu de `31.37%` para `96.83%`, e o bug de recovery code que permitia restaurar codigo consumido apos `verifyLogin()` foi corrigido na raiz.
- O gate global de `pnpm test:coverage` passou para `78.95%`.
- A rodada seguinte fechou tambem o bloco WebAuthn: `packages/modules/mfa/src/webauthn.ts` saiu de `7.53%` para `91.03%`, e o drift de `credentialId` entre registro e repositorio foi corrigido na raiz para manter a trilha registration -> authentication coerente.
- O gate global de `pnpm test:coverage` passou para `80.27%`.
- A rodada seguinte confirmou essa leitura: `ml` segue claramente fora do foco imediato, porque o maior retorno desta base estava no runtime da API.
- `apps/api/src/email-gateway.ts` saiu de `0%` para `100%`, e a falha de transporte do provider `Resend` passou a gerar resultado estruturado em vez de excecao sem tratamento.
- Os repositórios operacionais de API receberam prova automatizada útil, com `apps/api/src/card-transaction-repository.ts` em `97.18%` e `apps/api/src/email-delivery-repository.ts` em `100%`.
- O gate global de `pnpm test:coverage` passou para `81.91%`.
- A rodada seguinte fechou o gap residual de PIX persistido no gate oficial: `apps/api/src/pix-transaction-repository.ts`, antes excluido em `vitest.config.ts`, voltou ao relatorio oficial com `98.18%`.
- A auditoria subsequente recalibrou o baseline oficial para `81.91%` antes do lote seguinte, evitando propagar numero nao confirmado como fonte final.
- A rodada seguinte atacou diretamente bootstrap/runtime: `apps/api/src/startup-secrets.ts` foi para `98.7%`, `apps/api/src/runtime.ts` para `86.89%`, e `apps/api/src` como agregado foi para `94.72%`.
- O gate global de `pnpm test:coverage` passou para `83.62%`.
- A rodada seguinte consolidou os branches defensivos restantes de maior retorno em `apps/api/src/runtime.ts` e fechou a superfície operacional de `apps/api/src/http/auth-rate-limiter.ts`.
- `runtime.ts` passou para `88.5%`, `apps/api/src/http` foi para `100%`, e o gate global de `pnpm test:coverage` passou para `83.81%`.
- A rodada seguinte continuou no mesmo eixo e fechou tres branches restantes de alto retorno em `apps/api/src/runtime.ts`: retorno antecipado de settlement sem `externalReferenceId`, callback operacional `notification.sent` e inicializacao sem `bootstrapAccountId`.
- Com isso, `runtime.ts` passou para `91.2%`, `apps/api/src` consolidou `96.21%` e o gate global de `pnpm test:coverage` foi confirmado em `83.96%` (`543/543`).
- A rodada seguinte fechou os callbacks restantes de mudanca de status em `apps/api/src/runtime.ts` (`appointment.status_changed` e `encounter.status_changed`) e, fora da API, endureceu `packages/shared/logging/src/index.ts` com prova util de redacao, correlacao e fallback de child logger.
- Com isso, `runtime.ts` foi para `94.79%`, `packages/shared/logging/src/index.ts` para `90.44%` e o gate global de `pnpm test:coverage` foi confirmado em `84.61%` (`549/549`).
- A rodada seguinte continuou o fechamento fino de `apps/api/src/runtime.ts` com dois ramos de alto retorno residual: publicacao de `patient.created` no outbox e fallback auditavel de erro no dispatch de WhatsApp reminder.
- O melhor segundo alvo desta base nao foi `ml` nem `fiscal/service.ts`: `packages/modules/diagnostics/src/laboratory.ts` foi escolhido por risco/ROI e subiu para `88.51%` com cobertura util de hidratacao de catalogo, filtros por encounter e dashboard operacional.
- Com os reruns confirmados, `runtime.ts` passou para `97.12%`, `packages/modules/diagnostics/src/laboratory.ts` para `88.51%` e o gate global de `pnpm test:coverage` foi para `85.04%` (`552/552`).
- `ml` permanece condicionado a caso de uso operacional concreto e continua fora da trilha imediata.
- A rodada seguinte reavaliou o restante de `runtime.ts` e concluiu que o ganho marginal residual ja era menor do que o disponivel em fiscal; a prioridade saiu corretamente de runtime para `packages/modules/fiscal/src/service.ts`.
- O lote fiscal fechou o serviço em `92.85%`, cobrindo delegacao ao branch persistido, filtros fiscais reais, retornos nulos do ciclo NFS-e e reflexo do dashboard apos criacao de layout.
- Com os reruns confirmados, o gate global de `pnpm test:coverage` foi para `86.43%` (`555/555`), enquanto `runtime.ts` permaneceu estavel em `97.12%`.
- `ml` continua condicionado a caso de uso operacional concreto e segue fora da trilha imediata.
- A rodada seguinte fechou o adapter persistido `packages/modules/fiscal/src/database-fiscal.repository.ts`, que foi a `100%` com prova util de query building, mapeamento e lifecycle de layouts NFS-e.
- Com isso, `packages/modules/fiscal/src` consolidou `95.74%` e o gate global de `pnpm test:coverage` foi para `88.86%` (`566/566` no rerun atual), reforcando a prioridade correta de fiscal sobre `ml`.
- `ml` continua condicionado a caso de uso operacional concreto e segue fora da trilha imediata.
- A rodada seguinte reavaliou os gaps operacionais restantes fora de fiscal e concluiu que o melhor ROI residual nao estava mais em `runtime.ts` nem em `ml`, e sim em `apps/api/src/feature-flags.ts` com complemento direto em `packages/tenant-context/src/middleware.ts`.
- O lote ampliou a prova do contrato publico de rollout da API, cobrindo snapshot booleano, bootstrap de multiplos flags e o rollout inbound de WhatsApp, enquanto fechou a resolucao explicita de tenant/account/correlation id no middleware de tenancy.
- Com os reruns confirmados, `apps/api/src/feature-flags.ts` foi para `96.52%`, `packages/tenant-context/src/middleware.ts` para `100%` e o gate global de `pnpm test:coverage` ficou em `88.86%` (`566/566`).
- `ml` continua condicionado a caso de uso operacional concreto e segue fora da trilha imediata.
- A rodada seguinte fechou o seam do provider persistido de flags sem depender de mocking fragil de loader: `createApiFeatureFlags()` passou a aceitar contexto opcional de `accountId/userId` e `databaseProviderFactory`, preservando o comportamento atual do bootstrap.
- O mesmo lote atacou a superficie comercial com melhor ROI remanescente fora de fiscal/API: `packages/modules/counter-sales/src/index.ts` foi para `85.59%` com cobertura oficial de `updateItem`, `removeItem`, `cancel` e `reopen`.
- Com os reruns confirmados, o gate global de `pnpm test:coverage` passou para `89.59%` (`569/569`), `apps/api/src/feature-flags.ts` chegou a `100%` em statements/lines e `ml` continuou corretamente fora da trilha imediata.
- Qualquer avanço futuro em `ml` deve continuar condicionado a caso de uso operacional concreto.

---

## 6. GATES EXECUTIVOS

### Gate G0 - Estabilizacao de release
- `pnpm typecheck` PASS
- `pnpm build` PASS
- `pnpm validate:openapi` PASS
- `pnpm test:coverage` PASS
- `pnpm test:critical:bootstrap` PASS

### Gate G1 - Fluxos enterprise
- Agenda, billing, internacao, laboratorio e notificacoes cobrindo os fluxos principais
- Sem divergencia entre contrato de API, testes e validacoes de dominio
- Docs vivas atualizadas ao final de cada lote sem drift prioritario nos itens enterprise ativos

### Gate G2 - Operacao
- Evidencia de health, readiness, metrics e tracing por servico
- Restore drill e cutover checklist validados

### Gate G3 - Evolucao
- Roadmap e backlog revisados ao final de cada onda
- Itens de integracao e ML somente promovidos quando G0 e G1 estiverem verdes

---

## 7. RISCOS PRINCIPAIS

| Risco | Probabilidade | Impacto | Mitigacao |
|---|---|---|---|
| Tratar o projeto como pronto por amplitude funcional | Alta | Alto | Medir prontidao por gate, nao por volume de features |
| Drift continuo da documentacao | Alta | Medio | Atualizar docs vivos ao fim de cada onda |
| Regressao em agendamento/fluxos criticos | Media | Alto | Cobertura direcionada e gate bootstrap obrigatorio |
| Dispersao prematura em AI/ML | Media | Medio | Condicionar expansao a gates de release e operacao |
| Integracoes externas abrirem nova frente sem base fechada | Media | Medio | Priorizar somente o que reduz risco ou fecha receita/operacao |

---

## 8. DECISAO EXECUTIVA

O programa segue viavel e tecnicamente promissor, mas precisa mudar de fase. A prioridade agora nao e ampliar a fronteira de features; e fechar o produto para operacao confiavel. O backlog e o roadmap atualizados abaixo devem ser tratados como linha mestra:

- `docs/Enterprise/100-ROADMAP-VISAO-GERAL.md`
- `docs/Enterprise/200-BACKLOG-MASTER.md`

Se a equipe executar o P0 e o P1 com disciplina, o projeto consegue sair do patamar de base enterprise promissora para plataforma enterprise pronta para rollout controlado.
