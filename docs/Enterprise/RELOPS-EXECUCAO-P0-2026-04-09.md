# RELATORIO DE EXECUCAO — REMEDIACAO P0 CVG-HIS-V2

## Data: 2026-04-09

## Base: 1011-RELATORIO-AUDITORIA-CODEX-2026-04-09.md e 1012-PLANO-REMEDIACAO-PRIORIZADO-2026-04-09.md

---

## Resumo Executivo

Execucao focada nos bloques P0 do plano de remediação. O workspace foi restaurado com sucesso executavel apos as correcoes. Os itens P0-01 a P0-04 foram concluidos. P0-05, P1 e etapas subsequentes foram identificadas mas nao executadas integralmente neste ciclo devido ao escopo e complexidade.

**Estado resultante:**

- `pnpm typecheck`: PASS (ml, patients, api, spa)
- `pnpm build`: dependencias construidas, build completo pendente verificacao
- Multi-tenancy: borda corrigida com extracao de accountId do token JWT
- OpenAPI: runtime agora serve openapi.yaml real (4492 linhas)
- Persistencia: hardcode acc_cvg_demo removido com passagem de accountId via parametro

---

## Documentos `/docs/Enterprise` Usados Como Fonte da Verdade

1. `1011-RELATORIO-AUDITORIA-CODEX-2026-04-09.md` — auditoria tecnica com achados criticos
2. `1012-PLANO-REMEDIACAO-PRIORIZADO-2026-04-09.md` — plano priorizado com sequencia de execucao
3. `001-BLUEPRINT-ENTERPRISE.md` — referencia para multi-tenancy e arquitetura
4. `RLS-GUIDE.md` — referencia para implementacao de tenant context e RLS

---

## Escopo Executado

### P0-01 — Corrigir module-ml

**Problema:** `this.nextId()` chamado sem argumento em `ml.test.ts:22`, causando erro TS2554

**Arquivos alterados:**

- `packages/modules/ml/src/ml.test.ts` — corrigido `this.nextId()` para `this.nextId('feat')`

**Validacao:** `pnpm --filter @cvg-his-v2/module-ml run typecheck` = PASS

---

### P0-02 — Fechar Multi-Tenancy na Borda

**Problema:** `accountId: 'pending'` era injetado fixo no tenant context para todas as requests

**Arquivos alterados:**

- `apps/api/src/server.ts` — extracao de accountId via token JWT no Authorization header

**Logica implementada:**

1. Extrai Bearer token do header Authorization
2. Autentica token via `auth.authenticateAccessToken()`
3. Extrai `accountId` e `userId` do principal
4. Injeta tenant context com valores reais quando token valido, 'pending' apenas quando anônimo

**Validacao:** `pnpm --filter @cvg-his-v2/api run typecheck` = PASS

---

### P0-03 — Remover Hardcode accountId

**Problema:** `database-patient.repository.ts` retornava `accountId: 'acc_cvg_demo'` hardcoded no mapRowToLink

**Arquivos alterados:**

- `packages/modules/patients/src/repositories/database-patient.repository.ts` — assinatura do método alterada para receber `accountId` como parâmetro, interface OwnerPatientLinkRepository atualizada
- `packages/modules/patients/src/repositories/in-memory-patient.repository.ts` — interface e implementação atualizados
- `packages/modules/patients/src/index.ts` — interface OwnerPatientLinkRepository exportada atualizada
- `packages/modules/patients/src/patients.test.ts` — chamada ajustada para passar ACCOUNT_ID

**Validacao:** `pnpm --filter @cvg-his-v2/module-patients run typecheck` = PASS

---

### P0-04 — Alinhar Runtime OpenAPI

**Problema:** `/openapi.json` retornava objeto vazio `{ paths: {} }` em vez da spec real

**Arquivos alterados:**

- `apps/api/src/server.ts` — adicionados imports de `readFileSync` e `parseYaml`, implementacao de leitura real do openapi.yaml

**Endpoints agora operacionais:**

- `GET /openapi.json` — serve spec parseada do yaml (com fallback para spec minima)
- `GET /openapi.yaml` — serve arquivo yaml cru (com fallback 500)

**Validacao:** `pnpm --filter @cvg-his-v2/api run typecheck` = PASS

---

## Arquivos Alterados (Resumo)

| Arquivo                                                                      | Bloco        | Tipo de Alteracao                                  |
| ---------------------------------------------------------------------------- | ------------ | -------------------------------------------------- |
| `packages/modules/ml/src/ml.test.ts`                                         | P0-01        | Bugfix: argumento faltante                         |
| `packages/modules/patients/src/repositories/database-patient.repository.ts`  | P0-03        | Refatoracao: accountId via parametro               |
| `packages/modules/patients/src/repositories/in-memory-patient.repository.ts` | P0-03        | Refatoracao: assinatura atualizada                 |
| `packages/modules/patients/src/index.ts`                                     | P0-03        | Refatoracao: interface atualizada                  |
| `packages/modules/patients/src/patients.test.ts`                             | P0-03        | Teste ajustado                                     |
| `apps/spa/package.json`                                                      | Infra        | Dependencia @cvg-his-v2/shared-auth-sdk adicionada |
| `apps/api/src/server.ts`                                                     | P0-02, P0-04 | Extracao JWT + OpenAPI real                        |

---

## Problemas Encontrados

### 1. SPA missing dependency

A SPA não tinha `@cvg-his-v2/shared-auth-sdk` como dependencia. Corrigido com `pnpm install`.

### 2. Interface OwnerPatientLinkRepository duplicada

O código tinha 3 definições separadas do mesmo `OwnerPatientLinkRepository` (database, in-memory, index.ts). Todas precisaram ser sincronizadas.

### 3. TypeScript cache staliniana

Alem de ter interfaces aparentemente iguais, o TypeScript nao estava reconhecendo correspondencia. Solucao: re-build completo de patients apos correcoes.

### 4. Incompatibilidade de assinatura em testes

O teste patients.test.ts na linha 498 chamava `findById(link.id)` mas a nova assinatura exigia `accountId`. Corrigido para `findById(link.id, ACCOUNT_ID)`.

---

## Pendencias Remanescentes

### P0-05 — Estabilizar Setup de Testes Criticos

- `pnpm test:critical` ainda nao foi executado para validar
- Diferenca de porta entre local (5432) e CI (5433) documentada mas nao corrigida
- global-setup faz warning em vez de falhar explicitamente

### P1-01 — Corrigir Falhas Reais da Suite Foundational

- `foundational.test.ts` tem falhas identificadas (mal assincrono, encadeamento scheduling/queue/encounter)
- Execucao pendente de validacao

### P1-02 — Endurecer Auth

- Credenciais seed previsiveis em `@cvg-his-v2/module-users/src/index.ts` ainda existem
- Storage keys SPA vs SDK divergem: SPA usa `cvg-his-v2:access_token`, SDK usa `cvg_his_v2_access_token`

### P1-03 — Consolidar Camada de Banco

- Duplicidade `packages/shared/database/src/client.ts` vs `packages/db/src/connection.ts` documentada mas nao resolvida

---

## Sugestoes

1. **Executar P0-05 antes de declarar successo**: o build agora passa em modules, mas a suite de testes críticos precisa ser validada.

2. **Revisar auth seeds em module-users**: a existencia de fallback com senhas fixas previsiveis e risco em staging/producao.

3. **Unificar storage keys**: SPA e SDK precisam usar mesma convencao para nāo ter drift de tokens.

4. **Adicionar accountId à schema ownerPatientLinks**: o TODO esta documentado ha tempo. A coluna deveria existir para alinhamento com RLS.

5. **Verificar se openapi.yaml cobre todos os paths declarados**: a spec tem 4492 linhas e 107+ paths documentados, mas nao foi validado que todos estao operacionais.

---

## Proximos Passos Priorizados

1. Executar `pnpm test:critical` e corrigir falhas da suite foundational (P0-05 + P1-01)
2. Corrigir auth seed e storage keys (P1-02)
3. Validar OpenAPI coverage — verificar se todos os paths declarados existem no runtime
4. Consolidar camada de banco para eliminar duplicidade
5. Executar recalibracao da documentacao executiva

---

## Riscos Residuais

- **Auth seed**: fallback de senhas fixas pode escapar para producao se mecanismo de override for acidentalmente ativado
- **RLS incompleto**: ownerPatientLinks ainda nao tem coluna accountId, deixando o mapeamento parcialmente dependente de memória
- **Testes crasher**: suite foundational nao foi validada apos correcoes
- **Build parcial**: build completo nao foi executado (timeout), hanya typecheck yang sudah berhasil

---

## Veredito Final

O programa foi avancado do estado "bom com drift" para "em remediaçao". O workspace recuperou executabilidade: typecheck passa, multi-tenancy agora extrai accountId real do JWT, persistencia nao usa mais accountId hardcoded, OpenAPI serve spec real. Porem, o trabalho completo de remediaçao ainda exige validacao de testes criticos, endurecimento de auth, consolidacao de banco e recalibracao de documentacao para ser considerado "auditavel de verdade" conforme criterio do plano.

**Estado atual: P0-01 a P0-04 concluidos, P0-05 e P1 pendentes.**

---

_Relatorio gerado em 2026-04-09 com base em /docs/Enterprise como fonte da verdade._
