# CI Pipeline — Gates e Critérios

## Visão Geral

A pipeline de CI do CVG-HIS-V2 é executada em GitHub Actions e validada em cada push e Pull Request.

## Estrutura de Jobs

```
typecheck ── validate-openapi ── build ──┬── unit-tests
                     │                   ├── integration-tests
                     │                   ├── test-e2e-spa
                     │                   └── test-visual
                     └── coverage
```

- `typecheck`: primeiro gate obrigatório.
- `validate-openapi`: valida spec OpenAPI; depende de `typecheck`.
- `build`: compila pacotes; depende de `typecheck` e `validate-openapi`.
- `unit-tests`, `integration-tests`, `test-e2e-spa`, `test-visual`: dependem de `build`.
- `coverage`: depende de `typecheck` (executa em paralelo com `build` e `validate-openapi`).

## Gates de Merge (Obrigatórios)

Estes jobs **devem passar** para que um PR possa ser mergeado:

| Job                 | Descrição                                            | Timeout | Dependência                     |
| ------------------- | ---------------------------------------------------- | ------- | ------------------------------- |
| `typecheck`         | Valida TypeScript sem erros de compilação            | 10 min  | —                               |
| `validate-openapi`  | Valida que `openapi.yaml` parseia e tem estrutura OK | 5 min   | `typecheck`                     |
| `build`             | Compila todos os pacotes do monorepo                 | 10 min  | `typecheck`, `validate-openapi` |
| `unit-tests`        | Executa testes unitários (vitest)                    | 10 min  | `build`                         |
| `integration-tests` | Executa testes de integração com DB real             | 15 min  | `build`                         |

## Gates de Release Assistido (Informacionais)

Estes jobs são executados para dar confiança adicional, mas **não bloqueiam o merge** via `continue-on-error: true` no CI:

| Job            | Descrição                                   | Timeout | Dependência |
| -------------- | ------------------------------------------- | ------- | ----------- |
| `test-e2e-spa` | Testes E2E via Playwright no SPA            | 20 min  | `build`     |
| `test-visual`  | Snapshots visuais para detectar regressions | 20 min  | `build`     |
| `coverage`     | Coleta métricas de cobertura de código      | 15 min  | `typecheck` |

## OpenAPI Validation

O job `validate-openapi` executa `scripts/validate-openapi.js`, que:

1. Faz parse do YAML em `apps/api/src/openapi.yaml`
2. Valida campos obrigatórios (`openapi`, `info`, `paths`)
3. Valida que `paths` não está vazio
4. Valida que todos os `$ref` de schema existem em `components.schemas`
5. Verifica tags declaradas vs usadas
6. Verifica `operationId` único
7. Verifica métodos HTTP válidos por path

Este é um gate de **consistência de contrato** — se o YAML não parseia ou está mal estruturado, o PR é bloqueado.

Para validar localmente antes de commit:

```bash
pnpm validate:openapi
```

## Visual Regression

Testes visuais correm no CI com upload de artifacts automático em caso de falha. O workflow de baseline é:

### Quando atualizar o baseline

Atualize o baseline quando:

- Mudança visual **intencional** foi feita (design, layout, cores)
- Design system foi atualizado com impacto visual
- Após atualizar dependências que afetam rendering (Chrome version)

NÃO atualize quando:

- O teste falhou por mudança não-intencional (investigue o bug)
- Dados de teste mudaram (verificar seed)
- Falha intermitente (rode novamente antes de atualizar)

### Como atualizar localmente

```bash
# 1. Asegure que API e SPA estão rodando com dados consistentes
pnpm dev:api &
pnpm --filter @cvg-his-v2/spa run dev

# 2. Atualize os snapshots
pnpm test:visual:update

# 3. Commit o novo baseline
git add e2e/spa/snapshots/
git commit -m "feat(visual): update baseline snapshots"
```

### Quando o CI falhar no visual

1. Baixe o artifact `visual-regression-diffs` do workflow run
2. Compare `.diff.png` (diferenças em rosa) com `.actual.png` e `.expected.png`
3. Se mudança é **intencional**: atualize baseline localmente e faça commit
4. Se mudança é **bug**: corrija o código, não o baseline

> **Nota:** Falhas em `test-e2e-spa` e `test-visual` não bloqueiam merge — são jobs informativos. Se o setup de DB falhar, o job falha explicitamente (sem mascaramento).

## Coverage

Coverage é coletado via `vitest --coverage` e o report é upado como artifact. Thresholds mínimos foram ativados em 2026-04-09:

| Métrica    | Threshold                                |
| ---------- | ---------------------------------------- |
| Lines      | **5%** (ajustado de 15% por Executor 24) |
| Functions  | 15%                                      |
| Branches   | 10%                                      |
| Statements | **5%** (ajustado de 15% por Executor 24) |

Estes thresholds são **informacionais com warning** — failures não bloqueiam merge, mas são visíveis no CI summary.

> **Nota de implementação:** Os thresholds são baixos propositalmente para não quebrar o workspace durante estabilização. A meta é aumentá-los progressivamente conforme a cobertura real aumentar.

Para consultar coverage localmente:

```bash
pnpm test:coverage
# Abra coverage/index.html
```

## Scripts Locais

```bash
# Gate de merge completo
pnpm typecheck && pnpm validate:openapi && pnpm build && pnpm test

# Testes de integração (requer banco)
pnpm test:db:start
DATABASE_URL_TEST=... DATABASE_URL=... pnpm test:critical
pnpm test:db:stop

# Testes E2E (requer API + SPA)
pnpm test:e2e:spa

# Testes visuais
pnpm test:visual
pnpm test:visual:update  # atualiza baseline
```

## Modelo de Execução Local vs CI

### Fluxo Local (Oficial Atual)

O script `test` em `package.json` usa **`pnpm -r --filter @cvg-his-v2/* run test`**, que executa recursivamente em todos os workspaces **sem passar pelo turbo.json**. Isso significa:

- `pnpm test` executa **diretamente via pnpm**, ignorando `turbo.json`
- `turbo run test` (ou `pnpm turbo run test`) **respeitaria** `turbo.json` com `dependsOn: ["^build"]`
- A proteção `dependsOn: ["^build"]` em `turbo.json` (adicionada por Executor 8) **não é efetiva** no fluxo local atual

### Proteção Real de Build-Before-Test

| Ambiente            | Mecanismo                                          | Status       |
| ------------------- | -------------------------------------------------- | ------------ |
| Local (`pnpm test`) | Nenhum — `pnpm -r` ignora turbo.json               | ⚠️ Cosmético |
| CI (`unit-tests`)   | `needs: [build]` em `.github/workflows/ci.yml:128` | ✅ Funcional |

### Decisão Registrada

- **Fluxo local oficial**: `pnpm -r` (atualmente implementado)
- **Proteção build-before-test local**: Não existe no fluxo `pnpm -r` — a garantia existe apenas no CI via `needs: [build]`
- **Alternativa futura**: Se desired, mudar `package.json` de `pnpm -r` para `turbo run test` para que `turbo.json` seja respeitado localmente

## Critérios de Aceitação

| Gate                | Critério                                | Bloqueia Merge |
| ------------------- | --------------------------------------- | -------------- |
| `typecheck`         | TypeScript compila sem erros            | ✅ Sim         |
| `validate-openapi`  | OpenAPI YAML parseia e estrutura válida | ✅ Sim         |
| `build`             | Todos os pacotes compilam               | ✅ Sim         |
| `unit-tests`        | Testes unitários passam                 | ✅ Sim         |
| `integration-tests` | Testes de integração passam             | ✅ Sim         |
| `test-e2e-spa`      | Testes E2E passam                       | ❌ Não         |
| `test-visual`       | Snapshots sem regressions               | ❌ Não         |
| `coverage`          | Métricas de cobertura coletadas         | ❌ Não         |

## Artifacts

| Job            | Artifact                 | Condição | Retenção |
| -------------- | ------------------------ | -------- | -------- |
| `test-e2e-spa` | e2e-spa-report           | sempre   | 30 dias  |
| `test-visual`  | visual-regression-report | sempre   | 30 dias  |
| `test-visual`  | visual-regression-diffs  | falha    | 14 dias  |
| `test-visual`  | visual-test-results      | falha    | 14 dias  |
| `coverage`     | coverage-report          | sempre   | 30 dias  |

_Não há artifacts configurados para `unit-tests` e `integration-tests` — resultados são visíveis diretamente no resumo do job._

## Melhorias Futuras Sugeridas

- Adicionar threshold de coverage mínimo (ex: 50%) como check informativo com warning
- Spectral ruleset básico para validação de OpenAPI (além do parse)
- Tornar E2E tests obrigatórios para release para main
- Contract testing para integrações críticas
- Security scanning (SAST/DAST)
