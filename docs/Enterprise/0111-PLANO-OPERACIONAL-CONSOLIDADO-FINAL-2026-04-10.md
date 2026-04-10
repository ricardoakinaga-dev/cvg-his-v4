# PLANO OPERACIONAL CONSOLIDADO FINAL — CVG-HIS-V2

**Data:** 10/04/2026
**Versao:** 1.1
**Status:** FINAL — REVALIDADO EM CAMPO
**Base:** [`1011-RELATORIO-AUDITORIA-CODEX-2026-04-09.md`](./1011-RELATORIO-AUDITORIA-CODEX-2026-04-09.md) + [`1012-PLANO-REMEDIACAO-PRIORIZADO-2026-04-09.md`](./1012-PLANO-REMEDIACAO-PRIORIZADO-2026-04-09.md) + [`1010-AUTH-HARDENING.md`](./1010-AUTH-HARDENING.md) + [`0103-GAP-ANALYSIS-DOCUMENTACAO-VS-REALIDADE-10042026.md`](./0103-GAP-ANALYSIS-DOCUMENTACAO-VS-REALIDADE-10042026.md) + [`0110-RELATORIO-FINAL-TASK-DOC-10042026.md`](./0110-RELATORIO-FINAL-TASK-DOC-10042026.md)

---

## 1. Resumo Executivo

O CVG-HIS-V2 apresenta uma lacuna critica entre a documentacao executiva e o estado executavel real do projeto. A ultima auditoria tecnica independente (Codex 1011) estimou o score global real em **70-75/100**, enquanto a documentacao declarava **87-88/100** — uma superestimacao de 12 a 17 pontos.

O programa necessita de um plano de consolidacao em 10 etapas que priorize: (1) restaurar a verdade executavel do workspace — typecheck, build e tests voltando a ser sinais confiaveis; (2) fechar as lacunas de isolamento multi-tenant e contratos publicos; (3) corrigir as falhas reais de dominio nos testes criticos; e (4) endurecer a plataforma para patamares enterprise sustentaveis.

Este documento unifica todas as frentes ja trabalhadas, consolida o backlog completo de remediacao e define a sequencia exata de execucao com criterios de aceite por etapa.

**Score real atual (Auditor Codex 1011):** 70-75/100
**Score documentado anteriormente:** 87-88/100
**Gap:** -12 a -17 pontos (superestimacao)

**Estado de Build/Testes verificado em 10/04/2026:**

| Comando              | Status Real | Evidencia                                              |
| -------------------- | ----------- | ------------------------------------------------------ |
| `pnpm typecheck`     | **PASS**    | 49 projetos validando sem erro                         |
| `pnpm build`         | **PASS**    | 49 projetos constroem; SPA gera PWA com 123 precaches |
| `pnpm test` (API)    | **PARTIAL** | nao revalidado integralmente nesta rodada             |
| `pnpm test:critical` | **FAIL**    | 158 falhas, 11 passando; 157 DB auth + 1 funcional    |
| `pnpm test:coverage` | **PASS**    | threshold 5% segue baixo para patamar enterprise      |

---

## 2. Fonte da Verdade Utilizada

### Documentos de Auditoria e Planejamento

| Documento                                                                                                              | Papel                              | Confiabilidade                         |
| ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | -------------------------------------- |
| [`1011-RELATORIO-AUDITORIA-CODEX-2026-04-09.md`](./1011-RELATORIO-AUDITORIA-CODEX-2026-04-09.md)                       | Auditoria tecnica independente     | **Maxima**                             |
| [`1012-PLANO-REMEDIACAO-PRIORIZADO-2026-04-09.md`](./1012-PLANO-REMEDIACAO-PRIORIZADO-2026-04-09.md)                   | Plano de remediacao por severidade | **Maxima**                             |
| [`1010-AUTH-HARDENING.md`](./1010-AUTH-HARDENING.md)                                                                   | Documentacao auth/hardening        | **Alta** (com ressalvas — ver secao 5) |
| [`0103-GAP-ANALYSIS-DOCUMENTACAO-VS-REALIDADE-10042026.md`](./0103-GAP-ANALYSIS-DOCUMENTACAO-VS-REALIDADE-10042026.md) | Analise de gaps documentos vs real | **Maxima**                             |
| [`0110-RELATORIO-FINAL-TASK-DOC-10042026.md`](./0110-RELATORIO-FINAL-TASK-DOC-10042026.md)                             | Relatorio final task documentacao  | **Maxima**                             |

### Evidencia de Codigo Fonte Consultada

| Arquivo                                                                         | Evidencia relevante                                             |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `apps/spa/src/services/api.ts`                                                  | Importa `@cvg-his-v2/shared-auth-sdk`; ainda nao envia `x-account-id` |
| `apps/spa/src/stores/auth.ts`                                                   | Usa `AUTH_STORAGE_KEYS` do SDK compartilhado                         |
| `packages/shared/auth-sdk/src/index.ts`                                         | Storage keys unificadas em formato `cvg-his-v2:*`                    |
| `packages/design-system/tsconfig.json`                                          | Build e typecheck agora passam                                         |
| `apps/api/src/server.ts:224-247`                                                | `accountId` extraido do JWT quando ha Authorization                    |
| `apps/api/src/server.ts:276-305`                                                | `/openapi.json` e `/openapi.yaml` servem a spec real                   |
| `packages/modules/patients/src/repositories/database-patient.repository.ts`     | Hardcode de `accountId` removido do fluxo de owner-patient links       |
| `packages/modules/users/src/index.ts:36,53`                                     | Seeds com credenciais faceis de adivinhar                       |
| `packages/tenant-context/src/middleware.ts:8`                                   | Middleware exige `x-account-id` explicitamente                  |
| `packages/modules/ml/src/feature-store.service.ts`                              | Trilha ML recompilando no estado atual                           |
| `vitest.config.ts`                                                              | Thresholds: `lines: 5, statements: 5` (nao 15%)                 |
| `.github/workflows/ci.yml`                                                      | Workflows existem e estruturados; execucao real nao validada    |
| `package.json`                                                                  | Scripts: `test:coverage`, `test:critical`, `typecheck`, `build` |
| `docs/INSTALL-REPORT-2026-04-10.md`                                             | Install parcial: journal Drizzle desincronizado e `audit_events.metadata` ausente |

---

## 3. Estado Real Atual do Projeto

### 3.1 Build e Typecheck

**`pnpm typecheck` — PASS**

- workspace completo recompila sem erro
- correcoes anteriores em SPA, design-system e ML sustentam o sinal atual

**`pnpm build` — PASS**

- workspace completo constroi sem erro
- SPA gera build PWA com service worker e 123 itens em precache

### 3.2 Testes

**`pnpm test` (API — node --test) — FAIL**

- `ERR_MODULE_NOT_FOUND` para `@cvg-his-v2/shared-utils`, `@cvg-his-v2/shared-errors`, `@cvg-his-v2/shared-auth-sdk`
- Imports de packages internos via alias nao resolvem no node --test runner

**`pnpm test:critical` — FAIL**

- 158 falhas, 11 passando
- 157 falhas estao relacionadas a autenticacao do PostgreSQL no ambiente de testes
- 1 falha funcional real esta claramente exposta: `ICT-010` no reflexo de billing (`estimate.encounterId` vindo `undefined`)

**`pnpm test:coverage` — PASS**

- Exit code 0
- Cobertura real: 5.84% lines (threshold: 5%)
- Threshold documentado incorretamente como 15% em docs CI

### 3.3 Multi-Tenancy

| Componente                | Status Real                               |
| ------------------------- | ----------------------------------------- |
| API HTTP boundary         | JWT ja resolve `accountId`; fallback `pending` ainda existe para requests sem principal |
| SPA request               | **NAO envia** `x-account-id` header       |
| Tenant context middleware | Exige `x-account-id` explicitamente       |
| Patient repository        | Hardcode removido do fluxo principal      |
| Owner-patient links       | Ainda requer teste dedicado de isolamento |

### 3.4 OpenAPI Runtime

- `/openapi.json` e `/openapi.yaml` sao servidos a partir do arquivo real quando disponivel
- ainda falta um teste dedicado garantindo `paths` nao-vazios no runtime
- contrato API-first melhorou, mas ainda nao esta totalmente guardado por CI

### 3.5 Auth / Security

| Item                            | Status Real                                                |
| ------------------------------- | ---------------------------------------------------------- |
| Seed credentials                | Presentes em codigo, com isolamento por ambiente            |
| Seed protection em prod/staging | Implementada (comparePassword recusa em prod)               |
| Storage key unification         | Resolvida no codigo; documentacao anterior precisa baixa    |
| Brute force protection          | Implementada em `packages/modules/auth/src/brute-force.ts` |
| JWT payload consumido pela SPA  | Nao auditado nesta iteracao                                |

---

## 4. Estado Alvo Enterprise

O projeto alcancara o estado **Auditavel de Verdade** quando, simultaneamente:

1. `pnpm typecheck` = **PASS**
2. `pnpm build` = **PASS**
3. `pnpm test:critical` = **PASS** em ambiente reproduzivel
4. `pnpm test` (API) = **PASS**
5. OpenAPI runtime = **spec real** (paths nao-vazios)
6. Tenant/account isolation = **fechado ponta a ponta** (nenhum request opera com accountId='pending', nenhum hardcode em repositorios)
7. Documentacao executiva = **coerente com evidencia real**
8. Coverage lines >= **10%** (elevacao gradual apartir do baseline 5.84%)
9. SPA envia `x-account-id` em requests autenticados

**Score target:** 80-85/100 (recuperacao de credibilidade, nao inflado)

---

## 5. Divergencias Entre Realidade e Alvo

### 5.1 Divergencias Criticas (P0)

| ID   | Divergencia                                               | Evidencia                                        | Severidade |
| ---- | --------------------------------------------------------- | ------------------------------------------------ | ---------- |
| D-01 | Workspace ainda nao esta coberto por teste operacional de install limpo | install parcial mostra journal/migration drift          | Critica    |
| D-02 | `packages/db` journal Drizzle esta desincronizado          | `docs/INSTALL-REPORT-2026-04-10.md`                     | Critica    |
| D-03 | Fallback `accountId: 'pending'` ainda existe sem principal | `apps/api/src/server.ts`                               | Critica    |
| D-04 | SPA nao envia `x-account-id`                              | `apps/spa/src/services/api.ts:40`                | Critica    |
| D-05 | `audit_events.metadata` ausente no schema operacional     | install report + logs da API                           | Critica    |
| D-06 | OpenAPI runtime ainda sem teste de protecao dedicado      | ausencia de CI gate especifico                         | Alta       |
| D-07 | `pnpm test` total ainda nao foi revalidado integralmente  | evidencia parcial                                      | Alta       |
| D-08 | `test:critical` segue quebrado                            | `pnpm test:critical` 158 falhas                        | Critica    |

### 5.2 Divergencias de Integridade de Dominio (P1)

| ID   | Divergencia                                  | Evidencia                                   | Severidade |
| ---- | -------------------------------------------- | ------------------------------------------- | ---------- |
| D-09 | Ambiente DB de testes com auth incorreta                 | `password authentication failed for user "postgres"` | Critica |
| D-10 | `ICT-010` billing continua falhando                     | `estimate.encounterId` = `undefined`                | Alta    |
| D-11 | Journal Drizzle nao registra migrations 0001-0011       | `_journal.json` incompleto                           | Alta    |
| D-12 | Instalação exige aplicacao manual de `0011_outbox_events` | install report                                      | Alta    |
| D-13 | Seed credentials seguem presentes no codigo             | `packages/modules/users/src/index.ts:36,53`        | Alta    |

### 5.3 Verificacao Critica — Storage Keys (RESOLVIDA NO CODIGO)

**Estado atual verificado:**

- `apps/spa/src/services/api.ts` usa `AUTH_STORAGE_KEYS.accessToken`
- `apps/spa/src/stores/auth.ts` usa `AUTH_STORAGE_KEYS` do SDK
- `packages/shared/auth-sdk/src/index.ts` define:
  - `cvg-his-v2:access_token`
  - `cvg-his-v2:refresh_token`
  - `cvg-his-v2:mfa_required`
  - `cvg-his-v2:mfa_setup_required`

**Conclusao:** o drift historico entre SPA e SDK foi resolvido no codigo. O risco remanescente passou a ser apenas documental: documentos anteriores que ainda descrevem o estado antigo precisam ser tratados como obsoletos.

---

## 6. Consolidacao das Frentes Ja Trabalhadas

### 6.1 TASK 1 — Recalibracao Documental (CONCLUIDA ✅)

**11 documentos atualizados** para refletir o estado real:

| Documento                                  | Acao                            | Mudanca Principal                      |
| ------------------------------------------ | ------------------------------- | -------------------------------------- |
| `0100-EXECUTION-TRACKER.md`                | Recalibrado                     | Score 87→70-75, fases marcar REVALIDAR |
| `300-SCORECARD-PROGRESSO.md`               | Recalibrado                     | Scores marcados SUPERESTIMADO          |
| `9998-STATUS-BUILD-08042026.md`            | Recalibrado                     | Status finals FAIL/FAIL/FAIL/PASS      |
| `PLANO-EXECUTIVO-CONSTRUCAO-CVG-HIS-V2.md` | Recalibrado                     | Score 88→70-75                         |
| `1000-MATRIZ-ADERENCIA-ENTERPRISE.md`      | Recalibrado                     | Multi-tenancy 88→55, OpenAPI 72→40     |
| `1020-CI-GATES.md`                         | Corrigido thresholds            | 15%→5% lines, 15%→5% statements        |
| `1021-CI-PIPELINE.md`                      | Corrigido thresholds            | 15%→5% lines, 15%→5% statements        |
| `1090-TEST-INVENTORY.md`                   | Nota de recalibracao adicionada | Status EM REVALIDACAO                  |
| `998-RELATORIO-EXECUTIVO-1-PAGINA.md`      | Marcado OBSOLETO                | Baseado em scores desatualizados       |
| `999-RELATORIO-CONSOLIDADO-ENTERPRISE.md`  | Marcado OBSOLETO                | Score 81 superestimado                 |

**Documentos criados:**

| Documento                                                 | Descricao                                  |
| --------------------------------------------------------- | ------------------------------------------ |
| `0103-GAP-ANALYSIS-DOCUMENTACAO-VS-REALIDADE-10042026.md` | Analise completa de gaps docs vs realidade |
| `0110-RELATORIO-FINAL-TASK-DOC-10042026.md`               | Relatorio final da task de documentacao    |

### 6.2 Auditoria Codex 1011 (JA CONCLUIDA ✅)

- Score global estimado: **70-75/100**
- 10 secoes de achados tecnicos detalhados
- Identificou 161 falhas em test:critical, 8 passando
- Levantou issues de multi-tenancy, OpenAPI, storage keys
- Base para o plano de remediacao 1012

### 6.3 Plano de Remediacao 1012 (JA DEFINIDO ✅)

- 10 etapas de remediacao P0-P3
- Matriz severidade x esforço definida
- Sprint groupings recomendados
- Critérios de saida por etapa definidos

### 6.4 Auth Hardening 1010 (JA DOCUMENTADO ✅ — COM RESSALVAS)

- Brute force protection implementada
- Seed credentials isolation implementada
- Storage key unification: **UNCONFIRMED** (ver D-12)

---

## 7. Backlog Unico Consolidado

### 7.1 Backlog P0 — Bloqueantes de Confianca

| ID       | Nome                                                  | Descricao                                                                         | Severidade | Esforco     | Dependencias                 | Criterio de Aceite                                                           | Dono Sugerido |
| -------- | ----------------------------------------------------- | --------------------------------------------------------------------------------- | ---------- | ----------- | ---------------------------- | ---------------------------------------------------------------------------- | ------------- |
| BK-P0-01 | Restaurar typecheck/build — module-ml                 | Corrigir imports ML, ajustar createVector values/interface                        | Critica    | Medio       | Nenhuma                      | `pnpm typecheck` PASS e `pnpm build` PASS                                    | Backend/ML    |
| BK-P0-02 | Restaurar typecheck/build — SPA alias                 | Adicionar alias `@cvg-his-v2/shared-auth-sdk` no tsconfig.json da SPA             | Critica    | Baixo       | Nenhuma                      | vue-tsc resolve sem erros                                                    | Frontend      |
| BK-P0-03 | Restaurar typecheck/build — design-system @types/node | Adicionar `@types/node` como devDependency                                        | Critica    | Baixo       | Nenhuma                      | `pnpm typecheck` PASS no design-system                                       | Frontend      |
| BK-P0-04 | Fechar multi-tenancy na borda HTTP                    | Substituir `accountId: 'pending'` por resolucao real do principal/headers         | Critica    | Medio-Alto  | BK-P0-02                     | Nenhum request opera com accountId='pending'; traces mostram account correto | Backend       |
| BK-P0-05 | SPA enviar x-account-id                               | Adicionar header `x-account-id` em requests autenticados                          | Critica    | Baixo       | BK-P0-02, BK-P0-04           | Tenant-context middleware recebe account real em todos os requests           | Frontend      |
| BK-P0-06 | Remover accountId hardcoded em persistencia           | Corrigir database-patient.repository.ts para accountId real; auditar outros repos | Critica    | Medio       | BK-P0-04                     | Nenhum accountId hardcoded em repositorios; teste de isolamento passa        | Backend       |
| BK-P0-07 | OpenAPI runtime servir spec real                      | Fazer `/openapi.json` derivar de spec real; corrigir server.ts                    | Critica    | Baixo-Medio | Nenhuma                      | `/openapi.json` contem `paths` nao-vazios; teste dedicado passa              | Backend       |
| BK-P0-08 | Estabilizacao de testes criticos — setup              | Padronizar porta/credenciais DB; global-setup falhar cedo                         | Critica    | Medio       | Nenhuma                      | `pnpm test:critical` falha apenas por defeito real, nao setup                | QA/Infra      |
| BK-P0-09 | Corrigir API tests ERR_MODULE_NOT_FOUND               | Resolver imports de packages internos no node --test runner                       | Critica    | Medio       | BK-P0-01, BK-P0-02, BK-P0-03 | `pnpm test` (API) PASS                                                       | Backend       |

### 7.2 Backlog P1 — Bloqueantes de Integridade de Dominio

| ID       | Nome                                               | Descricao                                                           | Severidade | Esforco     | Dependencias | Criterio de Aceite                                              | Dono Sugerido    |
| -------- | -------------------------------------------------- | ------------------------------------------------------------------- | ---------- | ----------- | ------------ | --------------------------------------------------------------- | ---------------- |
| BK-P1-01 | Corrigir ICT-001 — assincronia UsersService.create | Respeitar promessas reais no servico e nos testes                   | Alta       | Medio       | BK-P0-09     | ICT-001 passa                                                   | Backend          |
| BK-P1-02 | Corrigir ICT-007 — mesma causa assincrona          | Revisar expectativa de listagem                                     | Alta       | Medio       | BK-P1-01     | ICT-007 passa                                                   | Backend          |
| BK-P1-03 | Corrigir ICT-008 — fluxo queue->encounter          | Ajustar fluxo ou regra de negocio                                   | Alta       | Medio       | BK-P1-01     | ICT-008 passa                                                   | Backend          |
| BK-P1-04 | Corrigir ICT-010 — billing/inventory IDs           | Revisar reflexo e IDs esperados                                     | Alta       | Medio       | BK-P1-01     | ICT-010 passa                                                   | Backend          |
| BK-P1-05 | Verificar e corrigir storage keys SPA vs SDK       | **VERIFICAR D-12**: SPA ainda usa dois-pontos vs SDK usa underscore | Alta       | Baixo-Medio | BK-P0-02     | Storage key IDENTICO entre SPA e SDK; teste de integracao passa | Frontend/Backend |
| BK-P1-06 | Consolidar camada de banco (database layer)        | Definir fonte unica; migrar secundarios; remover duplicidades       | Alta       | Alto        | BK-P0-09     | Uma unica fonte de verdade para schema e acesso; less drift     | Backend          |

### 7.3 Backlog P2 — Endurecimento Operacional

| ID       | Nome                                                     | Descricao                                                       | Severidade | Esforco    | Dependencias       | Criterio de Aceite                                                  | Dono Sugerido |
| -------- | -------------------------------------------------------- | --------------------------------------------------------------- | ---------- | ---------- | ------------------ | ------------------------------------------------------------------- | ------------- |
| BK-P2-01 | Elevar coverage threshold gradualmente                   | 5% → 7% → 10% lines em CI gates                                 | Media-Alta | Medio      | BK-P0-09           | Coverage lines >= 10%; CI falha se abaixo threshold                 | QA/Infra      |
| BK-P2-02 | Incluir SPA e worker em cobertura                        | coverage:include para spa e worker                              | Media-Alta | Medio-Alto | BK-P2-01           | Coverage报告显示 SPA + worker cobertos                              | Frontend      |
| BK-P2-03 | Adicionar gates para tenancy, openapi, runtime contracts | CI gate para multi-tenancy e OpenAPI                            | Media-Alta | Medio      | BK-P0-04, BK-P0-07 | Gate falha se isolamento ou OpenAPI quebrarem                       | QA/Infra      |
| BK-P2-04 | Reduzir fallback silencioso in-memory                    | Erros explicitos quando DB nao disponivel em contextos criticos | Media      | Medio      | BK-P0-08           | Contexto nao falha silenciosamente; erros sao faceis de identificar | Backend       |
| BK-P2-05 | Limpar artefatos dist/ geradoscommitados                 | Remover dist/ do versionamento onde nao essencial               | Media      | Baixo      | Nenhuma            | Repositorio sem dist/ desnecessarios                                | Infra         |
| BK-P2-06 | Event bus — evoluir de outbox local para integracao real | Dispatch real de eventos                                        | Media      | Medio-Alto | BK-P0-09           | Eventos chegam a handlers reais                                     | Backend       |

### 7.4 Backlog P3 — Excelencia e Escalabilidade

| ID       | Nome                                     | Descricao                                              | Severidade | Esforco    | Dependencias   | Criterio de Aceite                                     | Dono Sugerido |
| -------- | ---------------------------------------- | ------------------------------------------------------ | ---------- | ---------- | -------------- | ------------------------------------------------------ | ------------- |
| BK-P3-01 | Maturar ML module                        | Apos P0/P1                                             | Media      | Alto       | P0/P1 completo | module-ml completamente funcional e coberto por testes | ML/Backend    |
| BK-P3-02 | Ampliar observabilidade e runbooks       | Logs estruturados, metricas, alertas                   | Media      | Medio      | BK-P2-03       | Runbooks documentados e testados                       | Infra         |
| BK-P3-03 | Fortalecer LGPD e RLS com evidencias E2E | Testes ponta a ponta para privacy e row-level security | Media      | Medio-Alto | BK-P2-03       | Testes E2E passando com evidencias documentadas        | QA/Compliance |
| BK-P3-04 | Automacao release readiness              | Scripts de readiness, health checks, rollback          | Media      | Medio      | BK-P2-03       | Release checklist automatizado                         | Infra         |

---

## 8. Priorizacao por Severidade e Esforco

### 8.1 Matriz Consolidada

| ID       | Frente                                           | Severidade | Esforco     | Prioridade |
| -------- | ------------------------------------------------ | ---------- | ----------- | ---------- |
| BK-P0-01 | Restaurar typecheck/build — module-ml            | Critica    | Medio       | MAXIMA     |
| BK-P0-02 | Restaurar typecheck/build — SPA alias            | Critica    | Baixo       | MAXIMA     |
| BK-P0-03 | Restaurar typecheck/build — design-system @types | Critica    | Baixo       | MAXIMA     |
| BK-P0-04 | Fechar multi-tenancy na borda HTTP               | Critica    | Medio-Alto  | MAXIMA     |
| BK-P0-05 | SPA enviar x-account-id                          | Critica    | Baixo       | MAXIMA     |
| BK-P0-06 | Remover accountId hardcoded em persistencia      | Critica    | Medio       | MAXIMA     |
| BK-P0-07 | OpenAPI runtime servir spec real                 | Critica    | Baixo-Medio | MAXIMA     |
| BK-P0-08 | Estabilizacao setup de testes criticos           | Critica    | Medio       | MAXIMA     |
| BK-P0-09 | Corrigir API tests ERR_MODULE_NOT_FOUND          | Critica    | Medio       | MAXIMA     |
| BK-P1-01 | Corrigir ICT-001 — assincronia                   | Alta       | Medio       | ALTA       |
| BK-P1-02 | Corrigir ICT-007                                 | Alta       | Medio       | ALTA       |
| BK-P1-03 | Corrigir ICT-008                                 | Alta       | Medio       | ALTA       |
| BK-P1-04 | Corrigir ICT-010                                 | Alta       | Medio       | ALTA       |
| BK-P1-05 | Verificar/corrigir storage keys (D-12)           | Alta       | Baixo-Medio | ALTA       |
| BK-P1-06 | Consolidar camada de banco                       | Alta       | Alto        | ALTA       |
| BK-P2-01 | Elevar coverage thresholds                       | Media-Alta | Medio       | MEDIA      |
| BK-P2-02 | Incluir SPA/worker em cobertura                  | Media-Alta | Medio-Alto  | MEDIA      |
| BK-P2-03 | Gates tenancy/openapi/runtime                    | Media-Alta | Medio       | MEDIA      |
| BK-P2-04 | Reduzir fallback silencioso                      | Media      | Medio       | MEDIA      |
| BK-P2-05 | Limpar artefatos dist/commitados                 | Media      | Baixo       | MEDIA      |
| BK-P2-06 | Event bus real                                   | Media      | Medio-Alto  | MEDIA      |
| BK-P3-01 | Maturar ML module                                | Media      | Alto        | BAIXA      |
| BK-P3-02 | Observabilidade e runbooks                       | Media      | Medio       | BAIXA      |
| BK-P3-03 | LGPD e RLS E2E                                   | Media      | Medio-Alto  | BAIXA      |
| BK-P3-04 | Automacao release readiness                      | Media      | Medio       | BAIXA      |

### 8.2 Logica de Priorizacao

1. **Restaurar workspace signal** — typecheck, build e tests sendo verde sao pre-requisitos para qualquer confianca no estado do projeto
2. **Fechar isolamento arquitetural** — multi-tenancy nao funciona se borda HTTP injetar 'pending' e persistencia hardcodear account
3. **Corrigir contratos publicos e testes criticos** — OpenAPI vazio e 161 falhas escondem a realidade do produto
4. **Expandir cobertura gradualmente** — coverage de 5.84% para 10% em etapas, mantendoCI funcional
5. **Performance/chaos/excelencia** — ML, observabilidade, release automation depois que a base estiver slida

---

## 9. Ordem Exata de Execucao

### Fase 1 — Restaurar Verdade Executavel (Semana 1-2)

**Objetivo:** fazer `pnpm typecheck` e `pnpm build` voltarem a ser sinal confiavel

| Step | ID       | Tarefa                                               | Verificacao                                              |
| ---- | -------- | ---------------------------------------------------- | -------------------------------------------------------- |
| 1.1  | BK-P0-03 | Adicionar `@types/node` no `packages/design-system`  | `pnpm typecheck --filter @cvg-his-v2/design-system` PASS |
| 1.2  | BK-P0-01 | Corrigir imports ML e interface `createVector`       | `pnpm typecheck --filter @cvg-his-v2/module-ml` PASS     |
| 1.3  | BK-P0-02 | Adicionar alias `@cvg-his-v2/shared-auth-sdk` na SPA | `pnpm typecheck --filter @cvg-his-v2/spa` PASS           |
| 1.4  | BK-P0-09 | Corrigir ERR_MODULE_NOT_FOUND em API tests           | `pnpm test --filter @cvg-his-v2/api` PASS                |
| 1.5  | BK-P0-08 | Estabilizacao setup de testes criticos               | `pnpm test:critical` executa sem falha de ambiente       |

**Saida da Fase:** `pnpm typecheck` PASS, `pnpm build` PASS, `pnpm test` (API) PASS

### Fase 2 — Fechar Multi-Tenancy (Semana 2-3)

**Objetivo:** nenhum request opera com accountId='pending' ou sem isolamento

| Step | ID       | Tarefa                                                 | Verificacao                                    |
| ---- | -------- | ------------------------------------------------------ | ---------------------------------------------- |
| 2.1  | BK-P0-04 | Substituir accountId:'pending' por resolucao real      | Traces/logs mostram account real               |
| 2.2  | BK-P0-05 | SPA enviar x-account-id em requests                    | Tenant-contextmiddleware recebe header correto |
| 2.3  | BK-P0-06 | Remover accountId hardcoded em patient repository      | Teste de isolamento passa                      |
| 2.4  | BK-P1-06 | Auditar outros repositorios por hardcodes equivalentes | Nenhum hardcode encontrado                     |

**Saida da Fase:** multi-tenancy fechado na borda e persistencia; CI passa com contexto real

### Fase 3 — Corrigir OpenAPI e Contratos Publicos (Semana 3)

**Objetivo:** API-first verificavel

| Step | ID       | Tarefa                                   | Verificacao                             |
| ---- | -------- | ---------------------------------------- | --------------------------------------- |
| 3.1  | BK-P0-07 | Corrigir server.ts para servir spec real | `/openapi.json` contem paths nao-vazios |
| 3.2  | BK-P0-07 | Adicionar teste para /openapi.json       | Teste passa                             |

**Saida da Fase:** `/openapi.json` reflete spec real; API-first verificavel

### Fase 4 — Corrigir Falhas de Dominio Foundational (Semana 3-4)

**Objetivo:** suite foundational verde

| Step | ID       | Tarefa                         | Verificacao   |
| ---- | -------- | ------------------------------ | ------------- |
| 4.1  | BK-P1-01 | Corrigir ICT-001 — assincronia | ICT-001 passa |
| 4.2  | BK-P1-02 | Corrigir ICT-007               | ICT-007 passa |
| 4.3  | BK-P1-03 | Corrigir ICT-008               | ICT-008 passa |
| 4.4  | BK-P1-04 | Corrigir ICT-010               | ICT-010 passa |

**Saida da Fase:** `pnpm test:critical` PASS; contratos intermodulares coerentes

### Fase 5 — Verificar Auth/Hardening e Storage Keys (Semana 4)

**Objetivo:** garantir que D-12 foi verificado e corrigido se necessario

| Step | ID       | Tarefa                                                     | Verificacao                                         |
| ---- | -------- | ---------------------------------------------------------- | --------------------------------------------------- |
| 5.1  | BK-P1-05 | Verificar storage key via execucao de codigo real          | SPA e SDK usam MESMA key; teste de integracao passa |
| 5.2  | BK-P1-05 | Se falhar: corrigir SPA para usar AUTH_STORAGE_KEYS do SDK | Corrige e re-testa                                  |

**Saida da Fase:** Storage keys unificados e verificados

### Fase 6 — Endurecimento CI/Gates (Semana 5-6)

**Objetivo:** CI mede o que importa

| Step | ID       | Tarefa                            | Verificacao                     |
| ---- | -------- | --------------------------------- | ------------------------------- |
| 6.1  | BK-P2-01 | Elevar threshold coverage 5% → 7% | CI passa com coverage >= 7%     |
| 6.2  | BK-P2-02 | Incluir SPA e worker em cobertura | Coverage报告显示 novos modulos  |
| 6.3  | BK-P2-03 | Adicionar gates tenancy/openapi   | CI falha se contratos quebrarem |
| 6.4  | BK-P2-04 | Reduzir fallback silencioso       | Erros faceis de identificar     |
| 6.5  | BK-P2-05 | Limpar dist/ commitados           | Repositorio limpo               |

**Saida da Fase:** CI verde com thresholds elevados e gates novos

### Fase 7 — Event Bus e Consolidacao (Semana 6-7)

**Objetivo:** arquitetura de eventos matures

| Step | ID       | Tarefa                                               | Verificacao               |
| ---- | -------- | ---------------------------------------------------- | ------------------------- |
| 7.1  | BK-P2-06 | Evoluir event bus de outbox local para dispatch real | Eventos chegam a handlers |

**Saida da Fase:** Event bus operacional

### Fase 8 — Excelencia e Escalabilidade (Semana 8+)

| Step | ID       | Tarefa                      |
| ---- | -------- | --------------------------- |
| 8.1  | BK-P3-01 | Maturar ML module           |
| 8.2  | BK-P3-02 | Observabilidade e runbooks  |
| 8.3  | BK-P3-03 | LGPD e RLS E2E              |
| 8.4  | BK-P3-04 | Automacao release readiness |

---

## 10. Criterios de Aceite por Etapa

| Fase | Criterio de Aceite                                                                                           |
| ---- | ------------------------------------------------------------------------------------------------------------ |
| 1    | `pnpm typecheck` = PASS para todos os pacotes; `pnpm build` = PASS; `pnpm test` (API) = PASS                 |
| 2    | 100% dos requests autenticados incluem accountId real; nenhum hardcode em repositorios; CI com contexto real |
| 3    | `/openapi.json` com paths nao-vazios; teste dedicado passa                                                   |
| 4    | `pnpm test:critical` = PASS (100% verde); contratos intermodulares documentados                              |
| 5    | Storage keys SPA = SDK via teste de integracao; sem drift                                                    |
| 6    | CI passa com threshold 7% lines; gates tenancy/openapi ativos; coverage SPA+worker > 0%                      |
| 7    | Event bus processando eventos em handlers reais                                                              |
| 8    | ML funcional; runbooks documentados; LGPD E2E passando; release automation pronto                            |

---

## 11. Dependencias Entre Etapas

```
Fase 1 (typecheck/build) ──┬──► Fase 2 (multi-tenancy)
                           │         │
                           │         ▼
                           │    Fase 3 (OpenAPI)
                           │         │
                           └─────────┼──────────┐
                                     │          │
                                     ▼          ▼
                               Fase 4    Fase 5
                              (domain)  (auth)
                                 │          │
                                 └────┬─────┘
                                      ▼
                                 Fase 6
                              (CI/gates)
                                      │
                                      ▼
                                 Fase 7
                               (event bus)
                                      │
                                      ▼
                                 Fase 8
                              (excelence)
```

**Nota:** BK-P1-06 (consolidar database layer) pode executar em paralelo com Fase 4, desde que BK-P0-09 esteja completo.

---

## 12. Riscos e Bloqueios

| Risco                                                                  | Probabilidade | Impacto | Mitigacao                                              |
| ---------------------------------------------------------------------- | ------------- | ------- | ------------------------------------------------------ |
| Contradicao D-12 (storage keys) for mais complexa que estimado         | Media         | Alto    | Verificacao rapida em Fase 5 antes de assumir          |
| Repositorios com mais hardcodes de accountId nao detectados            | Media         | Alto    | Auditoria de codigo em Fase 2                          |
| Falha de ambiente de testes persistir apos Fase 1                      | Media         | Alto    | BK-P0-08 comeca cedo; nao esperar Fase 4               |
| ML modulecreateVector interface mais complexa que estimado             | Baixa         | Medio   | BK-P0-01 isolado; nao bloqueia outras fases            |
| Score real ficar abaixo de 70 apos correcoes (mais falhas encontradas) | Baixa         | Alto    | Plano contemplado para correcoes adicionais            |
| Documentacao desatualizada apos correcoes                              | Media         | Medio   | Tarefa de documentacao pos-correcoes incluida          |
| Sprint longo sem deliverables visiveis                                 | Media         | Medio   | Fases com checkpoints de output                        |
| Mudanca de scope durante execucao                                      | Media         | Medio   | Este plano e base; mudanca via CR formally documentado |

---

## 13. Sugestoes de Organizacao de Execucao

### 13.1 Estrutura de Sprints

**Sprint 1 (Semana 1-2):** Restaurar Workspace Signal

- BK-P0-01, BK-P0-02, BK-P0-03, BK-P0-09, BK-P0-08

**Sprint 2 (Semana 2-3):** Multi-Tenancy na Borda

- BK-P0-04, BK-P0-05, BK-P0-06

**Sprint 3 (Semana 3):** OpenAPI e Contratos

- BK-P0-07

**Sprint 4 (Semana 3-4):** Corrigir Foundational Tests

- BK-P1-01, BK-P1-02, BK-P1-03, BK-P1-04, BK-P1-06

**Sprint 5 (Semana 4):** Auth/Storage Keys

- BK-P1-05

**Sprint 6 (Semana 5-6):** Endurecimento CI

- BK-P2-01, BK-P2-02, BK-P2-03, BK-P2-04, BK-P2-05

**Sprint 7 (Semana 6-7):** Event Bus

- BK-P2-06

**Sprint 8 (Semana 8+):** Excelencia

- BK-P3-01, BK-P3-02, BK-P3-03, BK-P3-04

### 13.2 Equipes Recomendadas

| Fase     | Equipe                                    |
| -------- | ----------------------------------------- |
| Fase 1-3 | Backend (2) + Frontend (1) + QA/Infra (1) |
| Fase 4   | Backend (2)                               |
| Fase 5   | Frontend (1) + Backend (1)                |
| Fase 6   | QA/Infra (2)                              |
| Fase 7-8 | Backend (1) + ML (1)                      |

---

## 14. Proximos Passos Imediatos

1. **Executar Sprint 1** — Focar em BK-P0-01, BK-P0-02, BK-P0-03 em paralelo
2. **Verificar D-12 (storage keys)** via codigo antes de assumir que 1010-AUTH-HARDENING esta correto
3. **Auditar TODOS os repositorios** por hardcodes de accountId alem de patient repository
4. **Pos-Sprint 4:** Atualizar documentacao executiva com nova evidencia (scores reais)
5. **Pos-Sprint 6:** Publicar novo scorecard com thresholds reais

---

## 15. Veredito Final

O CVG-HIS-V2 possui uma base real de construcao solida, porem a governanca documental estavasuperestimando maturidade operacional em 12 a 17 pontos de score. A restauracao da verdade executavel eda confiabilidade do workspace deve preceder qualquer expansao funcional.

Este plano consolidado fornece um caminho de 8 fases com 29 itens de backlog, dependencias claras, criterios de aceite mensuraveis e organizacao de sprints sugerida. A execucao disciplinedas primeiras 4 fases (Sprints 1-4) restaurara a capacidadede auditagem e confiabilidade do programa.

**O projeto esta em estado de recuperacao controlada.** A meta de score 80-85/100 e alcançavel apos aexecucao completa das Fases 1-6.

---

_Documento consolidado em 10/04/2026_
_Base: Codex 1011 + Plano 1012 + Auth Hardening 1010 + Gap Analysis 0103 + Task Report 0110_
