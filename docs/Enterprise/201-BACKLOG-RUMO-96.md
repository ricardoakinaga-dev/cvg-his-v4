# BACKLOG RUMO A 96 - CVG-HIS-V2 ENTERPRISE

**Taxonomia:** `CANONICO`
**Papel no sistema documental:** backlog executivo da fase de excelencia rumo a `96/100`
**Ler em conjunto com:** `README.md`, `0337-RELATORIO-REAUDITORIA-EXECUTAVEL-2026-04-22.md`, `0338-PLANO-EXECUTIVO-RUMO-96-2026-04-22.md`, `101-ROADMAP-RUMO-96.md`, `0100-EXECUTION-TRACKER.md`

**Versao:** `2026-04-22`
**Objetivo:** sequenciar o trabalho necessario para elevar o baseline atual do programa a `96/100`

---

## Regras do backlog

- `P0` bloqueia a subida real de nota.
- `P1` fecha maturidade operacional premium.
- `P2` fecha excelencia em integracoes, seguranca e governanca.
- nenhum item e declarado fechado sem evidencia executavel.

---

## P0 - Reancoragem formal da excelencia

| ID | Item | Impacto | Status | Criterio de aceite |
|---|---|---|---|---|
| EXC-001 | Produzir checklist formal item a item dos requisitos vivos | Alto | Fechado | `0339-CHECKLIST-FORMAL-REQUISITOS-VIVOS-2026-04-22.md` publicado |
| EXC-002 | Publicar scorecard oficial `baseline -> alvo -> evidencia` | Alto | Fechado | `0340-SCORECARD-E-GATE-RUMO-96-2026-04-22.md` publicado |
| EXC-003 | Fechar drift residual entre roadmap, backlog, tracker e auditoria | Alto | Fechado | linha mestra reancorada em `README`, `0337`, `0338`, `0339`, `0340`, `101`, `201` e `0100` |
| EXC-004 | Formalizar gate de subida de score para `90+` | Alto | Fechado | gate formal publicado em `0340-SCORECARD-E-GATE-RUMO-96-2026-04-22.md` |

## P1 - Seguranca, identidade e tenant premium

| ID | Item | Impacto | Status | Criterio de aceite |
|---|---|---|---|---|
| SEC-001 | Endurecer expiracao, revogacao e recuperacao de sessao | Alto | Fechado | `GET /auth/sessions`, `POST /auth/logout-all-others` e `POST /auth/sessions/:sessionId/revoke` validados |
| SEC-002 | Revalidar MFA, OIDC e WebAuthn em cenarios compostos | Alto | Fechado | suites compostas de auth publicadas e verdes |
| SEC-003 | Endurecer ABAC em cenarios tenant/branch/sector compostos | Alto | Fechado | branch + sector + account isolation com prova automatizada |
| SEC-004 | Formalizar rotacao auditavel de segredos criticos | Alto | Fechado | `buildSecretRotationStatusReport` e rotacao compativel validados |
| SEC-005 | Fortalecer trilha de auditoria de actor, tenant e correlation id | Medio | Fechado | runtime, auth e AI/ML com identidade coerente ponta a ponta |

## P2 - Operacao premium e release excellence

| ID | Item | Impacto | Status | Criterio de aceite |
|---|---|---|---|---|
| OPS-101 | Reexecutar restore drill e publicar evidencia no tracker | Alto | Fechado | drill repetivel com saida documentada |
| OPS-102 | Revalidar cutover readiness com checklist operacional expandida | Alto | Fechado | evidencias por ambiente e servico |
| OPS-103 | Amarrar alertas, dashboards e SLOs por capacidade critica | Alto | Fechado | observabilidade orientada a objetivos reais |
| OPS-104 | Reduzir flakiness residual de smoke/integracao | Alto | Fechado | duas rodadas consecutivas sem falha intermitente |
| OPS-105 | Publicar release checklist por ambiente | Medio | Fechado | dev/staging/prod com entradas objetivas e rastreaveis |

## P3 - Integracoes e administrativo premium

| ID | Item | Impacto | Status | Criterio de aceite |
|---|---|---|---|---|
| INT-101 | Fechar suites ponta a ponta de email e SMS | Medio | Fechado | provider simulado, retry e auditoria validados |
| INT-102 | Fechar suites ponta a ponta de WhatsApp vendor-assisted | Medio | Fechado | envio, falha, retry, inbound e relatorio operacional validados |
| INT-103 | Fechar suites ponta a ponta de cartoes e conciliacao | Alto | Fechado | intent, settle, falha e reconciliacao auditados |
| INT-104 | Revalidar Google Calendar e equipment bridge com relatorio operacional | Medio | Fechado | sync, erro e idempotencia cobertos |
| FIN-101 | Elevar reconciliacao, aging e fechamento a nivel premium | Alto | Fechado | dashboards e persistencia sem drift prioritario |
| FIS-101 | Revalidar ciclo fiscal prioritario em lote premium | Alto | Fechado | emissao, cancelamento, preview e layouts auditados |

## P4 - AI/ML governado

| ID | Item | Impacto | Status | Criterio de aceite |
|---|---|---|---|---|
| ML-101 | Medir adocao e override de smart scheduling | Medio | Fechado | `GET /ml/report` publica adocao e override |
| ML-102 | Medir acuracia e utilidade de forecasting | Medio | Fechado | `GET /ml/report` publica previsto vs observado |
| ML-103 | Medir precision operacional de anomaly detection | Medio | Fechado | `POST /ml/anomalies/reviews` fecha confirmacao clinica rastreavel |
| ML-104 | Governar rollout de AI/ML por feature flags e owner claro | Medio | Fechado | catalogo de flags ML entrou no runtime oficial |
| ML-105 | Publicar relatorio de valor operacional de AI/ML | Baixo | Fechado | valor operacional consolidado em `0345` e `0346` |

## P5 - Auditoria final rumo a 96

| ID | Item | Impacto | Status | Criterio de aceite |
|---|---|---|---|---|
| AUD-101 | Reexecutar auditoria formal completa | Alto | Fechado | `0346-RELATORIO-AUDITORIA-FINAL-96-2026-04-22.md` publicado |
| AUD-102 | Provar ausencia de gap critico aberto | Alto | Fechado | checklist sem item critico aberto em `0339` |
| AUD-103 | Publicar score final sustentado por evidencias | Alto | Fechado | score oficial `96/100` publicado e rastreavel |

---

## Leitura de prioridade

Ordem correta de execucao:

1. `EXC-*` fechado;
2. `SEC-*` e `OPS-*` fechados;
3. `INT-*`, `FIN-*` e `FIS-*` fechados;
4. `ML-*` fechado com governanca e metrica operacional;
5. `AUD-*` fechado com score final publicado.
