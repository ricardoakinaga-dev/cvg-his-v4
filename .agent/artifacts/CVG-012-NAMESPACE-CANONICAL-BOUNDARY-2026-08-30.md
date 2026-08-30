# CVG-012 — namespace canônico bounded

Data: 2026-08-30
Resultado: `PASS_BOUNDED` / `COMPLETE_BOUNDED`
Confiança: `MEDIUM`
Risco residual: `HIGH`

## Escopo e autoridade

Authority: `.agent/authority.jsonl#AUTH-CVG-012-NAMESPACE-CANONICAL-BOUNDARY-IR-001`.

O slice corrigiu somente a fronteira de dependências/imports do grafo V2:
renomeou o catálogo RBAC para `@cvg-his-v2/rbac`, removeu a dependência direta
não usada `@cvg-his/db` de `module-fiscal`, alinhou callers/aliases/filtros e
adicionou `validate:namespaces` como guardrail bloqueante do CI. Não houve
migration, alteração de schema, payload HTTP, comportamento fiscal/provider,
deploy, target, produção ou aposentadoria global de packages legados.

## Discovery e RED

A auditoria inicial confirmou crossings entre packages canônicos e o namespace
legado em access-control/fiscal, callers de build/test e ausência de guardrail
de CI. O gate de implementação-ready foi gravado antes da mudança.

O TDD RED inicial foi executado com:

```text
pnpm exec vitest run tests/unit/infra/namespace-boundary.test.ts tests/unit/infra/ci-contract.test.ts --config vitest.config.ts --no-file-parallelism --reporter=verbose
```

Resultado: exit `1`, com 3 falhas esperadas e 6 testes passando. As falhas
provaram a ausência do guard e da chamada CI antes da implementação. O RED é
registrado em `VFY-CVG-012-NAMESPACE-CANONICAL-BOUNDARY-RED-001`.

## Implementação e crítica

- `packages/rbac` agora publica `@cvg-his-v2/rbac`.
- Access-control, DB seeds/tests, aliases Vitest, filtro de build da API e
  harness E2E usam o namespace canônico.
- `module-fiscal` não declara mais `@cvg-his/db`.
- `scripts/check-package-namespace-boundaries.mjs` inspeciona os manifests
  canônicos em `apps`/`packages` e a AST TypeScript dos sources (`.cjs`,
  `.cts`, `.js`, `.jsx`, `.mjs`, `.mts`, `.ts`, `.tsx` e `.vue`).
- A AST cobre imports/exports estáticos, `import()`, `require`,
  `require.resolve`, `import = require` e templates com prefixo literal; os
  scripts de `.vue` são limitados aos blocos `<script>`.
- `.github/workflows/ci.yml` executa `pnpm validate:namespaces` no job
  `repository-guards`.
- As fixtures cobrem dependência de manifest, import nomeado, side-effect,
  export, dynamic/template import, `require`, `require.resolve`,
  `import = require`, comentários entre tokens e ausência de falsos positivos
  em comentários/strings comuns.

A crítica independente retornou `FAIL_BOUNDED` e encontrou:

1. false negatives do scanner lexical em templates/comentários;
2. task/state/gate sem fechamento reconciliado;
3. cobertura permanente insuficiente para várias formas de import.

A resposta foi substituir o scanner lexical por AST TypeScript, expandir as
fixtures, atualizar os planos/documentos e reconciliar o control-plane antes
do commit. Não há aprovação independente pós-correção disponível; nenhuma
aprovação foi inferida.

## Verificação executada

| Verificação | Resultado |
| --- | --- |
| `pnpm validate:namespaces` | PASS; 65 packages canônicos, 5 owners legados, grafo limpo |
| namespace + CI contract | PASS — 10/10 |
| access-control | PASS — 39/39 |
| fiscal | PASS — 18/18 |
| API | PASS — 519/519 |
| PostgreSQL descartável | PASS; migrations/seed; 183 tables, 43 enums, 512 FKs |
| typecheck | PASS — 70/70 projetos |
| build | PASS — 70/70 projetos |
| coverage oficial | PASS — 80.17% statements/lines, 80.73% branches, 86.66% functions |
| OpenAPI | PASS — 354 paths, 40 tags, 413 schemas |
| migration-source / RLS / secrets | PASS — RLS 165/166 com 1 exceção documentada; sem findings de secrets |
| `git diff --check` / Prettier / lint direcionado | PASS; lint amplo mantém baseline não relacionado |

O lint amplo continua falhando somente no baseline conhecido
`packages/contracts/src/counterSales.ts:38,77` (`no-control-regex`). Isso não
foi alterado neste slice.

## Decisão e limites

O gate local é `PASS_BOUNDED`, com `COMPLETE_BOUNDED` apenas para
`CVG-012-NAMESPACE-CANONICAL-BOUNDARY`. R-012 e TD-029 permanecem
`P2 — BOUNDED/OPEN`: `packages/db`, `packages/audit` e outros owners legados
não foram aposentados; a prova não cobre CI remoto, target, provider,
production, deployment, release identity ou parity global.

O ERP global permanece `IN_PROGRESS/PARTIAL` e a promoção continua `BLOCKED`.
O próximo passo permitido é novo scouting residual sob nova autoridade; este
artefato não autoriza expansão de escopo.
