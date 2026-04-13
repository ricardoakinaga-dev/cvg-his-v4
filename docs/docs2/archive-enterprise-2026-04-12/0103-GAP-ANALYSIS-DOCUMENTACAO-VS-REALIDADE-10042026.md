# GAP ANALYSIS — DOCUMENTACAO vs REALIDADE EXECUTAVEL

**Data:** 10/04/2026
**Autor:** Task Documentacao Executiva
**Base:** Auditoria Codex 1011 + Verificacao de Campo

---

## 1. Resumo Executivo

A documentacao executiva do CVG-HIS-V2 apresenta desvios materiais em relacao ao estado executavel real do projeto. Os principais pontos de gap envolvem status de build/typecheck/testes e scores globais que foram declarados de forma otima sem evidencia sustentavel.

**Veredito:** O programa possui base real de construcao, porem a governanca documental esta superestimando maturidade operacional de forma que compromete a utilidade dos documentos para tomada de decisao executiva.

---

## 2. Claims Frageis Identificados

### 2.1 Status de Build/Typecheck/Testes (MAIOR RISCO)

| Claim Documentado                            | Documento                                                   | Evidencia Real                                                                                                                                                   | Severidade |
| -------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| `pnpm typecheck`: PASS (todos os 45 pacotes) | 0100-EXECUTION-TRACKER.md:31                                | **FAIL** — `apps/spa` nao consegue resolver `@cvg-his-v2/shared-auth-sdk` via vue-tsc; `packages/design-system` falha por falta de `@types/node`                 | Critica    |
| `pnpm build`: PASS (todos os 45 pacotes)     | 0100-EXECUTION-TRACKER.md:31                                | **FAIL** — mesmo bloqueio de modularesoluacao; design-system quebra antes da SPA                                                                                 | Critica    |
| `pnpm test`: PASS (36/36 API, ~1,127 total)  | 0100-EXECUTION-TRACKER.md:31, 9998-STATUS-BUILD-08042026.md | **FAIL** — API tests (node --test) falham com `ERR_MODULE_NOT_FOUND` para `@cvg-his-v2/shared-utils`, `@cvg-his-v2/shared-errors`, `@cvg-his-v2/shared-auth-sdk` | Critica    |
| `pnpm test:critical`: PASS                   | Auditoria Codex 1011                                        | **FAIL** — 161 falhas, 8 passando (mistura de ambiente e dominio)                                                                                                | Critica    |
| `pnpm test:coverage`: PASS                   | 9998-STATUS-BUILD-08042026.md:47                            | **CONCLUIDO** por Executor 24, porem com thresholds reduzidos para 5% lines/statements (nao 15%)                                                                 | Media      |

### 2.2 Scores Inflados

| Claim           | Documento                     | Valor Declarado | Valor Real (Auditoria Codex) | Gap           |
| --------------- | ----------------------------- | --------------- | ---------------------------- | ------------- |
| Score Global    | 0100-EXECUTION-TRACKER.md:8   | 87/100          | 70-75/100                    | -12 a -17 pts |
| Score Onda 1    | 300-SCORECARD-PROGRESSO.md    | 58→72           | ~55-65                       | Superestimado |
| Score Onda 2    | 300-SCORECARD-PROGRESSO.md    | 85-88           | ~75-80                       | Superestimado |
| Score Executivo | PLANO-EXECUTIVO-CONSTRUCAO:11 | 88/100          | 70-75/100                    | -13 pts       |
| Score Matriz    | 1000-MATRIZ-ADERENCIA:65      | 72/100          | ~60-68                       | -4 a -12 pts  |
| Testes/QA       | Scorecard                     | 92/100          | ~60-65                       | -27 a -32 pts |

### 2.3 Claims de Cobertura

| Claim           | Documento                                                                       | Valor Declarado               | Evidencia Real             | Status                       |
| --------------- | ------------------------------------------------------------------------------- | ----------------------------- | -------------------------- | ---------------------------- |
| Coverage lines  | 9998-STATUS-BUILD-08042026.md:48                                                | 5.84% (acima de threshold 5%) | 5.84% real sem DB          | ✅ Corrigido por Exec 24     |
| Threshold lines | 9998-STATUS-BUILD-08042026.md:38, 1020-CI-GATES.md:151, 1021-CI-PIPELINE.md:111 | 15%                           | 5% (ajustado por Exec 24)  | ⚠️ Desatualizado nos docs CI |
| Suites reais    | 1090-TEST-INVENTORY.md:59                                                       | 37 suites, ~1,127 testes      | Verificar em execucao real | **EM REVALIDACAO**           |

### 2.4 Multi-Tenancy / Seguranca

| Claim                     | Documento                               | Evidencia Real                                                       | Status         |
| ------------------------- | --------------------------------------- | -------------------------------------------------------------------- | -------------- |
| Multi-tenancy "concluido" | 999-RELATORIO-CONSOLIDADO-ENTERPRISE.md | accountId 'pending' injetado na API real; SPA nao envia x-account-id | **INCOMPLETO** |
| accountId hardcoded       | Auditoria Codex 1011:149                | `database-patient.repository.ts:189` usa `acc_cvg_demo` fixo         | **BLOQUEANTE** |
| Auth seeds preditiveis    | Auditoria Codex 1011:179                | `packages/modules/users/src/index.ts:36,53` com fallback explicito   | **RISCO**      |
| OpenAPI runtime           | Auditoria Codex 1011:163                | `server.ts:291` serve `paths: {}` vazio                              | **BLOQUEANTE** |

---

## 3. Evidencias Consultadas

### 3.1 Codigo Fonte

- `apps/spa/src/services/api.ts` — import de `@cvg-his-v2/shared-auth-sdk`
- `apps/spa/src/stores/auth.ts` — import de `@cvg-his-v2/shared-auth-sdk`
- `apps/spa/tsconfig.json` — sem alias para `@cvg-his-v2/shared-auth-sdk`
- `packages/design-system/tsconfig.json` — referenciando `@types/node` ausentes
- `packages/modules/ml/src/feature-store.service.ts` — funcao `createVector` sem parametro `values`
- `packages/modules/patients/src/repositories/database-patient.repository.ts:189` — `accountId` hardcoded
- `apps/api/src/server.ts:233` — `accountId: 'pending'`
- `packages/tenant-context/src/middleware.ts:8` — middleware exige `x-account-id`
- `apps/spa/src/services/api.ts:40` — SPA nao envia `x-account-id`
- `packages/modules/users/src/index.ts:36,53` — seeds hardcoded
- `apps/api/src/server.ts:291` — OpenAPI serve `paths: {}`

### 3.2 CI / Build

- `.github/workflows/ci.yml` — workflow existe e estruturado, mas precisa de execucao real para confirmar
- `vitest.config.ts` — thresholds: `lines: 5, statements: 5` (nao 15% como docs CI declaram)
- `package.json` — scripts `test:coverage` com 9 padroes de exclusao DB

### 3.3 Documentacao Analisada

- `1011-RELATORIO-AUDITORIA-CODEX-2026-04-09.md` — auditoria mais recente e confiavel
- `1012-PLANO-REMEDIACAO-PRIORIZADO-2026-04-09.md` — plano de correcao por severidade
- `0100-EXECUTION-TRACKER.md` — claims de PASS sem evidencia atual
- `9998-STATUS-BUILD-08042026.md` — parcialmente correto (coverage), desatualizado em outros pontos
- `300-SCORECARD-PROGRESSO.md` — scores inflados
- `1000-MATRIZ-ADERENCIA-ENTERPRISE.md` — score 72/100, verificacao necessaria
- `PLANO-EXECUTIVO-CONSTRUCAO-CVG-HIS-V2.md` — score 88/100 sem evidencia
- `1090-TEST-INVENTORY.md` — inventarios desatualizados em partes
- `1020-CI-GATES.md` — thresholds desatualizados (15% vs 5% real)
- `1021-CI-PIPELINE.md` — mesma inconsistencia de thresholds

---

## 4. Analise por Documento

### 4.1 0100-EXECUTION-TRACKER.md

**Problemas:**

- Linha 31: `pnpm typecheck`, `pnpm build`, `pnpm test` marcados como PASS — **FALSO**
- Linha 8: Score 87/100 — **SUPERESTIMADO** (real: 70-75/100)
- Linha 23-27: Fases Onda 1=concluida, F2=concluida — **PRECISA REVALIDACAO**
- Linha 50-86: Tabela de modulos com testes counts — **NAO VERIFICADO ATUALMENTE**
- Linha 107: Gap para 90+ — AI/ML score 0 — consistente com realidade

### 4.2 300-SCORECARD-PROGRESSO.md

**Problemas:**

- Linha 22: GLOBAL 90+ — **FALSO** (real: 70-75/100)
- Linha 26: Score executivo 82/100 — **SUPERESTIMADO**
- Linha 29-34: Claims de typecheck/build/test PASS — **FALSO**
- Seções Onda 1/2 checklist: Claims de "concluido" sem revisao recente

### 4.3 9998-STATUS-BUILD-08042026.md

**Problemas:**

- Seção "Métricas Finais" (linha 374-383): Scores 100/100 para Build/Typecheck/Tests/Quality/Coverage — **INCORRETO**
- Status build PASS nao corresponde a realidade
- Threshold lines 15% citado em vários pontos (linha 221) — **DESATUALIZADO** (real: 5%)

### 4.4 PLANO-EXECUTIVO-CONSTRUCAO-CVG-HIS-V2.md

**Problemas:**

- Linha 11: Score 88/100 — **SUPERESTIMADO**
- Tabela scores areas — **PRECISA RECALIBRAR**
- Claims de "PROBLEMAS CRITICOS BLOQUEANTES ✅ RESOLVIDOS" — **PRECISA REVALIDACAO**

### 4.5 1000-MATRIZ-ADERENCIA-ENTERPRISE.md

**Problemas:**

- Linha 65: Score 72/100 — **SUPERESTIMADO**
- Multi-tenancy 88/100 — **SUPERESTIMADO** (real: incompleto na borda)
- RLS 90/100 — **SUPERESTIMADO** (funciona, mas incompleto em persistencia)
- Linha 72: "workflow CI/CD" — **PRECISA VERIFICAR EXECUCAO REAL**

### 4.6 1020-CI-GATES.md e 1021-CI-PIPELINE.md

**Problemas:**

- Thresholds declarados 15% lines/functions/branches/15% statements — **DESATUALIZADO** (real: 5%/15%/10%/5%)
- Documentos CI claims de coverage 15% thresholds — **INCORRETO**
- Informam "Release Assist Gates nao bloqueiam merge" — **CORRETO** (confirmado em ci.yml)

### 4.7 1090-TEST-INVENTORY.md

**Problemas:**

- Inventario de 37 suites/~1,127 testes pode nao refletir estado atual
- "Executor 26 validou 34 suites operacionais" — **PRECISA REVALIDACAO**
- Contagens de testes por modulo podem estar desatualizadas

### 4.8 998-RELATORIO-EXECUTIVO-1-PAGINA.md

**Problemas:**

- Baseado em score 42/100 -> 90+ (historico) — **PRECISA ATUALIZAR**
- Claims de "typecheck 0 errors" (linha 108) — **SUPERESTIMADO**

### 4.9 999-RELATORIO-CONSOLIDADO-ENTERPRISE.md

**Problemas:**

- Score 81/100 (linha 370) — **SUPERESTIMADO** (real: 70-75/100)
- Claims de typecheck/build/test PASS — **FALSO**
- "readiness inicial para Onda 3" — **PRECISA REVALIDACAO**

---

## 5. Riscos Residuais

1. **Documentos desatualizados induzem decisao errada** — gestores podem acreditar que o programa esta mais maduro do que realmente esta
2. **Scores inflados comprometem medicao de progresso** — nao e possivel medir evolucao real se o baseline esta errado
3. **Claims de "concluido" para multi-tenancy e RLS** — podem gerar falsa sensacao de seguranca em auditagem
4. **Drift entre documentos CI e realidade** — thresholds desatualizados podem mascarar regresoes

---

## 6. Acoes Necessarias

### 6.1 Imediatas (Responsabilidade desta Task)

- [x] Identificar e documentar todos os gaps
- [ ] Recalibrar scores em todos os documentos
- [ ] Marcar status de build/typecheck/test como **NAO CONFIRMADO** ou **EM REVALIDACAO**
- [ ] Corrigir thresholds de coverage nos docs CI (5% nao 15%)

### 6.2 Dependentes de Outras Tasks

- Corrigir `apps/spa` resolucao de `@cvg-his-v2/shared-auth-sdk` (task de codigo)
- Corrigir `packages/design-system` falta de `@types/node` (task de codigo)
- Corrigir ML module `createVector` (task de codigo)
- Corrigir `accountId: 'pending'` na API (task de codigo)
- Corrigir OpenAPI runtime (task de codigo)
- Corrigir `test:critical` (task de codigo/testes)
- Corrigir API tests `ERR_MODULE_NOT_FOUND` (task de codigo/infra)

### 6.3 Posterior a Correcoes

- Reexecutar `pnpm typecheck`, `pnpm build`, `pnpm test` e validar que passam
- Atualizar todos os documentos com nova evidencia
- Regenerar scorecards com valores reais

---

## 7. Nota sobre a Auditoria Codex 1011

A auditoria Codex de 09/04/2026 e a **fonte de evidencia mais confiavel** ate o momento. Seus achados de:

- typecheck FAIL
- build FAIL
- test:critical FAIL (161 falhos, 8 passando)
- Multi-tenancy incompleto na borda
- OpenAPI runtime serving empty paths
- accountId hardcoded em persistencia

Sao **consistentes com a verificacao de campo realizada** e devem ser tratados como vereditoate que correcoes sejam aplicadas e revalidadas.

---

_Documento gerado pela Task de Documentacao Executiva em 10/04/2026_
_Base: Auditoria Codex 1011 + Verificacao de Campo + Analise Documental_
