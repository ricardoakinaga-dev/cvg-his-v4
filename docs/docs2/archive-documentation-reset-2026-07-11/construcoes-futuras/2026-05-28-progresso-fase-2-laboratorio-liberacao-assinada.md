# Progresso F2-08 - Laboratorio Liberacao Assinada

Data: 2026-05-28

## Objetivo

Avancar o laboratorio de uma esteira de pedido/coleta/resultado para uma operacao enterprise de laudo liberado com responsavel tecnico, usuario liberador, data de liberacao e hash auditavel de assinatura.

## Entregue

- `DiagnosticOrderSummary` passou a expor `resultedAt`, `releasedByUserId`, `signedByUserId` e `signatureHash`.
- `RecordDiagnosticResultRequest` passou a aceitar metadados de liberacao e assinatura.
- `DiagnosticsService.recordResult()` agora exige `releasedByUserId` para status `resulted`.
- O dominio gera `signatureHash` SHA-256 quando um resultado e liberado sem hash informado.
- A API injeta o usuario autenticado como `releasedByUserId` ao liberar resultado por `/laboratory/orders/:id/result`.
- A ponte `/exam-results/:id` tambem popula usuario liberador e responsavel tecnico.
- A integracao de equipamento laboratorial libera resultados com identidade tecnica `equipment_bridge`.
- A persistencia PostgreSQL ganhou colunas para liberacao e assinatura em `diagnostic_orders`.
- A OpenAPI foi atualizada com os novos campos de resultado assinado.
- A tela `LaboratoryOrdersPage` passou a operar coleta e liberacao, incluindo campo de responsavel tecnico e exibicao de liberacao assinada na esteira.
- A pagina clinica de diagnosticos passou a enviar responsavel tecnico ao liberar resultado por anexo.
- A API passou a expor `/laboratory/reports/:orderId/print` para gerar HTML imprimivel do laudo liberado.
- O HTML do laudo inclui identificacao, resultado, usuario liberador, responsavel tecnico, anexo e hash da assinatura.
- A tela `LaboratoryResultsPage` passou a oferecer acao `Laudo` com pre-visualizacao do documento imprimivel assinado.

## Arquivos principais

- `packages/shared/types/src/index.ts`
- `packages/shared/contracts/src/index.ts`
- `packages/modules/diagnostics/src/index.ts`
- `packages/modules/diagnostics/src/repositories/database-diagnostics.repository.ts`
- `packages/db/migrations/0053_laboratory_result_release_signature.sql`
- `packages/shared/database/src/migrations/024_laboratory_result_release_signature.sql`
- `apps/api/src/routes/laboratory-routes.ts`
- `apps/api/src/openapi.yaml`
- `apps/spa/src/pages/laboratory/LaboratoryOrdersPage.vue`

## Validacoes executadas

```bash
pnpm --filter @cvg-his-v2/shared-types build
pnpm --filter @cvg-his-v2/shared-contracts build
pnpm --filter @cvg-his-v2/shared-database build
pnpm --filter @cvg-his-v2/module-diagnostics build
pnpm --filter @cvg-his-v2/api build
node apps/api/dist/routes/laboratory-routes.test.js
pnpm --filter @cvg-his-v2/module-diagnostics test
pnpm --filter @cvg-his-v2/spa exec vitest run src/pages/laboratory/__tests__/LaboratoryOrdersPage.test.ts --pool=forks
pnpm --filter @cvg-his-v2/spa exec vitest run src/pages/laboratory/__tests__/LaboratoryResultsPage.test.ts --pool=forks
pnpm validate:openapi
pnpm --filter @cvg-his-v2/spa exec vue-tsc --noEmit
pnpm --filter @cvg-his-v2/spa build
rg -n "vue-component-type-helpers(@|: )3\\.(2\\.7|3\\.3\\.2)" pnpm-lock.yaml
```

Resultado:

- Modulo diagnosticos: 21 testes verdes.
- Rotas laboratorio API: 15 testes verdes.
- Tela laboratorio SPA: 5 testes verdes.
- Tela de laudos SPA: 4 testes verdes.
- OpenAPI: valido, 284 paths, 319 schemas.
- Typecheck SPA: verde.
- Build SPA: verde.
- Lockfile: `vue-component-type-helpers@3.2.7` preservado.

## Impacto no Premium Enterprise

Esta entrega fortalece o laboratorio para operacao auditavel: cada resultado liberado passa a carregar identidade do usuario liberador, responsavel tecnico, data da liberacao e assinatura hash do conteudo. O laudo agora tambem pode ser materializado em HTML imprimivel, reduzindo fragilidade regulatoria, melhorando rastreabilidade e aproximando o F2-08 de um modulo premium com laudo, referencia, equipamento, assinatura e integracao.

## Proximos passos recomendados

- Vincular assinatura a cadastro profissional/RBAC em vez de texto livre.
- Exibir hash e trilha de auditoria em uma tela de detalhe do laudo.
- Evoluir o HTML imprimivel para PDF assinado com valores de referencia estruturados.
- Integrar equipamentos com payload estruturado de parametros e ranges.
- Criar E2E cobrindo pedido, coleta, liberacao assinada e consulta no prontuario.
