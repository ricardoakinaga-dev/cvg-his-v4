# Phase 0 Progress

## Escopo executado

- leitura estrutural do repositorio atual
- leitura de documentacao historica existente
- inventario do legado por apps, packages, modulos e areas funcionais
- consolidacao do rationale da reconstrucao
- consolidacao do mapa de reaproveitamento e do mapa de descarte

## Documentos criados

- `docs/010-reconstruction-rationale.md`
- `docs/011-legacy-inventory.md`
- `docs/012-legacy-reuse-map.md`
- `docs/013-legacy-discard-map.md`
- `docs/015-phase-0-validation.md`
- `docs/016-phase-0-open-issues.md`
- `docs/README.md`

## Areas analisadas

- apps legadas: `apps/his-api`, `apps/his-web`, `apps/his-worker`
- packages legados: `packages/db`, `packages/rbac`, `packages/audit`, `packages/contracts`, `packages/domain`, `packages/config`, `packages/events`
- documentacao historica: `docs/docs2`
- arquivos de raiz: `README.md`, `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`

## Resumo do inventario

O legado possui base funcional forte, principalmente em auth, RBAC, cadastro mestre, encounter e partes assistenciais avancadas. Ao mesmo tempo, carrega sinais de crescimento incremental com fronteiras pouco consistentes, nomenclatura heterogenea e risco de mistura entre dominio clinico, dominio administrativo e detalhes de implementacao.

## Resultado desta fase

A Fase 0 concluiu que o V2 deve nascer em base nova e que o legado deve permanecer restrito a referencia funcional, descoberta de regras e apoio a migracao futura. A promocao do legado a baseline estrutural foi explicitamente rejeitada.
