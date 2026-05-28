# Progresso Fase 3 - F3-05 Auditoria operacional

## Objetivo

Fortalecer a auditoria operacional do CVG-HIS v4 Premium Enterprise para que eventos relevantes sejam rastreados por usuario, conta, modulo, acao, entidade, correlacao e nivel de risco.

## Entregas realizadas

- Criado um relatorio de cobertura operacional no `AuditService`.
- Adicionada a lista inicial de requisitos criticos de auditoria enterprise:
  - falha de login;
  - revogacao de sessao;
  - leitura da matriz RBAC/ABAC;
  - exportacao LGPD;
  - conclusao de DSR;
  - leitura do log de auditoria;
  - ajuste de estoque;
  - liberacao de resultado laboratorial.
- O relatorio calcula:
  - total de eventos por conta;
  - eventos por modulo;
  - eventos por risco;
  - requisitos cobertos e pendentes;
  - percentual de cobertura;
  - evidencia por evento quando encontrada.
- Criado endpoint `GET /audit/operational-coverage`.
- A leitura do relatorio gera auditoria propria com evento `operational_coverage_read`.
- OpenAPI atualizado com:
  - path `/audit/operational-coverage`;
  - schema `OperationalAuditCoverageReport`;
  - schema `OperationalAuditCoverageItem`.
- A tela SPA `/audit` passou a exibir:
  - percentual de cobertura operacional;
  - status da cobertura;
  - requisitos cobertos/pendentes;
  - evidencias de cobertura junto da leitura de risco.

## Arquivos principais

- `packages/modules/audit/src/index.ts`
- `packages/modules/audit/src/audit.test.ts`
- `apps/api/src/routes/access-control-routes.ts`
- `apps/api/src/routes/access-control-audit-events.test.ts`
- `apps/api/src/openapi.yaml`
- `apps/spa/src/services/audit.ts`
- `apps/spa/src/pages/audit/AuditPage.vue`
- `apps/spa/src/pages/audit/__tests__/AuditPage.test.ts`

## Validacoes executadas

- `pnpm --filter @cvg-his-v2/module-audit build` - passou.
- `pnpm --filter @cvg-his-v2/module-audit exec vitest run src/audit.test.ts` - 17/17 testes passando.
- `pnpm --filter @cvg-his-v2/api build` - passou.
- `node --test apps/api/dist/routes/access-control-audit-events.test.js` - 5/5 testes passando.
- `pnpm validate:openapi` - OpenAPI valido com 288 paths e 329 schemas.
- `pnpm --filter @cvg-his-v2/spa exec vitest run src/pages/audit/__tests__/AuditPage.test.ts` - 6/6 testes passando.
- `pnpm --filter @cvg-his-v2/spa exec vue-tsc --noEmit` - passou.
- `pnpm-lock.yaml` preserva `vue-component-type-helpers@3.2.7`.

## Atualizacao RC

O incremento posterior `2026-05-28-progresso-rc-auditoria-operacional-evidencias.md` adicionou o gate `pnpm governance:audit`, que valida a matriz critica ampliada, rota protegida, OpenAPI, SPA, Dashboard e testes, e passou a integrar `pnpm readiness:enterprise` e `pnpm rc:evidence`.

## Impacto Enterprise

F3-05 fica atendido como criterio tecnico local de Release Candidate. A cobertura operacional de auditoria agora possui superficie funcional e gate reexecutavel; a validacao final ainda depende das evidencias externas gerais do RC.
