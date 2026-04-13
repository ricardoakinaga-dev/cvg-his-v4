# RELATORIO EXECUTOR 25 — 2026-04-10

## Auditoria de Suites Invisiveis + Reativacao design-system

**Executor:** 25
**Data:** 10/04/2026
**Status:** Concluido
**Dono:** QA

---

## Contexto

Auditoria estrutural de suites de teste que existem em disco mas nao sao executadas pelo pipeline de teste do monorepo. O root `vitest.config.ts` tem `include: ['tests/**/_.test.ts']`, ou seja, espera testes no diretorio `tests/`. Modulos que colocam testes em `src/*.test.ts` precisam de `vitest.config.ts` local para serem descobertos.

Executors anteriores ja haviam corrigido este problema para: module-lgpd (Exec 15), module-mfa (Exec 17), module-audit (Exec 19), module-owners (Exec 20), module-patients (Exec 23).

---

## Problema: design-system — apenas 4/17 testes rodando

### Sintoma

`pnpm --filter @cvg-his-v2/design-system run test` reportava apenas `tests/DsSpinner.test.ts` (4 testes).

### Causa raiz

`package.json` tinha:

```json
"test": "vitest run --config ../../vitest.config.ts tests/"
```

O script aponta para `tests/` apenas. Existiam 3 arquivos de teste Vue adicionais em `src/vue/__tests__/` que nunca eram descobertos:

| Arquivo                                | Testes                 |
| -------------------------------------- | ---------------------- |
| `src/vue/__tests__/DsInput.test.ts`    | 5                      |
| `src/vue/__tests__/DsRadio.test.ts`    | 4                      |
| `src/vue/__tests__/DsCheckbox.test.ts` | 4                      |
| `tests/DsSpinner.test.ts`              | 4 (o unico que rodava) |

**Total: 17 testes, apenas 4 executados.**

### Fix aplicado

1. Criado `packages/design-system/vitest.config.ts` com `include: ['tests/**/*.test.ts', 'src/vue/__tests__/**/*.test.ts']`
2. Atualizado `package.json` para `"test": "vitest run --config vitest.config.ts"`

### Validacao

```
$ pnpm --filter @cvg-his-v2/design-system run test

 ✓ src/vue/__tests__/DsInput.test.ts (5 tests) 67ms
 ✓ src/vue/__tests__/DsRadio.test.ts (4 tests) 80ms
 ✓ src/vue/__tests__/DsCheckbox.test.ts (4 tests) 83ms
 ✓ tests/DsSpinner.test.ts (4 tests) 46ms

Test Files  4 passed (4)
     Tests  17 passed (17)
```

---

## Auditoria complementar: @cvg-his/contracts

Verificado que `@cvg-his/contracts` (43 testes, 1 suite) continua passando com sua propria `vitest.config.ts` local.

```
$ pnpm --filter @cvg-his/contracts run test
Test Files  1 passed (1)
     Tests  43 passed (43)
```

---

## Impacto consolidado

| Metrica                         | Antes | Depois |
| ------------------------------- | ----- | ------ |
| Suites reais                    | 18    | 19     |
| Total testes reais              | ~780  | ~804   |
| design-system testes executados | 4     | 17     |

---

## Pattern estrutural documentado

Para qualquer modulo do monorepo:

- Se tem `src/*.test.ts` e NAO tem `tests/` → precisa de `vitest.config.ts` local com `include: ['src/**/*.test.ts']`
- Se tem `src/vue/__tests__/*.test.ts` → precisa de `vitest.config.ts` local com `include: ['src/vue/__tests__/**/*.test.ts']` (ou combinacao)
- Se tem `tests/*.test.ts` e `src/**/*.test.ts` → incluir ambos padroes

---

## Acoes realizadas

- `packages/design-system/vitest.config.ts` — criado
- `packages/design-system/package.json` — atualizado (script test)
- `docs/Enterprise/1090-TEST-INVENTORY.md` — atualizado (design-system 4→17, +@cvg-his/contracts 43, suites 18→19, testes ~780→~804)
- `docs/Enterprise/1002-QUADRO-SEMANAL-EXECUCAO.md` — linha Exec 25 adicionada

---

## Validacao final

```
typecheck: PASS (workspace-wide)
```

---

## Pendencias

Nenhuma.
