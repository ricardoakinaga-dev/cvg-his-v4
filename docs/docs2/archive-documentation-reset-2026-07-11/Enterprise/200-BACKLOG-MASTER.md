# BACKLOG MASTER - CVG-HIS-V2 Enterprise
**Taxonomia:** `CANONICO`
**Papel no sistema documental:** backlog executivo vivo com sequenciamento, status e criterios de aceite do programa
**Ler em conjunto com:** `README.md`, `0334-PLANO-EXECUTIVO-REALINHAMENTO-ENTERPRISE-2026-04-17.md`, `0335-RELATORIO-AUDITORIA-EXTREMA-WORKSPACE-2026-04-19.md`, `100-ROADMAP-VISAO-GERAL.md`, `0100-EXECUTION-TRACKER.md`

**Versao:** 2026-04-19
**Objetivo:** elevar a prontidao de release de `84/100` para `90/100` e a maturidade de produto de `90/100` para `92/100+`
**Base:** `0334-PLANO-EXECUTIVO-REALINHAMENTO-ENTERPRISE-2026-04-17.md`, `0335-RELATORIO-AUDITORIA-EXTREMA-WORKSPACE-2026-04-19.md` e `100-ROADMAP-VISAO-GERAL.md`

## Regras do backlog

- P0 bloqueia release ou confianca operacional.
- P1 fecha loops enterprise que ja estao parcialmente construidos.
- P2 endurece a plataforma para rollout seguro.
- P3 expande integracoes e inteligencia depois do core ficar verde.

## P0 - Bloqueadores de release

| ID | Item | Impacto | Status | Criterio de aceite |
|---|---|---|---|---|
| BLK-001 | Corrigir divergencia de duracao em appointments | Alto | Fechado | `pnpm test:critical:bootstrap` PASS (17/04/2026) |
| BLK-002 | Revalidar fluxo appointment -> linkage no bootstrap critico | Alto | Fechado | teste fundacional verde sem ajuste manual (17/04/2026) |
| BLK-003 | Revisar contrato entre dominio, testes e OpenAPI em agenda | Alto | Fechado | payloads e validacoes alinhados (17/04/2026) |
| BLK-004 | Reexecutar trilha minima de release apos o fix | Alto | Fechado | typecheck, build, validate:openapi, coverage e bootstrap critico PASS (17/04/2026) |
| BLK-005 | Publicar checklist de release com evidencias | Medio | Fechado | documento de release e evidencias por gate (17/04/2026) |
| DOC-001 | Reancorar a linha mestra documental apos auditoria extrema | Alto | Fechado | `README`, `0334`, `0335`, `100`, `200` e `0100` coerentes com o workspace de `19/04/2026` |
| DOC-002 | Classificar a pasta `docs/Enterprise` em `CANONICO`, `APOIO` e `OPERACIONAL` | Alto | Fechado | taxonomia explicita aplicada aos documentos ativos e historico arquivado em `docs/docs2` |
| TST-001 | Fechar regressao da suite `rate-limiting` | Alto | Fechado | `pnpm test:integration` PASS com `rate-limiting` alinhado ao contrato atual (19/04/2026) |
| TST-002 | Fechar persistencia e cascade de webhooks | Alto | Fechado | `pnpm test:integration` PASS com persistencia/cascade de webhooks revalidada (19/04/2026) |
| TST-003 | Alinhar contrato de prescricoes API | Alto | Fechado | `pnpm test:integration` PASS com `medicalRecordId` coerente (19/04/2026) |
| TST-004 | Fechar drift do contrato de migrations oficiais | Medio | Fechado | `pnpm test:integration` PASS com lista oficial coerente (19/04/2026) |
| TST-005 | Desbloquear health-check do E2E critico | Alto | Fechado | `pnpm test:e2e` PASS (`11/11`) com bootstrap Playwright auto-suficiente (19/04/2026) |

## P1 - Fechamento enterprise

| ID | Item | Impacto | Status | Criterio de aceite |
|---|---|---|---|---|
| ENT-001 | Completar ciclo fiscal prioritario | Alto | Fechado | emissao, cancelamento e backoffice minimo operaveis |
| ENT-002 | Fechar conciliacao financeira e aging operacional | Alto | Fechado | fechamento administrativo com trilha auditavel |
| ENT-003 | Consolidar fluxo WhatsApp vendor-assisted | Medio | Fechado | envio, inbound e operacao previsivel |
| ENT-004 | Revalidar multi-tenancy e RLS ponta a ponta | Alto | Fechado | evidencia em testes e runtime multi-tenant |
| ENT-005 | Revalidar ABAC e segregacao contextual | Medio | Fechado | politicas cobrindo cenarios reais de tenant/branch/sector |
| ENT-006 | Endurecer internacao, bed board e handover nos fluxos criticos | Medio | Fechado | jornadas principais cobertas por testes integrados |
| ENT-007 | Fechar contratos de laboratorio/diagnostics para operacao | Medio | Fechado | pedidos, resultados, catalogo e bridge diagnostics/laboratory coerentes |
| ENT-008 | Consolidar backlog de docs vivas e eliminar drift prioritario | Medio | Fechado | roadmap, backlog e tracker coerentes com o codigo |

## P2 - Operacao e plataforma

| ID | Item | Impacto | Status | Criterio de aceite |
|---|---|---|---|---|
| OPS-001 | Completar OTEL collector e tracing distribuido | Alto | Fechado | API e worker com traces correlacionados |
| OPS-002 | Ligar metrics e alert rules a SLOs | Alto | Fechado | alertas orientados a erro, latencia e disponibilidade |
| OPS-003 | Formalizar backup, restore drill e cutover readiness | Alto | Fechado | drill repetivel e documentado |
| OPS-004 | Hardenizar charts Helm e configuracao por ambiente | Medio | Fechado | chart validado por ambiente com guardrails operacionais reais |
| OPS-005 | Evoluir governanca de feature flags | Medio | Fechado | rollout, visibilidade e auditoria mais previsiveis |
| OPS-006 | Elevar coverage das areas mais criticas | Medio | Fechado | agenda, financeiro, diagnostics e flows core com cobertura direcionada e bug real corrigido |
| OPS-007 | Consolidar readiness/liveness/health por servico | Medio | Fechado | contratos operacionais claros para API, SPA e worker |

## P3 - Integracoes de negocio

| ID | Item | Impacto | Status | Criterio de aceite |
|---|---|---|---|---|
| INT-001 | Integracao de cartoes | Medio | Fechado | provider gateway externo equivalente, captura, conciliacao minima, auditoria e surface operacional coerentes |
| INT-002 | Integracao de email | Medio | Fechado | config compartilhado, provider local/Resend, retry, auditoria, relatorio operacional e rollout por ambiente coerentes |
| INT-003 | Integracao de SMS | Medio | Fechado | envio transacional, retry, relatorio operacional, config compartilhado e testes de rota/API fechados (19/04/2026) |
| INT-004 | Google Calendar | Baixo | Fechado | sincronizacao outbound de appointments, relatorio operacional e contrato OpenAPI publicados (19/04/2026) |
| INT-005 | HL7/FHIR ou integracao de equipamentos | Baixo | Fechado | trilha de integracao de equipamentos laboratoriais entregue como recorte operacional do item, com import idempotente e report operacional (19/04/2026) |

## P3.5 - Paridade Vetus comercial

| ID | Item | Impacto | Status | Criterio de aceite |
|---|---|---|---|---|
| VETUS-COM-001 | Implementar superficie de fidelidade e resgate de pontos | Medio | Fechado parcial | rota `/loyalty`, pagina SPA e testes verdes; pendente API persistida |
| VETUS-COM-002 | Implementar cadastro operacional de tabelas de preco | Medio | Fechado parcial | rota `/tabelas-de-preco`, pagina SPA, navegacao e testes verdes; pendente API persistida |
| VETUS-COM-003 | Implementar superficie de pontos de venda e sincronizacao | Medio | Fechado parcial | rota `/pontos-de-venda`, pagina SPA, navegacao e testes verdes; pendente worker/API real de sync |
| VETUS-COM-004 | Criar base relacional para fidelidade, precos e PDV | Alto | Fechado | migration `0021_commercial_loyalty_price_pdv` aplicada no banco de teste |
| VETUS-COM-005 | Publicar API/OpenAPI para fidelidade, tabelas de preco e jobs PDV | Alto | Aberto | endpoints, contratos, handlers, testes e persistencia em runtime |
| VETUS-COM-006 | Substituir dados locais por integracao real nas telas novas | Alto | Aberto | SPA consumindo API com estados de loading, erro, vazio e sucesso |
| VETUS-COM-007 | Validar Helm no ambiente da rodada Vetus | Medio | Aberto | `pnpm validate:helm` PASS em runner com binario `helm` disponivel |

## P4 - IA e inteligencia aplicada

| ID | Item | Impacto | Status | Criterio de aceite |
|---|---|---|---|---|
| ML-001 | Promover smart scheduling a feature real | Medio | Fechado | rota API, OpenAPI, UX no fluxo rapido e medicao Prometheus conectadas (19/04/2026) |
| ML-002 | OCR fiscal/documental | Baixo | Fechado | preview executavel exposto em API/contrato para leitura fiscal-documental inicial (19/04/2026) |
| ML-003 | Demand forecasting | Baixo | Fechado | previsoes de demanda publicadas em API e consumidas pela cockpit de appointments da SPA (19/04/2026) |
| ML-004 | Anomaly detection em exames | Baixo | Fechado | varredura de anomalias laboratoriais exposta em API e refletida na tela de resultados da SPA (19/04/2026) |

## Atualizacao operacional 19/04/2026

- `pnpm test:integration` foi fechado no lote de estabilizacao de contrato e persistencia; os itens `TST-001` a `TST-004` deixam de ser bloqueadores ativos.
- `pnpm test:e2e` passou a executar a trilha critica com bootstrap auto-suficiente da API e fechou em `11/11`, encerrando `TST-005`.
- `ML-001` saiu de infraestrutura para feature consumivel: `POST /scheduling/recommendations/duration`, `smart_scheduling_*` metrics e UX no `AppointmentQuickCreateForm` passaram a compor o fluxo real de agendamento.
- A OpenAPI vigente do workspace passou a `165 paths`, `32 tags` e `161 schemas`.
- O endurecimento residual do reminder de WhatsApp foi fechado na propria suite ampla de `apps/api`: o runtime preserva corretamente `provider=360dialog` no audit log de falha de vendor, e o teste foi alinhado a esse contrato real sem reabrir `ML-001`.

## Atualizacao operacional 22/04/2026 - fechamento dos gaps do relatorio 0336

- O backlog seguia marcado como `Fechado`, mas a auditoria executavel `0336` encontrou gaps reais entre essa declaracao e o runtime em prontuario, contratos SPA/API e docs ativas.
- Esses gaps foram fechados na propria rodada de remediacao:
  - `packages/db/migrations/0019_medical_records_rls.sql`
  - `packages/db/migrations/0020_medical_records_integrity.sql`
  - alinhamento de sessao orfa `404 Session not found` na SPA
  - alinhamento do contrato de triagem para `items` ou `records`
  - cobertura de rotas financeiras faltantes em `frontend-backend-contract.test.ts`
  - consolidacao final de `apps/spa` como frontend canonico sem `cvg-his-v2-web` no config compartilhado
- Evidencia da remediacao:
  - `pnpm typecheck` -> `PASS`
  - `pnpm build` -> `PASS`
  - `pnpm test:integration` -> `PASS` (`75 arquivos`, `886 testes`)
  - `pnpm test:smoke` -> `PASS` (`13 passed`)
  - `node scripts/validate-openapi.js` -> `PASS` (`175 paths`, `33 tags`, `178 schemas`)
  - `node infra/scripts/check-cutover-readiness.mjs` -> `PASS`
- Leitura executiva correta apos essa rodada:
  - os itens do backlog continuam `Fechados`
  - o fechamento agora voltou a estar sustentado por evidencia executavel atualizada e registrada na linha mestra documental

## Atualizacao operacional 24/04/2026 - ciclo Vetus paridade comercial

- A pasta `docs/vetus/guides` e `docs/vetus/inspection` passou a alimentar uma nova frente de paridade funcional.
- A primeira fatia implementada fechou a superficie SPA de `Resgate de Pontos`, `Tabelas de Preco` e `Pontos de venda`.
- A migration `0021_commercial_loyalty_price_pdv` criou a base de dados para fidelidade, pontos, resgates, tabelas de preco, itens de tabela e jobs PDV.
- Evidencias da rodada:
  - `pnpm typecheck` -> `PASS`
  - `pnpm test` -> `PASS`
  - `pnpm validate:openapi` -> `PASS` (`175 paths`, `33 tags`, `178 schemas`)
  - `node infra/scripts/check-cutover-readiness.mjs` -> `PASS`
  - migration aplicada no banco de teste `cvg_his_v2_test`
- Limite registrado: as novas telas ainda precisam de API persistida e o `validate:helm` ficou bloqueado por falta do binario `helm`.

## Atualizacao operacional 19/04/2026 - lote premium de integracoes e ML aplicado

- `INT-003` foi fechado com `POST /integrations/sms/messages`, retry explicito, relatorio operacional e adapters `local/twilio`.
- `INT-004` foi fechado com sincronizacao outbound `appointment -> Google Calendar`, report operacional e surface OpenAPI dedicada.
- `INT-005` foi fechado no recorte operacional de integracao de equipamentos laboratoriais: import idempotente de resultados externos, progressao coerente `requested -> collected -> resulted` e report operacional.
- `ML-002`, `ML-003` e `ML-004` deixaram de ser backlog puramente conceitual e passaram a existir como features executaveis em `/ml/ocr/fiscal-preview`, `/ml/forecasting/demand` e `/ml/anomalies/laboratory-results`, com consumo real em SPA para forecasting e anomalias.
- A OpenAPI vigente passou a `175 paths`, `33 tags` e `178 schemas`.
- `pnpm --filter @cvg-his-v2/api test` fechou em `125/125` apos endurecimento do contrato de query validation da rota de forecasting (`horizonDays` e `referenceDate`).

## Sequenciamento recomendado

1. Fechar todo o P0.
2. Executar `ENT-001`, `ENT-002`, `ENT-004` e `OPS-001` a `OPS-003`.
3. Fechar `ENT-007`, `ENT-008` e elevar `OPS-006` nas areas core antes de abrir novas frentes largas.
4. Consolidar rollout e configuracao por ambiente das novas integracoes `SMS`, `Google Calendar` e equipment bridge laboratorial.
5. Tratar ML aplicado como frente de produto operavel, com proxima prioridade em calibracao de thresholds e qualidade de dados, nao em abrir novos endpoints.

## Atualizacao operacional 18/04/2026

- O incidente do harness de bootstrap critico foi corrigido na raiz: reset do banco de teste agora e deterministico e nao deixa schema residual para reaplicacao de enums da migracao `0000`.
- A trilha de teste agora tambem reduz colisao por desenho: `test:critical` deixou de hardcodear `DATABASE_URL_TEST`, o bootstrap usa banco efemero quando necessario e o setup aplica lock por nome do banco.
- A higiene operacional do runner foi endurecida: `pnpm test:runner:clean` remove processos `vitest`/`pnpm test:*` orfaos ou estagnados pelo `cwd` real do processo e limpa bancos efemeros sem conexao antes dos reruns criticos.
- O travamento residual do bootstrap sob sessao contaminada foi corrigido na raiz em `tests/db/db-admin.ts`: o reset nao encerra mais o `adminPool` dentro do advisory lock, eliminando o deadlock silencioso apos `CREATE DATABASE`.
- A coverage dirigida do modulo fiscal entrou no gate oficial: `packages/modules/fiscal/src/service.ts` subiu para `74.36%` e o gate global foi para `64.23%`.
- A coverage dirigida seguiu nas superficies operacionais remanescentes: `packages/modules/inventory/src/index.ts` subiu para `81.05%`, `packages/modules/owners/src/index.ts` para `87.00%` e `packages/modules/counter-sales/src/index.ts` para `41.20%`; o gate global foi para `67.21%`.
- A rodada seguinte fechou o maior gap comercial remanescente: `packages/modules/counter-sales/src/index.ts` subiu para `74.70%`, com dashboard, hidratacao persistida, filtros e relatorios operacionais entrando no gate oficial.
- `feature-flags` recebeu lote util de runtime/repository: a superficie relevante do pacote subiu para `32.23%` com cobertura de provider, rollout, cache, fallback seguro e degradacao controlada por erro de repositorio.
- O gap clinico mais agudo foi fechado na rodada seguinte: `packages/modules/triage/src/index.ts` subiu para `90.05%`, cobrindo validacao de paciente, versionamento, normalizacao de notas e hidratacao ordenada.
- O modulo persistido de flags recebeu correcao de raiz e prova util de SQL/mapeamento; a leitura correta do gap remanescente e que o `32.23%` baixo esta em `packages/shared/feature-flags/src/index.ts`, nao no modulo persistido.
- O drift de compilacao em `triage` foi eliminado com a restauracao do import de `PatientId`, e o build do modulo voltou a verde.
- O gap remanescente em flags compartilhadas foi fechado de forma material: `packages/shared/feature-flags/src/index.ts` subiu para `73.98%` com cobertura util de registry, rollout, providers compostos e metrics.
- A rodada seguinte fechou os gaps operacionais restantes mais imediatos: `packages/modules/encounters/src/index.ts` subiu para `93.08%` e `packages/modules/staff/src/index.ts` para `99.59%`, com cobertura de hidratação, timeline, callbacks, escopo de conta e toggles de status.
- A rodada seguinte fechou tambem o cadastro clinico e a identidade operacional no gate oficial: `packages/modules/patients/src/index.ts` subiu para `94.73%` e `packages/modules/users/src/index.ts` para `96.98%`.
- O gate global de `pnpm test:coverage` avancou para `77.85%`.
- A rodada seguinte fechou `packages/modules/mfa/src/service.ts` com ganho de coverage e bugfix real de recovery codes: o arquivo subiu para `96.83%`, o agregado de `packages/modules/mfa/src` para `67.88%` e o gate global para `78.95%`.
- A rodada seguinte fechou tambem `packages/modules/mfa/src/webauthn.ts`: o arquivo subiu para `91.03%`, o agregado de `packages/modules/mfa/src` foi para `95.86%` e o gate global para `80.27%`.
- `ml` foi reavaliado na rodada seguinte e continuou fora do foco imediato; o melhor retorno operacional estava no runtime da API.
- A rodada seguinte fechou `apps/api/src/email-gateway.ts` e os repositórios operacionais em memória: `email-gateway.ts` foi para `100%`, `card-transaction-repository.ts` para `97.18%`, `email-delivery-repository.ts` para `100%`, e o gate global subiu para `81.91%`.
- A rodada seguinte fechou o branch persistido de PIX e corrigiu o drift do gate oficial: `apps/api/src/pix-transaction-repository.ts` deixou de ficar excluido em `vitest.config.ts` e passou a constar no coverage oficial com `98.18%`, elevando o global para `82.38%`.
- A auditoria subsequente recalibrou o numero oficial antes do proximo lote para `81.91%`, evitando congelar um percentual nao confirmado como baseline.
- A rodada seguinte fechou `apps/api/src/startup-secrets.ts` (`98.7%`) e elevou `apps/api/src/runtime.ts` para `86.89%`, levando o gate global de `pnpm test:coverage` para `83.62%`.
- A rodada seguinte fechou mais branches defensivos do runtime e a superfície operacional de HTTP: `apps/api/src/runtime.ts` foi para `88.5%`, `apps/api/src/http/auth-rate-limiter.ts` foi para `100%`, e o gate global subiu para `83.81%`.
- A rodada seguinte fechou novos branches defensivos em `apps/api/src/runtime.ts`: settlement sem `externalReferenceId`, emissao de `notification.sent` e `initialize()` sem `bootstrapAccountId`. O arquivo subiu para `91.2%` e o gate global foi para `83.96%`.
- A rodada seguinte fechou tambem os callbacks de `appointment.status_changed` e `encounter.status_changed` em `apps/api/src/runtime.ts`, alem de elevar `packages/shared/logging/src/index.ts` para `90.44%` com cobertura operacional de sanitizacao e fallback.
- O gate global passou para `84.61%` e `ml` permaneceu conscientemente adiado.
- A rodada seguinte continuou `apps/api/src/runtime.ts` no que ainda tinha ROI real: callback `patient.created` no outbox e fallback auditavel de falha no vendor de WhatsApp reminder.
- O segundo alvo da rodada foi escolhido por criterio operacional: `packages/modules/diagnostics/src/laboratory.ts` oferecia melhor retorno do que `packages/modules/fiscal/src/service.ts` e muito mais do que `ml` neste momento.
- Com isso, `apps/api/src/runtime.ts` passou para `97.12%`, `packages/modules/diagnostics/src/laboratory.ts` para `88.51%` e o gate global de `pnpm test:coverage` foi confirmado em `85.04%` (`552/552`).
- `ml` segue conscientemente adiado; `INT-003` permanece fora da trilha imediata.
- A rodada seguinte reavaliou `apps/api/src/runtime.ts` e manteve o arquivo estavel em `97.12%`; os gaps remanescentes existem, mas o ROI operacional imediato ficou melhor em fiscal.
- O lote entao atacou `packages/modules/fiscal/src/service.ts`, que subiu para `92.85%` com prova do branch persistido do serviço, filtros reais e ciclo NFS-e mais bem exercitado.
- Com os reruns confirmados, o gate global de `pnpm test:coverage` foi para `86.43%` (`555/555`) e `packages/modules/fiscal/src` consolidou `78.64%`.
- `ml` segue conscientemente adiado; `INT-003` permanece fora da trilha imediata.
- A rodada seguinte fechou o adapter fiscal persistido: `packages/modules/fiscal/src/database-fiscal.repository.ts` passou a `100%` com cobertura de query building, mapeamento e layouts NFS-e.
- Com isso, `packages/modules/fiscal/src` consolidou `95.74%` no gate oficial, e o global de `pnpm test:coverage` foi confirmado em `88.86%` (`566/566` no rerun atual).
- `ml` segue conscientemente adiado; `INT-003` permanece fora da trilha imediata.
- `INT-003` permanece fora da trilha imediata; qualquer reavaliacao de `ml` continua subordinada a retorno operacional real.
- A rodada seguinte reavaliou os melhores gaps operacionais restantes fora de fiscal e manteve `apps/api/src/runtime.ts` apenas auditado, sem novo lote, porque o ROI residual imediato ali ficou menor.
- O alvo com melhor retorno real nesta base foi `apps/api/src/feature-flags.ts`, complementado por `packages/tenant-context/src/middleware.ts` para fechar a prova de resolucao tenant/account em runtime.
- Com os reruns confirmados, `apps/api/src/feature-flags.ts` foi para `96.52%`, `packages/tenant-context/src/middleware.ts` para `100%` e o gate global de `pnpm test:coverage` ficou em `88.86%` (`566/566`).
- `packages/modules/ml/src/*` continua conscientemente adiado; `INT-003` permanece fora da trilha imediata.
- A rodada seguinte fechou o seam do provider persistido em `apps/api/src/feature-flags.ts` com `accountId/userId` opcional e `databaseProviderFactory` injetavel, evitando mock fragil e mantendo o bootstrap atual intacto.
- O mesmo lote puxou `packages/modules/counter-sales/src/index.ts` em metodos ainda fora do gate oficial (`updateItem`, `removeItem`, `cancel`, `reopen`), elevando a superficie comercial para `85.59%`.
- Com os reruns confirmados, o gate global de `pnpm test:coverage` passou para `89.59%` (`569/569`), `apps/api/src/feature-flags.ts` chegou a `100%` em statements/lines e `ml` permaneceu conscientemente adiado.
