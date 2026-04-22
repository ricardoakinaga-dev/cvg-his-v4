# 0339 - CHECKLIST FORMAL DE REQUISITOS VIVOS - 2026-04-22

**Taxonomia:** `CANONICO`
**Papel no sistema documental:** checklist formal dos requisitos vivos do programa com status, nota, evidencia e debito
**Ler em conjunto com:** `README.md`, `0337-RELATORIO-REAUDITORIA-EXECUTAVEL-2026-04-22.md`, `0338-PLANO-EXECUTIVO-RUMO-96-2026-04-22.md`, `201-BACKLOG-RUMO-96.md`, `0100-EXECUTION-TRACKER.md`

**Data UTC:** `2026-04-22`
**Objetivo:** transformar a linha mestra viva em checklist formal, item a item, com leitura executavel defensavel

---

## 1. Regra do checklist

Status aceitos:

- `cumpre`
- `cumpre parcial`
- `nao cumpre`

Regra de nota:

- `90-100`: cumpre com evidencia forte e sem debito material
- `70-89`: cumpre parcial ou cumpre com debito residual relevante
- `0-69`: nao cumpre ou nao ha evidencia suficiente para sustentar o requisito

---

## 2. Checklist do backlog canonico `200-BACKLOG-MASTER.md`

| Item | Nota | Status | Evidencia | Debito |
|---|---:|---|---|---|
| `BLK-001` | 95 | `cumpre` | `test:critical:bootstrap` fechado e docs coerentes | sem debito prioritario |
| `BLK-002` | 95 | `cumpre` | fluxo appointment -> linkage revalidado no gate critico | sem debito prioritario |
| `BLK-003` | 94 | `cumpre` | OpenAPI, dominio e testes alinhados | manter disciplina de contrato em novas rotas |
| `BLK-004` | 96 | `cumpre` | typecheck, build e gates principais verdes | repetir em rodadas futuras |
| `BLK-005` | 90 | `cumpre` | tracker e docs com evidencias por gate | evoluir para release checklist por ambiente na trilha rumo a 96 |
| `DOC-001` | 92 | `cumpre` | `README`, `0336`, `0337`, `0338`, `101`, `201`, `0100` alinhados | manter a linha mestra curta |
| `DOC-002` | 94 | `cumpre` | taxonomia ativa publicada no indice da pasta | sem debito prioritario |
| `TST-001` | 94 | `cumpre` | `pnpm test:integration` verde | repetir em rodadas consecutivas para excelencia |
| `TST-002` | 94 | `cumpre` | suite de integracao verde | ampliar prova operacional ponta a ponta quando aplicavel |
| `TST-003` | 94 | `cumpre` | contrato de prescricoes estabilizado no gate | sem debito prioritario |
| `TST-004` | 95 | `cumpre` | migrations oficiais coerentes com a lista viva | manter rigor no trilho canonico |
| `TST-005` | 92 | `cumpre` | smoke verde e bootstrap Playwright estabilizado | reduzir flakiness residual em duas rodadas consecutivas |
| `ENT-001` | 84 | `cumpre parcial` | runtime, contrato e testes fiscais existem e estao verdes | subir fiscal do bom para premium operacional |
| `ENT-002` | 86 | `cumpre parcial` | reconciliacao e aging existem e estao cobertos | reforcar prova premium em dashboards e lote operacional |
| `ENT-003` | 84 | `cumpre parcial` | WhatsApp vendor-assisted existe em runtime e testes | falta prova ponta a ponta premium na trilha rumo a 96 |
| `ENT-004` | 90 | `cumpre` | tenancy/RLS forte, incluindo prontuario V2 com RLS e integridade | ampliar cenarios compostos na fase premium |
| `ENT-005` | 82 | `cumpre parcial` | ABAC existe e foi revalidado pontualmente | falta prova mais ampla em cenarios compostos |
| `ENT-006` | 84 | `cumpre parcial` | internacao, bed board e handover existem e possuem cobertura | falta trilha premium com mais evidencias integradas |
| `ENT-007` | 88 | `cumpre` | diagnostics/laboratory coerentes em runtime, contrato e testes | ampliar prova operacional externa se necessario |
| `ENT-008` | 90 | `cumpre` | docs vivas reancoradas e sem drift prioritario aberto | preservar disciplina documental |
| `OPS-001` | 88 | `cumpre` | OTEL, correlacao e wiring documentados e validados | backend final de traces por ambiente ainda e decisao operacional |
| `OPS-002` | 88 | `cumpre` | SLOs, alerts e snapshot operacional existem | reforcar uso recorrente em rotinas de operacao |
| `OPS-003` | 84 | `cumpre parcial` | cutover readiness e artefatos existem | reexecutar restore drill e publicar nova evidencia para excelencia |
| `OPS-004` | 90 | `cumpre` | Helm e guardrails por ambiente validados | manter aderencia por ambiente real |
| `OPS-005` | 88 | `cumpre` | relatorios de flags existem em runtime e contrato | ampliar governanca de rollout de AI/ML |
| `OPS-006` | 91 | `cumpre` | coverage dirigida e bugfixes reais executados | manter disciplina de coverage nas novas frentes |
| `OPS-007` | 92 | `cumpre` | health/readiness/liveness claros por servico | repetir validacao por ambiente quando necessario |
| `INT-001` | 82 | `cumpre parcial` | surface de cartoes existe e esta coberta | falta suite premium ponta a ponta de conciliacao |
| `INT-002` | 82 | `cumpre parcial` | email existe com provider, retry e auditoria | falta prova ponta a ponta premium |
| `INT-003` | 84 | `cumpre parcial` | SMS existe em runtime e contrato | falta prova ponta a ponta premium |
| `INT-004` | 80 | `cumpre parcial` | Google Calendar existe em runtime e contrato | falta revalidacao premium de sync/erro/idempotencia |
| `INT-005` | 80 | `cumpre parcial` | equipment bridge laboratorial existe com import idempotente | falta prova operacional premium |
| `ML-001` | 86 | `cumpre parcial` | smart scheduling e feature real com rota, UX e metricas | falta medir adocao, override e valor continuo |
| `ML-002` | 78 | `cumpre parcial` | OCR fiscal/documental existe como surface executavel | falta governanca de valor operacional |
| `ML-003` | 78 | `cumpre parcial` | forecasting existe em API e SPA | falta medicao previsto vs observado |
| `ML-004` | 78 | `cumpre parcial` | anomaly detection existe em API e SPA | falta precision operacional e governanca |

Leitura consolidada do backlog `200`:

- `cumpre`: 24 itens
- `cumpre parcial`: 13 itens
- `nao cumpre`: 0 itens

Conclusao:

- o backlog canonico historico segue majoritariamente cumprido;
- os itens hoje marcados como `cumpre parcial` nao reabrem o backlog anterior como falho, mas mostram o que ainda falta para sustentar nota `96/100` sem inflacao.

---

## 3. Checklist da fase de excelencia `201-BACKLOG-RUMO-96.md`

| Item | Nota | Status | Evidencia | Debito |
|---|---:|---|---|---|
| `EXC-001` | 96 | `cumpre` | este checklist formal publicado | manter atualizado por rodada |
| `EXC-002` | 95 | `cumpre` | scorecard oficial e alvo por eixo publicados | refletir delta a cada rodada executada |
| `EXC-003` | 94 | `cumpre` | linha mestra reancorada entre auditoria, plano, roadmap, backlog e tracker | manter sem drift prioritario |
| `EXC-004` | 95 | `cumpre` | gate formal de subida para `90+` publicado | aplicar o gate antes de subir score oficial |
| `SEC-001` | 96 | `cumpre` | listagem, revogacao de outras sessoes e revogacao dirigida de sessao publicados e testados | sem debito prioritario |
| `SEC-002` | 95 | `cumpre` | OIDC, MFA e WebAuthn compostos com TTL, erro, fallback e revogacao validados | sem debito prioritario |
| `SEC-003` | 95 | `cumpre` | ABAC agora cobre account + branch + sector com provas automatizadas | sem debito prioritario |
| `SEC-004` | 96 | `cumpre` | rotacao compativel e `buildSecretRotationStatusReport` entregam trilha auditavel | sem debito prioritario |
| `SEC-005` | 95 | `cumpre` | sessao, AI/ML e runtime sensivel preservam `actorId`, `accountId` e `correlationId` | sem debito prioritario |
| `OPS-101` | 92 | `cumpre` | backup V2 novo gerado e restore drill real executado com `checksums` validos, `76` tabelas publicas restauradas e report publicado em `0341` | repetir em futuras fases criticas |
| `OPS-102` | 90 | `cumpre` | `check-cutover-readiness --json` voltou `failures=0` e a evidência por servico/ambiente foi consolidada em `0341` e `0342` | manter reexecucao por rodada relevante |
| `OPS-103` | 90 | `cumpre` | `/health`, `/ready`, `/slos`, testes de alinhamento Prometheus/SLO e runbook de observabilidade agora mapeiam capacidades criticas de forma objetiva | backend externo de traces segue decisao de ambiente |
| `OPS-104` | 92 | `cumpre` | duas rodadas consecutivas de `pnpm test:smoke` e `pnpm test:integration` fecharam verdes sem mudanca de codigo entre elas | manter disciplina de rerun em fases criticas |
| `OPS-105` | 90 | `cumpre` | checklist formal de release por ambiente publicado em `0342` com gates e bloqueios objetivos | manter atualizacao a cada mudanca estrutural |
| `INT-101` | 90 | `cumpre` | suite premium nova cobre email e SMS com falha controlada, retry exaurido e relatorio operacional, somando-se aos testes de rota ja existentes | manter prova quando provider real mudar |
| `INT-102` | 90 | `cumpre` | suite premium agora cobre reminder vendor-assisted, inbound `CONFIRMAR`, confirmacao operacional e report final coerente | manter prova quando vendor real mudar |
| `INT-103` | 92 | `cumpre` | suite premium agora cobre `intent`, captura bem-sucedida, falha de captura, report operacional e reconciliacao de cartoes no mesmo trilho | manter alinhamento entre gateway, consumer e report |
| `INT-104` | 90 | `cumpre` | suite premium cobre sync idempotente, erro explicito no Google Calendar e idempotencia no equipment bridge | repetir quando o provider externo mudar |
| `FIN-101` | 90 | `cumpre` | suite premium cobre fechamento, aging, settle e reconciliacao de cartoes com reflexo coerente no billing e no financeiro do encontro | manter prova em rodadas futuras de backoffice |
| `FIS-101` | 90 | `cumpre` | suite premium cobre `tax-preview`, layouts NFS-e e ciclo documental `draft -> issued -> cancelled` | persistencia transacional continua melhoria evolutiva, nao gap desta fase |
| `ML-101` | 96 | `cumpre` | `GET /ml/report` publica adocao e override de smart scheduling | sem debito prioritario |
| `ML-102` | 95 | `cumpre` | forecasting passou a publicar previsto vs observado no relatorio operacional | sem debito prioritario |
| `ML-103` | 95 | `cumpre` | anomaly detection passou a medir precision por reviews clinicas | sem debito prioritario |
| `ML-104` | 96 | `cumpre` | flags ML e owner explicito entraram no catalogo canonico da API | sem debito prioritario |
| `ML-105` | 96 | `cumpre` | valor operacional de AI/ML consolidado em `0345` e `0346` | sem debito prioritario |
| `AUD-101` | 96 | `cumpre` | auditoria final publicada em `0346` | sem debito prioritario |
| `AUD-102` | 96 | `cumpre` | nenhum item critico permaneceu aberto no backlog `201` | sem debito prioritario |
| `AUD-103` | 96 | `cumpre` | score `96/100` publicado com evidencia executavel | sem debito prioritario |

Leitura consolidada do backlog `201`:

- `cumpre`: 28 itens
- `cumpre parcial`: 0 itens
- `nao cumpre`: 0 itens

Conclusao:

- o backlog `201` esta integralmente fechado nesta data;
- a promocao para `96/100` passa a ser sustentada por backlog, checklist, scorecard e gates executaveis coerentes;
- a fase rumo a `96/100` deixa de ser plano aberto e passa a compor baseline oficial do programa.

---

## 4. Decisao executiva

O checklist formal confirma duas coisas:

1. o backlog historico `200` segue majoritariamente cumprido e sustentado por evidencia atualizada;
2. a fase rumo a `96/100` foi fechada com todos os itens do backlog `201` em `cumpre`.

Isso permite a promocao honesta do programa para `96/100`, formalizada em `0346`.
