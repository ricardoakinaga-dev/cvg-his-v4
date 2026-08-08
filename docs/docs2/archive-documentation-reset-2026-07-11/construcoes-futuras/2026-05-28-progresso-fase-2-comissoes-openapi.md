# Progresso Fase 2 - Comissoes no OpenAPI

Data: 2026-05-28

## Escopo entregue

- Adicionada a tag `Commissions` ao contrato OpenAPI principal.
- Documentadas as rotas HTTP do motor real de comissoes:
  - `GET /commission-rules`
  - `POST /commission-rules`
  - `GET /commission-calculations`
  - `POST /commission-calculations`
  - `GET /commission-calculations/{calculationId}`
  - `POST /commission-calculations/{calculationId}/review`
  - `POST /commission-calculations/{calculationId}/pay`
  - `POST /commission-calculations/{calculationId}/cancel`
- Adicionados schemas para:
  - `CommissionRule`
  - `CreateCommissionRuleRequest`
  - `CommissionRuleListResponse`
  - `CommissionSourceLine`
  - `CommissionLine`
  - `CommissionCalculation`
  - `CommissionCalculationDetail`
  - `CommissionCalculationListResponse`
  - `CalculateCommissionsRequest`

## Validacoes executadas

- `pnpm validate:openapi`
- `pnpm --filter @cvg-his-v2/module-packages build`
- `pnpm --filter @cvg-his-v2/module-commissions build`
- `pnpm --filter @cvg-his-v2/api build`
- `node --test dist/routes/commission-routes.test.js` em `apps/api`

Resultado: todos os comandos passaram.

## Evidencia OpenAPI

- Contrato validado com 260 paths, 37 tags e 270 schemas.

## Proximo passo recomendado

Iniciar F2-03 com motor real de relatorios: catalogo de relatorios, execucao com filtros, exportacao e agendamento auditavel.
