# PR-4: Auth/Tenancy Hardening

## Scope

- Removida orientacao para headers client-controlled nas mensagens de erro dos services:
  - `apps/his-api/src/modules/**/service.ts` (mensagens de actor/account)
- `patient-context` agora deriva `accountId` de `requestContext.actor` (JWT), nao de header:
  - `apps/his-api/src/modules/patientContext/service.ts`
  - `apps/his-api/src/modules/patientContext/routes.ts`
- Login bootstrap agora usa `ADMIN_ACCOUNT_ID`/`ADMIN_USER_ID` (com fallback seguro), evitando tenant hardcoded fixo no codigo:
  - `apps/his-api/src/modules/auth/routes.ts`

## Root Cause Fixed

- Mensagens e helper legados incentivavam uso de `x-account-id`/`x-user-id`.
- `patient-context` ainda lia `x-account-id` diretamente.
- Auth email/key usava tenant fixo sem configuracao por ambiente.

## How To Test (Local)

1. Requests sem token:
   - chamar rota protegida (ex.: `/owners`) sem cookie/token
   - esperado: `401`
2. Requests com token valido:
   - login via `/auth/login` ou `/auth/dev-login`
   - chamar `/patient-context/by-patient/:id`
   - esperado: usa actor do JWT sem depender de `x-account-id`.
3. Bootstrap actor configuravel:
   - definir `ADMIN_ACCOUNT_ID` e `ADMIN_USER_ID`
   - login email deve emitir token com esses IDs.

## How To Test (EasyPanel)

1. Confirmar env no `his-api`:
   - `JWT_SECRET`, `JWT_ISSUER`, `JWT_AUDIENCE`
   - opcional: `ADMIN_ACCOUNT_ID`, `ADMIN_USER_ID`
2. Deploy `his-api`.
3. Validar:
   - sem token => `401`
   - com token => acesso dentro do tenant
   - `patient-context` responde sem exigir header legado.
