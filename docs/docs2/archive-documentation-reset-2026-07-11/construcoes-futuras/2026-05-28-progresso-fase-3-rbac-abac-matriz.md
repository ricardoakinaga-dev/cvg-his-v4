# Progresso Fase 3 - RBAC/ABAC por modulo

Data: 2026-05-28

## Objetivo

Avancar o item F3-01 do roadmap Premium Enterprise: revisar RBAC/ABAC por modulo com evidencia executavel de permissoes por perfil, unidade e acao.

## Entregue

- Criado contrato compartilhado para matriz de permissoes por modulo:
  - modulo;
  - permissoes;
  - acoes `consult`, `insert`, `update`, `delete`, `execute` e `admin`;
  - perfis/roles que concedem acesso;
  - overrides por equipe, setor e usuario;
  - status de cobertura `complete`, `partial` ou `read-only`.
- O dominio `AccessControlService` passou a gerar a matriz oficial via `getModulePermissionMatrix(accountId)`.
- Criado endpoint `GET /access-control/module-permission-matrix`.
- A leitura da matriz registra auditoria operacional em `access-control` com risco medio.
- OpenAPI atualizado com a nova rota e schemas.
- A tela `Governanca de Acesso` passou a consumir a matriz oficial e exibir:
  - total de modulos RBAC completos;
  - cobertura por modulo;
  - acoes permitidas;
  - perfis associados;
  - overrides por equipe, setor e usuario.

## Evidencias tecnicas

- `packages/shared/types/src/index.ts`
- `packages/modules/access-control/src/index.ts`
- `apps/api/src/routes/access-control-routes.ts`
- `apps/api/src/routes/access-control-audit-events.test.ts`
- `apps/api/src/openapi.yaml`
- `apps/spa/src/services/accessControl.ts`
- `apps/spa/src/pages/access-control/AccessControlPage.vue`
- `apps/spa/src/pages/access-control/__tests__/AccessControlPage.test.ts`

## Validacao executada

- `pnpm --filter @cvg-his-v2/shared-types build`
- `pnpm --filter @cvg-his-v2/module-access-control build`
- `pnpm --filter @cvg-his-v2/api build`
- `node apps/api/dist/routes/access-control-audit-events.test.js` - 4/4 testes passando
- `pnpm validate:openapi` - OpenAPI valido, 287 paths, 326 schemas
- `pnpm --filter @cvg-his-v2/spa exec vue-tsc --noEmit`
- `pnpm --filter @cvg-his-v2/spa exec vitest run src/pages/access-control/__tests__/AccessControlPage.test.ts --pool=forks` - 7/7 testes passando
- `pnpm --filter @cvg-his-v2/spa build`
- Conferencia do lockfile preservando `vue-component-type-helpers@3.2.7`

## Atualizacao RC

O incremento posterior `2026-05-28-progresso-rc-governanca-acesso-rbac-abac.md` adicionou o gate `pnpm governance:access`, cruzando catalogo de permissoes, roles, ABAC, matriz por modulo, rota protegida/auditada, OpenAPI, SPA, testes, rotas criticas e RLS.

## Status

F3-01 fica atendido como criterio tecnico local de Release Candidate. A validacao final ainda depende das evidencias externas gerais do RC.
