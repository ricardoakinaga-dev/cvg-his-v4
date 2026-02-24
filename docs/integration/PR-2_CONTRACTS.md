# PR-2: Contrato Unico + Contract Tests

## Scope

- Alinhado `packages/contracts` com os payloads reais de summary:
  - `packages/contracts/src/owners.ts`
  - `packages/contracts/src/patients.ts`
- Expandido contrato de encounters para busca por `q`:
  - `packages/contracts/src/encounters.ts`
- Backend agora valida response com schemas compartilhados em owners/patients/encounters:
  - `apps/his-api/src/modules/owners/routes.ts`
  - `apps/his-api/src/modules/patients/routes.ts`
  - `apps/his-api/src/modules/encounters/routes.ts`
- Encounter list no backend suporta `q` com scoping por `account_id`:
  - `apps/his-api/src/modules/encounters/service.ts`
  - `apps/his-api/src/modules/encounters/repo.ts`
- Frontend usa schemas corretos compartilhados e valida summaries/encounters:
  - `apps/his-web/src/lib/api.ts`
  - `apps/his-web/src/contracts/openapi-lite.ts`
- Teste de contrato (smoke) para `owners/patients/encounters`:
  - `apps/his-web/src/lib/api.contract.test.ts`

## Root Cause Fixed

- Drift de contrato entre `packages/contracts` e payload real de `/owners/:id/summary` e `/patients/:id/summary`.
- `listEncounters` no frontend perdia metadados de paginação e não validava contrato.
- Import de schema inválido no web (`OwnerCreateSchema` etc.) sem alias no contrato.

## How To Test (Local)

1. Contratos compartilhados:
   - `cd packages/contracts && npx vitest run src/__tests__/contracts.test.ts`
2. Smoke de contrato no web:
   - `cd apps/his-web && npx vitest run --environment node src/lib/api.contract.test.ts`
3. Validar busca de encounters por `q`:
   - `GET /encounters?q=consulta&page=1&pageSize=10` deve responder com `{ data, page, pageSize, total }`.

## How To Test (EasyPanel)

1. Deploy `his-api` e `his-web` com envs do checklist.
2. Validar summaries:
   - `GET https://<web-domain>/api/proxy/owners/<id>/summary`
   - `GET https://<web-domain>/api/proxy/patients/<id>/summary`
3. Validar encounters paginado + busca:
   - `GET https://<web-domain>/api/proxy/encounters?q=...&page=1&pageSize=10`
4. Navegar:
   - `/owners/<id>`, `/patients/<id>`, `/encounters` sem erro de parse no frontend.
