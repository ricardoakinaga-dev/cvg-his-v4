# 0335 - RELATORIO DE AUDITORIA EXTREMA DO WORKSPACE - 2026-04-19

**Taxonomia:** `CANONICO`
**Papel no sistema documental:** baseline auditado do workspace e ancora de revalidacao contra o codigo executavel
**Ler em conjunto com:** `README.md`, `0334-PLANO-EXECUTIVO-REALINHAMENTO-ENTERPRISE-2026-04-17.md`, `100-ROADMAP-VISAO-GERAL.md`, `200-BACKLOG-MASTER.md`, `0100-EXECUTION-TRACKER.md`

**Data UTC:** `2026-04-19`
**Objetivo:** congelar uma leitura executavel e documental defensavel do programa antes de reancorar a pasta `docs/Enterprise`
**Base canonica:** `0334-PLANO-EXECUTIVO-REALINHAMENTO-ENTERPRISE-2026-04-17.md`, `100-ROADMAP-VISAO-GERAL.md`, `200-BACKLOG-MASTER.md`, `0100-EXECUTION-TRACKER.md`

---

> **ATUALIZACAO DE CONTEXTO (22/04/2026):** este documento permanece como baseline historico da leitura de `19/04/2026`, mas partes dele foram superadas pela remediacao registrada em `0336-RELATORIO-AUDITORIA-EXECUTAVEL-2026-04-22.md`. Em especial: `apps/web` nao faz mais parte do runtime oficial ativo, o frontend canonico e `apps/spa`, e o trilho canonico de prontuario foi endurecido com `0018`, `0019` e `0020`.

## 1. Resumo executivo

Leitura consolidada do estado atual:

- **produto construido:** `90/100`
- **prontidao de release do workspace hoje:** `84/100`
- **qualidade da documentacao enterprise como sistema de governanca:** `84/100`

Conclusao objetiva:

- a base tecnica do programa esta mais madura do que parte do historico documental ainda sugere;
- a linha mestra atual existe e e valida, mas continua cercada por artefatos antigos que ainda se apresentam como vivos;
- o maior risco imediato deixou de ser falta de implementacao bruta e passou a ser **endurecimento residual de runtime + disciplina de docs vivas + fechamento seletivo das ultimas suites largas**;
- a matriz ampliada deixou de estar estruturalmente quebrada, e o endurecimento residual do reminder de WhatsApp foi fechado com alinhamento explicito entre o contrato auditavel do runtime e a expectativa da suite ampla de `apps/api`.

---

## 2. Evidencia executavel desta rodada

### Gates executados em 2026-04-19

| Gate | Resultado | Observacao |
|---|---|---|
| `pnpm typecheck` | `PASS` | monorepo validado sem erro |
| `pnpm build` | `PASS` | API, SPA, worker e pacotes construidos; PWA gerada |
| `pnpm validate:openapi` | `PASS` | `175 paths`, `33 tags`, `178 schemas` |
| `pnpm test:coverage` | `PASS` | `569/569` testes; `89.59%` statements/lines, `78.16%` branches |
| `pnpm test:critical:bootstrap` | `PASS` | `169/169` testes criticos em PostgreSQL efemero |
| `pnpm validate:helm` | `PASS` | validacao Helm OK para `dev`, `staging` e `prod` |

### Suite ampliada fora do gate minimo

| Comando | Resultado | Observacao |
|---|---|---|
| `pnpm test:integration` | `PASS` | regressões de `rate-limiting`, `webhooks`, `prescriptions` e migrations fechadas na trilha atual |
| `pnpm test:e2e` | `PASS` | fluxo critico executado em `11/11` com bootstrap Playwright auto-suficiente |
| `pnpm --filter @cvg-his-v2/api typecheck` | `PASS` | lote `ML-001` validado com dependencias rebuildadas |
| `pnpm exec tsx --test apps/api/src/routes/scheduling-routes.test.ts` | `PASS` | rota de recomendacao smart scheduling validada (`5/5`) |
| `pnpm --filter @cvg-his-v2/spa exec vitest run src/pages/appointments/__tests__/AppointmentFormPage.test.ts` | `PASS` | fluxo de formulario da agenda revalidado (`3/3`) |
| `pnpm --filter @cvg-his-v2/api test` | `PASS` | suite ampla revalidada e encerrada em `125/125`, incluindo o lote premium de integracoes e ML aplicado |

### Achado operacional desta rodada

- A primeira execucao de `pnpm test:coverage` caiu no flush final do reporter por ausencia de `coverage/.tmp`.
- O problema nao era regressao de produto; o rerun com `coverage/.tmp` criado confirmou o gate verde.
- Isso deve ser tratado como gap de harness/operacao local, nao como quebra funcional do core.
- O endurecimento residual do runtime de reminders WhatsApp foi fechado na propria rodada: o evento `whatsapp_reminder_failed` preserva `provider=360dialog` no sumario operacional quando o vendor falha, e a suite ampla foi reancorada a esse contrato real.
- `ML-001` foi promovido a feature real nesta data com API, OpenAPI, telemetria Prometheus e UX conectadas ao fluxo rapido da agenda.
- O lote premium tambem fechou `INT-003`, `INT-004`, `INT-005`, `ML-002`, `ML-003` e `ML-004`, adicionando surface publica para SMS, Google Calendar, equipment bridge laboratorial, OCR fiscal/documental, demand forecasting e anomaly detection laboratorial.

---

## 3. Auditoria documental

### Linha mestra canonica atual

Usar como fonte de verdade viva:

1. `0334-PLANO-EXECUTIVO-REALINHAMENTO-ENTERPRISE-2026-04-17.md`
2. `100-ROADMAP-VISAO-GERAL.md`
3. `200-BACKLOG-MASTER.md`
4. `0100-EXECUTION-TRACKER.md`

Documento estrutural de apoio:

- `001-BLUEPRINT-ENTERPRISE.md`

Documentos de apoio tematico:

- `0195-POLITICA-ROTACAO-DE-SEGREDOS-E-CREDENCIAIS.md`
- `0322-PLANO-ACAO-WHATSAPP-INTEGRATION-2026-04-14.md`
- `0323-PLANO-PLATAFORMA-LONGA-KUBERNETES-HELM-2026-04-14.md`
- `0325-CATALOGO-FEATURE-FLAGS-OPERACIONAL.md`
- relatorios de execucao especificos `0210`-`0212` e `0310`-`0333`

### Taxonomia ativa da pasta

| Classe | Uso |
|---|---|
| `CANONICO` | documento vivo de decisao, roadmap, backlog ou tracker |
| `APOIO` | referencia estrutural, risco, capacidade ou governanca que sustenta a linha mestra |
| `OPERACIONAL` | plano tematico ou catalogo usado para execucao direta de uma frente ativa |

### Principais conflitos internos encontrados

- `0100-EXECUTION-TRACKER.md` ainda se apresenta como `source of truth`, mas ele proprio manda usar `0334`, `100` e `200` como linha mestra atual.
- `0334` congelou a OpenAPI em `157/32/146`, mas o workspace auditado em `2026-04-19` esta em `164/32/159`.
- `000`, `0192`, `0193`, `0194`, `0300`-`0304`, `0326`-`0329` e os blocos por ondas `103/104/105`, `203/204/205`, `313/314/315` competiam com a linha mestra atual antes do arquivamento em `docs/docs2/archive-enterprise-2026-04-19-pruned/`.
- Ha IDs duplicados ou ambiguos na pasta (`0205`, `0303`, `0315`, `0316`, `0319`, `0320`, `0322`), o que dificulta citacao e manutencao.

---

## 4. Auditoria tecnica do codigo

### Estado confirmado

- monorepo amplo e modular, com `apps/api`, `apps/spa`, `apps/worker` e `38` modulos em `packages/modules`; a referencia a `apps/web` nesta auditoria deve ser lida como fotografia historica do workspace em `19/04/2026`
- OpenAPI viva e maior do que parte das docs atuais
- tenancy/RLS reais, com migrations, wrappers e suites dedicadas
- MFA, WebAuthn, OIDC, ABAC, SOC2 e scans materializados no codigo
- observabilidade real com Prometheus, OTel, SLOs, dashboards e runbooks
- Helm multiambiente, backup/restore/cutover e governance de feature flags presentes
- AI/ML agora com superficie operacional real alem da fundacao: smart scheduling, OCR fiscal/documental, forecasting e anomaly detection expostos em API, com consumo real da SPA em agenda e laboratorio

### Gaps tecnicos mais relevantes

1. Na data desta auditoria, `apps/web` ainda convivia com a SPA nova, mantendo superficie duplicada e migracao incompleta. Esse ponto foi fechado na trilha posterior de remediacao e nao representa mais o runtime oficial atual.
2. Hotspots ainda grandes em `apps/api/src/server.ts`, `apps/api/src/runtime.ts` e `apps/spa/src/router/routes.ts`.
3. O provider de segredos e pratico e funcional, mas a garantia enterprise final ainda depende de disciplina de ambiente quando Vault nao e o backend efetivo.
4. A trilha de cobertura esta forte, mas o harness ainda tem arestas operacionais, como o diretorio `coverage/.tmp`.
5. O recorte `INT-005` foi fechado via equipment bridge laboratorial, nao via stack HL7/FHIR completa; se houver sponsor regulatorio futuro, isso deve abrir um novo item e nao sobrescrever o fechamento atual.
6. O valor atual de ML ja saiu do modo fundacional, mas a qualidade dos thresholds e o tuning dos dados ainda exigem calibracao operacional continua.

---

## 5. Score por eixo

| Eixo | Nota | Leitura |
|---|---:|---|
| Documentacao Enterprise | 68 | linha mestra existe, mas o excesso de documentos vivos gera ambiguidade |
| Arquitetura modular e schema | 92 | base forte e ampla |
| API / OpenAPI | 93 | contrato vivo, grande e validado |
| Frontend SPA / Shell | 89 | SPA madura, com legado ainda coexistindo |
| Design System / acessibilidade | 86 | pacote real, testes e stories presentes |
| Agenda / fila / internacao | 84 | dominio amplo e integrado |
| Clinico / prontuario / prescricoes | 86 | superficie real e consistente |
| Laboratorio / diagnostics | 87 | bridge, catalogo, detalhe e resultados coerentes |
| Financeiro / billing / cash / PIX | 86 | trilha profunda e com boa prova automatizada |
| Fiscal / ERP administrativo | 78 | ciclo prioritario fechado, maturidade enterprise ainda parcial |
| Multi-tenancy / tenant context / RLS | 82 | fundacao real e validada |
| Seguranca / compliance | 90 | MFA, WebAuthn, OIDC, ABAC, SOC2 e scans reais |
| Event bus / webhooks / API keys | 86 | base assincrona e integracoes internas operaveis |
| Feature flags / Redis / runtime distribuido | 83 | base operacional boa, rollout ainda amadurecendo |
| WhatsApp / CRM / notificacoes | 82 | runtime e UI reais, operacao por tenant ainda merece aprofundamento |
| Observabilidade / operacao | 88 | stack e runbooks bem acima do baseline historico |
| AI/ML | 78 | superficie executavel real em agenda, fiscal/documental e laboratorio |
| Plataforma / Helm / Vault / backup | 85 | trilha operacional forte com evidencias reais |
| QA / CI / gates | 90 | gates centrais verdes e cobertura alta |
| Prontidao de release hoje | 84 | gates centrais, suite ampla de API, integracao e E2E critico revalidados no lote atual |

---

## 6. Decisao executiva

O projeto ja pode ser documentado a partir do runtime atual sem depender de suposicoes antigas.

O trabalho imediato em `docs/Enterprise` deve seguir esta ordem:

1. manter `README`, `0334`, `0335`, `100`, `200` e `0100` como nucleo canonico;
2. classificar `001`, `301` e `302` como `APOIO`;
3. classificar `0195`, `0322`, `0323` e `0325` como `OPERACIONAL`;
4. impedir que documentos antigos continuem se vendendo como fonte de verdade viva, mantendo o arquivo morto em `docs/docs2/archive-enterprise-2026-04-19-pruned/`.

Sem isso, o proximo drift nao vira de falta de codigo; vira de governanca documental quebrada.
